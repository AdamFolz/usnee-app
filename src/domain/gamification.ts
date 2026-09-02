import type { ConsumptionEntry, MoodEntry, SleepEntry, Batch } from '../types';
import { cleanStreak, usageStreak } from './stats';

// ─── XP Constants ─────────────────────────────────────────────────────

export const XP = {
  /** За каждую новую запись */
  PER_ENTRY: 10,
  /** За каждую ачивку (базовые) */
  PER_ACHIEVEMENT_BASE: 25,
  /** За сложные ачивки (редкие) */
  PER_ACHIEVEMENT_RARE: 50,
  /** За очень редкие ачивки */
  PER_ACHIEVEMENT_LEGENDARY: 100,
  /** За трек настроения */
  PER_MOOD: 5,
  /** За трек сна */
  PER_SLEEP: 5,
  /** За лог воды */
  PER_WATER: 2,
  /** За день чистоты (бонус в конце дня, не за каждую запись) */
  PER_CLEAN_DAY: 5,
  /** За день с записью (streak) */
  PER_USAGE_DAY: 3,
} as const;

// ─── Level Thresholds ─────────────────────────────────────────────────

/**
 * XP needed to reach a level.
 * Formula: floor(level * 100 * (1 + level * 0.1))
 * This gives a gentle exponential curve:
 * L1: 0, L2: 110, L3: 330, L4: 660, L5: 1100, L6: 1650, ...
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(level * 100 * (1 + level * 0.1));
}

/**
 * Total XP needed to reach a level (cumulative).
 */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) {
    total += xpForLevel(l);
  }
  return total;
}

/**
 * Get level from total XP.
 */
export function levelFromXp(xp: number): number {
  let level = 1;
  let accumulated = 0;
  while (accumulated + xpForLevel(level + 1) <= xp) {
    accumulated += xpForLevel(level + 1);
    level++;
    if (level > 100) break; // safety cap
  }
  return level;
}

/**
 * XP progress within current level (0..1).
 */
export function xpProgressInLevel(xp: number): number {
  const level = levelFromXp(xp);
  const levelStart = totalXpForLevel(level);
  const levelEnd = levelStart + xpForLevel(level + 1);
  const earned = xp - levelStart;
  const needed = levelEnd - levelStart;
  return needed > 0 ? Math.min(1, earned / needed) : 1;
}

// ─── XP Calculation ──────────────────────────────────────────────────

export interface XpBreakdown {
  entriesXp: number;
  achievementsXp: number;
  moodXp: number;
  sleepXp: number;
  waterXp: number;
  streakXp: number;
  total: number;
}

export interface XpSnapshot {
  level: number;
  xpInLevel: number;
  xpProgress: number; // 0..1
  totalXp: number;
  breakdown: XpBreakdown;
}

/**
 * Calculate XP from entries count.
 * Each entry = PER_ENTRY XP.
 * Clean days in streak get bonus PER_CLEAN_DAY (once per streak day).
 */
export function xpFromEntries(entries: ConsumptionEntry[], now = Date.now()): { xp: number; cleanBonus: number; usageBonus: number } {
  const validEntries = entries.filter((e) => !e.reversedAt);
  const entriesXp = validEntries.length * XP.PER_ENTRY;
  
  const cleanDays = cleanStreak(validEntries, now);
  const usageDays = usageStreak(validEntries, now);
  
  // Clean streak bonus: once per clean day (not per entry)
  const cleanBonus = cleanDays * XP.PER_CLEAN_DAY;
  
  // Usage streak bonus: once per day with entries
  const usageBonus = usageDays * XP.PER_USAGE_DAY;
  
  return { xp: entriesXp + cleanBonus + usageBonus, cleanBonus, usageBonus };
}

/**
 * Calculate XP from moods.
 */
export function xpFromMoods(moods: MoodEntry[]): number {
  return moods.length * XP.PER_MOOD;
}

/**
 * Calculate XP from sleep logs.
 */
export function xpFromSleep(sleep: SleepEntry[]): number {
  return sleep.filter((s) => s.duration).length * XP.PER_SLEEP;
}

/**
 * Calculate XP from water logs.
 */
export function xpFromWater(water: { timestamp: number }[]): number {
  return water.length * XP.PER_WATER;
}

// ─── Achievement XP ──────────────────────────────────────────────────

