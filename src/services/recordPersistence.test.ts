import { describe, expect, it } from 'vitest';
import type { Batch } from '../types';
import { prepareRecordCommand } from './recordPersistence';

const batch: Batch = { id: 'b1', substanceId: 'meph', name: '№014', totalWeight: 400, weightUnit: 'мг', solutionVolume: 20, volumeUnit: 'мл', concentration: 20, createdAt: 1, active: true, remaining: 260 };

describe('record command builder', () => {
  it('creates linked stable ids, payload and consumption movement', () => {
    const command = prepareRecordCommand({ substanceId: 'meph', substanceName: 'Мефедрон', methodId: 'inject', amountInput: '1', amountUnit: 'мл', occurredAt: 1000, alone: true, batchId: 'b1' }, batch, { entryId: 'e1', operationId: 'o1', movementId: 'm1' });
    expect(command.entry.id).toBe('e1'); expect(command.operation.operationId).toBe('o1'); expect(command.movement?.id).toBe('m1');
    expect(command.operation.payload.amount.calculatedMassMg).toBe(20);
    expect(command.movement?.deltaMassMg).toBe(-20); expect(command.nextBatchRemaining).toBe(240);
  });
  it('creates no movement without batch', () => { const command = prepareRecordCommand({ substanceId: 'meph', methodId: 'oral', amountInput: '10', amountUnit: 'мг', occurredAt: Date.now(), alone: false }, null, { entryId: 'e1', operationId: 'o1' }); expect(command.movement).toBeUndefined(); expect(command.operation.payload.batchId).toBeUndefined(); });
  it('rejects a batch consume when mass cannot be calculated', () => {
    expect(() => prepareRecordCommand({ substanceId: 'meph', methodId: 'inject', amountInput: '1', amountUnit: 'хиты', occurredAt: Date.now(), alone: true }, batch)).toThrow('Не удалось рассчитать расход партии');
  });
});
