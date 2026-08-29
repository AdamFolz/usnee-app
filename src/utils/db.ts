import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { BatchMovement } from '../contracts/batch';
import type { EntrySyncRecord } from '../contracts/persistence';
import type { OutboxOperation } from '../contracts/sync';
import type { Batch, ConsumptionEntry, SleepEntry, MoodEntry, FoodEntry, WaterEntry, NorsSession } from '../types';
import { createUuid } from './ids';

interface USNEEDB extends DBSchema {
  entries: { key: string; value: ConsumptionEntry; indexes: { 'by-timestamp': number; 'by-substance': string } };
  batches: { key: string; value: Batch };
  sleep: { key: string; value: SleepEntry };
  mood: { key: string; value: MoodEntry };
  food: { key: string; value: FoodEntry };
  water: { key: string; value: WaterEntry };
  nors: { key: string; value: NorsSession };
  outbox: { key: string; value: OutboxOperation; indexes: { 'by-created-at': string; 'by-entity-id': string } };
  batchMovements: { key: string; value: BatchMovement; indexes: { 'by-batch-id': string; 'by-operation-id': string; 'by-entry-id': string } };
  entrySync: { key: string; value: EntrySyncRecord; indexes: { 'by-operation-id': string; 'by-state': string } };
}

type StoreName = 'entries' | 'batches' | 'sleep' | 'mood' | 'food' | 'water' | 'nors' | 'outbox' | 'batchMovements' | 'entrySync';

let db: IDBPDatabase<USNEEDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<USNEEDB>> {
  if (db) return db;
  db = await openDB<USNEEDB>('usnee-db', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const entries = database.createObjectStore('entries', { keyPath: 'id' });
        entries.createIndex('by-timestamp', 'timestamp');
        entries.createIndex('by-substance', 'substanceId');
        database.createObjectStore('batches', { keyPath: 'id' });
        database.createObjectStore('sleep', { keyPath: 'id' });
        database.createObjectStore('mood', { keyPath: 'id' });
        database.createObjectStore('food', { keyPath: 'id' });
        database.createObjectStore('water', { keyPath: 'id' });
        database.createObjectStore('nors', { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        const outbox = database.createObjectStore('outbox', { keyPath: 'operationId' });
        outbox.createIndex('by-created-at', 'createdAt');
        outbox.createIndex('by-entity-id', 'entityId');
        const movements = database.createObjectStore('batchMovements', { keyPath: 'id' });
        movements.createIndex('by-batch-id', 'batchId');
        movements.createIndex('by-operation-id', 'operationId', { unique: true });
        movements.createIndex('by-entry-id', 'entryId');
        const sync = database.createObjectStore('entrySync', { keyPath: 'entityId' });
        sync.createIndex('by-operation-id', 'operationId', { unique: true });
        sync.createIndex('by-state', 'state');
      }
    }
  });
  return db;
}

export function closeDB(): void { db?.close(); db = null; }
export async function getDB() { return initDB(); }

export interface CreateEntryTransactionCommand {
  entry: ConsumptionEntry;
  operation: OutboxOperation;
  sync: EntrySyncRecord;
  movement?: BatchMovement;
  batchId?: string;
  expectedBatchRemaining?: number;
  nextBatchRemaining?: number;
}

export async function createEntryTransaction(command: CreateEntryTransactionCommand): Promise<'created' | 'duplicate'> {
  const database = await getDB();
  const stores: StoreName[] = ['entries', 'outbox', 'entrySync'];
  if (command.movement && command.batchId) stores.push('batchMovements', 'batches');
  const tx = database.transaction(stores, 'readwrite');
  if (await tx.objectStore('outbox').get(command.operation.operationId)) { await tx.done; return 'duplicate'; }
  // TODO: atomic outbox claim needs backend/lease semantics; current client path stays idempotent.
  if (command.movement && command.batchId) {
    const batch = await tx.objectStore('batches').get(command.batchId);
    if (!batch || !batch.active) { await tx.done; throw new Error('BATCH_UNAVAILABLE'); }
    if (batch.substanceId !== command.entry.substanceId) { await tx.done; throw new Error('BATCH_INCOMPATIBLE'); }
    if (command.expectedBatchRemaining !== undefined && batch.remaining !== command.expectedBatchRemaining) { await tx.done; throw new Error('BATCH_CHANGED'); }
    if (command.nextBatchRemaining === undefined || command.nextBatchRemaining < 0) { await tx.done; throw new Error('BATCH_INSUFFICIENT'); }
    await tx.objectStore('batchMovements').add(command.movement);
    await tx.objectStore('batches').put({ ...batch, remaining: command.nextBatchRemaining });
  }
  await tx.objectStore('entries').add(command.entry);
  await tx.objectStore('outbox').add(command.operation);
  await tx.objectStore('entrySync').put(command.sync);
  await tx.done;
  window.dispatchEvent(new Event('usnee:outbox-changed'));
  return 'created';
}

