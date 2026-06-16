import express from 'express';

const router = express.Router();

import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getUserProgress, completeLevel } from '../controllers/user.controller.js';

import {
  getScore,
  updateScore
} from '../controllers/user.controller.js';

router.get('/score', authMiddleware, getScore);

router.post('/score', authMiddleware, updateScore);

// Get current progress to render the map
router.get('/progress', verifyToken, getUserProgress);

// Call this endpoint from individual level pages when a kid wins
router.post('/complete-level', verifyToken, completeLevel);

export default router;