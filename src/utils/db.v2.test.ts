import { openDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Batch } from '../types';
import { acknowledgeOutboxOperation, closeDB, createEntryTransaction, failOutboxOperation, getBatchMovements, getDB, getDueOutboxOperations, getEntries, getEntrySync, getOutboxOperations, reverseEntryTransaction, updateEntryDetailsTransaction } from './db';
import { prepareRecordCommand } from '../services/recordPersistence';

const batch: Batch = { id: 'b1', substanceId: 'meph', name: '№014', totalWeight: 400, weightUnit: 'мг', solutionVolume: 20, volumeUnit: 'мл', concentration: 20, createdAt: 1, active: true, remaining: 260 };

async function reset() {
  closeDB();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('usnee-db'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error('blocked')); });
}

beforeEach(reset);
afterEach(() => closeDB());

describe('IndexedDB v2 persistence', () => {
  it('creates all v2 stores and indexes', async () => {
    const db = await getDB();
    expect([...db.objectStoreNames]).toEqual(expect.arrayContaining(['entries', 'batches', 'outbox', 'batchMovements', 'entrySync']));
    const tx = db.transaction(['outbox', 'batchMovements', 'entrySync']);
    expect([...tx.objectStore('outbox').indexNames]).toContain('by-entity-id');
    expect([...tx.objectStore('batchMovements').indexNames]).toContain('by-operation-id');
  });

  it('upgrades v1 without losing legacy entries and batches', async () => {
    const legacy = await openDB('usnee-db', 1, { upgrade(db) { const entries = db.createObjectStore('entries', { keyPath: 'id' }); entries.createIndex('by-timestamp', 'timestamp'); entries.createIndex('by-substance', 'substanceId'); db.createObjectStore('batches', { keyPath: 'id' }); for (const name of ['sleep','mood','food','water','nors']) db.createObjectStore(name, { keyPath: 'id' }); } });
    await legacy.put('entries', { id: 'legacy', substanceId: 'meph', methodId: 'inject', timestamp: 1, dose: 1, doseUnit: 'мл', methodDetails: {}, alone: true, createdAt: 1, updatedAt: 1 });
    await legacy.put('batches', batch); legacy.close();
    const db = await getDB();
    expect(await db.get('entries', 'legacy')).toBeTruthy();
    expect(await db.get('batches', 'b1')).toEqual(batch);
    expect(db.objectStoreNames.contains('outbox')).toBe(true);
  });

  it('atomically writes entry, movement, batch projection, outbox and sync metadata', async () => {
    const db = await getDB(); await db.put('batches', batch);
    const command = prepareRecordCommand({ substanceId: 'meph', substanceName: 'Мефедрон', methodId: 'inject', methodName: 'Инъекция', amountInput: '1', amountUnit: 'мл', occurredAt: Date.now(), alone: true, batchId: 'b1' }, batch, { entryId: 'e1', operationId: 'o1', movementId: 'm1' });
    expect(await createEntryTransaction(command)).toBe('created');
    expect((await getEntries()).map((item) => item.id)).toContain('e1');
    expect((await getOutboxOperations()).map((item) => item.operationId)).toContain('o1');
    expect((await getEntrySync('e1'))?.state).toBe('pending');
    expect((await getBatchMovements('b1'))[0].deltaMassMg).toBe(-20);
    expect((await db.get('batches', 'b1'))?.remaining).toBe(240);
    expect(await createEntryTransaction(command)).toBe('duplicate');
  });

  it('rolls back when batch balance changed', async () => {
    const db = await getDB(); await db.put('batches', batch);
    const command = prepareRecordCommand({ substanceId: 'meph', methodId: 'inject', amountInput: '1', amountUnit: 'мл', occurredAt: Date.now(), alone: true, batchId: 'b1' }, batch, { entryId: 'e1', operationId: 'o1', movementId: 'm1' });
    await db.put('batches', { ...batch, remaining: 200 });
    await expect(createEntryTransaction(command)).rejects.toThrow('BATCH_CHANGED');
    expect(await db.get('entries', 'e1')).toBeUndefined();
    expect(await db.get('outbox', 'o1')).toBeUndefined();
  });

  it('atomically updates safe entry details and queues an update', async () => {
    const db = await getDB();
    const command = prepareRecordCommand({ substanceId: 'meph', methodId: 'oral', amountInput: '10', amountUnit: 'мг', occurredAt: Date.now(), alone: true }, null, { entryId: 'e1', operationId: 'o1' });
    await createEntryTransaction(command);
    const updated = await updateEntryDetailsTransaction('e1', 1000, '  note  ');
    expect(updated.timestamp).toBe(1000);
    expect(updated.notes).toBe('note');
    expect((await db.get('entrySync', 'e1'))?.state).toBe('pending');
    expect((await db.get('entrySync', 'e1'))?.createOperationId).toBe('o1');
    expect((await db.getAll('outbox')).some((operation) => operation.kind === 'update')).toBe(true);
  });

  it('creates idempotent reversal and restores batch projection', async () => {
    const db = await getDB(); await db.put('batches', batch);
    const command = prepareRecordCommand({ substanceId: 'meph', methodId: 'inject', amountInput: '1', amountUnit: 'мл', occurredAt: Date.now(), alone: true, batchId: 'b1' }, batch, { entryId: 'e1', operationId: 'o1', movementId: 'm1' });
    await createEntryTransaction(command);
    const reverse = { entryId: 'e1', reverseOperation: { operationId: 'r1', entityId: 'e1', entityType: 'entry' as const, kind: 'reverse' as const, baseRevision: 0, payload: {}, createdAt: new Date().toISOString(), attempts: 0 }, reverseMovement: { ...command.movement!, id: 'rm1', operationId: 'r1', kind: 'reverse' as const, reversesMovementId: 'm1', deltaMassMg: 20, deltaVolumeMl: 1 } };
    expect(await reverseEntryTransaction(reverse)).toBe('reversed');
    expect((await db.get('batches', 'b1'))?.remaining).toBe(260);
    expect((await db.get('entries', 'e1'))?.reversedAt).toEqual(expect.any(Number));
    expect((await getEntries()).find((entry) => entry.id === 'e1')).toBeUndefined();
    expect(await reverseEntryTransaction(reverse)).toBe('duplicate');
  });

  it('acknowledges accepted operations and removes them from outbox', async () => {
    const db = await getDB();
    const command = prepareRecordCommand({ substanceId: 'meph', methodId: 'oral', amountInput: '10', amountUnit: 'мг', occurredAt: Date.now(), alone: true }, null, { entryId: 'e1', operationId: 'o1' });
    await createEntryTransaction(command);
    await acknowledgeOutboxOperation({ operationId: 'o1', entityId: 'e1', status: 'accepted', revision: 1, serverTime: '2026-08-06T00:00:00.000Z' });
    expect(await db.get('outbox', 'o1')).toBeUndefined();
    expect(await getEntrySync('e1')).toMatchObject({ state: 'synced', revision: 1, lastSyncedAt: '2026-08-06T00:00:00.000Z' });
  });

  it('retains rejected operations and blocks later operations for the same entry', async () => {
    const db = await getDB();
    const command = prepareRecordCommand({ substanceId: 'meph', methodId: 'oral', amountInput: '10', amountUnit: 'мг', occurredAt: Date.now(), alone: true }, null, { entryId: 'e1', operationId: 'o1' });
    await createEntryTransaction(command);
    await updateEntryDetailsTransaction('e1', 1000, 'note');
    await acknowledgeOutboxOperation({ operationId: 'o1', entityId: 'e1', status: 'rejected', serverTime: '2026-08-06T00:00:00.000Z', errorCode: 'VALIDATION' });
    expect(await db.get('outbox', 'o1')).toMatchObject({ lastErrorCode: 'VALIDATION' });
    expect(await getEntrySync('e1')).toMatchObject({ state: 'pending' });
    expect(await getDueOutboxOperations('2026-08-07T00:00:00.000Z')).toEqual([]);
  });

  it('backs off failed operations without deleting local data', async () => {
    const db = await getDB();
    const command = prepareRecordCommand({ substanceId: 'meph', methodId: 'oral', amountInput: '10', amountUnit: 'мг', occurredAt: Date.now(), alone: true }, null, { entryId: 'e1', operationId: 'o1' });
    await createEntryTransaction(command);
    await failOutboxOperation('o1', 'NETWORK_ERROR', '2026-08-07T00:00:00.000Z');
    expect(await db.get('entries', 'e1')).toBeTruthy();
    expect(await db.get('outbox', 'o1')).toMatchObject({ attempts: 1, lastErrorCode: 'NETWORK_ERROR' });
    expect(await getEntrySync('e1')).toMatchObject({ state: 'failed', errorCode: 'NETWORK_ERROR' });
  });
});
