import User from '../models/user.model.js';
import Badge from '../models/Badge.model.js';
import UserBadge from '../models/UserBadge.model.js';
import { createNotification } from './notification.service.js';

export const checkAndAwardBadge = async (userId, badgeName, io = null) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) return null;

    // Find the badge
    const badge = await Badge.findOne({ where: { name: badgeName } });
    if (!badge) {
      console.warn(`Badge '${badgeName}' not found in database.`);
      return null;
    }

    // Check if user already has this badge
    const hasBadge = await UserBadge.findOne({
  where: {
    userId: userId,
    badgeId: badge.id
  }
});
    if (hasBadge) return null;

    // Award badge
   await UserBadge.create({
  userId: userId,
  badgeId: badge.id,
  unlockedAt: new Date()
});

    // Create notification
    await createNotification(
      userId,
      'New Badge Unlocked! 🏆',
      `You earned the '${badgeName}' badge: ${badge.description}`,
      badge.icon,
      io
    );

    // Emit to client
    if (io) {
      io.to(userId.toString()).emit('badge-unlocked', {
        badge,
        unlockedAt: new Date()
      });
    }

    return badge;
  } catch (err) {
    console.error('Error awarding badge:', err);
    return null;
  }
};

