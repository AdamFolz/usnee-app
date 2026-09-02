import { describe, expect, it } from 'vitest';
import {
  xpForLevel,
  totalXpForLevel,
  levelFromXp,
  xpProgressInLevel,
  xpForAchievement,
  xpFromAchievements,
  xpFromEntries,
  xpFromMoods,
  xpFromSleep,
  xpFromWater,
  calculateXpSnapshot,
  getAchievementTier,
  getNextMilestone,
  getLevelName,
} from './gamification';
import type { ConsumptionEntry } from '../types';

const DAY = 24 * 60 * 60 * 1000;

function makeEntry(id: string, daysAgo: number): ConsumptionEntry {
  return {
    id,
    substanceId: 'test',
    methodId: 'inject',
    timestamp: Date.now() - daysAgo * DAY,
    dose: 1,
    doseUnit: 'мл',
    methodDetails: {},
    alone: false,
    createdAt: Date.now() - daysAgo * DAY,
    updatedAt: Date.now() - daysAgo * DAY,
  };
}

describe('xpForLevel', () => {
  it('level 1 requires 0 XP', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('level 2 requires 240 XP (floor(2 * 100 * 1.2))', () => {
    expect(xpForLevel(2)).toBe(240);
  });

  it('level 3 requires 390 XP (floor(3 * 100 * 1.3))', () => {
    expect(xpForLevel(3)).toBe(390);
  });
});

describe('totalXpForLevel', () => {
  it('level 1 total = 0', () => {
    expect(totalXpForLevel(1)).toBe(0);
  });

  it('level 2 total = 240', () => {
    expect(totalXpForLevel(2)).toBe(240);
  });

  it('level 3 total = 240 + 390 = 630', () => {
    expect(totalXpForLevel(3)).toBe(630);
  });
});

describe('levelFromXp', () => {
  it('0 XP = level 1', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it('between levels interpolates correctly', () => {
    // 239 XP should still be level 1 (needs 240 for level 2)
    expect(levelFromXp(239)).toBe(1);
    expect(levelFromXp(240)).toBe(2);
  });
});

describe('xpProgressInLevel', () => {
  it('0 XP = 0 progress (in level 1)', () => {
    expect(xpProgressInLevel(0)).toBe(0);
  });

  it('progress increases with XP', () => {
    // Level 2 starts at 240, needs 390 for level 3
    // 240 = start of level 2 = 0%
    expect(xpProgressInLevel(240)).toBe(0);
    // 315 = midpoint = ~19%
    expect(xpProgressInLevel(315)).toBeGreaterThan(0.15);
    expect(xpProgressInLevel(315)).toBeLessThan(0.25);
  });
});

describe('xpForAchievement', () => {
  it('common achievement = 25 XP', () => {
    expect(xpForAchievement('first')).toBe(25);
  });

  it('rare achievement = 50 XP', () => {
    expect(xpForAchievement('still_alive')).toBe(50);
  });

  it('legendary achievement = 100 XP', () => {
    expect(xpForAchievement('week_bender')).toBe(100);
  });
});

describe('xpFromAchievements', () => {
  it('empty set = 0 XP', () => {
    expect(xpFromAchievements(new Set())).toBe(0);
  });

  it('one common = 25 XP', () => {
    expect(xpFromAchievements(new Set(['first']))).toBe(25);
  });

  it('one rare = 50 XP', () => {
    expect(xpFromAchievements(new Set(['still_alive']))).toBe(50);
  });

  it('mixed achievements sum correctly', () => {
    const set = new Set(['first', 'still_alive', 'week_bender']);
    expect(xpFromAchievements(set)).toBe(25 + 50 + 100);
  });
});

describe('xpFromEntries', () => {
  it('no entries = 0 XP', () => {
    const result = xpFromEntries([], Date.now());
    expect(result.xp).toBe(0);
    expect(result.cleanBonus).toBe(0);
    expect(result.usageBonus).toBe(0);
  });

  it('one entry = 13 XP (10 entry + 3 usage day bonus)', () => {
    const entries = [makeEntry('e1', 0)];
    const result = xpFromEntries(entries, Date.now());
    expect(result.xp).toBe(13); // 10 + 3 (usage streak)
  });

  it('no entries = no clean bonus', () => {
    // With no entries, clean streak = 0
    const result = xpFromEntries([], Date.now());
    expect(result.cleanBonus).toBe(0);
  });
});

describe('xpFromMoods', () => {
  it('no moods = 0 XP', () => {
    expect(xpFromMoods([])).toBe(0);
  });

  it('3 moods = 15 XP (3 * 5)', () => {
    expect(xpFromMoods([
      { id: '1', timestamp: Date.now(), mood: 'good', intensity: 3 },
      { id: '2', timestamp: Date.now(), mood: 'neutral', intensity: 3 },
      { id: '3', timestamp: Date.now(), mood: 'good', intensity: 3 },
    ])).toBe(15);
  });
});

describe('xpFromSleep', () => {
  it('no sleep = 0 XP', () => {
    expect(xpFromSleep([])).toBe(0);
  });

  it('sleep without duration = 0 XP', () => {
    expect(xpFromSleep([{ id: '1', startTime: Date.now() }])).toBe(0);
  });

  it('sleep with duration = 5 XP', () => {
    expect(xpFromSleep([{ id: '1', startTime: Date.now() - 3600000, endTime: Date.now(), duration: 3600000 }])).toBe(5);
  });
});

describe('xpFromWater', () => {
  it('no water = 0 XP', () => {
    expect(xpFromWater([])).toBe(0);
  });

  it('2 water logs = 4 XP (2 * 2)', () => {
    expect(xpFromWater([
      { timestamp: Date.now() },
      { timestamp: Date.now() },
    ])).toBe(4);
  });
});

describe('calculateXpSnapshot', () => {
  it('empty inputs = level 1, 0 XP', () => {
    const snapshot = calculateXpSnapshot({
      entries: [],
      moods: [],
      sleep: [],
      water: [],
      unlockedAchievements: new Set(),
    });
    expect(snapshot.level).toBe(1);
    expect(snapshot.totalXp).toBe(0);
  });

  it('one entry adds XP', () => {
    const snapshot = calculateXpSnapshot({
      entries: [makeEntry('e1', 0)],
      moods: [],
      sleep: [],
      water: [],
      unlockedAchievements: new Set(),
    });
    expect(snapshot.totalXp).toBeGreaterThan(0); // 10 entry + 3 usage day
  });

  it('one achievement adds XP', () => {
    const snapshot = calculateXpSnapshot({
      entries: [],
      moods: [],
      sleep: [],
      water: [],
      unlockedAchievements: new Set(['first']),
    });
    expect(snapshot.totalXp).toBe(25); // just the achievement
  });

  it('breakdown sums match total', () => {
    const snapshot = calculateXpSnapshot({
      entries: [makeEntry('e1', 0)],
      moods: [{ id: 'm1', timestamp: Date.now(), mood: 'good', intensity: 3 }],
      sleep: [{ id: 's1', startTime: Date.now() - 3600000, endTime: Date.now(), duration: 3600000 }],
      water: [{ timestamp: Date.now() }],
      unlockedAchievements: new Set(['first']),
    });
    
    const { breakdown } = snapshot;
    // Verify breakdown sums match total
    const sum = breakdown.entriesXp + breakdown.achievementsXp + breakdown.moodXp + breakdown.sleepXp + breakdown.waterXp;
    expect(breakdown.total).toBe(sum);
    // Verify level calculation is reasonable
    expect(snapshot.level).toBeGreaterThanOrEqual(1);
    expect(snapshot.xpProgress).toBeGreaterThanOrEqual(0);
    expect(snapshot.xpProgress).toBeLessThanOrEqual(1);
  });
});

describe('getAchievementTier', () => {
  it('first = common', () => {
    expect(getAchievementTier('first')).toBe('common');
  });

  it('still_alive = rare', () => {
    expect(getAchievementTier('still_alive')).toBe('rare');
  });

  it('week_bender = legendary', () => {
    expect(getAchievementTier('week_bender')).toBe('legendary');
  });
});

describe('getNextMilestone', () => {
  it('level 1 at 0 XP: next milestone level 2', () => {
    const milestone = getNextMilestone(0, 2);
    expect(milestone?.level).toBe(2);
    expect(milestone?.xpNeeded).toBe(240);
    expect(milestone?.xpRemaining).toBe(240);
  });

  it('already at target level = null', () => {
    expect(getNextMilestone(300, 2)).toBeNull();
  });
});

describe('getLevelName', () => {
  it('level 1 = Начинающий', () => {
    expect(getLevelName(1)).toBe('Начинающий');
  });

  it('level 5 = Мастер', () => {
    expect(getLevelName(5)).toBe('Мастер');
  });

  it('level 10+ = Просветлённый', () => {
    expect(getLevelName(15)).toBe('Просветлённый');
  });
});
