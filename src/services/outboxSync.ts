import type { EntrySyncRecord } from '../contracts/persistence';
import type { OutboxOperation, SyncAcknowledgement } from '../contracts/sync';
import { getTelegramWebApp } from '../integrations/telegram';
import {
  acknowledgeOutboxOperation,
  claimOutboxOperation,
  failOutboxOperation,
  getDueOutboxOperations
} from '../utils/db';

export interface SyncTransportConfig {
  apiBaseUrl: string;
  initData: string;
}

export type SyncRunResult =
  | { status: 'disabled'; processed: 0 }
  | { status: 'offline'; processed: 0 }
  | { status: 'complete'; processed: number }
  | { status: 'paused'; processed: number; errorCode: string };

function envValue(name: string): string {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  return meta.env?.[name]?.trim() ?? '';
}

export function getSyncTransportConfig(): SyncTransportConfig | null {
  const apiBaseUrl = envValue('VITE_API_BASE_URL').replace(/\/+$/, '');
  const initData = getTelegramWebApp()?.initData?.trim() ?? '';
  return apiBaseUrl && initData ? { apiBaseUrl, initData } : null;
}

function isAcknowledgement(value: unknown, operation: OutboxOperation): value is SyncAcknowledgement {
  if (!value || typeof value !== 'object') return false;
  const ack = value as Partial<SyncAcknowledgement>;
  return ack.operationId === operation.operationId
    && ack.entityId === operation.entityId
    && ['accepted', 'duplicate', 'rejected', 'conflict'].includes(ack.status ?? '')
    && typeof ack.serverTime === 'string';
}

async function sendOperation(operation: OutboxOperation, config: SyncTransportConfig): Promise<SyncAcknowledgement> {
  const response = await fetch(`${config.apiBaseUrl}/api/sync/operations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': config.initData,
      'Idempotency-Key': operation.operationId
    },
    body: JSON.stringify(operation)
  });

  let body: unknown;
  try { body = await response.json(); }
  catch { throw new Error(response.ok ? 'INVALID_SERVER_RESPONSE' : `HTTP_${response.status}`); }
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  if (!isAcknowledgement(body, operation)) throw new Error('INVALID_SERVER_RESPONSE');
  return body;
}

function retryDelayMs(attempt: number): number {
  return Math.min(5 * 60_000, 2_000 * 2 ** Math.min(Math.max(attempt - 1, 0), 7));
}

export async function flushEntryOutbox(options: {
  config?: SyncTransportConfig | null;
  online?: boolean;
  limit?: number;
} = {}): Promise<SyncRunResult> {
  const online = options.online ?? navigator.onLine;
  if (!online) return { status: 'offline', processed: 0 };
  const config = options.config === undefined ? getSyncTransportConfig() : options.config;
  if (!config) return { status: 'disabled', processed: 0 };

  const operations = (await getDueOutboxOperations(new Date().toISOString()))
    .filter((operation) => operation.entityType === 'entry')
    .slice(0, options.limit ?? 20);
  let processed = 0;

  for (const operation of operations) {
    await claimOutboxOperation(operation.operationId);
    try {
      const acknowledgement = await sendOperation(operation, config);
      await acknowledgeOutboxOperation(acknowledgement);
      processed += 1;
      if (acknowledgement.status === 'rejected' || acknowledgement.status === 'conflict') {
        return { status: 'paused', processed, errorCode: acknowledgement.errorCode ?? acknowledgement.status.toUpperCase() };
      }
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : 'NETWORK_ERROR';
      const attempt = operation.attempts + 1;
      await failOutboxOperation(operation.operationId, errorCode, new Date(Date.now() + retryDelayMs(attempt)).toISOString());
      return { status: 'paused', processed, errorCode };
    }
  }
  return { status: 'complete', processed };
}

export function statusFromAcknowledgement(
  acknowledgement: SyncAcknowledgement,
  existing: EntrySyncRecord
): EntrySyncRecord {
  const state = acknowledgement.status === 'conflict'
    ? 'conflicted'
    : acknowledgement.status === 'rejected'
      ? 'failed'
      : 'synced';
  return {
    ...existing,
    state,
    revision: acknowledgement.revision ?? existing.revision,
    lastSyncedAt: acknowledgement.status === 'accepted' || acknowledgement.status === 'duplicate'
      ? acknowledgement.serverTime
      : existing.lastSyncedAt,
    errorCode: acknowledgement.errorCode
  };
}
