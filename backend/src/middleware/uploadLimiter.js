import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const rateLimit = require('express-rate-limit');

/**
 * Create rate limiter for file upload/import operations
 * Prevents abuse and resource exhaustion
 */
export const createUploadLimiter = (options = {}) => {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return (req, res, next) => next();
  }
  
  const defaults = {
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // 5 requests per hour per IP
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count all attempts
    skipFailedRequests: false, // Count all attempts
    message: {
      success: false,
      error: 'Too many import attempts',
      details: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Maximum 5 imports per hour. Please try again later.',
      },
    },
    handler: (req, res) => {
      const resetTime = req.rateLimit.resetTime;
      const now = Date.now();
      const minutesRemaining = Math.ceil((resetTime - now) / 1000 / 60);

      res.status(429).json({
        success: false,
        error: 'Too many import attempts',
        details: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Maximum 5 imports per hour. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
          retryAfter: Math.ceil((resetTime - now) / 1000),
        },
      });
    },
  };

  return rateLimit({ ...defaults, ...options });
};

/**
 * Default import rate limiter
 * 5 imports per hour per IP address
 */
export const importLimiter = createUploadLimiter();