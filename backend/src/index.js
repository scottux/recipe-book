import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import compression from 'compression';

// Import new infrastructure
import { initializeRedis, closeRedis } from './config/redis.js';
import logger from './config/logger.js';
import { requestId, requestLogger, errorLogger } from './middleware/requestLogger.js';
import { authenticatedLimiter } from './middleware/redisRateLimiter.js';

// Import routes
import recipeRoutes from './routes/recipes.js';
import authRoutes from './routes/auth.js';
import collectionRoutes from './routes/collections.js';
import mealPlanRoutes from './routes/mealPlans.js';
import shoppingListRoutes from './routes/shoppingLists.js';
import exportRoutes from './routes/export.js';
import importRoutes from './routes/import.js';
import healthRoutes from './routes/health.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Request ID tracking (must be first)
app.use(requestId);

// CORS
app.use(cors());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Response compression
if (process.env.ENABLE_COMPRESSION !== 'false') {
  app.use(compression({
    level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  }));
}

// Request logging (after request ID, before routes)
app.use(requestLogger);

// ============================================================================
// HEALTH CHECK ROUTES (no rate limiting, no auth)
// ============================================================================
app.use('/health', healthRoutes);

// ============================================================================
// API ROUTES (with rate limiting)
// ============================================================================

// Apply rate limiting to all API routes
app.use('/api/', authenticatedLimiter);

// Auth routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/recipes', recipeRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/shopping-lists', shoppingListRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);

// Legacy health check (for backward compatibility)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Recipe Book API is running',
    version: process.env.npm_package_version
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Error logger middleware
app.use(errorLogger);

// Error handler
app.use((err, req, res, next) => {
  // Log error with context
  logger.error('Unhandled error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  // In production, hide error details
  const errorMessage = isProduction 
    ? 'An error occurred while processing your request.'
    : err.message;
  
  res.status(err.status || 500).json({
    success: false,
    error: errorMessage,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    requestId: req.id,
    path: req.path,
    method: req.method,
  });
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ============================================================================
// DATABASE & REDIS INITIALIZATION
// ============================================================================

async function initializeApp() {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      minPoolSize: parseInt(process.env.DB_CONNECTION_POOL_MIN) || 10,
      maxPoolSize: parseInt(process.env.DB_CONNECTION_POOL_MAX) || 50,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('✓ Connected to MongoDB');
    
    // Initialize Redis (non-blocking, continues if Redis fails)
    logger.info('Initializing Redis...');
    try {
      await initializeRedis();
      logger.info('✓ Redis initialized');
    } catch (error) {
      logger.warn('Redis initialization failed, continuing without Redis', {
        error: error.message,
      });
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`✓ Server running on http://localhost:${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version,
      });
    });
    
    // Setup graceful shutdown
    setupGracefulShutdown(server);
    
  } catch (error) {
    logger.error('Failed to initialize application', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

function setupGracefulShutdown(server) {
  const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000;
  
  async function gracefulShutdown(signal) {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Set a timeout for forced shutdown
    const forceShutdownTimer = setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, shutdownTimeout);
    
    try {
      // Close Redis connection
      await closeRedis();
      logger.info('Redis connection closed');
      
      // Close MongoDB connection
      await mongoose.connection.close(false);
      logger.info('MongoDB connection closed');
      
      clearTimeout(forceShutdownTimer);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', {
        error: error.message,
      });
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  }
  
  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// ============================================================================
// UNHANDLED ERRORS
// ============================================================================

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// ============================================================================
// START APPLICATION
// ============================================================================

// Only start the server if not imported as a module (for testing)
if (process.env.NODE_ENV !== 'test') {
  initializeApp();
}

// Export app for testing
export default app;
