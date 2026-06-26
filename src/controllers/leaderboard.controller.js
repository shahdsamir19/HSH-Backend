import User from '../models/user.model.js';
import Badge from '../models/Badge.model.js';
import UserBadge from '../models/UserBadge.model.js';

export const getLeaderboard = async (req, res) => {
  try {
    const players = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'xp', 'rank', 'wins', 'losses', 'status', 'avatar'],
      order: [['xp', 'DESC']],
      limit: 10
    });

    res.status(200).json(players.map(u => ({
      ...u.toJSON(),
      username: `${u.firstName} ${u.lastName}`
    })));
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyStats = async (req, res) => {
  try {
    const user = req.user;

    const userBadges = await UserBadge.findAll({
      where: { userId: user.id },
      include: [{ model: Badge, as: 'badge' }]
    });

    res.status(200).json({
      id: user.id,
      username: `${user.firstName} ${user.lastName}`,
      email: user.email,
      xp: user.xp,
      rank: user.rank,
      wins: user.wins,
      losses: user.losses,
      status: user.status,
      avatar: user.avatar,
      badges: userBadges.map(ub => ({ badge: ub.badge, unlockedAt: ub.unlockedAt }))
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
