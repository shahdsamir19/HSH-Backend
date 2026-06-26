// server.js
import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import app from './src/app.js';
import sequelize from './src/config/database.js';
import { initializeSocket } from './src/socket/socket.js';

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);
const io = initializeSocket(server);
// Make io accessible in HTTP controllers via req.app.get('io')
app.set('io', io);

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

// Vercel automatically sets process.env.VERCEL = '1' on its serverless
// platform — that's the actual signal for "don't call listen()", not
// NODE_ENV. Railway (and most other hosts) commonly set NODE_ENV=production
// too, but they still need a real listening server, so checking VERCEL
// specifically keeps Railway working correctly either way.
if (!process.env.VERCEL) {
  connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  });
} else {
  connectDB();
}

export default app;
