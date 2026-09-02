import { describe, expect, it } from 'vitest';
import type { ConsumptionEntry, Batch } from '../types';
import { startOfDay } from '../utils/date';
import {
  aggregateSimpleStats,
  filterEntriesByPeriod,
  usageStreak,
  maxUsageStreak,
  cleanStreak,
  doseToMg,
  aggregateDoseSummary,
  buildHeatmap,
  getCalendarWeekEntries,
} from './stats';

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

const DAY = 24 * 60 * 60 * 1000;

describe('usageStreak', () => {
  it('counts consecutive days with entries up to today', () => {
    const now = new Date(2026, 8, 2, 18).getTime();
    const e1 = entry('1', 'meph', now);
    const e2 = entry('2', 'meph', now - DAY);
    const e3 = entry('3', 'meph', now - 2 * DAY);
    expect(usageStreak([e1, e2, e3], now)).toBe(3);
  });

  it('counts from yesterday when today is empty (streak survives midnight)', () => {
    const now = new Date(2026, 8, 2, 18).getTime();
    const e1 = entry('1', 'meph', now - DAY);
    const e2 = entry('2', 'meph', now - 2 * DAY);
    expect(usageStreak([e1, e2], now)).toBe(2);
  });

  it('returns 0 when both today and yesterday are empty', () => {
    const now = new Date(2026, 8, 2, 18).getTime();
    const e1 = entry('1', 'meph', now - 3 * DAY);
    expect(usageStreak([e1], now)).toBe(0);
  });

  it('returns 0 for empty entries', () => {
    expect(usageStreak([], Date.now())).toBe(0);
  });
});

describe('maxUsageStreak', () => {
  it('finds the longest run of consecutive days', () => {
    const now = new Date(2026, 8, 2, 18).getTime();
    const e1 = entry('1', 'meph', now);
    const e2 = entry('2', 'meph', now - DAY);
    const e3 = entry('3', 'meph', now - 2 * DAY);
    const e4 = entry('4', 'meph', now - 5 * DAY); // gap
    expect(maxUsageStreak([e1, e2, e3, e4])).toBe(3);
  });

  it('returns 0 for empty', () => {
    expect(maxUsageStreak([])).toBe(0);
  });
});

describe('cleanStreak', () => {
  it('counts clean days from today backwards', () => {
    const now = new Date(2026, 8, 2, 18).getTime();
    const e1 = entry('1', 'meph', now - 3 * DAY); // 3 days ago
    expect(cleanStreak([e1], now)).toBe(3); // today, yesterday, day-before = 3 clean
  });

  it('returns 0 when today has an entry', () => {
    const now = new Date(2026, 8, 2, 18).getTime();
    expect(cleanStreak([entry('1', 'meph', now)], now)).toBe(0);
  });

  it('returns 0 for empty entries (no data = no clean streak)', () => {
    expect(cleanStreak([], Date.now())).toBe(0);
  });
});

describe('doseToMg', () => {
  it('converts mg directly', () => {
    expect(doseToMg(50, 'мг')).toBe(50);
    expect(doseToMg(50, 'mg')).toBe(50);
  });

  it('converts grams to mg', () => {
    expect(doseToMg(0.5, 'г')).toBe(500);
    expect(doseToMg(1, 'g')).toBe(1000);
  });

  it('converts ml via concentration', () => {
    expect(doseToMg(2, 'мл', 20)).toBe(40);
    expect(doseToMg(0.5, 'ml', 20)).toBe(10);
  });

  it('returns undefined for ml without concentration', () => {
    expect(doseToMg(2, 'мл')).toBeUndefined();
  });

  it('returns undefined for unknown units', () => {
    expect(doseToMg(5, 'шт')).toBeUndefined();
  });
});

