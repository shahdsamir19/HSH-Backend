import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Community post by a user
const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  postType: {
    type: DataTypes.STRING,
    allowNull: false // 'Achievement', 'Cyber Tip', 'Question', 'Challenge Invitation'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  likes: {
    type: DataTypes.TEXT,
    defaultValue: '[]' // JSON array of userIds
  },
  isReported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'posts',
  timestamps: true
});

export default Post;
