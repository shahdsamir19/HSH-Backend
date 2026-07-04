import Post from '../models/Post.model.js';
import Comment from '../models/Comment.model.js';
import Report from '../models/Report.model.js';

const BAD_WORDS = ['idiot', 'stupid', 'dumb', 'fool', 'hate', 'kill', 'jerk', 'trash', 'scam', 'hack', 'fuck', 'shit', 'asshole'];

const filterProfanity = (text) => {
  let filtered = text;
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '***');
  });
  return filtered;
};

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.findAll({
      where: { isReported: false },
      order: [['createdAt', 'DESC']]
    });

    const postsWithComments = await Promise.all(posts.map(async (post) => {
      const comments = await Comment.findAll({
        where: { postId: post.id },
        order: [['createdAt', 'ASC']]
      });

      return {
        id: post.id,
        userId: post.userId,
        username: post.username,
        postType: post.postType,
        content: post.content,
        likes: JSON.parse(post.likes || '[]'),
        isReported: post.isReported,
        createdAt: post.createdAt,
        comments: comments.map(c => ({
          id: c.id,
          postId: c.postId,
          userId: c.userId,
          username: c.username,
          content: c.content,
          createdAt: c.createdAt
        }))
      };
    }));

    res.status(200).json(postsWithComments);
  } catch (err) {
    console.error('Error fetching community posts:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createPost = async (req, res) => {
  try {
    const { postType, content } = req.body;
    if (!postType || !content) {
      return res.status(400).json({ message: 'Post type and content are required' });
    }

    const cleanContent = filterProfanity(content);
    const username = `${req.user.firstName} ${req.user.lastName}`;

    const post = await Post.create({
      userId: req.user.id,
      username,
      postType,
      content: cleanContent,
      likes: '[]'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new-post', {
        id: post.id,
        userId: post.userId,
        username: post.username,
        postType: post.postType,
        content: post.content,
        likes: [],
        comments: [],
        createdAt: post.createdAt
      });
    }

    res.status(201).json({
      id: post.id,
      userId: post.userId,
      username: post.username,
      postType: post.postType,
      content: post.content,
      likes: [],
      comments: [],
      createdAt: post.createdAt
    });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const likes = JSON.parse(post.likes || '[]');
    const userIndex = likes.indexOf(req.user.id);

    if (userIndex > -1) {
      likes.splice(userIndex, 1);
    } else {
      likes.push(req.user.id);
    }

    post.likes = JSON.stringify(likes);
    await post.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('post-likes-updated', { postId: post.id, likes });
    }

    res.status(200).json({ id: post.id, likes });
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const commentPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await Post.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const cleanContent = filterProfanity(content);
    const username = `${req.user.firstName} ${req.user.lastName}`;

    const comment = await Comment.create({
      postId: post.id,
      userId: req.user.id,
      username,
      content: cleanContent
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new-comment', {
        postId: post.id,
        comment: {
          id: comment.id,
          postId: comment.postId,
          userId: comment.userId,
          username: comment.username,
          content: comment.content,
          createdAt: comment.createdAt
        }
      });
    }

    res.status(201).json({
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      username: comment.username,
      content: comment.content,
      createdAt: comment.createdAt
    });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const reportPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await Report.create({
      postId: post.id,
      reportedBy: req.user.id,
      reason: reason || 'Inappropriate content'
    });

    post.isReported = true;
    await post.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('post-reported', { postId: post.id });
    }

    res.status(200).json({ message: 'Post reported successfully.' });
  } catch (err) {
    console.error('Error reporting post:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Share a Cyber Arena badge achievement to the Cyber Club community feed.
// Reuses the existing Post model and socket broadcast — no new tables needed.
export const shareBadgeToClub = async (req, res) => {
  try {
    const { badgeName, badgeIcon, badgeDescription } = req.body;
    if (!badgeName) {
      return res.status(400).json({ message: 'badgeName is required' });
    }

    const username = `${req.user.firstName} ${req.user.lastName}`;
    const content = `🏆 I just unlocked the "${badgeIcon || '🏅'} ${badgeName}" badge in Cyber Arena! ${badgeDescription || ''} #CyberArena #Achievement`;

    const post = await Post.create({
      userId: req.user.id,
      username,
      postType: 'Achievement',
      content,
      likes: '[]'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new-post', {
        id: post.id,
        userId: post.userId,
        username: post.username,
        postType: post.postType,
        content: post.content,
        likes: [],
        comments: [],
        createdAt: post.createdAt
      });
    }

    res.status(201).json({
      message: 'Badge shared to Cyber Club!',
      post: {
        id: post.id,
        userId: post.userId,
        username: post.username,
        postType: post.postType,
        content: post.content,
        likes: [],
        comments: [],
        createdAt: post.createdAt
      }
    });
  } catch (err) {
    console.error('Error sharing badge to club:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
