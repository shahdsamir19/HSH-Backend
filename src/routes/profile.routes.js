import express from 'express';
import {
  getProfile,
  updateAvatar,
  addFriend,
  getFriends,
  getNotifications,
  markNotificationsRead,
  respondFriendRequest
} from '../controllers/profile.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/notifications', authMiddleware, getNotifications);
router.post('/notifications/read', authMiddleware, markNotificationsRead);
router.get('/friends', authMiddleware, getFriends);
router.post('/friends/add', authMiddleware, addFriend);
router.post('/friends/respond', authMiddleware, respondFriendRequest);
router.post('/avatar', authMiddleware, updateAvatar);
router.get('/', authMiddleware, getProfile);
router.get('/:id', authMiddleware, getProfile);

export default router;
