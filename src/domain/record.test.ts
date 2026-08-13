import { describe, expect, it } from 'vitest';
import type { ConsumptionEntry, Batch } from '../types';
import { findRecentDuplicate, normalizeAmountInput, parseRecordAmount, QuickRecordDraft, resolveRecordAmountFields, selectCompatibleBatch, validateRecordDraft } from './record';

const draft: QuickRecordDraft = { substanceId: 'meph', substanceName: 'Мефедрон', methodId: 'inject', methodName: 'Инъекция', amountInput: '1', amountUnit: 'мл', occurredAt: Date.now(), alone: true, batchId: 'b1' };
const batch: Batch = { id: 'b1', substanceId: 'meph', name: '№014', totalWeight: 400, weightUnit: 'мг', solutionVolume: 20, volumeUnit: 'мл', concentration: 20, createdAt: 1, active: true, remaining: 260 };
const entry: ConsumptionEntry = { id: 'e1', substanceId: 'meph', methodId: 'inject', timestamp: draft.occurredAt - 10 * 60_000, dose: 1, doseUnit: 'мл', methodDetails: {}, alone: true, createdAt: 1, updatedAt: 1 };

describe('record domain', () => {
  it('normalizes comma and repeated decimal separators', () => expect(normalizeAmountInput('1,2.3')).toBe('1.23'));
  it.each(['', '0', '-2'])('rejects invalid amount %s', (value) => expect(parseRecordAmount(value, 'мг').valid).toBe(false));
  it('converts grams and solution ml to mg', () => {
    expect(parseRecordAmount('1.5', 'г').calculatedMassMg).toBe(1500);
    expect(parseRecordAmount('1', 'мл', 20).calculatedMassMg).toBe(20);
  });
  it('does not invent conversion for unknown units', () => expect(parseRecordAmount('2', 'хиты').calculatedMassMg).toBeUndefined());
  it('validates compatible balance', () => expect(validateRecordDraft(draft, batch)).toEqual([]));
  it('rejects unknown units when a batch must be consumed', () => {
    expect(validateRecordDraft({ ...draft, amountUnit: 'хиты', amountInput: '2' }, batch)).toContain('Не удалось рассчитать расход партии. Проверьте количество и единицы.');
  });
  it('maps inject volume and only accepts a matching active batch', () => {
    expect(resolveRecordAmountFields('inject', { volume: 0.8 })).toEqual({ amountInput: '0.8', amountUnit: 'мл' });
    expect(selectCompatibleBatch(batch, 'meph')?.id).toBe('b1');
    expect(selectCompatibleBatch(batch, 'mdma')).toBeNull();
    expect(selectCompatibleBatch({ ...batch, active: false }, 'meph')).toBeNull();
  });
  it('rejects insufficient and incompatible batches', () => {
    expect(validateRecordDraft({ ...draft, amountInput: '20' }, batch)).toContain('В партии недостаточно остатка');
    expect(validateRecordDraft(draft, { ...batch, substanceId: 'mdma' })).toContain('Партия не подходит для выбранного вещества');
  });
  it('finds nearest duplicate inside the window', () => expect(findRecentDuplicate([entry], draft)?.entry.id).toBe('e1'));
  it('ignores different methods and old entries', () => {
    expect(findRecentDuplicate([{ ...entry, methodId: 'oral' }], draft)).toBeNull();
    expect(findRecentDuplicate([{ ...entry, timestamp: draft.occurredAt - 2 * 60 * 60_000 }], draft)).toBeNull();
  });
});
