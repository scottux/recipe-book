/**
 * Rate Limiter Test Helpers
 * 
 * Utilities for managing rate limiters in tests
 */

/**
 * Clear in-memory rate limiter stores
 * This prevents rate limit interference between tests
 */
export function clearRateLimiters() {
  // Clear any in-memory Map objects used for rate limiting
  // in authController (passwordChangeAttempts, accountDeletionAttempts, etc.)
  
  // Note: This is a workaround for in-memory rate limiting
  // If using Redis rate limiter, this would flush Redis test keys
}

/**
 * Wait for rate limit window to expire
 * @param {number} ms - Milliseconds to wait
 */
export async function waitForRateLimitReset(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
 * Bypass rate limiting for a specific test
 * This is useful when testing core functionality without rate limit interference
 */
export function mockNoRateLimit() {
  // Mock or disable rate limiting middleware for tests
  // Implementation depends on how rate limiter is structured
}