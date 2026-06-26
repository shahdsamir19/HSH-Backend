import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  questionText: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  optionA: {
    type: DataTypes.STRING,
    allowNull: true
  },
  optionB: {
    type: DataTypes.STRING,
    allowNull: true
  },
  optionC: {
    type: DataTypes.STRING,
    allowNull: true
  },
  optionD: {
    type: DataTypes.STRING,
    allowNull: true
  },
  correctAnswer: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gameMode: {
    type: DataTypes.STRING,
    allowNull: false // detective, ctf, defense, outbreak, duel
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true // JSON string for special scenario details (victim, evidence, etc.)
  }
});

export default Question;
