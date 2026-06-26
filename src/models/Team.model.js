import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Team = sequelize.define('Team', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  missionName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Lobby' // Lobby, Active, Finished
  },
  objectives: {
    type: DataTypes.TEXT,
    defaultValue: '[]' // JSON array of objectives
  },
  clues: {
    type: DataTypes.TEXT,
    defaultValue: '[]' // JSON array of strings
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

export default Team;
