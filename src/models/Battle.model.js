import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Battle = sequelize.define('Battle', {
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
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Active' // Active, Finished
  },
  gameMode: {
    type: DataTypes.STRING,
    allowNull: false // detective, ctf, defense, outbreak, duel
  },
  scenarioName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  currentQuestionIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  roundSecondsRemaining: {
    type: DataTypes.INTEGER,
    defaultValue: 15
  },
  isRoundActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  winnerId: {
  type: DataTypes.UUID,
  allowNull: true
},
  winnerUsername: {
    type: DataTypes.STRING,
    defaultValue: ''
  }
});

export default Battle;
