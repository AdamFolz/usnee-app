import { describe, expect, it } from 'vitest';
import type { Batch } from '../types';
import { adaptLegacyBatch, getBatchLevel } from './batchPresentation';

const batch: Batch = { id: 'b1', substanceId: 'meph', name: '№014', totalWeight: 360, weightUnit: 'мг', solutionVolume: 18, volumeUnit: 'мл', concentration: 20, createdAt: 1, active: true, remaining: 260 };

describe('batchPresentation', () => {
  it('derives solution volume, mass, concentration and percentage', () => {
    const result = adaptLegacyBatch(batch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.remainingVolumeMl).toBe(13);
    expect(result.value.remainingMassMg).toBe(260);
    expect(result.value.concentrationMgMl).toBe(20);
    expect(result.value.remainingPercent).toBeCloseTo(72.22, 1);
  });
  it.each([[20, 'low'], [9.99, 'critical'], [21, 'normal']] as const)('maps %s percent to %s', (percent, level) => expect(getBatchLevel(percent)).toBe(level));
  it('clamps percentage to 100', () => { const result = adaptLegacyBatch({ ...batch, remaining: 500 }); expect(result.ok && result.value.remainingPercent).toBe(100); });
  it.each([{ concentration: 0 }, { remaining: -1 }, { totalWeight: 0 }, { remaining: Number.NaN }])('rejects malformed batch %o', (change) => expect(adaptLegacyBatch({ ...batch, ...change }).ok).toBe(false));
});
