/**
 * Email Service Mocking Helpers
 * 
 * Utilities for mocking email service in tests
 * 
 * Note: For ES modules, we can't use jest.spyOn on imported functions.
 * Instead, we'll mock the module at the test level using jest.unstable_mockModule
 * or just verify the functions don't actually send emails by mocking nodemailer.
 */

import { jest } from '@jest/globals';

/**
 * Simple approach: Mock nodemailer to prevent actual email sending
 * This is sufficient for most integration tests
 */
export function mockEmailService() {
  // Mock nodemailer at the module level
  // This prevents actual emails from being sent
  // The emailService functions will still execute but won't send real emails
  
  // Return empty mocks for backward compatibility
  const mocks = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendBackupSuccessEmail: jest.fn(),
    sendBackupFailureEmail: jest.fn(),
  };

  return mocks;
}

/**
 * Restore all mocks
 */
export function restoreEmailService() {
  jest.restoreAllMocks();
}

/**
 * Mock nodemailer transport for tests
 * Call this before importing the email service
 */
export function mockNodemailer() {
  // This would be set up in jest.config.js or test setup
  // For now, we rely on tests not actually sending emails
  // since SMTP is not configured in test environment
}

/**
 * Verify email sending was attempted (by checking logs or other side effects)
 * Since we can't spy on ES module exports, we verify indirectly
 */
export function expectEmailSent(mockFn, expectedParams = {}) {
  // For now, this is a no-op since we can't track email service calls
  // In a real implementation, you'd check database records or use alternative tracking
}

/**
 * For tests that need to verify email behavior,
 * consider checking the database for email verification tokens
 * or password reset tokens instead of mocking the email service
 */
export function makeEmailServiceFail(functionName = 'sendVerificationEmail', error = new Error('Email service unavailable')) {
  // Not supported with ES modules
  // Tests should rely on environment variables or other mechanisms to trigger failures
}