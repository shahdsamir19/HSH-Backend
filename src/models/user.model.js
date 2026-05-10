import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/database.js';

const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  otp: {
  type: DataTypes.STRING,
  allowNull: true,
  },
  otpExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  role: {
    type: DataTypes.STRING,
    defaultValue: 'student', // 🔥 changed
  },

}, {
  tableName: 'users',
  timestamps: true,

  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, saltRounds);
    },
  },
});

User.prototype.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export default User;