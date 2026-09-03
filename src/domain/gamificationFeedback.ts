import type { XpSnapshot } from './gamification';

/**
 * Pure diff between XP snapshots around a record save/undo.
 * XP itself is derived state — this only reports what changed for UI feedback.
 */
export interface RecordXpFeedback {
  /** after.totalXp - before.totalXp (negative on undo). */
  xpDelta: number;
  leveledUp: boolean;
  /** Level after the change (current level even when no level-up). */
  newLevel: number;
  /** Achievement ids unlocked by this change, in insertion order. */
  newAchievements: string[];
}

export function computeRecordXpFeedback(input: {
  before: XpSnapshot;
  after: XpSnapshot;
  achievementsBefore: Set<string>;
  achievementsAfter: Set<string>;
}): RecordXpFeedback {
  const leveledUp = input.after.level > input.before.level;
  return {
    xpDelta: input.after.totalXp - input.before.totalXp,
    leveledUp,
    newLevel: input.after.level,
    newAchievements: [...input.achievementsAfter].filter((id) => !input.achievementsBefore.has(id))
  };
}
