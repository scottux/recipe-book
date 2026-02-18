/**
 * Authentication Helper Module for Integration Tests
 * 
 * Provides utilities for creating authenticated test users and managing
 * authentication state in integration tests. Each test gets isolated
 * authentication state to prevent cross-test contamination.
 * 
 * @module helpers/authHelpers
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../../models/User.js';

// Track test users for cleanup
let testUsers = [];

/**
 * Create an authenticated test user with JWT token
 * 
 * Generates a unique test user with hashed password and valid JWT token.
 * Each call creates a completely isolated user to prevent test interference.
 * 
 * @param {Object} userData - User data override
 * @param {string} [userData.username] - Unique username (auto-generated if not provided)
 * @param {string} [userData.email] - Unique email (auto-generated if not provided)
 * @param {string} [userData.password='Test123!'] - Password (will be hashed)
 * @param {boolean} [userData.emailVerified=true] - Email verified status
 * @param {boolean} [userData.twoFactorEnabled=false] - 2FA status
 * @returns {Promise<{user: Object, token: string}>} User object and JWT token
 * 
 * @example
 * const { user, token } = await createAuthenticatedUser();
 * const headers = getAuthHeaders(token);
 * 
 * @example
 * const { user, token } = await createAuthenticatedUser({
 *   email: 'specific@example.com',
 *   emailVerified: true
 * });
 */
export async function createAuthenticatedUser(userData = {}) {
  // Generate unique identifiers to prevent collisions
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  
  const defaultUser = {
    username: `test_${timestamp}_${randomSuffix}`,
    email: `test_${timestamp}_${randomSuffix}@example.com`,
    displayName: `Test User ${randomSuffix}`,
    password: 'Test123!',
    emailVerified: true,
    twoFactorEnabled: false,
    testUser: true // Marker for identification and cleanup
  };
  
  const finalUserData = { ...defaultUser, ...userData };
  
  // Hash password using bcrypt
  const hashedPassword = await bcrypt.hash(finalUserData.password, 10);
  
  // Create user in database
  const user = await User.create({
    ...finalUserData,
    password: hashedPassword
  });
  
  // Generate JWT token with 1 hour expiration (sufficient for tests)
  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
  
  // Track user ID for cleanup
  testUsers.push(user._id);
  
  // Return user object without password
  return {
    user: user.toObject(),
    token
  };
}

/**
 * Get authorization headers for authenticated requests
 * 
 * @param {string} token - JWT token
 * @returns {Object} Headers object with Authorization and Content-Type
 * 
 * @example
 * const headers = getAuthHeaders(token);
 * const response = await request(app)
 *   .get('/api/recipes')
 *   .set(headers);
 */
export function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Clean up all test users created during test run
 * 
 * Removes all users tracked in the testUsers array. Should be called
 * in afterEach or afterAll hooks to prevent test data accumulation.
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * afterEach(async () => {
 *   await cleanupTestUsers();
 * });
 */
export async function cleanupTestUsers() {
  if (testUsers.length === 0) return;
  
  try {
    await User.deleteMany({ _id: { $in: testUsers } });
    testUsers = [];
  } catch (error) {
    console.error('Error cleaning up test users:', error.message);
    // Don't throw - cleanup failures shouldn't break tests
    testUsers = [];
  }
}

/**
 * Create multiple authenticated test users
 * 
 * Convenience method for creating multiple isolated test users at once.
 * Useful for testing multi-user scenarios.
 * 
 * @param {number} count - Number of users to create
 * @returns {Promise<Array<{user: Object, token: string}>>} Array of user/token pairs
 * 
 * @example
 * const users = await createMultipleUsers(3);
 * const [user1, user2, user3] = users;
 * 
 * @example
 * const [owner, collaborator] = await createMultipleUsers(2);
 */
export async function createMultipleUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const { user, token } = await createAuthenticatedUser();
    users.push({ user, token });
  }
  return users;
}

