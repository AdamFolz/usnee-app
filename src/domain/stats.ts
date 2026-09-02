import type { ConsumptionEntry, Batch } from '../types';
import { SUBSTANCES } from '../constants/substances';
import { METHODS } from '../constants/methods';
import { startOfDay } from '../utils/date';

const DAY = 24 * 60 * 60 * 1000;

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

// ─── Canonical streak functions ───────────────────────────────────────

/** Текущая серия дней подряд с хотя бы одной записью. Сегодня пусто — серия считает со вчера (не обнуляется в полночь). */
export function usageStreak(entries: ConsumptionEntry[], now = Date.now()): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map((entry) => startOfDay(entry.timestamp)));
  let streak = 0;
  let check = startOfDay(now);
  if (!days.has(check)) check -= DAY; // сегодня пусто — начинаем со вчера
  while (days.has(check)) {
    streak++;
    check -= DAY;
  }
  return streak;
}

/** Максимальная серия дней подряд с хотя бы одной записью за всё время. */
export function maxUsageStreak(entries: ConsumptionEntry[]): number {
  if (entries.length === 0) return 0;
  const sortedDays = Array.from(new Set(entries.map((entry) => startOfDay(entry.timestamp)))).sort((a, b) => a - b);
  let maxStreak = 0;
  let streak = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0 || sortedDays[i] - sortedDays[i - 1] === DAY) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }
  return maxStreak;
}

/** Текущая серия чистых дней (без записей) до сегодня. 0 если сегодня есть запись. */
export function cleanStreak(entries: ConsumptionEntry[], now = Date.now()): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map((entry) => startOfDay(entry.timestamp)));
  let streak = 0;
  let check = startOfDay(now);
  while (!days.has(check)) {
    streak++;
    check -= DAY;
  }
  return streak;
}

// ─── Dose sums (mg only, honest) ──────────────────────────────────────

export interface DoseSumBySubstance {
  substanceId: string;
  label: string;
  count: number;
  /** Сумма в мг. Для мл — через batch.concentration; если нет — undefined (не суммируем). */
  totalMg?: number;
  /** Доля в общем количестве записей, 0..1. */
  share: number;
}

export interface DoseSummary {
  totalEntries: number;
  bySubstance: DoseSumBySubstance[];
  byMethod: { methodId: string; label: string; count: number }[];
}

/** Перевести дозу в мг. г/мг — тривиально; мл — через concentration. Невозможно → undefined. */
export function doseToMg(
  dose: number,
  unit: string,
  concentration?: number
): number | undefined {
  if (unit === 'мг' || unit === 'mg') return dose;
  if (unit === 'г' || unit === 'g') return dose * 1000;
  if ((unit === 'мл' || unit === 'ml') && typeof concentration === 'number' && concentration > 0) {
    return dose * concentration;
  }
  return undefined;
}

export function aggregateDoseSummary(
  entries: ConsumptionEntry[],
  batches: Batch[] = []
): DoseSummary {
  const total = entries.length;
  const batchById = new Map(batches.map((b) => [b.id, b]));
  const substanceMap = new Map<string, { count: number; totalMg: number; hasMg: boolean }>();
  const methodMap = new Map<string, { count: number }>();

  for (const entry of entries) {
    const sub = substanceMap.get(entry.substanceId) ?? { count: 0, totalMg: 0, hasMg: true };
    sub.count++;
    const batch = entry.batchId ? batchById.get(entry.batchId) : undefined;
    const mg = doseToMg(entry.dose, entry.doseUnit, batch?.concentration);
    if (mg === undefined) {
      sub.hasMg = false;
    } else {
      sub.totalMg += mg;
    }
    substanceMap.set(entry.substanceId, sub);

    const m = methodMap.get(entry.methodId) ?? { count: 0 };
    m.count++;
    methodMap.set(entry.methodId, m);
  }

  const bySubstance: DoseSumBySubstance[] = [...substanceMap.entries()].map(([id, data]) => ({
    substanceId: id,
    label: SUBSTANCES.find((item) => item.id === id)?.name ?? entries.find((e) => e.substanceId === id)?.substanceName ?? id,
    count: data.count,
    totalMg: data.hasMg ? data.totalMg : undefined,
    share: total > 0 ? data.count / total : 0,
  })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const byMethod = [...methodMap.entries()].map(([id, data]) => ({
    methodId: id,
    label: METHODS.find((m) => m.id === id)?.name ?? id,
    count: data.count,
  })).sort((a, b) => b.count - a.count);

  return { totalEntries: total, bySubstance, byMethod };
}

// ─── Heatmap (calendar) ──────────────────────────────────────────────

export interface HeatmapCell {
  date: number; // startOfDay timestamp
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4; // 0 = no entries, 1-4 = quartile-based
}

export interface HeatmapData {
  cells: HeatmapCell[];
  maxCount: number;
  /** Сколько недель влезает в диапазон. */
  weeks: number;
}

/** Построить heatmap-сетку для N последних дней, сгруппированных по неделям (пн–вс). */
export function buildHeatmap(
  entries: ConsumptionEntry[],
  days: number,
  now = Date.now()
): HeatmapData {
  const today = startOfDay(now);
  const start = today - (days - 1) * DAY;
  const dayCounts = new Map<number, number>();
  for (const entry of entries) {
    const day = startOfDay(entry.timestamp);
    if (day < start || day > today) continue;
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  const counts = [...dayCounts.values()];
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;

  // Intensity thresholds: 0=none, 1=low, 2=mid, 3=high, 4=max
  const threshold1 = Math.max(1, Math.ceil(maxCount * 0.25));
  const threshold2 = Math.max(2, Math.ceil(maxCount * 0.5));
  const threshold3 = Math.max(3, Math.ceil(maxCount * 0.75));

  function intensity(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    if (count >= threshold3) return 4;
    if (count >= threshold2) return 3;
    if (count >= threshold1) return 2;
    return 1;
  }

  const cells: HeatmapCell[] = [];
  for (let d = start; d <= today; d += DAY) {
    const count = dayCounts.get(d) ?? 0;
    cells.push({ date: d, count, intensity: intensity(count) });
  }

  // Align to weeks: pad start backwards to Monday
  const startWeekday = new Date(start).getDay() || 7; // 1=Mon..7=Sun
  const padStart = start - (startWeekday - 1) * DAY;
  const totalDays = Math.round((today - padStart) / DAY) + 1;
  const weeks = Math.ceil(totalDays / 7);

  // Pad cells with empty days at beginning
  const padded: HeatmapCell[] = [];
  for (let d = padStart; d < start; d += DAY) {
    padded.push({ date: d, count: 0, intensity: 0 });
  }
  padded.push(...cells);

  return { cells: padded, maxCount, weeks };
}

// ─── Calendar week count (for WeeklySummaryCard) ─────────────────────

/** Подсчитать записи за текущую календарную неделю (пн–вс) — не rolling 168h. */
export function getCalendarWeekEntries(
  entries: ConsumptionEntry[],
  now = Date.now()
): ConsumptionEntry[] {
  const today = new Date(now);
  const weekday = today.getDay() || 7; // 1=Mon..7=Sun
  const monday = startOfDay(now) - (weekday - 1) * DAY;
  const sunday = monday + 6 * DAY;
  return entries.filter((entry) => {
    const day = startOfDay(entry.timestamp);
    return day >= monday && day <= sunday;
  });
}
