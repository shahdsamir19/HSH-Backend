import express from 'express';
import { getLeaderboard, getMyStats } from '../controllers/leaderboard.controller.js';
import { authMiddleware, arenaUnlockMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', authMiddleware, arenaUnlockMiddleware, getLeaderboard);
router.get('/me', authMiddleware, arenaUnlockMiddleware, getMyStats);

export default router;
