import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OutboxOperation } from '../contracts/sync';
import {
  acknowledgeOutboxOperation,
  claimOutboxOperation,
  failOutboxOperation,
  getDueOutboxOperations
} from '../utils/db';
import { flushEntryOutbox } from './outboxSync';

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
});
