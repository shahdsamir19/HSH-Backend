import express from 'express';
import { getAnalytics, getReports, resolveReport, getUsers, deleteUser } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All admin routes require authentication (and ideally admin role - enforced in controller)
router.get('/analytics', authMiddleware, getAnalytics);
router.get('/reports', authMiddleware, getReports);
router.post('/reports/:id/resolve', authMiddleware, resolveReport);
router.get('/users', authMiddleware, getUsers);
router.delete('/users/:id', authMiddleware, deleteUser);

export default router;
