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
      item: ing.item || ing.name,
      amount: ing.amount,
      unit: ing.unit || '',
    }));

    // Normalize instruction format (handle both string and object)
    const normalizedInstructions = backupRecipe.instructions.map(inst =>
      typeof inst === 'string' ? inst : inst.description
    );

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
      dishType: backupRecipe.dishType,
      cuisine: backupRecipe.cuisine,
      difficulty: backupRecipe.difficulty,
      tags: backupRecipe.tags || [],
      rating: backupRecipe.rating,
      notes: backupRecipe.notes || '',
      sourceUrl: backupRecipe.sourceUrl || '',
      imageUrl: backupRecipe.imageUrl || '',
      isLocked: backupRecipe.isLocked || false,
    });

    await newRecipe.save({ session });

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
      icon: backupCollection.icon || '📁',
      isPublic: backupCollection.isPublic || false,
      recipes: remappedRecipeIds,
      recipeCount: remappedRecipeIds.length,
    });

    await newCollection.save({ session });
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
          const oldRecipeId = recipe.recipeId || recipe.recipe?._id || recipe.recipe?.id;
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

    await newMealPlan.save({ session });
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

    await newShoppingList.save({ session });
    imported++;
  }

  return { imported };
};