const RARE_ACHIEVEMENTS = new Set([
  'still_alive',    // 5 entries/day
  'to_infinity',    // 10 entries/day
  'vampire',        // all night
  'marathon',       // 24h hourly
  'collector',      // 5 sites/day
  'pharmacist',     // batch emptied same day
]);

const LEGENDARY_ACHIEVEMENTS = new Set([
  'week_bender',    // 7-day streak — questionable honor
]);

/**
 * XP value for an achievement.
 */
export function xpForAchievement(achievementId: string): number {
  if (LEGENDARY_ACHIEVEMENTS.has(achievementId)) return XP.PER_ACHIEVEMENT_LEGENDARY;
  if (RARE_ACHIEVEMENTS.has(achievementId)) return XP.PER_ACHIEVEMENT_RARE;
  return XP.PER_ACHIEVEMENT_BASE;
}

/**
 * Calculate total XP from unlocked achievements.
 */
export function xpFromAchievements(unlockedIds: Set<string>): number {
  let total = 0;
  for (const id of unlockedIds) {
    total += xpForAchievement(id);
  }
  return total;
}

// ─── Full Snapshot ───────────────────────────────────────────────────

export interface XpInput {
  entries: ConsumptionEntry[];
  moods: MoodEntry[];
  sleep: SleepEntry[];
  water: { timestamp: number }[];
  batches?: Batch[];
  unlockedAchievements: Set<string>;
  now?: number;
}

export function calculateXpSnapshot(input: XpInput): XpSnapshot {
  const now = input.now ?? Date.now();
  
  const { xp: entriesXp, cleanBonus, usageBonus } = xpFromEntries(input.entries, now);
  const moodXp = xpFromMoods(input.moods);
  const sleepXp = xpFromSleep(input.sleep);
  const waterXp = xpFromWater(input.water);
  const achievementsXp = xpFromAchievements(input.unlockedAchievements);
  
  const total = entriesXp + moodXp + sleepXp + waterXp + achievementsXp;
  const level = levelFromXp(total);
  const xpProgress = xpProgressInLevel(total);
  const levelStart = totalXpForLevel(level);
  const xpInLevel = total - levelStart;
  
  // entriesXp already includes streak bonuses
  const breakdownTotal = entriesXp + moodXp + sleepXp + waterXp + achievementsXp;
  
  return {
    level,
    xpInLevel,
    xpProgress,
    totalXp: total,
    breakdown: {
      entriesXp,
      achievementsXp,
      moodXp,
      sleepXp,
      waterXp,
      streakXp: cleanBonus + usageBonus,
      total: breakdownTotal,
    },
  };
}

// ─── Achievement XP by Tier ──────────────────────────────────────────

export type AchievementTier = 'common' | 'rare' | 'legendary';

export function getAchievementTier(achievementId: string): AchievementTier {
  if (LEGENDARY_ACHIEVEMENTS.has(achievementId)) return 'legendary';
  if (RARE_ACHIEVEMENTS.has(achievementId)) return 'rare';
  return 'common';
}

// ─── Next Milestone ─────────────────────────────────────────────────

export interface LevelMilestone {
  level: number;
  xpNeeded: number;       // XP to reach this level
  xpRemaining: number;     // XP remaining to next level
}

export function getNextMilestone(xp: number, targetLevel: number): LevelMilestone | null {
  const currentLevel = levelFromXp(xp);
  if (currentLevel >= targetLevel) return null;
  
  const xpForTarget = totalXpForLevel(targetLevel);
  return {
    level: targetLevel,
    xpNeeded: xpForTarget,
    xpRemaining: xpForTarget - xp,
  };
}

// ─── Level Names ─────────────────────────────────────────────────────

const LEVEL_NAMES = [
  '',           // 0
  'Начинающий', // 1
  'Ученик',     // 2
  'Практик',    // 3
  'Опытный',    // 4
  'Мастер',     // 5
  'Эксперт',   // 6
  'Профессионал', // 7
  'Гуру',       // 8
  'Легенда',    // 9
  'Просветлённый', // 10+
];

export function getLevelName(level: number): string {
  if (level <= 0) return LEVEL_NAMES[1];
  if (level >= LEVEL_NAMES.length) return LEVEL_NAMES[LEVEL_NAMES.length - 1];
  return LEVEL_NAMES[level];
}
