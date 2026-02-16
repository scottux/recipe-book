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
    }
  });

  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  return uri;
}

/**
 * Stop MongoDB Memory Server and disconnect mongoose
 */
export async function stopMongoServer() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

/**
 * Clear all collections (useful between tests)
 */
export async function clearDatabase() {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
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