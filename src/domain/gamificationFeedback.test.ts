import { describe, expect, it } from 'vitest';
import { computeRecordXpFeedback } from './gamificationFeedback';
import type { XpSnapshot } from './gamification';

function snap(overrides: Partial<XpSnapshot>): XpSnapshot {
  return {
    level: 1,
    xpInLevel: 0,
    xpProgress: 0,
    totalXp: 0,
    breakdown: {
      entriesXp: 0,
      achievementsXp: 0,
      moodXp: 0,
      sleepXp: 0,
      waterXp: 0,
      streakXp: 0,
      total: 0
    },
    ...overrides
  };
}

describe('computeRecordXpFeedback', () => {
  it('returns zeroed feedback when nothing changed (idempotent re-render)', () => {
    const s = snap({ level: 3, totalXp: 500, xpInLevel: 60, xpProgress: 0.3 });
    const feedback = computeRecordXpFeedback({
      before: s,
      after: s,
      achievementsBefore: new Set(['first']),
      achievementsAfter: new Set(['first'])
    });

    expect(feedback).toEqual({ xpDelta: 0, leveledUp: false, newLevel: 3, newAchievements: [] });
  });

  it('detects a plain XP gain without level-up', () => {
    const feedback = computeRecordXpFeedback({
      before: snap({ level: 2, totalXp: 120, xpInLevel: 10 }),
      after: snap({ level: 2, totalXp: 130, xpInLevel: 20 }),
      achievementsBefore: new Set(),
      achievementsAfter: new Set()
    });

    expect(feedback.xpDelta).toBe(10);
    expect(feedback.leveledUp).toBe(false);
    expect(feedback.newLevel).toBe(2);
    expect(feedback.newAchievements).toEqual([]);
  });

  it('detects level-up and clamps XP delta to non-negative', () => {
    const feedback = computeRecordXpFeedback({
      before: snap({ level: 2, totalXp: 105, xpInLevel: 105 }),
      after: snap({ level: 3, totalXp: 340, xpInLevel: 10 }),
      achievementsBefore: new Set(),
      achievementsAfter: new Set()
    });

    expect(feedback.xpDelta).toBe(235);
    expect(feedback.leveledUp).toBe(true);
    expect(feedback.newLevel).toBe(3);
  });

  it('detects newly unlocked achievements in stable order', () => {
    const feedback = computeRecordXpFeedback({
      before: snap({ totalXp: 10 }),
      after: snap({ totalXp: 60 }),
      achievementsBefore: new Set(['first']),
      achievementsAfter: new Set(['first', 'night_owl', 'hydrated'])
    });

    expect(feedback.newAchievements).toEqual(['night_owl', 'hydrated']);
  });

  it('reports level drop (undo) without crashing', () => {
    const feedback = computeRecordXpFeedback({
      before: snap({ level: 3, totalXp: 340 }),
      after: snap({ level: 2, totalXp: 120 }),
      achievementsBefore: new Set(['first']),
      achievementsAfter: new Set()
    });

    expect(feedback.xpDelta).toBe(-220);
    expect(feedback.leveledUp).toBe(false);
    expect(feedback.newLevel).toBe(2);
  });
});
