import type { BatchMovement } from '../contracts/batch';
import type { OutboxOperation } from '../contracts/sync';
import { getBatchMovementByEntry, getEntryById, getEntrySync, reverseEntryTransaction } from '../utils/db';
import { createUuid } from '../utils/ids';

export async function reverseEntryById(entryId: string): Promise<'reversed' | 'duplicate'> {
  const entry = await getEntryById(entryId);
  if (!entry) throw new Error('ENTRY_NOT_FOUND');
  const sync = await getEntrySync(entryId);
  if (!sync) throw new Error('LEGACY_ENTRY');
  const originalMovement = await getBatchMovementByEntry(entryId);
  const operationId = createUuid();
  const reverseOperation: OutboxOperation = {
    operationId,
    entityId: entryId,
    entityType: 'entry',
    kind: 'reverse',
    baseRevision: sync.revision,
    payload: { entryId, createOperationId: sync.createOperationId ?? sync.operationId, reason: 'user-undo' },
    createdAt: new Date().toISOString(),
    attempts: 0
  };
  const reverseMovement: BatchMovement | undefined = originalMovement ? {
    ...originalMovement,
    id: createUuid(),
    operationId,
    kind: 'reverse',
    reversesMovementId: originalMovement.id,
    deltaMassMg: -(originalMovement.deltaMassMg ?? 0),
    deltaVolumeMl: originalMovement.deltaVolumeMl === undefined ? undefined : -originalMovement.deltaVolumeMl,
    createdAt: new Date().toISOString()
  } : undefined;
  return reverseEntryTransaction({ entryId, reverseOperation, reverseMovement });
}
