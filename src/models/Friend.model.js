import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Friend/social connection between two users
const Friend = sequelize.define('Friend', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  requesterId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  recipientId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Pending' // Pending, Accepted
  }
}, {
  tableName: 'friends',
  timestamps: true
});

export default Friend;
