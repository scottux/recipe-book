import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const semver = require('semver');
import ImportError from '../utils/importErrors.js';

/**
 * Layer 1 & 2: File format and schema validation
 */
export const validateBackupFile = (data) => {
  // Required top-level fields
  const requiredFields = ['version', 'exportDate', 'user'];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new ImportError(
        'MISSING_FIELD',
        `Backup file is missing required field: ${field}`,
        { field }
      );
    }
  }

  // Validate version compatibility
  try {
    const backupVersion = semver.parse(data.version);
    if (!backupVersion || semver.lt(backupVersion, '2.0.0')) {
      throw new ImportError(
        'INCOMPATIBLE_VERSION',
        `Backup version ${data.version} not compatible. Requires 2.0.0+`,
        { version: data.version }
      );
    }
  } catch (error) {
    if (error instanceof ImportError) {
      throw error;
    }
    throw new ImportError(
      'INVALID_VERSION',
      `Invalid version format: ${data.version}`,
      { version: data.version }
    );
  }

  // Validate user object
  if (!data.user || !data.user.username) {
    throw new ImportError(
      'MISSING_FIELD',
      'Backup file is missing user.username',
      { field: 'user.username' }
    );
  }

  // Data can be optional but if present must be an object
  if (data.recipes || data.collections || data.mealPlans || data.shoppingLists) {
    // V2.0 format: top-level arrays
    return;
  }

  if (data.data && typeof data.data !== 'object') {
    throw new ImportError(
      'INVALID_STRUCTURE',
      'Backup file data field must be an object',
      { field: 'data' }
    );
  }
};

/**
 * Layer 3: Content validation
 */
export const validateBackupContent = (data) => {
  // Handle both V2.0 formats: data.recipes or top-level recipes
  const recipes = data.data?.recipes || data.recipes || [];
  const collections = data.data?.collections || data.collections || [];
  const mealPlans = data.data?.mealPlans || data.mealPlans || [];
  const shoppingLists = data.data?.shoppingLists || data.shoppingLists || [];

  // Validate recipes
  recipes.forEach((recipe, index) => {
    validateRecipe(recipe, index);
  });

  // Validate collections
  collections.forEach((collection, index) => {
    validateCollection(collection, index);
  });

  // Validate meal plans
  mealPlans.forEach((mealPlan, index) => {
    validateMealPlan(mealPlan, index);
  });

  // Validate shopping lists
  shoppingLists.forEach((list, index) => {
    validateShoppingList(list, index);
  });

  // Layer 4: Cross-reference validation
  validateReferences({ recipes, collections, mealPlans, shoppingLists });

  // Layer 5: Security validation
  sanitizeData({ recipes, collections, mealPlans, shoppingLists });
};

/**
 * Validate individual recipe
 */
function validateRecipe(recipe, index) {
  const required = ['title', 'ingredients', 'instructions'];
  
  for (const field of required) {
    if (!recipe[field]) {
      throw new ImportError(
        'INVALID_RECIPE',
        `Recipe at index ${index} missing required field: ${field}`,
        { index, field }
      );
    }
  }

  // Validate title length
  if (recipe.title.length > 200) {
    throw new ImportError(
      'FIELD_TOO_LONG',
      `Recipe at index ${index} title exceeds 200 characters`,
      { index, field: 'title', length: recipe.title.length }
    );
  }

  // Validate ingredients array
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    throw new ImportError(
      'INVALID_RECIPE',
      `Recipe at index ${index} must have at least one ingredient`,
      { index, field: 'ingredients' }
    );
  }

  // Validate each ingredient
  recipe.ingredients.forEach((ingredient, i) => {
    if (!ingredient.item && !ingredient.name) {
      throw new ImportError(
        'INVALID_INGREDIENT',
        `Recipe '${recipe.title}' ingredient ${i} missing item/name`,
        { index, ingredientIndex: i }
      );
    }
    // Amount can be empty string or missing (optional field)
    // Only validate that if present, it's not null/undefined
    if (ingredient.amount === null || ingredient.amount === undefined) {
      throw new ImportError(
        'INVALID_INGREDIENT',
        `Recipe '${recipe.title}' ingredient ${i} missing amount`,
        { index, ingredientIndex: i }
      );
    }
  });

  // Validate instructions array
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
    throw new ImportError(
      'INVALID_RECIPE',
      `Recipe at index ${index} must have at least one instruction`,
      { index, field: 'instructions' }
    );
  }

  // Validate each instruction - handle both string and object format
  recipe.instructions.forEach((instruction, i) => {
    const instructionText = typeof instruction === 'string' ? instruction : instruction.description;
    if (!instructionText) {
      throw new ImportError(
        'INVALID_INSTRUCTION',
        `Recipe '${recipe.title}' instruction ${i} missing description`,
        { index, instructionIndex: i }
      );
    }
  });
}

