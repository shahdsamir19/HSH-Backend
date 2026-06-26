import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './user.model.js';
import Badge from './Badge.model.js';

const UserBadge = sequelize.define('UserBadge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
userId: {
  type: DataTypes.UUID,
  allowNull: false,
  references: {
    model: User,
    key: 'id'
  },
  onDelete: 'CASCADE'
},

badgeId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: Badge,
    key: 'id'
  },
  onDelete: 'CASCADE'
},
  unlockedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

UserBadge.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

UserBadge.belongsTo(Badge, {
  foreignKey: 'badgeId',
  as: 'badge'
});

User.hasMany(UserBadge, {
  foreignKey: 'userId',
  as: 'badges'
});

Badge.hasMany(UserBadge, {
  foreignKey: 'badgeId',
  as: 'users'
});

export default UserBadge;
