import type { SyncMetadata } from './sync';

export interface EntrySyncRecord extends SyncMetadata {
  entityId: string;
  operationId: string;
  createOperationId?: string;
  reversedAt?: string;
  reverseOperationId?: string;
}

export interface ReverseEntryPayload {
  entryId: string;
  createOperationId: string;
  reason: 'user-undo';
}
