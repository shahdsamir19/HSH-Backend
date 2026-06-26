import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Badge = sequelize.define('Badge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

export default Badge;
