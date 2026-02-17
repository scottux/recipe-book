/**
 * Test Helpers Index
 * 
 * Central export point for all test helpers
 */

export * from './authHelpers.js';
export * from './emailMocks.js';
export * from './rateLimiterHelpers.js';
export * from './testDataFactories.js';
export * from './requestHelpers.js';

/**
 * Common test setup helper
 * Call this in beforeEach to set up common test state
 */
export async function setupTest() {
  // Common setup logic
  // Clear rate limiters, mock email, etc.
}

/**
 * Common test teardown helper
 * Call this in afterEach to clean up test state
 */
export async function teardownTest() {
  // Common teardown logic
  // Restore mocks, clear caches, etc.
}