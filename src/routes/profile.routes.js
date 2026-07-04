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
import { authMiddleware, arenaUnlockMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/notifications', authMiddleware, arenaUnlockMiddleware, getNotifications);
router.post('/notifications/read', authMiddleware, arenaUnlockMiddleware, markNotificationsRead);
router.get('/friends', authMiddleware, arenaUnlockMiddleware, getFriends);
router.post('/friends/add', authMiddleware, arenaUnlockMiddleware, addFriend);
router.post('/friends/respond', authMiddleware, arenaUnlockMiddleware, respondFriendRequest);
router.post('/avatar', authMiddleware, arenaUnlockMiddleware, updateAvatar);
router.get('/', authMiddleware, arenaUnlockMiddleware, getProfile);
router.get('/:id', authMiddleware, arenaUnlockMiddleware, getProfile);

export default router;
