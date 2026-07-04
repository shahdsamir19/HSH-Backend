import express from 'express';
import { getPosts, createPost, likePost, commentPost, reportPost, shareBadgeToClub } from '../controllers/community.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', authMiddleware, getPosts);
router.post('/', authMiddleware, createPost);
router.post('/share-badge', authMiddleware, shareBadgeToClub);
router.post('/:id/like', authMiddleware, likePost);
router.post('/:id/comment', authMiddleware, commentPost);
router.post('/:id/report', authMiddleware, reportPost);

export default router;
