import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Report filed on a community post
const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reportedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'reports',
  timestamps: true
});

export default Report;
