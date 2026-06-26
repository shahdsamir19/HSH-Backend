import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './user.model.js';
import Team from './Team.model.js';

const TeamMember = sequelize.define('TeamMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model: Team,
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
  isLeader: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isReady: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

TeamMember.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

TeamMember.belongsTo(Team, {
  foreignKey: 'teamId',
  as: 'team'
});

Team.hasMany(TeamMember, {
  foreignKey: 'teamId',
  as: 'members'
});

User.hasMany(TeamMember, {
  foreignKey: 'userId',
  as: 'teamMemberships'
});

export default TeamMember;
