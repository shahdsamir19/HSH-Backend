import { Op } from 'sequelize';
import User from '../models/user.model.js';
import Post from '../models/Post.model.js';
import Comment from '../models/Comment.model.js';
import Report from '../models/Report.model.js';
import Battle from '../models/Battle.model.js';

export const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const onlineUsersCount = await User.count({
      where: { status: { [Op.ne]: 'Offline' } }
    });
    const activeBattles = await Battle.count({
      where: { status: 'Active' }
    });
    const totalPosts = await Post.count();

    // Get list of online users
    const onlineList = await User.findAll({
      where: { status: { [Op.ne]: 'Offline' } },
      attributes: ['id', 'firstName', 'lastName', 'status', 'rank', 'avatar', 'xp']
    });

    res.status(200).json({
      totalUsers,
      onlineUsers: onlineUsersCount,
      activeBattles,
      totalPosts,
      onlineList: onlineList.map(u => ({
        ...u.toJSON(),
        username: `${u.firstName} ${u.lastName}`
      }))
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await Report.findAll({
      order: [['createdAt', 'DESC']]
    });

    const formatted = await Promise.all(reports.map(async (rep) => {
      const post = await Post.findByPk(rep.postId);
      const reporter = await User.findByPk(rep.reportedBy);

      return {
        id: rep.id,
        postId: rep.postId,
        postAuthor: post ? post.username : 'Deleted User',
        postContent: post ? post.content : 'Deleted Content',
        postType: post ? post.postType : '',
        reportedByUsername: reporter ? `${reporter.firstName} ${reporter.lastName}` : 'Unknown',
        reason: rep.reason,
        createdAt: rep.createdAt
      };
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resolveReport = async (req, res) => {
  try {
    const { action } = req.body; // 'delete' or 'keep'
    const report = await Report.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (action === 'delete') {
      await Comment.destroy({ where: { postId: report.postId } });
      await Post.destroy({ where: { id: report.postId } });
    } else {
      await Post.update({ isReported: false }, { where: { id: report.postId } });
    }

    await Report.destroy({ where: { id: req.params.id } });

    const io = req.app.get('io');
    if (io) {
      io.emit('report-resolved', { reportId: req.params.id });
    }

    res.status(200).json({ message: 'Report resolved successfully.' });
  } catch (err) {
    console.error('Error resolving report:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'otp', 'otpExpires'] },
      order: [['xp', 'DESC']]
    });
    res.status(200).json(users.map(u => ({
      ...u.toJSON(),
      username: `${u.firstName} ${u.lastName}`
    })));
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.destroy({ where: { id: req.params.id } });
    await Post.destroy({ where: { userId: req.params.id } });
    await Comment.destroy({ where: { userId: req.params.id } });

    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
