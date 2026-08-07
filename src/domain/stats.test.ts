import { describe, expect, it } from 'vitest';
import type { ConsumptionEntry } from '../types';
import { aggregateSimpleStats, filterEntriesByPeriod } from './stats';

function entry(id: string, substanceId: string, timestamp: number): ConsumptionEntry {
  return { id, substanceId, methodId: 'inject', timestamp, dose: 1, doseUnit: 'мл', methodDetails: {}, alone: true, createdAt: timestamp, updatedAt: timestamp };
}

describe('aggregateSimpleStats', () => {
  it('counts total, days and substances without summing incompatible doses', () => {
    const first = new Date(2026, 7, 7, 12).getTime();
    const second = new Date(2026, 7, 6, 12).getTime();
    const result = aggregateSimpleStats([entry('1', 'meph', first), entry('2', 'meph', first), entry('3', 'mdma', second)]);
    expect(result.total).toBe(3);
    expect(result.byDay.map((item) => item.count).sort()).toEqual([1, 2]);
    expect(result.bySubstance[0]).toMatchObject({ id: 'meph', label: 'Мефедрон', count: 2 });
    expect(result).not.toHaveProperty('totalDose');
  });

  it('returns empty aggregates for no entries', () => {
    expect(aggregateSimpleStats([])).toEqual({ total: 0, byDay: [], bySubstance: [] });
  });

  it('filters 7 and 30 day periods without changing all-time data', () => {
    const now = new Date(2026, 7, 30, 12).getTime();
    const recent = entry('recent', 'meph', now - 2 * 24 * 60 * 60 * 1000);
    const month = entry('month', 'mdma', now - 20 * 24 * 60 * 60 * 1000);
    const old = entry('old', 'opioid', now - 60 * 24 * 60 * 60 * 1000);
    expect(filterEntriesByPeriod([recent, month, old], '7d', now).map((item) => item.id)).toEqual(['recent']);
    expect(filterEntriesByPeriod([recent, month, old], '30d', now).map((item) => item.id)).toEqual(['recent', 'month']);
    expect(filterEntriesByPeriod([recent, month, old], 'all', now)).toHaveLength(3);
  });
});
