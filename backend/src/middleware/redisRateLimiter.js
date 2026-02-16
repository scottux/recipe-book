/**
 * Redis-based Rate Limiter Middleware
 * 
 * Implements distributed rate limiting using Redis for:
 * - Per-IP rate limiting (anonymous users)
 * - Per-user rate limiting (authenticated users)
 * - Per-endpoint rate limiting
 * - Graceful fallback if Redis is unavailable
 */

import { getRedisClient } from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Redis Rate Limiter Class
 */
class RedisRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 900000; // 15 minutes
    this.maxRequests = options.maxRequests || 100;
    this.prefix = options.prefix || process.env.REDIS_KEY_PREFIX || 'recipe-book:ratelimit:';
    this.skipFailedRequests = options.skipFailedRequests !== false; // Skip on Redis error
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
  }

  /**
   * Default key generator
   * @param {Request} req - Express request object
   * @returns {string} Rate limit key
   */
  defaultKeyGenerator(req) {
    // Use user ID for authenticated requests, IP for anonymous
    const identifier = req.user?.id || req.ip;
    const endpoint = req.path;
    return `${this.prefix}${endpoint}:${identifier}`;
  }

  /**
   * Check rate limit for a request
   * @param {string} key - Rate limit key
   * @returns {Promise<Object>} Rate limit status
   */
  async checkLimit(key) {
    const redis = getRedisClient();
    
    if (!redis || !redis.isOpen) {
      logger.warn('Redis not available for rate limiting', { key });
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests,
        resetTime: Date.now() + this.windowMs,
        degraded: true,
      };
    }

    try {
      // Increment counter atomically
      const current = await redis.incr(key);
      
      // Set expiry on first increment
      if (current === 1) {
        await redis.pExpire(key, this.windowMs);
      }
      
      // Get TTL for reset time
      const ttl = await redis.pTTL(key);
      const resetTime = ttl > 0 ? Date.now() + ttl : Date.now() + this.windowMs;
      
      return {
        allowed: current <= this.maxRequests,
        limit: this.maxRequests,
        remaining: Math.max(0, this.maxRequests - current),
        resetTime,
        current,
        degraded: false,
      };
    } catch (error) {
      logger.error('Rate limiter error', { error: error.message, key });
      
      // Fail open - allow request on error
      if (this.skipFailedRequests) {
        return {
          allowed: true,
          limit: this.maxRequests,
          remaining: this.maxRequests,
          resetTime: Date.now() + this.windowMs,
          degraded: true,
          error: error.message,
        };
      }
      
      throw error;
    }
  }

  /**
   * Express middleware
   * @returns {Function} Express middleware function
   */
  middleware() {
    return async (req, res, next) => {
      const key = this.keyGenerator(req);
      
      try {
        const result = await this.checkLimit(key);
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', result.limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
        
        // Add degraded mode header if Redis is down
        if (result.degraded) {
          res.setHeader('X-RateLimit-Degraded', 'true');
        }
        
        // Check if rate limit exceeded
        if (!result.allowed) {
          const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
          res.setHeader('Retry-After', retryAfter);
          
          logger.warn('Rate limit exceeded', {
            key,
            current: result.current,
            limit: result.limit,
            ip: req.ip,
            userId: req.user?.id,
            path: req.path,
          });
          
          return res.status(429).json({
            error: 'Too many requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: result.resetTime,
          });
        }
        
        // Attach rate limit info to request for logging
        req.rateLimit = result;
        
        next();
      } catch (error) {
        // If skipFailedRequests is false and we get here, it's a critical error
        logger.error('Critical rate limiter error', {
          error: error.message,
          key,
          path: req.path,
        });
        
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Rate limiting system unavailable',
        });
      }
    };
  }
}

/**
 * Create rate limiter with custom options
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
function createRateLimiter(options) {
  const limiter = new RedisRateLimiter(options);
  return limiter.middleware();
}

/**
 * Preset rate limiters for different use cases
 */

// Standard API rate limiter (100 requests per 15 minutes)
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

// Auth endpoints rate limiter (stricter - 10 requests per 15 minutes)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
});

// Authenticated user rate limiter (more generous - 300 requests per 15 minutes)
const authenticatedLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 300,
});

// Import/upload rate limiter (very strict - 5 requests per hour)
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
});

export {
  RedisRateLimiter,
  createRateLimiter,
  apiLimiter,
  authLimiter,
  authenticatedLimiter,
  uploadLimiter,
};
