import express from 'express';
import { getLeaderboard, getMyStats } from '../controllers/leaderboard.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getLeaderboard);
router.get('/me', authMiddleware, getMyStats);

export default router;
