import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  logging: process.env.NODE_ENV === 'production' ? false : (msg) => console.log('[Sequelize]', msg),
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

export const waitForDb = async (retries = 10, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('Successfully connected to Neon database');
      return;
    } catch (err) {
      console.warn(
        `Database connection failed (attempt ${i + 1}/${retries}). Retrying in ${delay / 1000}s...`
      );
      if (i === retries - 1) {
        console.error("Could not connect to the database after multiple attempts.");
        console.error(err);
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};

export const syncDatabase = async (options = { alter: true }) => {
  try {
    await sequelize.sync(options);
    console.log('Database synced successfully.');
  } catch (err) {
    console.error('Error syncing database:', err);
    throw err;
  }
};

export default sequelize;