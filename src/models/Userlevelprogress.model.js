import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './user.model.js';

const UserLevelProgress = sequelize.define('UserLevelProgress', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  levelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: true,
      min: 1,
    },
  },
  // Latest attempt's score (0-100)
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100,
    },
  },
  // Best score ever achieved on this level
  highestScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100,
    },
  },
  stars: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 3,
    },
  },
  grade: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Fail',
    validate: {
      isIn: [['A+', 'A', 'B', 'C', 'Fail']],
    },
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('passed', 'failed'),
    allowNull: false,
    defaultValue: 'failed',
  },
  // Seconds spent on the attempt that produced the current `score`
  completionTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
    },
  },
  // Set the first time status flips to 'passed'; never overwritten after that
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'user_level_progress',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'level_id'],
      name: 'user_level_progress_user_id_level_id_unique',
    },
  ],
});

// ── Associations ────────────────────────────────────────────────
// A user has many per-level progress rows; each row belongs to one user.
User.hasMany(UserLevelProgress, {
  foreignKey: 'userId',
  as: 'levelProgress',
  onDelete: 'CASCADE',
});
UserLevelProgress.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

export default UserLevelProgress;