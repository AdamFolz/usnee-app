import type { EntityId, IsoDateTime, OperationId } from './batch';

export type SyncState =
  | 'local-only'
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'conflicted';

export type SyncOperationKind = 'create' | 'update' | 'delete' | 'reverse';
export type SyncEntityType = 'entry' | 'batch' | 'batch-movement' | 'profile';

export interface SyncMetadata {
  state: SyncState;
  revision: number;
  lastSyncedAt?: IsoDateTime;
  errorCode?: string;
}

export interface OutboxOperation<TPayload = unknown> {
  operationId: OperationId;
  entityId: EntityId;
  entityType: SyncEntityType;
  kind: SyncOperationKind;
  baseRevision: number;
  payload: TPayload;
  createdAt: IsoDateTime;
  attempts: number;
  nextAttemptAt?: IsoDateTime;
  lastErrorCode?: string;
}

export interface SyncAcknowledgement {
  operationId: OperationId;
  entityId: EntityId;
  status: 'accepted' | 'duplicate' | 'rejected' | 'conflict';
  revision?: number;
  serverTime: IsoDateTime;
  errorCode?: string;
}

export interface EntryAmount {
  value: number;
  unit: 'ml' | 'mg' | 'g' | string;
  calculatedMassMg?: number;
}

export interface CreateEntryPayload {
  entryId: EntityId;
  substanceId: EntityId;
  substanceName?: string;
  methodId: EntityId;
  amount: EntryAmount;
  occurredAt: IsoDateTime;
  alone: boolean;
  batchId?: EntityId;
  batchMovementOperationId?: OperationId;
  notes?: string;
}

export type CreateEntryOperation = OutboxOperation<CreateEntryPayload> & {
  entityType: 'entry';
  kind: 'create';
};

export function isRetryableSyncState(state: SyncState): boolean {
  return state === 'pending' || state === 'failed';
}
