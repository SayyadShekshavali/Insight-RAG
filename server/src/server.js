import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import pino from 'pino';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { seedDatabase } from './config/seed.js';
import authRoutes from './modules/auth/auth.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import documentsRoutes from './modules/documents/documents.routes.js';
import integrationsRoutes from './modules/integrations/integrations.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import usersRoutes from './modules/users/users.routes.js';

dotenv.config();

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: '*', // For local dev flexibility
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log incoming requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Database & Redis status trackers
let dbConnected = false;
let redisConnected = false;

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    dbConnected = true;
    logger.info('MongoDB connected successfully');
    await seedDatabase();
  })
  .catch((err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
    logger.warn('Proceeding without database functionality. Ensure MongoDB is running on port 27017.');
  });

// Connect Redis (Optional helper for development fallback)
let redisClient = null;
try {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('Redis unreachable. Background BullMQ queue features will fall back to sync in-memory operations.');
        return null; // Stop retrying
      }
      return 1000;
    }
  });
  
  redisClient.on('connect', () => {
    redisConnected = true;
    logger.info('Redis connected successfully');
  });

  redisClient.on('error', (err) => {
    logger.error(`Redis connection error: ${err.message}`);
  });
} catch (e) {
  logger.error(`Redis client initialization failed: ${e.message}`);
}

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: dbConnected ? 'connected' : 'disconnected',
      redis: redisConnected ? 'connected' : 'disconnected'
    }
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
