/**
 * Backup Parser Service
 * Parse and validate cloud backup ZIP files
 */

import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import logger from '../config/logger.js';

/**
 * Parse a backup ZIP file
 * @param {string} filePath - Path to backup ZIP file
 * @returns {Promise<Object>} Parsed backup data
 * @throws {Error} If backup is invalid or corrupted
 */
export async function parseBackup(filePath) {
  logger.info(`Parsing backup file: ${filePath}`);

  try {
    // 1. Extract ZIP
    const extractDir = `${filePath}-extracted`;
    await extractZip(filePath, extractDir);

    try {
      // 2. Read JSON
      const jsonPath = path.join(extractDir, 'backup.json');
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const data = JSON.parse(jsonContent);

      // 3. Validate structure
      validateBackupStructure(data);

      // 4. Check version compatibility
      validateVersion(data.version);

      logger.info(`Backup parsed successfully: ${data.recipes?.length || 0} recipes`);

      return data;
    } finally {
      // 5. Cleanup extracted files
      await fs.rm(extractDir, { recursive: true, force: true });
    }
  } catch (error) {
    logger.error('Failed to parse backup', {
      error: error.message,
      filePath
    });
    throw error;
  }
}

/**
 * Get backup preview (metadata only, without full parsing)
 * @param {string} filePath - Path to backup ZIP file
 * @param {Object} options - Preview options
 * @param {boolean} options.includeDetails - Include detailed content lists
 * @param {number} options.maxRecipes - Max recipes to include in preview
 * @param {number} options.maxCollectionRecipes - Max recipes to show per collection
 * @returns {Promise<Object>} Backup preview data
 */
export async function getBackupPreview(filePath, options = {}) {
  const {
    includeDetails = true,
    maxRecipes = 100,
    maxCollectionRecipes = 10
  } = options;

  logger.info(`Getting backup preview: ${filePath}`, { includeDetails });

  try {
    // Parse the full backup (we need to extract to get metadata)
    const data = await parseBackup(filePath);

    // Build preview with statistics
    const preview = {
      version: data.version,
      exportDate: data.exportDate,
      type: data.type || 'manual',
      statistics: data.statistics || calculateStatistics(data)
    };

    // Add detailed content if requested
    if (includeDetails) {
      preview.details = {
        recipes: extractRecipePreview(data.recipes, maxRecipes),
        collections: extractCollectionPreview(data.collections, maxCollectionRecipes),
        mealPlans: extractMealPlanPreview(data.mealPlans),
        shoppingLists: extractShoppingListPreview(data.shoppingLists)
      };
    }

    return preview;
  } catch (error) {
    logger.error('Failed to get backup preview', {
      error: error.message,
      filePath
    });
    throw error;
  }
}

/**
 * Validate backup data structure
 * @param {Object} data - Parsed backup data
 * @throws {Error} If structure is invalid
 */
