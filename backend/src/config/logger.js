/**
 * Winston Logger Configuration
 * 
 * Provides structured JSON logging with:
 * - Multiple transports (console, file, daily rotation)
 * - Sensitive data redaction
 * - Request ID tracking
 * - Log levels: error, warn, info, http, debug
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../../package.json'), 'utf8')
);

/**
 * Custom format to redact sensitive data
 */
const redactSensitive = winston.format((info) => {
  // Redact password fields
  if (info.password) info.password = '[REDACTED]';
  if (info.newPassword) info.newPassword = '[REDACTED]';
  if (info.currentPassword) info.currentPassword = '[REDACTED]';
  
  // Redact tokens
  if (info.token) info.token = '[REDACTED]';
  if (info.refreshToken) info.refreshToken = '[REDACTED]';
  if (info.resetPasswordToken) info.resetPasswordToken = '[REDACTED]';
  
  // Redact authorization headers
  if (info.authorization) info.authorization = '[REDACTED]';
  if (info.headers?.authorization) info.headers.authorization = '[REDACTED]';
  
  // Redact JWT tokens from cookies
  if (info.cookies?.token) info.cookies.token = '[REDACTED]';
  
  return info;
});

/**
 * Create logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    winston.format.errors({ stack: true }),
    redactSensitive(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'recipe-book-api',
    environment: process.env.NODE_ENV || 'development',
    version: packageJson.version,
  },
  transports: [],
});

// Only add file transports in production or if explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  const logDir = process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs');
  
  // Error log - separate file for errors
  logger.add(
    new DailyRotateFile({
      level: 'error',
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      zippedArchive: true,
    })
  );
  
  // Combined log - all logs
  logger.add(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      zippedArchive: true,
    })
  );
}

// Console transport for development or when enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CONSOLE_LOGGING === 'true') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          let metaStr = '';
          if (Object.keys(meta).length > 0) {
            // Filter out environment and version from console output
            const { environment, version, ...restMeta } = meta;
            if (Object.keys(restMeta).length > 0) {
              metaStr = ` ${JSON.stringify(restMeta)}`;
            }
          }
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      ),
    })
  );
}

/**
 * Create a child logger with additional context
 * @param {Object} context - Additional context to include in all logs
 * @returns {winston.Logger} Child logger instance
 */
logger.child = function (context) {
  return winston.loggers.add(JSON.stringify(context), {
    format: winston.format.combine(
      winston.format.timestamp(),
      redactSensitive(),
      winston.format.json()
    ),
    defaultMeta: { ...this.defaultMeta, ...context },
    transports: this.transports,
  });
};

export default logger;
