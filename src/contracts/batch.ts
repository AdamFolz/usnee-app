export type EntityId = string;
export type OperationId = string;
export type IsoDateTime = string;

interface BatchBase {
  id: EntityId;
  substanceId: EntityId;
  name: string;
  status: 'active' | 'depleted' | 'archived';
  revision: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SolutionBatch extends BatchBase {
  form: 'solution';
  initialMassMg: number;
  initialVolumeMl: number;
  concentrationMgMl: number;
}

export interface DryBatch extends BatchBase {
  form: 'dry';
  initialMassMg: number;
}

export interface OtherBatch extends BatchBase {
  form: 'other';
  initialAmount: number;
  initialUnit: string;
  normalizedMassMg?: number;
}

/** Canonical Phase 0 contract. The IndexedDB v1 `Batch` type is legacy. */
export type BatchContract = SolutionBatch | DryBatch | OtherBatch;

export type BatchMovementKind =
  | 'initial'
  | 'consume'
  | 'refill'
  | 'correction'
  | 'reverse';

export interface BatchMovement {
  id: EntityId;
  operationId: OperationId;
  batchId: EntityId;
  entryId?: EntityId;
  reversesMovementId?: EntityId;
  kind: BatchMovementKind;
  /** Signed delta: initial/refill are positive, consume is negative, correction/reverse are signed. */
  deltaMassMg?: number;
  /** Signed delta: initial/refill are positive, consume is negative, correction/reverse are signed. */
  deltaVolumeMl?: number;
  createdAt: IsoDateTime;
  revision: number;
}

export interface BatchBalance {
  remainingMassMg?: number;
  remainingVolumeMl?: number;
  remainingPercent: number;
  concentrationMgMl?: number;
}

export function assertPositiveFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive finite number`);
  }
}

export function validateBatchContract(batch: BatchContract): void {
  if (batch.revision < 0 || !Number.isInteger(batch.revision)) {
    throw new Error('revision must be a non-negative integer');
  }

  if (batch.form === 'solution') {
    assertPositiveFinite(batch.initialMassMg, 'initialMassMg');
    assertPositiveFinite(batch.initialVolumeMl, 'initialVolumeMl');
    assertPositiveFinite(batch.concentrationMgMl, 'concentrationMgMl');
    const derived = batch.initialMassMg / batch.initialVolumeMl;
    if (Math.abs(derived - batch.concentrationMgMl) > 0.001) {
      throw new Error('concentrationMgMl does not match mass / volume');
    }
  } else if (batch.form === 'dry') {
    assertPositiveFinite(batch.initialMassMg, 'initialMassMg');
  } else {
    assertPositiveFinite(batch.initialAmount, 'initialAmount');
    if (!batch.initialUnit.trim()) throw new Error('initialUnit is required');
  }
}
