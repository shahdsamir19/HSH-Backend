import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './user.model.js';

const Notification = sequelize.define('Notification', {
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
  icon: {
    type: DataTypes.STRING,
    defaultValue: '🔔'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'generic'
  },
  senderId: {
  type: DataTypes.UUID,
  allowNull: true,
  references: {
    model: User,
    key: 'id'
  },
  onDelete: 'SET NULL'
}
});

Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Notification.belongsTo(User, {
  foreignKey: 'senderId',
  as: 'sender'
});

User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications'
});

export default Notification;
