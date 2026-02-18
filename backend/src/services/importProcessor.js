import Recipe from '../models/Recipe.js';
import Collection from '../models/Collection.js';
import MealPlan from '../models/MealPlan.js';
import ShoppingList from '../models/ShoppingList.js';

/**
 * Process and import recipes
 * Returns: { imported: number, idMapping: Map<oldId, newId> }
 */
export const processRecipes = async (userId, recipes, duplicates, session) => {
  const idMapping = new Map();
  let imported = 0;

  for (let i = 0; i < recipes.length; i++) {
    // Skip if duplicate
    if (duplicates && duplicates.has(i)) {
      continue;
    }

    const backupRecipe = recipes[i];
    const oldId = backupRecipe._id || backupRecipe.id;

    // Normalize ingredient format (handle both item and name)
    const normalizedIngredients = backupRecipe.ingredients.map(ing => ({
      name: ing.name || ing.item,
      amount: ing.amount,
      unit: ing.unit || '',
    }));

    // Normalize instruction format (handle both string and object)
    const normalizedInstructions = backupRecipe.instructions.map(inst =>
      typeof inst === 'string' ? inst : inst.description
    );

    // Normalize dishType to match enum values
    const normalizeDishType = (type) => {
      if (!type) return 'Other';
      const typeMap = {
        'appetizer': 'Appetizer',
        'main': 'Main Course',
        'main course': 'Main Course',
        'side': 'Side Dish',
        'side dish': 'Side Dish',
        'dessert': 'Dessert',
        'beverage': 'Beverage',
        'snack': 'Snack',
        'breakfast': 'Breakfast',
        'lunch': 'Lunch',
        'dinner': 'Dinner',
      };
      return typeMap[type.toLowerCase()] || 'Other';
    };

    // Create new recipe document
    const newRecipe = new Recipe({
      owner: userId,
      title: backupRecipe.title,
      description: backupRecipe.description || '',
      ingredients: normalizedIngredients,
      instructions: normalizedInstructions,
      prepTime: backupRecipe.prepTime,
      cookTime: backupRecipe.cookTime,
      servings: backupRecipe.servings,
      dishType: normalizeDishType(backupRecipe.dishType),
      cuisine: backupRecipe.cuisine,
      difficulty: backupRecipe.difficulty,
      tags: backupRecipe.tags || [],
      rating: backupRecipe.rating,
      notes: backupRecipe.notes || '',
      sourceUrl: backupRecipe.sourceUrl || '',
      imageUrl: backupRecipe.imageUrl || '',
      isLocked: backupRecipe.isLocked || false,
    });

    if (session) {
      await newRecipe.save({ session });
    } else {
      await newRecipe.save();
    }

    // Map old ID to new ID
    if (oldId) {
      idMapping.set(oldId.toString(), newRecipe._id.toString());
    }
    imported++;
  }

  return { imported, idMapping };
};

/**
 * Process and import collections
 * Returns: { imported: number }
 */
export const processCollections = async (
  userId,
  collections,
  recipeIdMapping,
  duplicates,
  session
) => {
  let imported = 0;

  for (let i = 0; i < collections.length; i++) {
    // Skip if duplicate
    if (duplicates && duplicates.has(i)) {
      continue;
    }

    const backupCollection = collections[i];

    // Get recipe IDs (handle both recipeIds and recipes array)
    let oldRecipeIds = backupCollection.recipeIds || [];
    if (!oldRecipeIds.length && backupCollection.recipes) {
      oldRecipeIds = backupCollection.recipes.map(r => r._id || r.id || r);
    }

    // Remap recipe IDs
    const remappedRecipeIds = oldRecipeIds
      .map((oldId) => recipeIdMapping.get(oldId?.toString() || oldId))
      .filter((id) => id !== undefined); // Remove missing references

    const newCollection = new Collection({
      owner: userId,
      name: backupCollection.name,
      description: backupCollection.description || '',
      icon: backupCollection.icon || '📚',
      isPublic: backupCollection.isPublic || false,
      recipes: remappedRecipeIds,
    });

    if (session) {
      await newCollection.save({ session });
    } else {
      await newCollection.save();
    }
    imported++;
  }

  return { imported };
};

/**
 * Process and import meal plans
 * Returns: { imported: number }
 */
