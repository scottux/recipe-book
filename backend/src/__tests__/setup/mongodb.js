/**
 * MongoDB Memory Server Setup with Replica Set Support
 * 
 * Provides a shared MongoDB in-memory instance with replica set enabled
 * for transaction support in integration tests
 */

import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

/**
 * Start MongoDB Memory Server with replica set
 * @returns {Promise<string>} MongoDB connection URI
 */
export async function startMongoServer() {
  if (mongoServer) {
    return mongoServer.getUri();
  }

  // Create replica set with single node (sufficient for tests)
  mongoServer = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger'
    },
    instanceOpts: [{
      port: 27017 // Use fixed port for consistency
    }]
  });

  const uri = mongoServer.getUri();
  
  // Connect mongoose with proper options
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000, // Increased from default 5000ms
    socketTimeoutMS: 45000, // Increased from default 30000ms
  });

  return uri;
}

/**
 * Stop MongoDB Memory Server and disconnect mongoose
 */
export async function stopMongoServer() {
  try {
    // Close all mongoose connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    // Stop the MongoDB Memory Server
    if (mongoServer) {
      await mongoServer.stop({ doCleanup: true, force: false });
      mongoServer = null;
    }
  } catch (error) {
    console.error('Error during MongoDB cleanup:', error);
    // Force cleanup
    if (mongoServer) {
      try {
        await mongoServer.stop({ doCleanup: true, force: true });
      } catch (forceError) {
        console.error('Force cleanup failed:', forceError);
      }
      mongoServer = null;
    }
  }
}

/**
 * Clear all collections (useful between tests)
 * Safe to call even if connection is not ready
 */
export async function clearDatabase() {
  // Ensure connection is ready
  if (mongoose.connection.readyState !== 1) {
    console.warn('MongoDB connection not ready, skipping clearDatabase');
    return;
  }

  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    try {
      await collection.deleteMany({});
    } catch (error) {
      console.error(`Error clearing collection ${key}:`, error.message);
    }
  }
}

/**
 * Ensure mongoose is connected to the test database
 * Reuses existing connection if available
 * 
 * NOTE: This function should NEVER start MongoDB - that's done by globalSetup
 * It only waits for and connects to the already-running instance
 */
export async function ensureConnection() {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection.getClient();
  }

  // If connecting, wait for it
  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve) => {
      mongoose.connection.once('connected', resolve);
    });
    return mongoose.connection.getClient();
  }

  // Wait for globalSetup to provide the URI via global state
  const uri = global.__MONGO_URI__;
  if (!uri) {
    throw new Error(
      'MongoDB URI not found in global state. ' +
      'Ensure globalSetup has run and set global.__MONGO_URI__'
    );
  }

  // Connect to the already-running MongoDB instance
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });

  return mongoose.connection.getClient();
}

/**
 * Get the current MongoDB server instance
 * @returns {MongoMemoryReplSet|null}
 */
export function getMongoServer() {
  return mongoServer;
}

export default {
  startMongoServer,
  stopMongoServer,
  clearDatabase,
  getMongoServer
};