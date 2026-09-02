import type { BatchMovement } from '../contracts/batch';
import type { EntrySyncRecord } from '../contracts/persistence';
import type { CreateEntryOperation, OutboxOperation } from '../contracts/sync';
import type { Batch, ConsumptionEntry } from '../types';
import type { QuickRecordDraft } from '../domain/record';
import { parseRecordAmount, readInjectionSite, validateRecordDraft } from '../domain/record';
import { createEntryTransaction, reverseEntryTransaction } from '../utils/db';
import { trackEvent } from '../integrations/analytics';
import { createUuid } from '../utils/ids';

export interface PreparedRecordCommand {
  entry: ConsumptionEntry;
  operation: CreateEntryOperation;
  sync: EntrySyncRecord;
  movement?: BatchMovement;
  batchId?: string;
  expectedBatchRemaining?: number;
  nextBatchRemaining?: number;
}

export function prepareRecordCommand(draft: QuickRecordDraft, batch?: Batch | null, ids?: { entryId: string; operationId: string; movementId?: string }): PreparedRecordCommand {
  const errors = validateRecordDraft(draft, batch);
  if (errors.length) throw new Error(errors[0]);
  const amount = parseRecordAmount(draft.amountInput, draft.amountUnit, batch?.concentration);
  const entryId = ids?.entryId ?? createUuid();
  const operationId = ids?.operationId ?? createUuid();
  const now = Date.now();
  const isoNow = new Date(now).toISOString();
  const entry: ConsumptionEntry = {
    id: entryId, substanceId: draft.substanceId!, substanceName: draft.substanceName,
    methodId: draft.methodId!, methodName: draft.methodName, timestamp: draft.occurredAt,
    dose: amount.value!, doseUnit: draft.amountUnit, methodDetails: draft.methodDetails ?? {},
    notes: draft.notes, batchId: batch?.id, injectionSite: readInjectionSite(draft.methodDetails), alone: draft.alone, createdAt: now, updatedAt: now
  };
  let movement: BatchMovement | undefined;
  if (batch) {
    const consumedMass = amount.calculatedMassMg;
    if (consumedMass === undefined || !Number.isFinite(consumedMass) || consumedMass <= 0) {
      throw new Error('Не удалось рассчитать расход партии. Проверьте количество и единицы.');
    }
    movement = {
      id: ids?.movementId ?? createUuid(), operationId, batchId: batch.id, entryId,
      kind: 'consume', deltaMassMg: -consumedMass,
      deltaVolumeMl: draft.amountUnit === 'мл' ? -amount.value! : undefined, createdAt: isoNow, revision: 0
    };
  }
  const operation: CreateEntryOperation = {
    operationId, entityId: entryId, entityType: 'entry', kind: 'create', baseRevision: 0,
    payload: {
      entryId, substanceId: entry.substanceId, substanceName: entry.substanceName, methodId: entry.methodId,
      amount: { value: entry.dose, unit: entry.doseUnit, calculatedMassMg: amount.calculatedMassMg },
      occurredAt: new Date(entry.timestamp).toISOString(), alone: entry.alone, batchId: batch?.id,
      batchMovementOperationId: movement ? operationId : undefined, notes: entry.notes
    },
    createdAt: isoNow, attempts: 0
  };
  return {
    entry, operation, sync: { entityId: entryId, operationId, createOperationId: operationId, state: 'pending', revision: 0 }, movement,
    batchId: batch?.id, expectedBatchRemaining: batch?.remaining,
    nextBatchRemaining: batch && amount.calculatedMassMg !== undefined ? batch.remaining - amount.calculatedMassMg : undefined
  };
}

export async function persistPreparedRecord(command: PreparedRecordCommand) {
  const result = await createEntryTransaction(command);
  if (result === 'created') trackEvent('record_created');
  return result;
}

export async function reversePreparedRecord(command: PreparedRecordCommand) {
  const reverseId = createUuid();
  const reverseOperation: OutboxOperation = {
    operationId: reverseId, entityId: command.entry.id, entityType: 'entry', kind: 'reverse', baseRevision: 0,
    payload: { entryId: command.entry.id, createOperationId: command.operation.operationId, reason: 'user-undo' },
    createdAt: new Date().toISOString(), attempts: 0
  };
  const reverseMovement = command.movement ? {
    ...command.movement, id: createUuid(), operationId: reverseId, kind: 'reverse' as const,
    reversesMovementId: command.movement.id,
    deltaMassMg: -(command.movement.deltaMassMg ?? 0),
    deltaVolumeMl: command.movement.deltaVolumeMl === undefined ? undefined : -command.movement.deltaVolumeMl,
    createdAt: new Date().toISOString()
  } : undefined;
  return reverseEntryTransaction({ entryId: command.entry.id, reverseOperation, reverseMovement });
}
