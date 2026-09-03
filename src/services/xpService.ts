import { evaluateUnlockedAchievements } from '../domain/achievements';
import { calculateXpSnapshot } from '../domain/gamification';
import { computeRecordXpFeedback, type RecordXpFeedback } from '../domain/gamificationFeedback';
import { getBatches, getEntries, getMoods, getSleep, getWater } from '../utils/db';

/**
 * Full XP snapshot from the device DB.
 * Fail-open: XP is derived state and must never block or break a record save.
 */
export async function readXpSnapshot(): Promise<{
  snapshot: ReturnType<typeof calculateXpSnapshot>;
  achievements: Set<string>;
}> {
  const [entries, moods, sleep, water, batches] = await Promise.all([
    getEntries(),
    getMoods(),
    getSleep(),
    getWater(),
    getBatches()
  ]);
  const achievements = evaluateUnlockedAchievements({ entries, water, batches });
  const snapshot = calculateXpSnapshot({ entries, moods, sleep, water, batches, unlockedAchievements: achievements });
  return { snapshot, achievements };
}

/**
 * XP feedback for a record save: snapshot before persist vs after.
 * Never throws — a feedback failure must not fail the record flow.
 */
export async function computeRecordXpDelta<T>(action: () => Promise<T>): Promise<{ result: T; feedback: RecordXpFeedback | null }> {
  let before: Awaited<ReturnType<typeof readXpSnapshot>> | null = null;
  try {
    before = await readXpSnapshot();
  } catch {
    before = null;
  }

  const result = await action();

  try {
    const after = await readXpSnapshot();
    if (!before) return { result, feedback: null };
    return {
      result,
      feedback: computeRecordXpFeedback({
        before: before.snapshot,
        after: after.snapshot,
        achievementsBefore: before.achievements,
        achievementsAfter: after.achievements
      })
    };
  } catch {
    return { result, feedback: null };
  }
}
