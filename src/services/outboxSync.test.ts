import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntrySyncRecord } from '../contracts/persistence';
import type { OutboxOperation } from '../contracts/sync';
import {
  acknowledgeOutboxOperation,
  claimOutboxOperation,
  failOutboxOperation,
  getDueOutboxOperations
} from '../utils/db';
import { flushEntryOutbox, statusFromAcknowledgement } from './outboxSync';

vi.mock('../utils/db', () => ({
  acknowledgeOutboxOperation: vi.fn(),
  claimOutboxOperation: vi.fn(),
  failOutboxOperation: vi.fn(),
  getDueOutboxOperations: vi.fn()
}));

const operation: OutboxOperation = {
  operationId: 'op-1', entityId: 'entry-1', entityType: 'entry', kind: 'create',
  baseRevision: 0, payload: { value: 1 }, createdAt: '2026-08-06T00:00:00.000Z', attempts: 0
};
const config = { apiBaseUrl: 'https://api.example.test', initData: 'signed-data' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDueOutboxOperations).mockResolvedValue([operation]);
  vi.mocked(claimOutboxOperation).mockResolvedValue(undefined);
  vi.mocked(acknowledgeOutboxOperation).mockResolvedValue(undefined);
  vi.mocked(failOutboxOperation).mockResolvedValue(undefined);
});

describe('entry outbox transport', () => {
  it('does nothing without explicit backend configuration', async () => {
    expect(await flushEntryOutbox({ config: null, online: true })).toEqual({ status: 'disabled', processed: 0 });
    expect(getDueOutboxOperations).not.toHaveBeenCalled();
  });

  it('sends Telegram auth and idempotency key, then acknowledges operation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      operationId: 'op-1', entityId: 'entry-1', status: 'accepted', revision: 1,
      serverTime: '2026-08-06T00:00:01.000Z'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect(await flushEntryOutbox({ config, online: true })).toEqual({ status: 'complete', processed: 1 });
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/api/sync/operations', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Telegram-Init-Data': 'signed-data', 'Idempotency-Key': 'op-1' })
    }));
    expect(acknowledgeOutboxOperation).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));
  });

  it('keeps failed operation for backoff retry and pauses ordering', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('NETWORK_ERROR'));
    expect(await flushEntryOutbox({ config, online: true })).toEqual({ status: 'paused', processed: 0, errorCode: 'NETWORK_ERROR' });
    expect(failOutboxOperation).toHaveBeenCalledWith('op-1', 'NETWORK_ERROR', expect.any(String));
    expect(acknowledgeOutboxOperation).not.toHaveBeenCalled();
  });

  it('rejects mismatched acknowledgements instead of losing the operation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      operationId: 'wrong', entityId: 'entry-1', status: 'accepted', serverTime: '2026-08-06T00:00:01.000Z'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect((await flushEntryOutbox({ config, online: true })).status).toBe('paused');
    expect(failOutboxOperation).toHaveBeenCalledWith('op-1', 'INVALID_SERVER_RESPONSE', expect.any(String));
  });

  it('pauses on conflict but keeps the acknowledgement', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      operationId: 'op-1', entityId: 'entry-1', status: 'conflict', errorCode: 'REVISION_CONFLICT',
      serverTime: '2026-08-06T00:00:01.000Z'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect(await flushEntryOutbox({ config, online: true })).toEqual({
      status: 'paused', processed: 1, errorCode: 'REVISION_CONFLICT'
    });
    expect(acknowledgeOutboxOperation).toHaveBeenCalledWith(expect.objectContaining({ status: 'conflict' }));
    expect(failOutboxOperation).not.toHaveBeenCalled();
  });

  it('pauses on rejected with its error code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      operationId: 'op-1', entityId: 'entry-1', status: 'rejected', errorCode: 'VALIDATION_FAILED',
      serverTime: '2026-08-06T00:00:01.000Z'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect(await flushEntryOutbox({ config, online: true })).toEqual({
      status: 'paused', processed: 1, errorCode: 'VALIDATION_FAILED'
    });
    expect(acknowledgeOutboxOperation).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }));
  });

  it('completes on duplicate like an accepted sync', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      operationId: 'op-1', entityId: 'entry-1', status: 'duplicate', revision: 3,
      serverTime: '2026-08-06T00:00:01.000Z'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect(await flushEntryOutbox({ config, online: true })).toEqual({ status: 'complete', processed: 1 });
    expect(acknowledgeOutboxOperation).toHaveBeenCalledWith(expect.objectContaining({ status: 'duplicate' }));
  });
});

describe('statusFromAcknowledgement', () => {
  const existing: EntrySyncRecord = {
    entityId: 'entry-1',
    operationId: 'op-0',
    state: 'syncing',
    revision: 2,
    lastSyncedAt: '2026-08-01T00:00:00.000Z'
  };
  const ackBase = { operationId: 'op-1', entityId: 'entry-1', serverTime: '2026-08-06T00:00:01.000Z', revision: 3 };

  it('maps conflict to conflicted and keeps previous sync time', () => {
    const next = statusFromAcknowledgement({ ...ackBase, status: 'conflict', errorCode: 'REVISION_CONFLICT' }, existing);
    expect(next.state).toBe('conflicted');
    expect(next.revision).toBe(3);
    expect(next.lastSyncedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(next.errorCode).toBe('REVISION_CONFLICT');
  });

  it('maps rejected to failed and keeps previous sync time', () => {
    const next = statusFromAcknowledgement({ ...ackBase, status: 'rejected', errorCode: 'VALIDATION_FAILED' }, existing);
    expect(next.state).toBe('failed');
    expect(next.lastSyncedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(next.errorCode).toBe('VALIDATION_FAILED');
  });

  it('maps duplicate and accepted to synced with fresh sync time', () => {
    for (const status of ['duplicate', 'accepted'] as const) {
      const next = statusFromAcknowledgement({ ...ackBase, status }, existing);
      expect(next.state).toBe('synced');
      expect(next.lastSyncedAt).toBe('2026-08-06T00:00:01.000Z');
      expect(next.errorCode).toBeUndefined();
    }
  });
});
