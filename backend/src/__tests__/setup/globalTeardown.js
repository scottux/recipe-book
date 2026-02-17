/**
 * Jest Global Teardown
 * Runs once after all test suites complete
 */

import { stopMongoServer } from './mongodb.js';

export default async function globalTeardown() {
  // Stop MongoDB Memory Server
  await stopMongoServer();
  
  console.log('✓ MongoDB Memory Server stopped');
  console.log('✓ All connections closed');
}