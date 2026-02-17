/**
 * Rate Limiter Test Helpers
 * 
 * Utilities for managing rate limiting in tests.
 */

import { clearRateLimit } from '../../middleware/rateLimiter.js';

// Track all used emails and IPs for cleanup
const usedEmails = new Set();
const usedIps = new Set();

/**
 * Register email/IP for cleanup
 * Call this when making requests that should be tracked
 */
export const trackRateLimitKey = (email, ip) => {
  if (email) usedEmails.add(email.toLowerCase());
  if (ip) usedIps.add(ip);
};

/**
 * Clear all tracked rate limits
 * Call in afterEach to reset state between tests
 */
export const clearAllRateLimits = () => {
  // Clear all tracked emails and IPs
  for (const email of usedEmails) {
    clearRateLimit(email, null);
  }
  for (const ip of usedIps) {
    clearRateLimit(null, ip);
  }
  
  // Clear the tracking sets
  usedEmails.clear();
  usedIps.clear();
};

/**
 * Clear specific rate limit
 */
export const clearSpecificRateLimit = (email, ip) => {
  clearRateLimit(email?.toLowerCase(), ip);
};

/**
 * Clear Redis rate limiter cache (if using Redis)
 * @param {Object} redisClient - Redis client instance
 */
export async function clearRedisRateLimits(redisClient) {
  if (redisClient && redisClient.isOpen) {
    try {
      // Clear all keys matching rate limit pattern
      const keys = await redisClient.keys('ratelimit:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.warn('Failed to clear Redis rate limits:', error.message);
    }
  }
}

/**
 * Wait for rate limit window to expire
 * @param {number} ms - Milliseconds to wait
 */
export async function waitForRateLimitReset(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock rate limiter to always allow requests
 * Useful for tests that don't need to test rate limiting
 */
export const mockRateLimiter = () => {
  return (req, res, next) => next();
};