function validateBackupStructure(data) {
  const required = ['version', 'exportDate', 'recipes'];

  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Invalid backup: missing required field '${field}'`);
    }
  }

  // Validate recipes is an array
  if (!Array.isArray(data.recipes)) {
    throw new Error('Invalid backup: recipes must be an array');
  }

  // Validate optional arrays
  if (data.collections && !Array.isArray(data.collections)) {
    throw new Error('Invalid backup: collections must be an array');
  }

  if (data.mealPlans && !Array.isArray(data.mealPlans)) {
    throw new Error('Invalid backup: mealPlans must be an array');
  }

  if (data.shoppingLists && !Array.isArray(data.shoppingLists)) {
    throw new Error('Invalid backup: shoppingLists must be an array');
  }

  logger.debug('Backup structure validated successfully');
}

/**
 * Check version compatibility
 * @param {string} version - Backup version string (e.g., "2.2.0")
 * @throws {Error} If version is incompatible
 */
function validateVersion(version) {
  if (!version || typeof version !== 'string') {
    throw new Error('Invalid backup: missing or invalid version');
  }

  const current = '2.2.0';
  const versionParts = version.split('.').map(Number);
  const currentParts = current.split('.').map(Number);

  // Check if any part is NaN
  if (versionParts.some(isNaN) || currentParts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }

  const [major] = versionParts;
  const [currentMajor] = currentParts;

  // Cannot restore from future major version
  if (major > currentMajor) {
    throw new Error(
      `Backup from future version (${version}). Current version is ${current}. Cannot import.`
    );
  }

  logger.debug(`Version compatibility checked: ${version} is compatible with ${current}`);
}

/**
 * Extract ZIP file to directory
 * @param {string} zipPath - Path to ZIP file
 * @param {string} extractPath - Destination directory
 * @returns {Promise<void>}
 */
async function extractZip(zipPath, extractPath) {
  logger.debug(`Extracting ZIP: ${zipPath} to ${extractPath}`);

  // Create extraction directory
  await fs.mkdir(extractPath, { recursive: true });

  return new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .on('close', () => {
        logger.debug('ZIP extraction complete');
        resolve();
      })
      .on('error', (error) => {
        logger.error('ZIP extraction failed', { error: error.message });
        reject(new Error(`Failed to extract ZIP: ${error.message}`));
      });
  });
}

/**
 * Calculate statistics from backup data
 * @param {Object} data - Backup data
 * @returns {Object} Statistics
 */
function calculateStatistics(data) {
  return {
    recipeCount: data.recipes?.length || 0,
    collectionCount: data.collections?.length || 0,
    mealPlanCount: data.mealPlans?.length || 0,
    shoppingListCount: data.shoppingLists?.length || 0
  };
}

/**
 * Extract recipe preview list
 * @param {Array} recipes - Full recipe array
 * @param {number} max - Maximum recipes to include
 * @returns {Array} Preview recipe objects
 */
function extractRecipePreview(recipes, max) {
  if (!recipes || recipes.length === 0) return [];
  
  return recipes.slice(0, max).map(r => ({
    title: r.title || 'Untitled Recipe',
    id: r._id || r.id
  }));
}

/**
 * Extract collection preview list
 * @param {Array} collections - Full collection array
 * @param {number} maxRecipesPerCollection - Max recipes to show per collection
 * @returns {Array} Preview collection objects
 */
function extractCollectionPreview(collections, maxRecipesPerCollection) {
  if (!collections || collections.length === 0) return [];
  
  return collections.map(c => {
    // Get recipe titles from the collection
    let recipeNames = [];
    if (c.recipes && Array.isArray(c.recipes)) {
      recipeNames = c.recipes
        .slice(0, maxRecipesPerCollection)
        .map(r => {
          // Handle both populated and reference-only recipes
          if (typeof r === 'string') return r; // Just an ID
          return r.title || r.name || 'Untitled Recipe';
        });
    }
    
    return {
      name: c.name || 'Unnamed Collection',
      recipeCount: c.recipes?.length || 0,
      recipes: recipeNames
    };
  });
}

/**
 * Extract meal plan preview list
 * @param {Array} mealPlans - Full meal plan array
 * @returns {Array} Preview meal plan objects
 */
function extractMealPlanPreview(mealPlans) {
  if (!mealPlans || mealPlans.length === 0) return [];
  
  return mealPlans.map(mp => ({
    name: mp.name || 'Unnamed Meal Plan',
    startDate: mp.startDate,
    endDate: mp.endDate,
    mealCount: mp.meals?.length || 0
  }));
}

/**
 * Extract shopping list preview list
 * @param {Array} shoppingLists - Full shopping list array
 * @returns {Array} Preview shopping list objects
 */
function extractShoppingListPreview(shoppingLists) {
  if (!shoppingLists || shoppingLists.length === 0) return [];
  
  return shoppingLists.map(sl => {
    const created = sl.createdAt || sl.created;
    const defaultName = created 
      ? `Shopping List ${new Date(created).toLocaleDateString()}`
      : 'Unnamed Shopping List';
    
    return {
      name: sl.name || defaultName,
      itemCount: sl.items?.length || 0,
      created: created
    };
  });
}

/**
 * Validate ZIP file format (check if file is actually a ZIP)
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} True if valid ZIP
 */
export async function isValidZip(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return false;
    }

    // Read first few bytes to check ZIP signature
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(4);
    await fileHandle.read(buffer, 0, 4, 0);
    await fileHandle.close();

    // ZIP files start with PK (0x50 0x4B)
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  } catch (error) {
    logger.error('Failed to validate ZIP format', { error: error.message });
    return false;
  }
}