/**
 * Verify JWT token is valid
 * 
 * Decodes and validates a JWT token using the configured secret.
 * Useful for testing token generation and validation logic.
 * 
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} Decoded token payload
 * @throws {Error} If token is invalid or expired
 * 
 * @example
 * const payload = await verifyToken(token);
 * expect(payload.userId).toBeDefined();
 * expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
 */
export async function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key');
}

/**
 * Generate a JWT token for an existing user
 * 
 * Useful when you need to generate a token for a user created outside
 * of this helper module.
 * 
 * @param {string|Object} userId - User ID (string or MongoDB ObjectId)
 * @param {Object} [options={}] - Token options
 * @param {string} [options.expiresIn='1h'] - Token expiration
 * @returns {string} JWT token
 * 
 * @example
 * const token = generateAuthToken(existingUser._id);
 * 
 * @example
 * const shortToken = generateAuthToken(userId, { expiresIn: '5m' });
 */
export function generateAuthToken(userId, options = {}) {
  const { expiresIn = '1h' } = options;
  
  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn }
  );
}

/**
 * Reset the test user tracking array
 * 
 * Clears the internal tracking array without deleting users from database.
 * Useful if you need to manage cleanup manually.
 * 
 * @returns {void}
 * 
 * @example
 * // Manual cleanup flow
 * await User.deleteMany({ testUser: true });
 * resetTestUserTracking();
 */
export function resetTestUserTracking() {
  testUsers = [];
}

/**
 * Get count of tracked test users
 * 
 * Returns the number of test users currently being tracked for cleanup.
 * Useful for debugging test cleanup issues.
 * 
 * @returns {number} Number of tracked test users
 * 
 * @example
 * console.log(`${getTrackedUserCount()} users pending cleanup`);
 */
export function getTrackedUserCount() {
  return testUsers.length;
}

/**
 * Create a user with a password reset token
 * 
 * Creates a test user with a valid password reset token and expiration.
 * Useful for testing password reset flows without going through email.
 * Returns both the Mongoose document and plain object for flexibility.
 * 
 * @param {Object} userData - User data override
 * @param {string} [userData.email] - User email (auto-generated if not provided)
 * @param {string} [userData.password='Test123!'] - Password (will be hashed)
 * @returns {Promise<{user: Object, userDoc: Document, resetToken: string}>} Plain user object, Mongoose document, and reset token
 * 
 * @example
 * const { user, userDoc, resetToken } = await createUserWithResetToken();
 * // Use user for comparison, userDoc for .save(), resetToken for requests
 * 
 * @example
 * const { userDoc, resetToken } = await createUserWithResetToken({
 *   email: 'specific@example.com'
 * });
 * userDoc.resetPasswordExpires = new Date(Date.now() - 1000);
 * await userDoc.save();
 */
export async function createUserWithResetToken(userData = {}) {
  const crypto = await import('crypto');
  
  // Generate unique identifiers
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  
  const defaultUser = {
    username: `test_${timestamp}_${randomSuffix}`,
    email: userData.email || `test_${timestamp}_${randomSuffix}@example.com`,
    displayName: userData.displayName || `Test User ${randomSuffix}`,
    password: userData.password || 'Test123!',
    emailVerified: true,
    testUser: true
  };
  
  const finalUserData = { ...defaultUser, ...userData };
  
  // Hash password
  const hashedPassword = await bcrypt.hash(finalUserData.password, 10);
  
  // Generate reset token (same logic as authController)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  // Create user with reset token
  const userDoc = await User.create({
    ...finalUserData,
    password: hashedPassword,
    resetPasswordToken: hashedToken,
    resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
  });
  
  // Track user for cleanup
  testUsers.push(userDoc._id);
  
  return {
    user: userDoc.toObject(), // Plain object for comparisons
    userDoc, // Mongoose document for .save() operations
    resetToken // Return unhashed token (what user would receive in email)
  };
}
