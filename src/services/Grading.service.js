/**
 * Grading rules for HSH level attempts.
 *
 *   90 - 100  => A+ => 3 stars
 *   75 - 89   => A  => 3 stars
 *   60 - 74   => B  => 2 stars
 *   50 - 59   => C  => 1 star
 *   0  - 49   => Fail => 0 stars
 *
 * Passing threshold: 60
 */

export const PASSING_THRESHOLD = 60;

const GRADE_BANDS = [
  { min: 90, grade: 'A+', stars: 3 },
  { min: 75, grade: 'A', stars: 3 },
  { min: 60, grade: 'B', stars: 2 },
  { min: 50, grade: 'C', stars: 1 },
  { min: 0, grade: 'Fail', stars: 0 },
];

/**
 * Validates a raw score input.
 * @param {*} score
 * @throws {Error} if score is not a finite number in [0, 100]
 */
export const assertValidScore = (score) => {
  const num = Number(score);
  if (!Number.isFinite(num)) {
    throw new Error('score must be a finite number');
  }
  if (num < 0 || num > 100) {
    throw new Error('score must be between 0 and 100');
  }
};

/**
 * Computes grade, stars, and pass/fail status for a given score.
 * Does not mutate or touch the database — pure calculation only.
 *
 * @param {number} score - 0-100
 * @returns {{ score: number, stars: number, grade: string, status: 'passed'|'failed' }}
 */
export const calculateGrade = (score) => {
  assertValidScore(score);
  const numericScore = Number(score);

  const band = GRADE_BANDS.find((b) => numericScore >= b.min);
  const status = numericScore >= PASSING_THRESHOLD ? 'passed' : 'failed';

  return {
    score: numericScore,
    stars: band.stars,
    grade: band.grade,
    status,
  };
};