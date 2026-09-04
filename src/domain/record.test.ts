import { describe, expect, it } from 'vitest';
import type { ConsumptionEntry, Batch, LastRecordContext } from '../types';
import { findRecentDuplicate, normalizeAmountInput, parseRecordAmount, QuickRecordDraft, buildLastRecordContext, lastRecordContextFromEntry, resolveQuickRecordDefaults, resolveRecordAmountFields, selectCompatibleBatch, validateRecordDraft } from './record';

const draft: QuickRecordDraft = { substanceId: 'meph', substanceName: 'Мефедрон', methodId: 'inject', methodName: 'Инъекция', amountInput: '1', amountUnit: 'мл', occurredAt: Date.now(), alone: true, batchId: 'b1' };
const batch: Batch = { id: 'b1', substanceId: 'meph', name: '№014', totalWeight: 400, weightUnit: 'мг', solutionVolume: 20, volumeUnit: 'мл', concentration: 20, createdAt: 1, active: true, remaining: 260 };
const entry: ConsumptionEntry = { id: 'e1', substanceId: 'meph', methodId: 'inject', timestamp: draft.occurredAt - 10 * 60_000, dose: 1, doseUnit: 'мл', methodDetails: {}, alone: true, createdAt: 1, updatedAt: 1 };

describe('record domain', () => {
  it('normalizes comma and repeated decimal separators', () => expect(normalizeAmountInput('1,2.3')).toBe('1.23'));
  it('keeps scientific notation intact (BUG-004: 1e5 must not become 15)', () => expect(normalizeAmountInput('1e5')).toBe('1e5'));
  it('keeps leading minus intact so validation can reject it (BUG-004: -10 must not become 10)', () => expect(normalizeAmountInput('-10')).toBe('-10'));
  it.each(['', '0', '-2'])('rejects invalid amount %s', (value) => expect(parseRecordAmount(value, 'мг').valid).toBe(false));
  it('converts grams and solution ml to mg', () => {
    expect(parseRecordAmount('1.5', 'г').calculatedMassMg).toBe(1500);
    expect(parseRecordAmount('1', 'мл', 20).calculatedMassMg).toBe(20);
  });
  it('does not invent conversion for unknown units', () => expect(parseRecordAmount('2', 'хиты').calculatedMassMg).toBeUndefined());
  it('validates compatible balance', () => expect(validateRecordDraft(draft, batch)).toEqual([]));
  it('rejects unknown units when a batch must be consumed', () => {
    expect(validateRecordDraft({ ...draft, amountUnit: 'хиты', amountInput: '2' }, batch)).toContain('Не удалось рассчитать расход партии. Проверь количество и единицы.');
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
  it('builds last record context from site details without requiring a schema bump', () => {
    expect(buildLastRecordContext({
      substanceId: 'meph',
      substanceName: 'Мефедрон',
      methodId: 'inject',
      methodName: 'Инъекция',
      amountUnit: 'мл',
      batchId: 'b1',
      methodDetails: { site: 'Вена локтя' }
    })).toEqual({
      substanceId: 'meph',
      substanceName: 'Мефедрон',
      methodId: 'inject',
      methodName: 'Инъекция',
      amountUnit: 'мл',
      batchId: 'b1',
      injectionSite: 'Вена локтя'
    });
  });
});

const lastEntry = (over: Partial<ConsumptionEntry> = {}): ConsumptionEntry => ({
  id: 'e9', substanceId: 'meph', substanceName: 'Мефедрон', methodId: 'sniff', methodName: 'Интраназально',
  timestamp: 1000, dose: 100, doseUnit: 'мг', methodDetails: {}, alone: true, createdAt: 1, updatedAt: 1, ...over
});
const context: LastRecordContext = { substanceId: 'meph', substanceName: 'Мефедрон', methodId: 'sniff', methodName: 'Интраназально', amountUnit: 'мг' };

describe('resolveQuickRecordDefaults', () => {
  it('prefills dose and unit as a pair from the last entry when it matches the context', () => {
    const { draft } = resolveQuickRecordDefaults({}, context, lastEntry(), null);
    expect(draft.amountInput).toBe('100');
    expect(draft.amountUnit).toBe('мг');
  });

  it('never mixes a dose from the last entry with a unit from a stale context', () => {
    // Контекст от удалённой записи (меф, интраназально, мг), последняя живая — инъекция 0.5 мл.
    const staleContext: LastRecordContext = { ...context, methodId: 'sniff', methodName: 'Интраназально' };
    const last = lastEntry({ methodId: 'inject', methodName: 'Инъекция', dose: 0.5, doseUnit: 'мл' });
    const { draft } = resolveQuickRecordDefaults({}, staleContext, last, null);
    expect(draft.methodId).toBe('sniff');
    expect(draft.amountInput).toBe('');
    expect(draft.amountUnit).toBe('мг');
  });

  it('prefills from the last entry only when there is no context', () => {
    const { draft } = resolveQuickRecordDefaults({}, null, lastEntry({ methodId: 'inject', methodName: 'Инъекция', dose: 0.5, doseUnit: 'мл' }), null);
    expect(draft.substanceId).toBe('meph');
    expect(draft.methodId).toBe('inject');
    expect(draft.amountInput).toBe('0.5');
    expect(draft.amountUnit).toBe('мл');
  });

  it('does not prefill a zero dose', () => {
    const { draft } = resolveQuickRecordDefaults({}, null, lastEntry({ dose: 0 }), null);
    expect(draft.amountInput).toBe('');
  });

  it('knows the naive unit fallback stays consistent with the resolved method', () => {
    const { draft } = resolveQuickRecordDefaults({}, null, undefined, null);
    expect(draft.amountUnit).toBe('мг');
    expect(draft.substanceId).toBeNull();
  });

  it('lets explicit route values override any prefill', () => {
    const { draft } = resolveQuickRecordDefaults({ amountInput: '2', amountUnit: 'г' }, context, lastEntry(), null);
    expect(draft.amountInput).toBe('2');
    expect(draft.amountUnit).toBe('г');
  });

  it('links only an active batch of the same substance', () => {
    const active: Batch = { ...batch, id: 'b2' };
    expect(resolveQuickRecordDefaults({}, context, lastEntry(), active).batch?.id).toBe('b2');
    expect(resolveQuickRecordDefaults({}, context, lastEntry(), { ...active, substanceId: 'mdma' }).batch).toBeNull();
    expect(resolveQuickRecordDefaults({ batchId: 'zzz' }, context, lastEntry(), active).batch).toBeNull();
  });

  it('carries the injection site into method details', () => {
    const { draft } = resolveQuickRecordDefaults({}, { ...context, injectionSite: 'Вена локтя' }, lastEntry(), null);
    expect(draft.methodDetails).toEqual({ site: 'Вена локтя' });
  });
});

describe('lastRecordContextFromEntry', () => {
  it('returns null when there is no entry', () => expect(lastRecordContextFromEntry(null)).toBeNull());
  it('rebuilds context from a surviving entry', () => {
    expect(lastRecordContextFromEntry(lastEntry({ methodDetails: { site: 'Вена локтя' } }))).toEqual({
      substanceId: 'meph',
      substanceName: 'Мефедрон',
      methodId: 'sniff',
      methodName: 'Интраназально',
      amountUnit: 'мг',
      injectionSite: 'Вена локтя'
    });
  });
});