export interface ReverseEntryCommand {
  entryId: string;
  reverseOperation: OutboxOperation;
  reverseMovement?: BatchMovement;
}

export async function reverseEntryTransaction(command: ReverseEntryCommand): Promise<'reversed' | 'duplicate'> {
  const database = await getDB();
  const originalSync = await database.get('entrySync', command.entryId);
  if (!originalSync) throw new Error('ENTRY_SYNC_NOT_FOUND');
  if (originalSync.reversedAt) return 'duplicate';
  const entry = await database.get('entries', command.entryId);
  if (!entry) throw new Error('ENTRY_NOT_FOUND');
  const stores: StoreName[] = ['entries', 'outbox', 'entrySync'];
  if (command.reverseMovement && entry.batchId) stores.push('batchMovements', 'batches');
  const tx = database.transaction(stores, 'readwrite');
  if (command.reverseMovement && entry.batchId) {
    const batch = await tx.objectStore('batches').get(entry.batchId);
    if (!batch) { await tx.done; throw new Error('BATCH_UNAVAILABLE'); }
    const restored = batch.remaining + Math.abs(command.reverseMovement.deltaMassMg ?? 0);
    await tx.objectStore('batchMovements').add(command.reverseMovement);
    await tx.objectStore('batches').put({ ...batch, remaining: restored });
  }
  const reversedAt = new Date().toISOString();
  await tx.objectStore('entries').put({ ...entry, reversedAt: Date.parse(reversedAt), updatedAt: Date.now() });
  await tx.objectStore('outbox').add(command.reverseOperation);
  await tx.objectStore('entrySync').put({ ...originalSync, state: 'pending', reversedAt, reverseOperationId: command.reverseOperation.operationId });
  await tx.done;
  window.dispatchEvent(new Event('usnee:outbox-changed'));
  return 'reversed';
}

export async function getOutboxOperations(): Promise<OutboxOperation[]> { return (await getDB()).getAll('outbox'); }

export async function getDueOutboxOperations(now: string): Promise<OutboxOperation[]> {
  const kindOrder: Record<OutboxOperation['kind'], number> = { create: 0, update: 1, delete: 2, reverse: 3 };
  const ordered = (await getOutboxOperations())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || kindOrder[a.kind] - kindOrder[b.kind]);
  const headByEntity = new Map<string, OutboxOperation>();
  for (const operation of ordered) {
    const key = `${operation.entityType}:${operation.entityId}`;
    if (!headByEntity.has(key)) headByEntity.set(key, operation);
  }
  return [...headByEntity.values()]
    .filter((operation) => !operation.nextAttemptAt || operation.nextAttemptAt <= now)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || kindOrder[a.kind] - kindOrder[b.kind]);
}

export async function claimOutboxOperation(operationId: string): Promise<void> {
  const database = await getDB();
  const operation = await database.get('outbox', operationId);
  if (!operation) return;
  const sync = operation.entityType === 'entry' ? await database.get('entrySync', operation.entityId) : undefined;
  const tx = database.transaction(['outbox', 'entrySync'], 'readwrite');
  await tx.objectStore('outbox').put({ ...operation, lastErrorCode: undefined });
  if (sync && sync.operationId === operationId) {
    await tx.objectStore('entrySync').put({ ...sync, state: 'syncing', errorCode: undefined });
  }
  await tx.done;
}