export const processMealPlans = async (
  userId,
  mealPlans,
  recipeIdMapping,
  duplicates,
  session
) => {
  let imported = 0;

  for (let i = 0; i < mealPlans.length; i++) {
    // Skip if duplicate
    if (duplicates && duplicates.has(i)) {
      continue;
    }

    const backupMealPlan = mealPlans[i];

    // Remap recipe references in meals
    const remappedMeals = backupMealPlan.meals.map((meal) => {
      const mealType = meal.mealType || meal.type;
      const recipes = (meal.recipes || [])
        .map((recipe) => {
          // Handle multiple formats: recipeId, recipe._id, recipe.id, or recipe as string
          let oldRecipeId;
          if (recipe.recipeId) {
            oldRecipeId = recipe.recipeId;
          } else if (typeof recipe.recipe === 'string') {
            oldRecipeId = recipe.recipe;
          } else if (recipe.recipe?._id) {
            oldRecipeId = recipe.recipe._id;
          } else if (recipe.recipe?.id) {
            oldRecipeId = recipe.recipe.id;
          } else {
            oldRecipeId = recipe.recipe;
          }
          const newRecipeId = recipeIdMapping.get(oldRecipeId?.toString());
          
          if (!newRecipeId) return null; // Skip missing references

          return {
            recipe: newRecipeId,
            servings: recipe.servings,
          };
        })
        .filter((recipe) => recipe !== null);

      return {
        date: meal.date || backupMealPlan.date || backupMealPlan.startDate,
        mealType: mealType,
        recipes: recipes,
        notes: meal.notes || '',
      };
    });

    // Determine dates
    const startDate = backupMealPlan.startDate || backupMealPlan.date;
    const endDate = backupMealPlan.endDate || backupMealPlan.date;

    const newMealPlan = new MealPlan({
      owner: userId,
      name: backupMealPlan.name || 'Imported Meal Plan',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isTemplate: backupMealPlan.isTemplate || false,
      meals: remappedMeals,
    });

    if (session) {
      await newMealPlan.save({ session });
    } else {
      await newMealPlan.save();
    }
    imported++;
  }

  return { imported };
};

/**
 * Process and import shopping lists
 * Returns: { imported: number }
 */
export const processShoppingLists = async (
  userId,
  shoppingLists,
  duplicates,
  session
) => {
  let imported = 0;

  for (let i = 0; i < shoppingLists.length; i++) {
    // Skip if duplicate
    if (duplicates && duplicates.has(i)) {
      continue;
    }

    const backupList = shoppingLists[i];

    const newShoppingList = new ShoppingList({
      owner: userId,
      name: backupList.name,
      items: backupList.items || [],
      mealPlanId: backupList.mealPlanId,
      isActive: backupList.isActive !== undefined ? backupList.isActive : true,
      completedAt: backupList.completedAt ? new Date(backupList.completedAt) : null,
    });

    if (session) {
      await newShoppingList.save({ session });
    } else {
      await newShoppingList.save();
    }
    imported++;
  }

  return { imported };
};

/**
 * Main import processor function
 * Processes all import data (recipes, collections, meal plans, shopping lists)
 * 
 * @param {string} userId - User ID
 * @param {Object} importData - Import data with recipes, collections, etc.
 * @param {mongoose.ClientSession} session - MongoDB session for transaction
 * @param {boolean} checkDuplicates - Whether to check for duplicates
 * @returns {Promise<Object>} Import statistics
 */
export const processImport = async (userId, importData, session, checkDuplicates = true) => {
  const stats = {
    totalImported: 0,
    totalSkipped: 0,
    recipes: { imported: 0, skipped: 0 },
    collections: { imported: 0, skipped: 0 },
    mealPlans: { imported: 0, skipped: 0 },
    shoppingLists: { imported: 0, skipped: 0 }
  };

  // Find duplicates if requested
  let duplicates = {
    recipes: new Set(),
    collections: new Set(),
    mealPlans: new Set(),
    shoppingLists: new Set()
  };

  // Note: Duplicate checking disabled for cloud restore to allow full data restoration
  // Users can manually deduplicate if needed after restore

  // Process recipes first (needed for ID mapping)
  if (importData.recipes && importData.recipes.length > 0) {
    const recipeResult = await processRecipes(
      userId,
      importData.recipes,
      duplicates.recipes,
      session
    );
    stats.recipes.imported = recipeResult.imported;
    stats.recipes.skipped = importData.recipes.length - recipeResult.imported;
    stats.totalImported += recipeResult.imported;
    stats.totalSkipped += stats.recipes.skipped;

    // Process collections (depends on recipe ID mapping)
    if (importData.collections && importData.collections.length > 0) {
      const collectionResult = await processCollections(
        userId,
        importData.collections,
        recipeResult.idMapping,
        duplicates.collections,
        session
      );
      stats.collections.imported = collectionResult.imported;
      stats.collections.skipped = importData.collections.length - collectionResult.imported;
      stats.totalImported += collectionResult.imported;
      stats.totalSkipped += stats.collections.skipped;
    }

    // Process meal plans (depends on recipe ID mapping)
    if (importData.mealPlans && importData.mealPlans.length > 0) {
      const mealPlanResult = await processMealPlans(
        userId,
        importData.mealPlans,
        recipeResult.idMapping,
        duplicates.mealPlans,
        session
      );
      stats.mealPlans.imported = mealPlanResult.imported;
      stats.mealPlans.skipped = importData.mealPlans.length - mealPlanResult.imported;
      stats.totalImported += mealPlanResult.imported;
      stats.totalSkipped += stats.mealPlans.skipped;
    }

    // Process shopping lists
    if (importData.shoppingLists && importData.shoppingLists.length > 0) {
      const shoppingListResult = await processShoppingLists(
        userId,
        importData.shoppingLists,
        duplicates.shoppingLists,
        session
      );
      stats.shoppingLists.imported = shoppingListResult.imported;
      stats.shoppingLists.skipped = importData.shoppingLists.length - shoppingListResult.imported;
      stats.totalImported += shoppingListResult.imported;
      stats.totalSkipped += stats.shoppingLists.skipped;
    }
  }

  return stats;
};
