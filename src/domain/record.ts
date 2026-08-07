import type { Batch, ConsumptionEntry } from '../types';

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
  return { valid: true, value, normalized, calculatedMassMg };
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
    if (amount.calculatedMassMg !== undefined && amount.calculatedMassMg > batch.remaining) errors.push('В партии недостаточно остатка');
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