/**
 * Validate individual collection
 */
function validateCollection(collection, index) {
  if (!collection.name) {
    throw new ImportError(
      'INVALID_COLLECTION',
      `Collection at index ${index} missing name`,
      { index, field: 'name' }
    );
  }

  // Ensure recipeIds is an array
  if (collection.recipeIds && !Array.isArray(collection.recipeIds)) {
    throw new ImportError(
      'INVALID_COLLECTION',
      `Collection at index ${index} recipeIds must be an array`,
      { index, field: 'recipeIds' }
    );
  }

  // Handle both V2.0 formats
  if (!collection.recipeIds && !collection.recipes) {
    collection.recipeIds = [];
  }
}

/**
 * Validate individual meal plan
 */
function validateMealPlan(mealPlan, index) {
  // Handle both date formats
  if (!mealPlan.date && !mealPlan.startDate) {
    throw new ImportError(
      'INVALID_MEAL_PLAN',
      `Meal plan at index ${index} missing date/startDate`,
      { index, field: 'date' }
    );
  }

  if (!Array.isArray(mealPlan.meals)) {
    throw new ImportError(
      'INVALID_MEAL_PLAN',
      `Meal plan at index ${index} missing meals array`,
      { index, field: 'meals' }
    );
  }

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  mealPlan.meals.forEach((meal, i) => {
    // Handle both mealType and type
    const mealType = meal.mealType || meal.type;
    if (!mealType || !validMealTypes.includes(mealType)) {
      throw new ImportError(
        'INVALID_MEAL',
        `Meal plan for ${mealPlan.date || mealPlan.startDate} meal ${i} has invalid type`,
        { index, mealIndex: i, mealType }
      );
    }
  });
}

/**
 * Validate individual shopping list
 */
function validateShoppingList(list, index) {
  if (!list.name) {
    throw new ImportError(
      'INVALID_SHOPPING_LIST',
      `Shopping list at index ${index} missing name`,
      { index, field: 'name' }
    );
  }

  if (!Array.isArray(list.items)) {
    list.items = [];
  }
}

/**
 * Layer 4: Validate cross-references
 */
function validateReferences(data) {
  const recipeIds = new Set(
    (data.recipes || []).map((r) => r._id || r.id)
  );

  // Validate collection references
  (data.collections || []).forEach((collection) => {
    const ids = collection.recipeIds || collection.recipes?.map(r => r._id || r.id) || [];
    ids.forEach((recipeId) => {
      if (recipeId && !recipeIds.has(recipeId)) {
        console.warn(
          `Collection '${collection.name}' references missing recipe: ${recipeId}`
        );
      }
    });
  });

  // Validate meal plan references
  (data.mealPlans || []).forEach((mealPlan) => {
    mealPlan.meals.forEach((meal) => {
      if (meal.recipes) {
        meal.recipes.forEach((recipe) => {
          const recipeId = recipe.recipeId || recipe.recipe?._id || recipe.recipe?.id;
          if (recipeId && !recipeIds.has(recipeId)) {
            console.warn(
              `Meal plan for ${mealPlan.date || mealPlan.startDate} references missing recipe: ${recipeId}`
            );
          }
        });
      }
    });
  });
}

/**
 * Layer 5: Security validation and sanitization
 */
function sanitizeData(data) {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  };

  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize all data arrays
  data.recipes = sanitizeObject(data.recipes || []);
  data.collections = sanitizeObject(data.collections || []);
  data.mealPlans = sanitizeObject(data.mealPlans || []);
  data.shoppingLists = sanitizeObject(data.shoppingLists || []);
}