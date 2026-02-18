import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const multer = require('multer');
import mongoose from 'mongoose';
import User from '../models/User.js';
import Recipe from '../models/Recipe.js';
import Collection from '../models/Collection.js';
import MealPlan from '../models/MealPlan.js';
import ShoppingList from '../models/ShoppingList.js';
import {
  validateBackupFile,
  validateBackupContent,
} from '../services/importValidator.js';
import {
  processRecipes,
  processCollections,
  processMealPlans,
  processShoppingLists,
} from '../services/importProcessor.js';
import ImportError from '../utils/importErrors.js';

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/json' ||
      file.originalname.endsWith('.json')
    ) {
      cb(null, true);
    } else {
      cb(
        new ImportError('INVALID_FILE_TYPE', 'Must be .json file'),
        false
      );
    }
  },
});

/**
 * Multer error handler middleware
 */
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof ImportError && err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: err.message,
      details: {
        code: err.code,
        message: err.message,
      },
    });
  }
  
  if (err instanceof multer.MulterError || err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: err.message || 'File upload error',
      details: {
        code: err.code || 'UPLOAD_ERROR',
        message: err.message || 'File upload failed',
      },
    });
  }
  
  next(err);
};

/**
 * Main import handler
 * POST /api/import/backup
 */
export const importBackup = [
  upload.single('file'),
  handleMulterErrors,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      // 1. Validate file exists
      if (!req.file) {
        throw new ImportError('NO_FILE', 'No file uploaded');
      }

      // 2. Parse JSON
      let backupData;
      try {
        backupData = JSON.parse(req.file.buffer.toString('utf8'));
      } catch (error) {
        throw new ImportError(
          'INVALID_JSON',
          'Backup file is not valid JSON'
        );
      }

      // 3. Validate file format and content
      validateBackupFile(backupData);
      validateBackupContent(backupData);

      // 4. Get mode and verify password if needed
      const mode = req.body.mode || 'merge';
      if (mode === 'replace') {
        if (!req.body.password) {
          throw new ImportError(
            'INVALID_PASSWORD',
            'Password required for replace mode'
          );
        }

        const userId = String(req.user._id || req.user.id);
        const user = await User.findById(userId).select('+password');
        
        // Check if user exists
        if (!user) {
          throw new ImportError(
            'INVALID_PASSWORD',
            'Password verification failed'
          );
        }
        
        // Verify password
        const isValid = await user.comparePassword(req.body.password);
        if (!isValid) {
          throw new ImportError(
            'INVALID_PASSWORD',
            'Password is incorrect'
          );
        }
      }

      // 5. Detect duplicates (merge mode only)
      let duplicates = null;
      const userId = String(req.user._id || req.user.id);
      if (mode === 'merge') {
        duplicates = await detectDuplicates(userId, backupData);
      }

      // 6. Execute import in transaction
      const result = await executeImport(
        session,
        userId,
        backupData,
        mode,
        duplicates
      );

      res.json({
        success: true,
        message: 'Import completed successfully',
        summary: result,
      });
    } catch (error) {
      // Handle ImportError first (from fileFilter or validation)
      if (error instanceof ImportError) {
        // Check if it's a file type error from multer fileFilter
        if (error.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            error: error.message,
            details: {
              code: error.code,
              message: error.message,
              ...error.details,
            },
          });
        }
        
        // Other ImportErrors
        return res.status(error.statusCode || 400).json({
          success: false,
          error: error.message,
          details: {
            code: error.code,
            message: error.message,
            ...error.details,
          },
        });
      }
      
      // Handle SyntaxError (invalid JSON)
      if (error instanceof SyntaxError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid backup file',
          details: {
            code: 'INVALID_JSON',
            message: 'Backup file is not valid JSON',
          },
        });
      }
      
      // Handle MulterError
      if (error.name === 'MulterError' || error instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          error: error.message || 'File upload error',
          details: {
            code: error.code || 'UPLOAD_ERROR',
            message: error.message || 'File upload failed',
          },
        });
      }
      
      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        console.error('Mongoose validation error:', error);
        console.error('Validation details:', JSON.stringify(error.errors, null, 2));
        return res.status(422).json({
          success: false,
          error: 'Validation failed',
          details: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            errors: error.errors,
          },
        });
      }
      
      // Handle unknown errors
      console.error('Import error:', error);
      return res.status(500).json({
        success: false,
        error: 'Import failed',
        details: {
          code: 'IMPORT_ERROR',
          message: 'An error occurred during import',
        },
      });
    } finally {
      session.endSession();
    }
  },
];

/**
 * Detect duplicates in merge mode
 */
