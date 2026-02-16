/**
 * Redis Client Configuration
 * 
 * Provides a configured Redis client with connection error handling
 * and automatic reconnection.
 */

import { createClient } from 'redis';
import logger from './logger.js';

let client = null;

/**
 * Initialize Redis client
 * @returns {Promise<RedisClient>} Configured Redis client
 */
async function initializeRedis() {
  if (client) {
    return client;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisPassword = process.env.REDIS_PASSWORD;

  client = createClient({
    url: redisUrl,
    password: redisPassword,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnection failed after 10 attempts');
          return new Error('Redis reconnection failed');
        }
        // Exponential backoff: 2^retries * 100ms, max 3s
        return Math.min(Math.pow(2, retries) * 100, 3000);
      },
    },
  });

  // Event handlers
  client.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  client.on('reconnecting', () => {
    logger.warn('Redis client reconnecting');
  });

  client.on('end', () => {
    logger.info('Redis client disconnected');
  });

  try {
    await client.connect();
    logger.info('Redis initialized successfully', { url: redisUrl });
  } catch (error) {
    logger.error('Failed to initialize Redis', { error: error.message });
    // Don't throw - allow app to start without Redis
  }

  return client;
}

/**
 * Get Redis client instance
 * @returns {RedisClient|null} Redis client or null if not initialized
 */
function getRedisClient() {
  return client;
}

/**
 * Close Redis connection gracefully
 */
async function closeRedis() {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
    logger.info('Redis connection closed');
  }
}

export { initializeRedis, getRedisClient, closeRedis };
