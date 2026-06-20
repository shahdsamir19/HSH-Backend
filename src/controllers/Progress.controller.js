import {
  submitLevelResult,
  getFullProgress,
  getLevelProgress,
  formatLevelRow,
} from '../services/progress.service.js';

// Hardcoded for now — see note in progress.service.js about
// completionPercentage needing a real denominator. Bump this when a
// new level ships, or replace with a DB-backed count once a Level
// model exists.
const TOTAL_LEVELS = 9;

/**
 * POST /api/progress/submit
 * Body: { levelId, score, completionTime }
 */
export const submitProgress = async (req, res) => {
  try {
    const { levelId, score, completionTime } = req.body;

    if (levelId === undefined || levelId === null || !Number.isInteger(Number(levelId)) || Number(levelId) < 1) {
      return res.status(400).json({
        success: false,
        message: 'levelId is required and must be a positive integer',
      });
    }
    if (score === undefined || score === null || Number.isNaN(Number(score))) {
      return res.status(400).json({
        success: false,
        message: 'score is required and must be a number',
      });
    }
    if (Number(score) < 0 || Number(score) > 100) {
      return res.status(400).json({
        success: false,
        message: 'score must be between 0 and 100',
      });
    }
    if (
      completionTime !== undefined &&
      completionTime !== null &&
      (Number.isNaN(Number(completionTime)) || Number(completionTime) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'completionTime must be a non-negative number of seconds',
      });
    }

    const progress = await submitLevelResult(
      req.user.id,
      Number(levelId),
      Number(score),
      completionTime !== undefined && completionTime !== null ? Number(completionTime) : undefined
    );

    return res.status(200).json({
      success: true,
      message: 'Progress saved',
      data: formatLevelRow(progress),
    });
  } catch (error) {
    console.error('SUBMIT PROGRESS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit progress',
      error: error.message,
    });
  }
};

/**
 * GET /api/progress
 */
export const getAllProgress = async (req, res) => {
  try {
    const summary = await getFullProgress(req.user.id, { totalLevels: TOTAL_LEVELS });

    return res.status(200).json({
      success: true,
      message: 'Progress fetched successfully',
      data: summary,
    });
  } catch (error) {
    console.error('GET ALL PROGRESS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch progress',
      error: error.message,
    });
  }
};

/**
 * GET /api/progress/:levelId
 */
export const getOneLevelProgress = async (req, res) => {
  try {
    const levelId = Number(req.params.levelId);

    if (!Number.isInteger(levelId) || levelId < 1) {
      return res.status(400).json({
        success: false,
        message: 'levelId must be a positive integer',
      });
    }

    const progress = await getLevelProgress(req.user.id, levelId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress found for this level',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Level progress fetched successfully',
      data: formatLevelRow(progress),
    });
  } catch (error) {
    console.error('GET LEVEL PROGRESS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch level progress',
      error: error.message,
    });
  }
};