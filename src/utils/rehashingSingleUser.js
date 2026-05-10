import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import User from './models/user.model.js';
import sequelize from '../config/database.js';

const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;

async function rehashSingleUser() {
  try {
    const email = 'jamesbond@blondmail.com';
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log(`User with email ${email} not found`);
      return process.exit(1);
    }

    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      console.log(`User ${email}: password already hashed`);
      return process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    user.password = hashedPassword;
    await user.save();

    console.log(`User ${email}: password successfully re-hashed`);
    process.exit(0);
  } catch (err) {
    console.error('Error re-hashing password:', err);
    process.exit(1);
  }
}

rehashSingleUser();