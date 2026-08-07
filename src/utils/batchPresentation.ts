import type { Batch } from '../types';

export type BatchLevel = 'normal' | 'low' | 'critical';

export interface BatchHeroViewModel {
  id: string;
  name: string;
  substanceId: string;
  form: 'solution';
  remainingMassMg: number;
  remainingVolumeMl: number;
  concentrationMgMl: number;
  remainingPercent: number;
  level: BatchLevel;
}

export type BatchPresentationResult =
  | { ok: true; value: BatchHeroViewModel }
  | { ok: false; reason: 'invalid-batch-data' };

export function getBatchLevel(percent: number): BatchLevel {
  if (percent < 10) return 'critical';
  if (percent <= 20) return 'low';
  return 'normal';
}

export function adaptLegacyBatch(batch: Batch): BatchPresentationResult {
  const values = [batch.remaining, batch.totalWeight, batch.concentration];
  if (values.some((value) => !Number.isFinite(value)) || batch.remaining < 0 || batch.totalWeight <= 0 || batch.concentration <= 0) {
    return { ok: false, reason: 'invalid-batch-data' };
  }

  const remainingPercent = Math.min(100, Math.max(0, (batch.remaining / batch.totalWeight) * 100));
  return {
    ok: true,
    value: {
      id: batch.id,
      name: batch.name,
      substanceId: batch.substanceId,
      form: 'solution',
      remainingMassMg: batch.remaining,
      remainingVolumeMl: batch.remaining / batch.concentration,
      concentrationMgMl: batch.concentration,
      remainingPercent,
      level: getBatchLevel(remainingPercent)
    }
  };
}

export function formatAmount(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits, minimumFractionDigits: 0 }).format(value);
}
