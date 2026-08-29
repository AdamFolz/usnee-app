import type { ConsumptionEntry } from '../types';
import { SUBSTANCES } from '../constants/substances';

export interface CountAggregate { id: string; label: string; count: number; }
export interface SimpleStats { total: number; byDay: CountAggregate[]; bySubstance: CountAggregate[]; }
export type StatsPeriod = '7d' | '30d' | 'all';

export function filterEntriesByPeriod(entries: ConsumptionEntry[], period: StatsPeriod, now = Date.now()): ConsumptionEntry[] {
  if (period === 'all') return entries;
  const days = period === '7d' ? 7 : 30;
  const from = now - days * 24 * 60 * 60 * 1000;
  // 7d = rolling 168h, not a calendar week.
  return entries.filter((entry) => entry.timestamp >= from && entry.timestamp <= now + 5 * 60_000);
}

export function aggregateSimpleStats(entries: ConsumptionEntry[], locale = 'ru-RU'): SimpleStats {
  const dayCounts = new Map<string, number>();
  const substanceCounts = new Map<string, number>();
  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
    substanceCounts.set(entry.substanceId, (substanceCounts.get(entry.substanceId) ?? 0) + 1);
  }
  return {
    total: entries.length,
    byDay: [...dayCounts.entries()].map(([id, count]) => ({
      id,
      label: new Date(`${id}T12:00:00`).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }),
      count
    })).sort((a, b) => b.id.localeCompare(a.id)),
    bySubstance: [...substanceCounts.entries()].map(([id, count]) => ({
      id,
      label: SUBSTANCES.find((item) => item.id === id)?.name ?? entries.find((entry) => entry.substanceId === id)?.substanceName ?? id,
      count
    })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  };
}