describe('aggregateDoseSummary', () => {
  it('sums mg per substance when convertible, marks undefined when not', () => {
    const ts = Date.now();
    const entries: ConsumptionEntry[] = [
      { id: 'a', substanceId: 'meph', methodId: 'inject', timestamp: ts, dose: 2, doseUnit: 'мл', methodDetails: {}, alone: true, batchId: 'b1', createdAt: ts, updatedAt: ts },
      { id: 'b', substanceId: 'meph', methodId: 'inject', timestamp: ts, dose: 1, doseUnit: 'мл', methodDetails: {}, alone: true, batchId: 'b1', createdAt: ts, updatedAt: ts },
      { id: 'c', substanceId: 'meph', methodId: 'snort', timestamp: ts, dose: 100, doseUnit: 'мг', methodDetails: {}, alone: true, createdAt: ts, updatedAt: ts },
    ];
    const batches: Batch[] = [
      { id: 'b1', substanceId: 'meph', name: '№1', totalWeight: 1000, weightUnit: 'мг', solutionVolume: 50, volumeUnit: 'мл', concentration: 20, createdAt: ts, active: true, remaining: 500 } as unknown as Batch,
    ];
    const result = aggregateDoseSummary(entries, batches);
    const meph = result.bySubstance.find((s) => s.substanceId === 'meph');
    expect(meph?.count).toBe(3);
    expect(meph?.totalMg).toBe(40 + 20 + 100); // 2ml*20 + 1ml*20 + 100mg
  });

  it('marks totalMg undefined when any entry is unconvertible', () => {
    const ts = Date.now();
    const entries: ConsumptionEntry[] = [
      { id: 'a', substanceId: 'meph', methodId: 'inject', timestamp: ts, dose: 2, doseUnit: 'мл', methodDetails: {}, alone: true, createdAt: ts, updatedAt: ts }, // no batch → no concentration
    ];
    const result = aggregateDoseSummary(entries, []);
    const meph = result.bySubstance.find((s) => s.substanceId === 'meph');
    expect(meph?.totalMg).toBeUndefined();
    expect(meph?.count).toBe(1);
  });

  it('computes share as count/total', () => {
    const ts = Date.now();
    const entries: ConsumptionEntry[] = [
      entry('1', 'meph', ts),
      entry('2', 'meph', ts),
      entry('3', 'mdma', ts),
    ];
    const result = aggregateDoseSummary(entries, []);
    const meph = result.bySubstance.find((s) => s.substanceId === 'meph');
    expect(meph?.share).toBeCloseTo(2 / 3);
  });
});

describe('buildHeatmap', () => {
  it('builds cells for each day in range with correct counts', () => {
    const now = new Date(2026, 8, 2, 18).getTime();
    const e1 = entry('1', 'meph', now);
    const e2 = entry('2', 'meph', now);
    const e3 = entry('3', 'meph', now - DAY);
    const heatmap = buildHeatmap([e1, e2, e3], 7, now);
    expect(heatmap.maxCount).toBe(2);
    const todayDay = startOfDay(now);
    const todayCell = heatmap.cells.find((c) => c.date === todayDay);
    expect(todayCell?.count).toBe(2);
    expect(todayCell?.intensity).toBeGreaterThan(0);
  });

  it('assigns intensity 0 for empty days', () => {
    const now = new Date(2026, 8, 2, 18).getTime();
    const heatmap = buildHeatmap([], 7, now);
    expect(heatmap.cells.every((c) => c.intensity === 0)).toBe(true);
  });

  it('pads to week boundaries (starts on Monday)', () => {
    const now = new Date(2026, 8, 2, 18).getTime(); // Wednesday
    const heatmap = buildHeatmap([], 14, now);
    // Sept 2 2026 is Wednesday → padded start should be Monday Aug 31
    const firstDate = new Date(heatmap.cells[0].date);
    expect(firstDate.getDay()).toBe(1); // Monday
  });
});

describe('getCalendarWeekEntries', () => {
  it('returns only entries in current calendar week (Mon-Sun)', () => {
    const wednesday = new Date(2026, 8, 2, 18).getTime(); // Wed Sep 2
    const monday = new Date(2026, 7, 31, 12).getTime(); // Mon Aug 31
    const lastSunday = new Date(2026, 7, 30, 12).getTime(); // Sun Aug 30 (prev week)
    const nextMonday = new Date(2026, 8, 7, 12).getTime(); // Mon Sep 7 (next week)
    const entries = [
      entry('1', 'meph', monday),
      entry('2', 'meph', wednesday),
      entry('3', 'meph', lastSunday),
      entry('4', 'meph', nextMonday),
    ];
    const weekEntries = getCalendarWeekEntries(entries, wednesday);
    expect(weekEntries.map((e) => e.id).sort()).toEqual(['1', '2']);
  });
});
