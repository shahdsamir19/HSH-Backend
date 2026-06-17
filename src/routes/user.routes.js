import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { 
  getUserProgress, 
  completeLevel, 
  getScore, 
  updateScore 
} from '../controllers/user.controller.js';

const router = express.Router();

// Score management endpoints
router.get('/score', authMiddleware, getScore);
router.post('/score', authMiddleware, updateScore);

// Map progress endpoints (Fix: replaced verifyToken with authMiddleware)
router.get('/progress', authMiddleware, getUserProgress);
router.post('/complete-level', authMiddleware, completeLevel);

export default router;