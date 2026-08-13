import type { Batch, ConsumptionEntry, LastRecordContext } from '../types';

export interface QuickRecordDraft {
  substanceId: string | null;
  substanceName?: string;
  methodId: string | null;
  methodName?: string;
  amountInput: string;
  amountUnit: string;
  occurredAt: number;
  alone: boolean;
  batchId?: string;
  notes?: string;
  methodDetails?: Record<string, unknown>;
}

export interface AmountResult {
  valid: boolean;
  value?: number;
  normalized?: string;
  calculatedMassMg?: number;
  error?: string;
}

export function normalizeAmountInput(input: string): string {
  const normalized = input.replace(',', '.').replace(/[^\d.]/g, '');
  const [whole = '', ...fractions] = normalized.split('.');
  return fractions.length ? `${whole}.${fractions.join('')}` : whole;
}

export function parseRecordAmount(input: string, unit: string, concentrationMgMl?: number): AmountResult {
  if (input.trim().startsWith('-')) return { valid: false, error: 'Введите количество больше нуля' };
  const normalized = normalizeAmountInput(input);
  const value = Number(normalized);
  if (!normalized || !Number.isFinite(value) || value <= 0) return { valid: false, error: 'Введите количество больше нуля' };
  let calculatedMassMg: number | undefined;
  if (unit === 'г') calculatedMassMg = value * 1000;
  else if (unit === 'мг') calculatedMassMg = value;
  else if (unit === 'мл' && concentrationMgMl && concentrationMgMl > 0) calculatedMassMg = value * concentrationMgMl;
  if (calculatedMassMg !== undefined && (!Number.isFinite(calculatedMassMg) || calculatedMassMg <= 0)) {
    return { valid: false, error: 'Не удалось рассчитать расход. Проверьте количество и единицы.' };
  }
  return { valid: true, value, normalized, calculatedMassMg };
}

export function resolveRecordAmountFields(
  methodId: string,
  methodDetails: Record<string, unknown>
): { amountInput: string; amountUnit: string } {
  if (methodId === 'inject') {
    const volume = methodDetails.volume;
    return { amountInput: volume === undefined || volume === null ? '' : String(volume), amountUnit: 'мл' };
  }
  const dose = methodDetails.dose;
  return {
    amountInput: dose === undefined || dose === null ? '' : String(dose),
    amountUnit: String(methodDetails.doseUnit ?? 'мг')
  };
}

export function selectCompatibleBatch(
  batch: Batch | null | undefined,
  substanceId: string | null,
  requestedBatchId?: string
): Batch | null {
  if (!batch || !substanceId || !batch.active || batch.substanceId !== substanceId) return null;
  if (requestedBatchId && requestedBatchId !== batch.id) return null;
  return batch;
}

export function readInjectionSite(methodDetails?: Record<string, unknown>, fallback?: string): string | undefined {
  if (typeof methodDetails?.site === 'string' && methodDetails.site.trim()) return methodDetails.site;
  if (fallback?.trim()) return fallback;
  return undefined;
}

export function buildLastRecordContext(input: {
  substanceId: string;
  substanceName?: string;
  methodId: string;
  methodName?: string;
  amountUnit: string;
  batchId?: string;
  methodDetails?: Record<string, unknown>;
  injectionSite?: string;
}): LastRecordContext {
  return {
    substanceId: input.substanceId,
    substanceName: input.substanceName,
    methodId: input.methodId,
    methodName: input.methodName,
    amountUnit: input.amountUnit,
    batchId: input.batchId,
    injectionSite: readInjectionSite(input.methodDetails, input.injectionSite)
  };
}

export function validateRecordDraft(draft: QuickRecordDraft, batch?: Batch | null): string[] {
  const errors: string[] = [];
  if (!draft.substanceId) errors.push('Выберите вещество');
  if (!draft.methodId) errors.push('Выберите способ');
  const amount = parseRecordAmount(draft.amountInput, draft.amountUnit, batch?.concentration);
  if (!amount.valid) errors.push(amount.error!);
  if (!Number.isFinite(draft.occurredAt) || draft.occurredAt > Date.now() + 5 * 60_000) errors.push('Проверьте время записи');
  if (batch) {
    if (!batch.active || batch.substanceId !== draft.substanceId) errors.push('Партия не подходит для выбранного вещества');
    if (!Number.isFinite(batch.concentration) || batch.concentration <= 0 || batch.remaining < 0) errors.push('Данные партии повреждены');
    if (amount.calculatedMassMg === undefined || !Number.isFinite(amount.calculatedMassMg) || amount.calculatedMassMg <= 0) {
      errors.push('Не удалось рассчитать расход партии. Проверьте количество и единицы.');
    } else if (amount.calculatedMassMg > batch.remaining) {
      errors.push('В партии недостаточно остатка');
    }
  }
  return [...new Set(errors)];
}

export function findRecentDuplicate(entries: ConsumptionEntry[], draft: QuickRecordDraft, windowMs = 60 * 60 * 1000) {
  return entries
    .filter((entry) => entry.substanceId === draft.substanceId && entry.methodId === draft.methodId)
    .map((entry) => ({ entry, diff: Math.abs(entry.timestamp - draft.occurredAt) }))
    .filter(({ diff }) => diff <= windowMs)
    .sort((a, b) => a.diff - b.diff)[0] ?? null;
}
