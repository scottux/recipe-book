/**
 * Health Check Routes
 * 
 * Provides Kubernetes-compatible health check endpoints:
 * - /health/live - Liveness probe (process running)
 * - /health/ready - Readiness probe (dependencies healthy)
 * - /health/startup - Startup probe (initialization complete)
 */

import express from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis.js';
import logger from '../config/logger.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * Liveness Probe
 * Returns 200 if the process is running
 * Fast, no dependency checks
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../../package.json').version,
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * Readiness Probe
 * Returns 200 if ready to handle requests
 * Checks critical dependencies (database, Redis)
 */
router.get('/ready', async (req, res) => {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
  };
  
  let isHealthy = true;
  
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      try {
        await mongoose.connection.db.admin().ping();
        checks.database = 'ok';
      } catch (error) {
        checks.database = 'error';
        checks.databaseError = error.message;
        isHealthy = false;
        logger.error('Database health check failed', { error: error.message });
      }
    } else {
      checks.database = 'not_connected';
      checks.databaseState = mongoose.connection.readyState;
      isHealthy = false;
    }
    
    // Check Redis connection (optional - don't fail if Redis is down)
    const redis = getRedisClient();
    if (redis && redis.isOpen) {
      try {
        await redis.ping();
        checks.redis = 'ok';
      } catch (error) {
        checks.redis = 'degraded';
        checks.redisError = error.message;
        // Don't mark as unhealthy - Redis is optional for core functionality
        logger.warn('Redis health check failed', { error: error.message });
      }
    } else {
      checks.redis = 'not_connected';
      // Don't mark as unhealthy - Redis is optional
    }
    
    const statusCode = isHealthy ? 200 : 503;
    const status = isHealthy ? 'ok' : 'unhealthy';
    
    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    logger.error('Health check error', { error: error.message });
    
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      checks,
      error: error.message,
    });
  }
});

/**
 * Startup Probe
 * Returns 200 when application has started
 * Used by Kubernetes to know when to start sending traffic
 */
router.get('/startup', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const isStarted = dbConnected;
  
  const status = isStarted ? 'started' : 'starting';
  const statusCode = isStarted ? 200 : 503;
  
  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    databaseConnected: dbConnected,
    connectionState: mongoose.connection.readyState,
  });
});

export default router;