export async function acknowledgeOutboxOperation(acknowledgement: import('../contracts/sync').SyncAcknowledgement): Promise<void> {
  const database = await getDB();
  const operation = await database.get('outbox', acknowledgement.operationId);
  if (!operation || operation.entityId !== acknowledgement.entityId) throw new Error('OUTBOX_ACK_MISMATCH');
  const sync = operation.entityType === 'entry' ? await database.get('entrySync', operation.entityId) : undefined;
  const tx = database.transaction(['outbox', 'entrySync'], 'readwrite');
  const accepted = acknowledgement.status === 'accepted' || acknowledgement.status === 'duplicate';
  if (accepted) {
    await tx.objectStore('outbox').delete(operation.operationId);
  } else {
    await tx.objectStore('outbox').put({
      ...operation,
      lastErrorCode: acknowledgement.errorCode ?? acknowledgement.status.toUpperCase(),
      nextAttemptAt: '9999-12-31T23:59:59.999Z'
    });
  }
  if (sync && sync.operationId === operation.operationId) {
    const state = acknowledgement.status === 'conflict'
      ? 'conflicted'
      : acknowledgement.status === 'rejected'
        ? 'failed'
        : 'synced';
    await tx.objectStore('entrySync').put({
      ...sync,
      state,
      revision: acknowledgement.revision ?? sync.revision,
      lastSyncedAt: state === 'synced' ? acknowledgement.serverTime : sync.lastSyncedAt,
      errorCode: acknowledgement.errorCode ?? (accepted ? undefined : acknowledgement.status.toUpperCase())
    });
  }
  await tx.done;
  window.dispatchEvent(new Event('usnee:sync-changed'));
}

export async function failOutboxOperation(operationId: string, errorCode: string, nextAttemptAt: string): Promise<void> {
  const database = await getDB();
  const operation = await database.get('outbox', operationId);
  if (!operation) return;
  const sync = operation.entityType === 'entry' ? await database.get('entrySync', operation.entityId) : undefined;
  const tx = database.transaction(['outbox', 'entrySync'], 'readwrite');
  await tx.objectStore('outbox').put({ ...operation, attempts: operation.attempts + 1, lastErrorCode: errorCode, nextAttemptAt });
  if (sync && sync.operationId === operationId) {
    await tx.objectStore('entrySync').put({ ...sync, state: 'failed', errorCode });
  }
  await tx.done;
  window.dispatchEvent(new Event('usnee:sync-changed'));
}

export async function getEntrySync(id: string): Promise<EntrySyncRecord | undefined> { return (await getDB()).get('entrySync', id); }
export async function getEntrySyncRecords(): Promise<EntrySyncRecord[]> { return (await getDB()).getAll('entrySync'); }
export async function getBatchMovements(batchId: string): Promise<BatchMovement[]> { return (await getDB()).getAllFromIndex('batchMovements', 'by-batch-id', batchId); }
export async function getBatchMovementByEntry(entryId: string): Promise<BatchMovement | undefined> {
  const movements = await (await getDB()).getAllFromIndex('batchMovements', 'by-entry-id', entryId);
  return movements.find((movement) => movement.kind === 'consume');
}

