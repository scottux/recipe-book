/**
 * Backup Restorer Service
 * Restore data from cloud backups with transaction safety
 */

import mongoose from 'mongoose';
import Recipe from '../models/Recipe.js';
import Collection from '../models/Collection.js';
import MealPlan from '../models/MealPlan.js';
import ShoppingList from '../models/ShoppingList.js';
import { processImport } from './importProcessor.js';
import logger from '../config/logger.js';

/**
 * Restore from backup data
 * @param {string} userId - User ID
 * @param {Object} backupData - Parsed backup data
 * @param {string} mode - 'merge' or 'replace'
 * @returns {Promise<Object>} Import statistics
 * @throws {Error} If restore fails
 */
export async function restoreFromBackup(userId, backupData, mode) {
  logger.info(`Starting restore for user ${userId}`, {
    mode,
    recipeCount: backupData.recipes?.length || 0
  });

  // Only use transactions if running on replica set (production)
  // MongoDB Memory Server (tests) doesn't support transactions
  let session = null;
  let useSession = false;
  
  try {
    session = await mongoose.startSession();
    await session.startTransaction();
    useSession = true;
  } catch (sessionError) {
    // Standalone MongoDB (like Memory Server) - continue without session
    logger.debug('Transaction not supported, continuing without transaction support', {
      error: sessionError.message
    });
    if (session) {
      session.endSession();
    }
    session = null;
    useSession = false;
  }

  try {

    let stats;

    if (mode === 'replace') {
      logger.info(`Replace mode: Deleting existing data for user ${userId}`);

      // Delete all existing data
      await deleteExistingData(userId, useSession ? session : null);

      // Import all from backup (no duplicate checking needed)
      stats = await importBackupData(userId, backupData, useSession ? session : null, false);

      logger.info(`Replace mode complete: ${stats.totalImported} items imported`);
    } else {
      logger.info(`Merge mode: Importing with duplicate checking for user ${userId}`);

      // Merge mode: Import with duplicate checking
      stats = await importBackupData(userId, backupData, useSession ? session : null, true);

      logger.info(`Merge mode complete: ${stats.totalImported} items imported, ${stats.totalSkipped} skipped`);
    }

    if (session) {
      await session.commitTransaction();
    }

    logger.info(`Restore successful for user ${userId}`, { stats });

    return stats;
  } catch (error) {
    logger.error(`Restore failed for user ${userId}`, {
      error: error.message,
      stack: error.stack
    });

    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        // Ignore abort errors
      }
    }
    throw new Error(`Restore failed: ${error.message}`);
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

/**
 * Delete all existing user data
 * @param {string} userId - User ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<Object>} Deletion counts
 */
async function deleteExistingData(userId, session) {
  logger.debug(`Deleting existing data for user ${userId}`);

  // Execute queries with optional session
  let results;
  if (session) {
    results = await Promise.all([
      Recipe.deleteMany({ owner: userId }).session(session),
      Collection.deleteMany({ owner: userId }).session(session),
      MealPlan.deleteMany({ owner: userId }).session(session),
      ShoppingList.deleteMany({ owner: userId }).session(session)
    ]);
  } else {
    results = await Promise.all([
      Recipe.deleteMany({ owner: userId }),
      Collection.deleteMany({ owner: userId }),
      MealPlan.deleteMany({ owner: userId }),
      ShoppingList.deleteMany({ owner: userId })
    ]);
  }

  const counts = {
    recipes: results[0].deletedCount,
    collections: results[1].deletedCount,
    mealPlans: results[2].deletedCount,
    shoppingLists: results[3].deletedCount
  };

  logger.info(`Existing data deleted for user ${userId}`, counts);

  return counts;
}

/**
 * Import backup data
 * @param {string} userId - User ID
 * @param {Object} backupData - Parsed backup data
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {boolean} checkDuplicates - Whether to skip duplicates
 * @returns {Promise<Object>} Import statistics
 */
