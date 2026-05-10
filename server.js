import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import sequelize from './src/config/database.js';

const PORT = process.env.PORT || 5001;

// 1. Database Connection Logic
// We move this to a separate check so Vercel can reuse the connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log("✅ Database synced");
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
};

// 2. Conditional Execution
// Only call app.listen() if we are NOT on Vercel (local development)
if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running locally on http://localhost:${PORT}`);
    });
  });
} else {
  // On Vercel (Production), just connect to DB
  connectDB();
}

// 3. EXPORT the app for Vercel
// Vercel needs this export to wrap your app in a serverless function
export default app;