/**
 * Request Logging Middleware
 * 
 * Provides:
 * - Unique request ID generation and tracking
 * - HTTP request/response logging with context
 * - Performance timing
 * - User context attachment
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

/**
 * Request ID Middleware
 * Generates unique ID for each request and adds to response headers
 */
const requestId = (req, res, next) => {
  // Use existing request ID from header or generate new one
  req.id = req.get('X-Request-ID') || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Request Logger Middleware
 * Logs HTTP requests with timing and context
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log after response is sent
  res.end = function (...args) {
    // Calculate request duration
    const duration = Date.now() - startTime;
    
    // Build log context
    const logContext = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    
    // Add user context if authenticated
    if (req.user) {
      logContext.userId = req.user.id;
      logContext.username = req.user.username;
    }
    
    // Add query params if present (but redact sensitive ones)
    if (req.query && Object.keys(req.query).length > 0) {
      const sanitizedQuery = { ...req.query };
      // Redact sensitive query params
      if (sanitizedQuery.token) sanitizedQuery.token = '[REDACTED]';
      if (sanitizedQuery.password) sanitizedQuery.password = '[REDACTED]';
      logContext.query = sanitizedQuery;
    }
    
    // Add rate limit info if available
    if (req.rateLimit) {
      logContext.rateLimit = {
        remaining: req.rateLimit.remaining,
        limit: req.rateLimit.limit,
        degraded: req.rateLimit.degraded,
      };
    }
    
    // Add content length if available
    const contentLength = res.get('content-length');
    if (contentLength) {
      logContext.responseSize = parseInt(contentLength);
    }
    
    // Determine log level based on status code
    let logLevel = 'info';
    if (res.statusCode >= 500) {
      logLevel = 'error';
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
    }
    
    // Log the request
    const message = `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;
    logger[logLevel](message, logContext);
    
    // Call original end function
    return originalEnd.apply(res, args);
  };
  
  next();
};

/**
 * Error Logger Middleware
 * Logs errors with full context
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip,
  });
  
  next(err);
};

export { requestId, requestLogger, errorLogger };