async function importBackupData(userId, backupData, session, checkDuplicates = false) {
  logger.debug(`Importing backup data for user ${userId}`, {
    checkDuplicates,
    recipeCount: backupData.recipes?.length || 0,
    collectionCount: backupData.collections?.length || 0,
    mealPlanCount: backupData.mealPlans?.length || 0,
    shoppingListCount: backupData.shoppingLists?.length || 0
  });

  // Prepare import data structure (same format as REQ-016)
  const importData = {
    recipes: backupData.recipes || [],
    collections: backupData.collections || [],
    mealPlans: backupData.mealPlans || [],
    shoppingLists: backupData.shoppingLists || []
  };

  // Reuse existing import processor from REQ-016
  const stats = await processImport(userId, importData, session, checkDuplicates);

  logger.debug(`Import complete for user ${userId}`, stats);

  return stats;
}

/**
 * Validate restore can be performed
 * @param {string} userId - User ID
 * @param {Object} backupData - Parsed backup data
 * @param {string} mode - 'merge' or 'replace'
 * @returns {Promise<Object>} Validation result
 */
export async function validateRestore(userId, backupData, mode) {
  const issues = [];

  // Check if backup data is valid
  if (!backupData.recipes || !Array.isArray(backupData.recipes)) {
    issues.push('Invalid backup: missing or invalid recipes array');
  }

  // Check mode
  if (!['merge', 'replace'].includes(mode)) {
    issues.push(`Invalid restore mode: ${mode}. Must be 'merge' or 'replace'`);
  }

  // In merge mode, check for potential conflicts
  if (mode === 'merge' && backupData.recipes?.length > 0) {
    const existingCount = await Recipe.countDocuments({ owner: userId });

    if (existingCount > 0) {
      logger.debug(`Merge mode: User has ${existingCount} existing recipes`);
    }
  }

  // In replace mode, warn about data deletion
  if (mode === 'replace') {
    const existingCounts = await Promise.all([
      Recipe.countDocuments({ owner: userId }),
      Collection.countDocuments({ owner: userId }),
      MealPlan.countDocuments({ owner: userId }),
      ShoppingList.countDocuments({ owner: userId })
    ]);

    const totalExisting =
      existingCounts[0] + existingCounts[1] + existingCounts[2] + existingCounts[3];

    if (totalExisting > 0) {
      logger.warn(`Replace mode: ${totalExisting} existing items will be deleted`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings: []
  };
}

/**
 * Get restore preview (estimate what will happen)
 * @param {string} userId - User ID
 * @param {Object} backupData - Parsed backup data
 * @param {string} mode - 'merge' or 'replace'
 * @returns {Promise<Object>} Preview data
 */
export async function getRestorePreview(userId, backupData, mode) {
  const backupCounts = {
    recipes: backupData.recipes?.length || 0,
    collections: backupData.collections?.length || 0,
    mealPlans: backupData.mealPlans?.length || 0,
    shoppingLists: backupData.shoppingLists?.length || 0
  };

  const existingCounts = {
    recipes: await Recipe.countDocuments({ owner: userId }),
    collections: await Collection.countDocuments({ owner: userId }),
    mealPlans: await MealPlan.countDocuments({ owner: userId }),
    shoppingLists: await ShoppingList.countDocuments({ owner: userId })
  };

  let preview;

  if (mode === 'replace') {
    preview = {
      mode: 'replace',
      action: 'All existing data will be deleted and replaced with backup data',
      willDelete: existingCounts,
      willImport: backupCounts,
      finalCount: backupCounts
    };
  } else {
    // Merge mode: Approximate (actual duplicates will be determined during import)
    preview = {
      mode: 'merge',
      action: 'Backup data will be added to existing data (duplicates skipped)',
      existing: existingCounts,
      fromBackup: backupCounts,
      estimatedFinal: {
        recipes: existingCounts.recipes + backupCounts.recipes,
        collections: existingCounts.collections + backupCounts.collections,
        mealPlans: existingCounts.mealPlans + backupCounts.mealPlans,
        shoppingLists: existingCounts.shoppingLists + backupCounts.shoppingLists
      },
      note: 'Actual counts may be lower due to duplicate detection'
    };
  }

  return preview;
}