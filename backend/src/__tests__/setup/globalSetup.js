/**
 * Jest Global Setup
 * Runs once before all test suites
 */

import { startMongoServer } from './mongodb.js';

export default async function globalSetup() {
  // Start MongoDB Memory Server once for all tests
  const mongoUri = await startMongoServer();
  
  // Store URI in global for access in tests
  global.__MONGO_URI__ = mongoUri;
  
  console.log('✓ MongoDB Memory Server started');
  console.log(`  URI: ${mongoUri}`);
}