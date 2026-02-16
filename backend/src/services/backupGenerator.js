/**
 * Backup Generation Service
 * 
 * Generates backup files containing all user data in JSON format,
 * compressed as ZIP files for cloud storage.
 */

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import Recipe from '../models/Recipe.js';
import Collection from '../models/Collection.js';
import MealPlan from '../models/MealPlan.js';
import ShoppingList from '../models/ShoppingList.js';
import logger from '../config/logger.js';

/**
 * Generate backup file for a user
 * 
 * @param {string} userId - User ID
 * @param {string} type - Backup type ('manual' or 'automatic')
 * @returns {Promise<Object>} Backup file info {path, size}
 */
export async function generateBackupFile(userId, type = 'manual') {
  try {
    logger.info(`Generating ${type} backup for user ${userId}`);
    
    // Fetch all user data
    const [recipes, collections, mealPlans, shoppingLists] = await Promise.all([
      Recipe.find({ owner: userId }).lean(),
      Collection.find({ owner: userId }).lean(),
      MealPlan.find({ owner: userId }).lean(),
      ShoppingList.find({ owner: userId }).lean()
    ]);
    
    // Create backup data structure
    const backupData = {
      version: '2.2.0',
      exportDate: new Date().toISOString(),
      type,
      recipes: recipes.map(cleanDocument),
      collections: collections.map(cleanDocument),
      mealPlans: mealPlans.map(cleanDocument),
      shoppingLists: shoppingLists.map(cleanDocument),
      statistics: {
        recipeCount: recipes.length,
        collectionCount: collections.length,
        mealPlanCount: mealPlans.length,
        shoppingListCount: shoppingLists.length
      }
    };
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate filenames with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const jsonFilename = `backup-${userId}-${timestamp}.json`;
    const zipFilename = `recipe-book-${type}-backup-${timestamp}.zip`;
    
    const jsonPath = path.join(tempDir, jsonFilename);
    const zipPath = path.join(tempDir, zipFilename);
    
    // Write JSON to file
    fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf8');
    
    // Compress to ZIP
    await compressFile(jsonPath, zipPath);
    
    // Get file size
    const stats = fs.statSync(zipPath);
    
    // Clean up JSON file
    fs.unlinkSync(jsonPath);
    
    logger.info(`Backup generated successfully: ${zipFilename} (${stats.size} bytes)`);
    
    return {
      path: zipPath,
      filename: zipFilename,
      size: stats.size
    };
    
  } catch (error) {
    logger.error('Failed to generate backup:', error);
    throw new Error(`Backup generation failed: ${error.message}`);
  }
}

/**
 * Clean document by removing MongoDB-specific fields
 * 
 * @param {Object} doc - MongoDB document
 * @returns {Object} Cleaned document
 */
function cleanDocument(doc) {
  const cleaned = { ...doc };
  
  // Remove MongoDB-specific fields
  delete cleaned.__v;
  
  // Convert ObjectId to string
  if (cleaned._id) {
    cleaned._id = cleaned._id.toString();
  }
  if (cleaned.owner) {
    cleaned.owner = cleaned.owner.toString();
  }
  
  // Convert dates to ISO strings
  if (cleaned.createdAt) {
    cleaned.createdAt = cleaned.createdAt.toISOString();
  }
  if (cleaned.updatedAt) {
    cleaned.updatedAt = cleaned.updatedAt.toISOString();
  }
  
  // Clean nested arrays
  if (cleaned.recipes && Array.isArray(cleaned.recipes)) {
    cleaned.recipes = cleaned.recipes.map(r => 
      typeof r === 'object' && r._id ? r._id.toString() : r.toString()
    );
  }
  
  if (cleaned.meals && Array.isArray(cleaned.meals)) {
    cleaned.meals = cleaned.meals.map(meal => ({
      ...meal,
      recipe: meal.recipe ? meal.recipe.toString() : null,
      date: meal.date ? meal.date.toISOString() : null
    }));
  }
  
  if (cleaned.items && Array.isArray(cleaned.items)) {
    cleaned.items = cleaned.items.map(item => ({
      ...item,
      recipe: item.recipe ? item.recipe.toString() : null
    }));
  }
  
  return cleaned;
}

/**
 * Compress JSON file to ZIP
 * 
 * @param {string} inputPath - Path to JSON file
 * @param {string} outputPath - Path for ZIP file
 * @returns {Promise<string>} Path to ZIP file
 */
function compressFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    output.on('close', () => {
      logger.info(`Archive created: ${archive.pointer()} bytes`);
      resolve(outputPath);
    });
    
    output.on('error', reject);
    archive.on('error', reject);
    
    archive.pipe(output);
    archive.file(inputPath, { name: 'backup.json' });
    archive.finalize();
  });
}

/**
 * Clean up backup file
 * 
 * @param {string} filePath - Path to backup file
 */
export function cleanupBackupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Cleaned up backup file: ${filePath}`);
    }
  } catch (error) {
    logger.warn(`Failed to clean up backup file ${filePath}:`, error.message);
  }
}