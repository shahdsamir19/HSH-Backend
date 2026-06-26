import { Op } from 'sequelize';
import User from '../models/user.model.js';
import Friend from '../models/Friend.model.js';
import Notification from '../models/Notification.model.js';
import Badge from '../models/Badge.model.js';
import UserBadge from '../models/UserBadge.model.js';

export const getProfile = async (req, res) => {
  try {
    const targetId = req.params.id || req.user.id;

    const user = await User.findByPk(targetId, {
      attributes: { exclude: ['password', 'otp', 'otpExpires'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch badges via UserBadge join
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
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) {
      return res.status(400).json({ message: 'Avatar string is required' });
    }

    const user = req.user;
    user.avatar = avatar;
    await user.save();

    res.status(200).json({ message: 'Avatar updated', avatar: user.avatar });
  } catch (err) {
    console.error('Error updating avatar:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addFriend = async (req, res) => {
  try {
    const { username } = req.body; // Frontend sends full name here
    if (!username) {
      return res.status(400).json({ message: 'Friend name is required' });
    }

    const nameParts = username.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const whereClause = lastName 
      ? { firstName, lastName } 
      : { firstName };

    const friendUser = await User.findOne({ where: whereClause });
    if (!friendUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (friendUser.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot add yourself' });
    }

    const existing = await Friend.findOne({
      where: {
        [Op.or]: [
          { requesterId: req.user.id, recipientId: friendUser.id },
          { requesterId: friendUser.id, recipientId: req.user.id }
        ]
      }
    });

    const myUsername = `${req.user.firstName} ${req.user.lastName}`;

    if (existing) {
      if (existing.status === 'Accepted') {
        return res.status(400).json({ message: 'Already friends' });
      }
      if (existing.requesterId === req.user.id) {
        return res.status(400).json({ message: 'Friend request already sent' });
      }

      // Accept request (the other user sent a request first)
      existing.status = 'Accepted';
      await existing.save();

      // Delete original request notification for the current user
      await Notification.destroy({
        where: {
          userId: req.user.id,
          type: 'friend_request',
          senderId: friendUser.id
        }
      });

      const notif = await Notification.create({
        userId: friendUser.id,
        type: 'friend_accepted',
        title: 'Friend Request Accepted! 👥',
        message: `${myUsername} accepted your friend request.`,
        icon: '👥'
      });

      const io = req.app.get('io');
      if (io) {
        io.to(friendUser.id.toString()).emit('new-notification', notif);
        io.to(friendUser.id.toString()).emit('friend-list-updated');
        io.to(req.user.id.toString()).emit('friend-list-updated');
      }

      return res.status(200).json({ message: 'Friend request accepted!', status: 'Accepted' });
    }

    // Create pending request
    await Friend.create({
      requesterId: req.user.id,
      recipientId: friendUser.id,
      status: 'Pending'
    });

    const notif = await Notification.create({
      userId: friendUser.id,
      type: 'friend_request',
      senderId: req.user.id,
      title: 'New Friend Request 👥',
      message: `${myUsername} sent you a friend request.`,
      icon: '👥'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(friendUser.id.toString()).emit('new-notification', notif);
      io.to(friendUser.id.toString()).emit('friend-list-updated');
    }

    res.status(200).json({ message: 'Friend request sent!', status: 'Pending' });
  } catch (err) {
    console.error('Error adding friend:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFriends = async (req, res) => {
  try {
    const friendships = await Friend.findAll({
      where: {
        status: 'Accepted',
        [Op.or]: [{ requesterId: req.user.id }, { recipientId: req.user.id }]
      }
    });

    const friendIds = friendships.map(f =>
      f.requesterId === req.user.id ? f.recipientId : f.requesterId
    );

    const friendsList = await User.findAll({
      where: { id: friendIds },
      attributes: ['id', 'firstName', 'lastName', 'xp', 'rank', 'status', 'avatar']
    });

    res.status(200).json(friendsList.map(u => ({
      ...u.toJSON(),
      username: `${u.firstName} ${u.lastName}`
    })));
  } catch (err) {
    console.error('Error fetching friends:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifs = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(notifs);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    await Notification.update({ isRead: true }, {
      where: { userId: req.user.id }
    });
    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Error updating notifications:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const respondFriendRequest = async (req, res) => {
  try {
    const { notificationId, action } = req.body;
    if (!notificationId || !action) {
      return res.status(400).json({ message: 'Notification ID and action are required' });
    }

    const notif = await Notification.findByPk(notificationId);
    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notif.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (notif.type !== 'friend_request') {
      return res.status(400).json({ message: 'Not a friend request notification' });
    }

    const requesterId = notif.senderId;

    const friendship = await Friend.findOne({
      where: {
        requesterId,
        recipientId: req.user.id,
        status: 'Pending'
      }
    });

    if (!friendship) {
      await notif.destroy();
      return res.status(404).json({ message: 'Friend request record not found' });
    }

    const myUsername = `${req.user.firstName} ${req.user.lastName}`;
    const io = req.app.get('io');

    if (action === 'accept') {
      friendship.status = 'Accepted';
      await friendship.save();

      const acceptNotif = await Notification.create({
        userId: requesterId,
        type: 'friend_accepted',
        title: 'Friend Request Accepted! 👥',
        message: `${myUsername} accepted your friend request.`,
        icon: '👥'
      });

      await notif.destroy();

      if (io) {
        io.to(requesterId.toString()).emit('new-notification', acceptNotif);
        io.to(requesterId.toString()).emit('friend-list-updated');
        io.to(req.user.id.toString()).emit('friend-list-updated');
      }

      return res.status(200).json({ message: 'Friend request accepted!' });
    } else if (action === 'decline') {
      await friendship.destroy();
      await notif.destroy();

      if (io) {
        io.to(req.user.id.toString()).emit('friend-list-updated');
        io.to(requesterId.toString()).emit('friend-list-updated');
      }

      return res.status(200).json({ message: 'Friend request declined' });
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (err) {
    console.error('Error responding to friend request:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
