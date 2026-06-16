import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chatbot.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();

// ✅ CORS (simple for development)
app.use(cors());

// ✅ Logging
app.use(morgan('dev'));

// ✅ Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);

// ✅ Health check
app.get('/ping', (req, res) => {
  res.json({ message: 'pong 🏓' });
});

// ✅ Root
app.get('/', (req, res) => {
  res.json({ message: 'Cybersecurity Game API is running 🚀' });
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    message: err.message || 'Server error'
  });
});

export default app;