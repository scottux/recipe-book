/**
 * Authentication Test Helpers
 * 
 * Utilities for creating authenticated users and managing auth in tests
 */

import User from '../../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../../middleware/auth.js';

/**
 * Create a test user with authentication tokens
 * @param {Object} userData - Optional user data overrides
 * @returns {Promise<Object>} { user, accessToken, refreshToken }
 */
export async function createAuthenticatedUser(userData = {}) {
  const defaultData = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    displayName: 'Test User',
    emailVerified: true, // Bypass email verification for tests
  };

  const user = await User.create({
    ...defaultData,
    ...userData,
  });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token to user
  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  return {
    user,
    accessToken,
    refreshToken,
  };
}

/**
 * Create multiple test users
 * @param {number} count - Number of users to create
 * @returns {Promise<Array>} Array of { user, accessToken, refreshToken }
 */
export async function createMultipleUsers(count = 3) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const userData = {
      email: `test-user-${i}-${Date.now()}@example.com`,
      displayName: `Test User ${i + 1}`,
    };
    users.push(await createAuthenticatedUser(userData));
  }
  return users;
}

/**
 * Create user with 2FA enabled
 * @param {Object} userData - Optional user data overrides
 * @returns {Promise<Object>} { user, accessToken, refreshToken, twoFactorSecret }
 */
export async function createUserWith2FA(userData = {}) {
  const speakeasy = (await import('speakeasy')).default;
  
  const secret = speakeasy.generateSecret({
    name: 'Recipe Book Test',
    length: 32,
  });

  const { user, accessToken, refreshToken } = await createAuthenticatedUser({
    ...userData,
    twoFactorEnabled: true,
    twoFactorSecret: secret.base32,
  });

  return {
    user,
    accessToken,
    refreshToken,
    twoFactorSecret: secret.base32,
  };
}

/**
 * Generate valid 2FA token for user
 * @param {string} secret - User's 2FA secret
 * @returns {string} Valid TOTP token
 */
export function generate2FAToken(secret) {
  const speakeasy = require('speakeasy');
  return speakeasy.totp({
    secret,
    encoding: 'base32',
  });
}

/**
 * Create user with password reset token
 * @param {Object} userData - Optional user data overrides
 * @returns {Promise<Object>} { user, resetToken }
 */
export async function createUserWithResetToken(userData = {}) {
  const { user } = await createAuthenticatedUser(userData);
  
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  return {
    user,
    resetToken,
  };
}

/**
 * Create user with email verification token
 * @param {Object} userData - Optional user data overrides
 * @returns {Promise<Object>} { user, verificationToken }
 */
export async function createUserWithVerificationToken(userData = {}) {
  const { user } = await createAuthenticatedUser({
    ...userData,
    emailVerified: false, // Override default
  });
  
  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  return {
    user,
    verificationToken,
  };
}

/**
 * Get authorization header for authenticated requests
 * @param {string} token - Access token
 * @returns {Object} Headers object for supertest
 */
export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Clear all rate limiting maps (for auth controllers that use in-memory limiting)
 * Call this in afterEach to prevent rate limit interference between tests
 */
export function clearAuthRateLimits() {
  // These are exported from authController for testing
  // If rate limiters are in-memory Map objects, clear them
  // This is a placeholder - actual implementation depends on how rate limiters are exposed
}