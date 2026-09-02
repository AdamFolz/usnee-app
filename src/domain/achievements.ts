import type { Batch, ConsumptionEntry, WaterEntry } from '../types';
import { startOfDay } from '../utils/date';
import { readInjectionSite } from './record';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function evaluateUnlockedAchievements(input: {
  entries: ConsumptionEntry[];
  water?: WaterEntry[];
  batches?: Batch[];
  now?: number;
}): Set<string> {
  const now = input.now ?? Date.now();
  const entries = input.entries
    .filter((entry) => !entry.reversedAt)
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  const water = input.water ?? [];
  const batches = input.batches ?? [];
  const unlocked = new Set<string>();
  const times = entries.map((entry) => entry.timestamp);

  if (entries.length >= 1) unlocked.add('first');
  if (entries.some((entry) => new Date(entry.timestamp).getHours() === 3)) unlocked.add('night_owl');
  if (entries.filter((entry) => entry.alone).length >= 3) unlocked.add('lone_wolf');
  if (new Set(entries.map((entry) => entry.substanceId)).size >= 5) unlocked.add('chemist');
  if (entries.some((entry) => (entry.pulse || 0) >= 140)) unlocked.add('pulse_racer');
  if (entries.some((entry) => entry.fentanylTestResult === 'negative')) unlocked.add('fentanyl_slayer');
  if (entries.some((entry) => entry.missedShot)) unlocked.add('missed_shot');

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
  if (maxStreak >= 7) unlocked.add('week_bender');
  if (calculateCleanStreak(entries, now) >= 7) unlocked.add('clean_7');
  if (water.length > 0 && entries.length >= 3) unlocked.add('hydrated');

  if (maxCountInWindow(times, DAY) >= 5) unlocked.add('still_alive');
  if (maxCountInWindow(times.filter(isNight), DAY) >= 3) unlocked.add('work_tomorrow');
  if (hasCloseConsecutivePair(times, HOUR)) unlocked.add('barely_breathing');
  if (maxCountInWindow(times, DAY) >= 10) unlocked.add('to_infinity');
  if (hasAllNightWindow(entries)) unlocked.add('vampire');
  if (maxCountInWindow(times, HOUR) >= 3) unlocked.add('speedrun');
  if (hasHourRun(times, 24)) unlocked.add('marathon');
  if (maxDistinctSitesInWindow(entries, DAY) >= 5) unlocked.add('collector');
  if (hasSameDayEmptiedBatch(batches, entries, now)) unlocked.add('pharmacist');
  if (batches.length >= 1) unlocked.add('architect');
  if (entries.filter(hasDiarySignal).length >= 3) unlocked.add('diary');

  return unlocked;
}

function calculateCleanStreak(entries: ConsumptionEntry[], now: number): number {
  if (entries.length === 0) return 0;
  const today = startOfDay(now);
  const days = new Set(entries.map((entry) => startOfDay(entry.timestamp)));
  let streak = 0;
  let check = today;
  while (!days.has(check)) {
    streak++;
    check -= DAY;
  }
  return streak;
}

function isNight(ts: number): boolean {
  return new Date(ts).getHours() < 6;
}

function maxCountInWindow(times: number[], windowMs: number): number {
  let left = 0;
  let best = 0;
  for (let right = 0; right < times.length; right++) {
    while (times[right] - times[left] >= windowMs) left++;
    best = Math.max(best, right - left + 1);
  }
  return best;
}

function hasCloseConsecutivePair(times: number[], limitMs: number): boolean {
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] < limitMs) return true;
  }
  return false;
}

function hasAllNightWindow(entries: ConsumptionEntry[]): boolean {
  let left = 0;
  for (let right = 0; right < entries.length; right++) {
    while (entries[right].timestamp - entries[left].timestamp >= DAY) left++;
    let allNight = true;
    for (let i = left; i <= right; i++) {
      if (!isNight(entries[i].timestamp)) {
        allNight = false;
        break;
      }
    }
    if (allNight && right >= left) return true;
  }
  return false;
}

function hourStart(ts: number): number {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  d.setMilliseconds(0);
  return d.getTime();
}

function hasHourRun(times: number[], needed: number): boolean {
  const hours = Array.from(new Set(times.map(hourStart))).sort((a, b) => a - b);
  let run = 0;
  for (let i = 0; i < hours.length; i++) {
    if (i === 0 || hours[i] - hours[i - 1] === HOUR) run++;
    else run = 1;
    if (run >= needed) return true;
  }
  return false;
}

function maxDistinctSitesInWindow(entries: ConsumptionEntry[], windowMs: number): number {
  const sites = entries.map((entry) => readInjectionSite(entry.methodDetails, entry.injectionSite));
  const counts = new Map<string, number>();
  let left = 0;
  let best = 0;
  for (let right = 0; right < entries.length; right++) {
    const site = sites[right];
    if (site) counts.set(site, (counts.get(site) ?? 0) + 1);
    while (entries[right].timestamp - entries[left].timestamp >= windowMs) {
      const old = sites[left];
      if (old) {
        const next = (counts.get(old) ?? 1) - 1;
        if (next <= 0) counts.delete(old);
        else counts.set(old, next);
      }
      left++;
    }
    best = Math.max(best, counts.size);
  }
  return best;
}

function hasSameDayEmptiedBatch(batches: Batch[], entries: ConsumptionEntry[], now: number): boolean {
  return batches.some((batch) => {
    if (batch.remaining > 0) return false;
    const related = entries.filter((entry) => entry.batchId === batch.id);
    const emptiedAt = related.length ? related[related.length - 1].timestamp : now;
    return startOfDay(batch.createdAt) === startOfDay(emptiedAt);
  });
}

function hasDiarySignal(entry: ConsumptionEntry): boolean {
  return Boolean(entry.notes?.trim() || entry.triggerId?.trim() || entry.customTrigger?.trim());
}
