import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fileUpload from 'express-fileupload';
import apiLimiter, { loginLimiter } from './utils/rateLimiter.js';
import logger from './utils/logger.js';
import setupSwagger from '../docs/swagger.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import chatRoutes from "./routes/chatbot.routes.js";
import bankRoutes from "./routes/bank.routes.js";
import currencyRoutes from './routes/currency.routes.js';
import routes from './routes/index.js';

const app = express();

//CORS CONFIG 
const allowedOrigins = [
  'https://securex-frontend-bucket.s3-website-us-east-1.amazonaws.com',
  'https://securex.app',
  'https://www.securex.app',
  'http://localhost:5001',
  'http://localhost:5174'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//WEBHOOK (BEFORE JSON)
app.use('/api/transactions/paystack/webhook', express.raw({ type: 'application/json' }));

// BODY PARSING
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// INVALID JSON HANDLER
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body"
    });
  }
  next();
});

// RATE LIMITING
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);

// FILE UPLOAD
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 10 * 1024 * 1024 },
  abortOnLimit: true,
}));

// SWAGGER (SAFE)
if (process.env.NODE_ENV !== 'production' || process.env.SHOW_SWAGGER === 'true') {
  setupSwagger(app);
}

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api', routes);

// HEALTH CHECK
app.get('/ping', (req, res) => res.json({ message: 'pong' }));

// ROOT (SAFE)
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  logger.error(err);

  if (res.headersSent) return next(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;