async function detectDuplicates(userId, backupData) {
  const duplicates = {
    recipes: new Set(),
    collections: new Set(),
    mealPlans: new Set(),
    shoppingLists: new Set(),
  };

  // Extract data arrays (handle both formats)
  const recipes = backupData.data?.recipes || backupData.recipes || [];
  const collections = backupData.data?.collections || backupData.collections || [];
  const mealPlans = backupData.data?.mealPlans || backupData.mealPlans || [];
  const shoppingLists = backupData.data?.shoppingLists || backupData.shoppingLists || [];

  // Get existing user data
  const [existingRecipes, existingCollections, existingMealPlans, existingShoppingLists] = 
    await Promise.all([
      Recipe.find({ owner: userId }),
      Collection.find({ owner: userId }),
      MealPlan.find({ owner: userId }),
      ShoppingList.find({ owner: userId }),
    ]);

  // Check recipe duplicates (title + first 3 ingredients)
  recipes.forEach((backupRecipe, index) => {
    const isDuplicate = existingRecipes.some((existing) => {
      if (
        existing.title.toLowerCase() !== backupRecipe.title.toLowerCase()
      ) {
        return false;
      }

      // Compare first 3 ingredients
      const backupIngredients = backupRecipe.ingredients
        .slice(0, 3)
        .map((i) => (i.name || i.item).toLowerCase())
        .sort();
      const existingIngredients = existing.ingredients
        .slice(0, 3)
        .map((i) => (i.name || i.item).toLowerCase())
        .sort();

      return (
        JSON.stringify(backupIngredients) ===
        JSON.stringify(existingIngredients)
      );
    });

    if (isDuplicate) {
      duplicates.recipes.add(index);
    }
  });

  // Check collection duplicates (name)
  collections.forEach((backupCollection, index) => {
    const isDuplicate = existingCollections.some(
      (existing) =>
        existing.name.toLowerCase() === backupCollection.name.toLowerCase()
    );
    if (isDuplicate) {
      duplicates.collections.add(index);
    }
  });

  // Check meal plan duplicates (name + date overlap)
  mealPlans.forEach((backupMealPlan, index) => {
    const backupStart = new Date(backupMealPlan.startDate || backupMealPlan.date);
    const backupEnd = new Date(backupMealPlan.endDate || backupMealPlan.date);

    const isDuplicate = existingMealPlans.some((existing) => {
      // Check name match
      if (existing.name.toLowerCase() !== backupMealPlan.name.toLowerCase()) {
        return false;
      }

      // Check date overlap
      const existingStart = new Date(existing.startDate);
      const existingEnd = new Date(existing.endDate);

      return (
        (backupStart >= existingStart && backupStart <= existingEnd) ||
        (backupEnd >= existingStart && backupEnd <= existingEnd) ||
        (backupStart <= existingStart && backupEnd >= existingEnd)
      );
    });

    if (isDuplicate) {
      duplicates.mealPlans.add(index);
    }
  });

  // Check shopping list duplicates (name)
  shoppingLists.forEach((backupList, index) => {
    const isDuplicate = existingShoppingLists.some(
      (existing) =>
        existing.name.toLowerCase() === backupList.name.toLowerCase()
    );
    if (isDuplicate) {
      duplicates.shoppingLists.add(index);
    }
  });

  return duplicates;
}

/**
 * Execute import transaction
 */
async function executeImport(session, userId, backupData, mode, duplicates) {
  const startTime = Date.now();
  const summary = {
    mode,
    recipesImported: 0,
    collectionsImported: 0,
    mealPlansImported: 0,
    shoppingListsImported: 0,
    duplicatesSkipped: 0,
    duration: 0,
  };

  // Extract data arrays (handle both formats)
  const recipes = backupData.data?.recipes || backupData.recipes || [];
  const collections = backupData.data?.collections || backupData.collections || [];
  const mealPlans = backupData.data?.mealPlans || backupData.mealPlans || [];
  const shoppingLists = backupData.data?.shoppingLists || backupData.shoppingLists || [];

  try {
    await session.startTransaction();

    // Replace mode: Delete all existing data first
    if (mode === 'replace') {
      await Promise.all([
        Recipe.deleteMany({ owner: userId }, { session }),
        Collection.deleteMany({ owner: userId }, { session }),
        MealPlan.deleteMany({ owner: userId }, { session }),
        ShoppingList.deleteMany({ owner: userId }, { session }),
      ]);
    }

    // Process recipes first (base entities)
    const { imported: recipesImported, idMapping: recipeIdMapping } =
      await processRecipes(userId, recipes, duplicates?.recipes, session);
    summary.recipesImported = recipesImported;

    // Process collections
    const { imported: collectionsImported } = await processCollections(
      userId,
      collections,
      recipeIdMapping,
      duplicates?.collections,
      session
    );
    summary.collectionsImported = collectionsImported;

    // Process meal plans
    const { imported: mealPlansImported } = await processMealPlans(
      userId,
      mealPlans,
      recipeIdMapping,
      duplicates?.mealPlans,
      session
    );
    summary.mealPlansImported = mealPlansImported;

    // Process shopping lists
    const { imported: shoppingListsImported } = await processShoppingLists(
      userId,
      shoppingLists,
      duplicates?.shoppingLists,
      session
    );
    summary.shoppingListsImported = shoppingListsImported;

    // Calculate duplicates skipped
    if (duplicates) {
      summary.duplicatesSkipped =
        duplicates.recipes.size +
        duplicates.collections.size +
        duplicates.mealPlans.size +
        duplicates.shoppingLists.size;
    }

    await session.commitTransaction();

    summary.duration = Date.now() - startTime;
    return summary;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  }
}