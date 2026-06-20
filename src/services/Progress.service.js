import UserLevelProgress from '../models/userLevelProgress.model.js';
import { calculateGrade } from './grading.service.js';

/**
 * Submit a level attempt result for a user.
 *
 * - Creates the row on first attempt at a level.
 * - Always increments `attempts` and overwrites `score`/`completionTime`
 *   with the latest attempt's values.
 * - `highestScore` only ever goes up.
 * - `grade`/`stars`/`status` are recalculated from the LATEST score
 *   (matches the spec: "Recalculate grade and stars" after updating
 *   latest score — not from highestScore). If you'd rather grade off
 *   the personal best instead, swap `result.score` for `highestScore`
 *   in the calculateGrade call below.
 * - `completedAt` is set the first time the level is passed, and is
 *   NOT overwritten on subsequent passing attempts (records "first
 *   pass" date, not "most recent pass" date).
 *
 * @param {string} userId
 * @param {number} levelId
 * @param {number} score - 0-100
 * @param {number} [completionTime] - seconds
 * @returns {Promise<UserLevelProgress>}
 */
export const submitLevelResult = async (userId, levelId, score, completionTime) => {
  const graded = calculateGrade(score); // throws on invalid score

  const [progress] = await UserLevelProgress.findOrCreate({
    where: { userId, levelId },
    defaults: {
      userId,
      levelId,
      score: 0,
      highestScore: 0,
      stars: 0,
      grade: 'Fail',
      attempts: 0,
      status: 'failed',
    },
  });

  progress.attempts += 1;
  progress.score = graded.score;
  progress.stars = graded.stars;
  progress.grade = graded.grade;
  progress.status = graded.status;
  progress.completionTime = completionTime ?? progress.completionTime;

  if (graded.score > progress.highestScore) {
    progress.highestScore = graded.score;
  }

  if (graded.status === 'passed' && !progress.completedAt) {
    progress.completedAt = new Date();
  }

  await progress.save();
  return progress;
};

/**
 * Fetch all progress rows for a user, plus aggregate stats.
 *
 * @param {string} userId
 * @returns {Promise<{totalScore: number, completedLevels: number[], completionPercentage: number, levels: object[]}>}
 */
export const getFullProgress = async (userId, { totalLevels } = {}) => {
  const rows = await UserLevelProgress.findAll({
    where: { userId },
    order: [['levelId', 'ASC']],
  });

  const totalScore = rows.reduce((sum, r) => sum + (r.highestScore || 0), 0);
  const completedLevels = rows
    .filter((r) => r.status === 'passed')
    .map((r) => r.levelId);

  // completionPercentage needs a denominator (how many levels exist in
  // the game). That number isn't tracked anywhere in this schema, so it
  // must be passed in by the caller (e.g. from a config constant or a
  // future Level model), or it's computed as "passed / attempted" which
  // is a different (and less useful) metric. See note in controller.
  const denominator = totalLevels ?? rows.length;
  const completionPercentage = denominator > 0
    ? Math.round((completedLevels.length / denominator) * 100)
    : 0;

  return {
    totalScore,
    completedLevels,
    completionPercentage,
    levels: rows.map(formatLevelRow),
  };
};

/**
 * Fetch a single level's progress row for a user.
 *
 * @param {string} userId
 * @param {number} levelId
 * @returns {Promise<UserLevelProgress|null>}
 */
export const getLevelProgress = async (userId, levelId) => {
  return UserLevelProgress.findOne({ where: { userId, levelId } });
};

const formatLevelRow = (row) => ({
  levelId: row.levelId,
  score: row.score,
  highestScore: row.highestScore,
  stars: row.stars,
  grade: row.grade,
  attempts: row.attempts,
  status: row.status,
  completionTime: row.completionTime,
  completedAt: row.completedAt,
});

export { formatLevelRow };