export async function updateEntryDetailsTransaction(entryId: string, timestamp: number, notes?: string): Promise<ConsumptionEntry> {
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 5 * 60_000) throw new Error('INVALID_TIMESTAMP');
  const database = await getDB();
  const entry = await database.get('entries', entryId);
  if (!entry || entry.reversedAt) throw new Error('ENTRY_NOT_FOUND');
  const existingSync = await database.get('entrySync', entryId);
  const operationId = createUuid();
  const createdAt = new Date().toISOString();
  const updated: ConsumptionEntry = { ...entry, timestamp, notes: notes?.trim() || undefined, updatedAt: Date.now() };
  const operation: OutboxOperation = {
    operationId, entityId: entryId, entityType: 'entry', kind: 'update',
    baseRevision: existingSync?.revision ?? 0,
    payload: { timestamp: new Date(timestamp).toISOString(), notes: updated.notes },
    createdAt, attempts: 0
  };
  const tx = database.transaction(['entries', 'outbox', 'entrySync'], 'readwrite');
  await tx.objectStore('entries').put(updated);
  await tx.objectStore('outbox').add(operation);
  await tx.objectStore('entrySync').put({
    entityId: entryId,
    operationId,
    createOperationId: existingSync?.createOperationId ?? existingSync?.operationId,
    state: 'pending',
    revision: existingSync?.revision ?? 0
  });
  await tx.done;
  window.dispatchEvent(new Event('usnee:outbox-changed'));
  return updated;
}
export async function addEntry(entry: ConsumptionEntry): Promise<void> { await (await getDB()).put('entries', entry); }
export async function getEntries(): Promise<ConsumptionEntry[]> { return (await getDB()).getAllFromIndex('entries', 'by-timestamp').then((entries) => entries.filter((entry) => !entry.reversedAt)); }
export async function getEntriesBySubstance(substanceId: string): Promise<ConsumptionEntry[]> { return (await getDB()).getAllFromIndex('entries', 'by-substance', substanceId).then((entries) => entries.filter((entry) => !entry.reversedAt)); }
export async function deleteEntry(id: string): Promise<void> { await (await getDB()).delete('entries', id); }
export async function updateEntry(entry: ConsumptionEntry): Promise<void> { await (await getDB()).put('entries', entry); }
export async function getEntryById(id: string): Promise<ConsumptionEntry | undefined> { return (await getDB()).get('entries', id); }
export async function getLastEntry(): Promise<ConsumptionEntry | undefined> { const all = await getEntries(); return all.length ? all[all.length - 1] : undefined; }
export async function getEntriesBetween(start: number, end: number): Promise<ConsumptionEntry[]> { return (await getEntries()).filter((entry) => entry.timestamp >= start && entry.timestamp <= end); }
export async function addBatch(batch: Batch): Promise<void> { await (await getDB()).put('batches', batch); }
export async function getBatches(): Promise<Batch[]> { return (await getDB()).getAll('batches'); }
export async function getActiveBatch(substanceId?: string): Promise<Batch | undefined> { return (await getBatches()).find((batch) => batch.active && (!substanceId || batch.substanceId === substanceId)); }
export async function updateBatch(batch: Batch): Promise<void> { await (await getDB()).put('batches', batch); }
export async function addMood(entry: MoodEntry): Promise<void> { await (await getDB()).put('mood', entry); }
export async function getMoods(): Promise<MoodEntry[]> { return (await getDB()).getAll('mood'); }
export async function addSleep(entry: SleepEntry): Promise<void> {
  const database = await getDB();
  const active = (await database.getAll('sleep')).find((item) => !item.endTime);
  if (active && !entry.endTime) throw new Error('SLEEP_ALREADY_ACTIVE');
  await database.put('sleep', entry);
}
export async function getSleep(): Promise<SleepEntry[]> { return (await getDB()).getAll('sleep'); }
export async function addFood(entry: FoodEntry): Promise<void> { await (await getDB()).put('food', entry); }
export async function getFood(): Promise<FoodEntry[]> { return (await getDB()).getAll('food'); }
export async function addWater(entry: WaterEntry): Promise<void> { await (await getDB()).put('water', entry); }
export async function getWater(): Promise<WaterEntry[]> { return (await getDB()).getAll('water'); }
export async function addNors(session: NorsSession): Promise<void> { await (await getDB()).put('nors', session); }
export async function getNorsSessions(): Promise<NorsSession[]> { return (await getDB()).getAll('nors'); }
export async function clearAllData(): Promise<void> {
  const database = await getDB();
  const names: StoreName[] = ['entries', 'batches', 'sleep', 'mood', 'food', 'water', 'nors', 'outbox', 'batchMovements', 'entrySync'];
  const tx = database.transaction(names, 'readwrite');
  await Promise.all(names.map((name) => tx.objectStore(name).clear()));
  await tx.done;
}

export async function resetUserData(): Promise<void> {
  await clearAllData();
  localStorage.removeItem('usnee-clean-days');
  localStorage.removeItem('usnee-app-store');
}

// ---- Import (BUG-001 / BUG-003) ----

export function isConsumptionEntry(value: unknown): value is ConsumptionEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ConsumptionEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.substanceId === 'string' &&
    typeof entry.methodId === 'string' &&
    typeof entry.timestamp === 'number' &&
    Number.isFinite(entry.timestamp) &&
    typeof entry.dose === 'number' &&
    Number.isFinite(entry.dose) &&
    entry.dose > 0 &&
    typeof entry.doseUnit === 'string' &&
    typeof entry.alone === 'boolean' &&
    typeof entry.createdAt === 'number' &&
    typeof entry.updatedAt === 'number'
  );
}

/**
 * Import entries explicitly as local-only: written to `entries` and marked
 * in `entrySync` as `local-only`, with NO outbox operation — so the sync
 * runner never picks them up (BUG-003: import must not bypass sync silently;
 * these are local records and stay local until user re-records them).
 */
export async function importEntriesLocalOnly(entries: unknown[]): Promise<number> {
  const database = await getDB();
  const valid = entries.filter(isConsumptionEntry);
  if (valid.length === 0) return 0;
  const tx = database.transaction(['entries', 'entrySync'], 'readwrite');
  for (const entry of valid) {
    await tx.objectStore('entries').put(entry);
    await tx.objectStore('entrySync').put({
      entityId: entry.id,
      operationId: entry.id,
      createOperationId: entry.id,
      state: 'local-only',
      revision: 0
    });
  }
  await tx.done;
  return valid.length;
}
