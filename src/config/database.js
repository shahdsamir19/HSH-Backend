import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = isProduction
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
      },
      logging: false,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    })
  : new Sequelize(
      process.env.DB_NAME_DEV || 'securex_dev',
      process.env.DB_USERNAME || 'postgres',
      process.env.DB_PASSWORD || 'postgres',
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        dialect: 'postgres',
        define: { underscored: true, timestamps: true },
        logging: (msg) => console.log('[Sequelize]', msg),
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      }
    );

export const waitForDb = async (retries = 10, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log(
        `Successfully connected to database${isProduction ? '' : ': ' + process.env.DB_NAME_DEV}`
      );
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