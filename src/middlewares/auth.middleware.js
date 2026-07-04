import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);

    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

import { isStage1Completed } from '../services/Progress.service.js';

export const arenaUnlockMiddleware = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const unlocked = await isStage1Completed(user);
    if (!unlocked) {
      return res.status(403).json({ message: "Access Denied: You must complete Stage 1 (Levels 1–4) to unlock the Cyber Arena." });
    }
    next();
  } catch (err) {
    console.error('Error in arenaUnlockMiddleware:', err);
    res.status(500).json({ message: 'Server error verifying stage unlock' });
  }
};