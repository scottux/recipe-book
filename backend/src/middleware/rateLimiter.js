/**
 * Rate Limiter Middleware
 * 
 * Provides specialized rate limiting for password reset operations.
 * Uses in-memory storage with automatic cleanup.
 */

// In-memory storage for rate limiting
const emailAttempts = new Map(); // email -> [timestamps]
const ipAttempts = new Map();    // ip -> [timestamps]

/**
 * Clean up old attempts (remove entries older than retention period)
 * 
 * @param {Map} store - The storage map to clean
 * @param {number} retentionMs - How long to keep entries (in milliseconds)
 */
const cleanupOldAttempts = (store, retentionMs) => {
  const now = Date.now();
  const cutoff = now - retentionMs;
  
  for (const [key, timestamps] of store.entries()) {
    const validTimestamps = timestamps.filter(t => t > cutoff);
    
    if (validTimestamps.length === 0) {
      store.delete(key);
    } else {
      store.set(key, validTimestamps);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(() => {
  cleanupOldAttempts(emailAttempts, 60 * 60 * 1000); // 1 hour
  cleanupOldAttempts(ipAttempts, 60 * 60 * 1000);    // 1 hour
}, 5 * 60 * 1000);

/**
 * Get client IP address from request
 * Handles proxies and forwarded headers
 * 
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
};

/**
 * Rate limiter for password reset requests
 * 
 * Limits:
 * - 3 requests per email per hour
 * - 10 requests per IP per hour
 * 
 * @returns {Function} Express middleware function
 */
export const passwordResetRateLimiter = () => {
  return (req, res, next) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    
    // Get email from request body
    const email = req.body.email?.toLowerCase();
    const ip = getClientIp(req);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required.'
      });
    }
    
    // Check email-based rate limit (3 per hour)
    let emailTimestamps = emailAttempts.get(email) || [];
    emailTimestamps = emailTimestamps.filter(t => t > hourAgo);
    
    if (emailTimestamps.length >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Too many password reset requests for this email. Please try again later.',
        retryAfter: Math.ceil((emailTimestamps[0] + 60 * 60 * 1000 - now) / 1000)
      });
    }
    
    // Check IP-based rate limit (10 per hour)
    let ipTimestamps = ipAttempts.get(ip) || [];
    ipTimestamps = ipTimestamps.filter(t => t > hourAgo);
    
    if (ipTimestamps.length >= 10) {
      return res.status(429).json({
        success: false,
        error: 'Too many password reset requests from this location. Please try again later.',
        retryAfter: Math.ceil((ipTimestamps[0] + 60 * 60 * 1000 - now) / 1000)
      });
    }
    
    // Record this attempt
    emailTimestamps.push(now);
    ipTimestamps.push(now);
    
    emailAttempts.set(email, emailTimestamps);
    ipAttempts.set(ip, ipTimestamps);
    
    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Limit-Email', '3');
    res.setHeader('X-RateLimit-Remaining-Email', Math.max(0, 3 - emailTimestamps.length));
    res.setHeader('X-RateLimit-Limit-IP', '10');
    res.setHeader('X-RateLimit-Remaining-IP', Math.max(0, 10 - ipTimestamps.length));
    
    next();
  };
};

/**
 * Generic rate limiter factory
 * 
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {string} options.message - Error message for rate limit exceeded
 * @param {string} options.keyGenerator - Function to generate rate limit key from request
 * @returns {Function} Express middleware function
 */
export const createRateLimiter = ({
  windowMs = 60 * 60 * 1000, // 1 hour default
  maxRequests = 100,
  message = 'Too many requests. Please try again later.',
  keyGenerator = (req) => getClientIp(req)
}) => {
  const attempts = new Map();
  
  // Cleanup old attempts periodically
  setInterval(() => {
    cleanupOldAttempts(attempts, windowMs);
  }, Math.min(windowMs / 2, 5 * 60 * 1000)); // Cleanup at half window or 5 min max
  
  return (req, res, next) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = keyGenerator(req);
    
    let timestamps = attempts.get(key) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    
    if (timestamps.length >= maxRequests) {
      const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', timestamps[0] + windowMs);
      res.setHeader('Retry-After', retryAfter);
      
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter
      });
    }
    
    timestamps.push(now);
    attempts.set(key, timestamps);
    
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - timestamps.length));
    
    next();
  };
};

/**
 * Clear rate limit for a specific key (useful for testing or manual intervention)
 * 
 * @param {string} email - Email to clear from rate limits
 * @param {string} ip - IP to clear from rate limits
 */
export const clearRateLimit = (email, ip) => {
  if (email) emailAttempts.delete(email.toLowerCase());
  if (ip) ipAttempts.delete(ip);
};

/**
 * Get current rate limit status for debugging
 * 
 * @param {string} email - Email to check
 * @param {string} ip - IP to check
 * @returns {Object} Current status
 */
export const getRateLimitStatus = (email, ip) => {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  
  const status = {};
  
  if (email) {
    const timestamps = (emailAttempts.get(email.toLowerCase()) || [])
      .filter(t => t > hourAgo);
    status.email = {
      attempts: timestamps.length,
      remaining: Math.max(0, 3 - timestamps.length),
      resetAt: timestamps.length > 0 ? timestamps[0] + 60 * 60 * 1000 : null
    };
  }
  
  if (ip) {
    const timestamps = (ipAttempts.get(ip) || [])
      .filter(t => t > hourAgo);
    status.ip = {
      attempts: timestamps.length,
      remaining: Math.max(0, 10 - timestamps.length),
      resetAt: timestamps.length > 0 ? timestamps[0] + 60 * 60 * 1000 : null
    };
  }
  
  return status;
};