import express from 'express';

const router = express.Router();

import { authMiddleware } from '../middlewares/auth.middleware.js';

import {
  getScore,
  updateScore
} from '../controllers/user.controller.js';

router.get('/score', authMiddleware, getScore);

router.post('/score', authMiddleware, updateScore);

export default router;