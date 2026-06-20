import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  submitProgress,
  getAllProgress,
  getOneLevelProgress,
} from '../controllers/progress.controller.js';

const router = express.Router();

// POST /api/progress/submit  — submit a level attempt result
router.post('/submit', authMiddleware, submitProgress);

// GET /api/progress  — full progress summary + per-level breakdown
router.get('/', authMiddleware, getAllProgress);

// GET /api/progress/:levelId  — single level detail
// IMPORTANT: this must stay registered AFTER '/submit' and '/',
// otherwise Express matches "submit" as a :levelId param.
router.get('/:levelId', authMiddleware, getOneLevelProgress);

export default router;