import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './user.model.js';
import Battle from './Battle.model.js';

const BattlePlayer = sequelize.define('BattlePlayer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  battleId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: Battle,
    key: 'id'
  },
  onDelete: 'CASCADE'
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
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  socketId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  hp: {
    type: DataTypes.INTEGER,
    defaultValue: 100 // Duel Mode health
  },
  shield: {
    type: DataTypes.INTEGER,
    defaultValue: 100 // City Defense health
  },
  fragments: {
    type: DataTypes.INTEGER,
    defaultValue: 0 // CTF Key Fragments
  },
  hasAnswered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  submittedAnswer: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  answerTimeSeconds: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  combo: {
    type: DataTypes.INTEGER,
    defaultValue: 0 // Duel combo streak
  },
  shieldActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Firewall shield power-up state
  }
});



export default BattlePlayer;
