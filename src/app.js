// src/app.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chatbot.routes.js';
import userRoutes from './routes/user.routes.js';
import progressRoutes from './routes/progress.routes.js';

const app = express();

// ===============================
// ✅ CORS CONFIG
// ===============================
const corsOptions = {
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
    // add your deployed frontend's real URL here too, e.g.:
    // "https://your-frontend.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization"
  ],
  credentials: true,
  optionsSuccessStatus: 204
};

// cors() must run before everything else. It already auto-answers
// every OPTIONS preflight on its own — no separate app.options('*', ...)
// line is needed, and that line was risky on newer Express versions.
app.use(cors(corsOptions));

// ===============================
// ✅ Logging
// ===============================
app.use(morgan('dev'));

// ===============================
// ✅ Body parsing (must be BEFORE routes)
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// ✅ Routes
// ===============================
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/progress', progressRoutes); 

// ===============================
// ✅ Health check
// ===============================
app.get('/ping', (req, res) => {
  res.json({ message: 'pong 🏓' });
});

// ===============================
// ✅ Root
// ===============================
app.get('/', (req, res) => {
  res.json({ message: 'Cybersecurity Game API is running 🚀' });
});

// ===============================
// ❌ 404 handler (must be after routes)
// ===============================
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// ===============================
// ❌ Global error handler
// ===============================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: err.message || 'Server error'
  });
});

export default app;
