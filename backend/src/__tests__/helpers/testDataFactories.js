/**
 * Test Data Factories
 * 
 * Factory functions for creating test data objects
 */

import mongoose from 'mongoose';

/**
 * Create valid recipe data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Recipe data object
 */
export function createRecipeData(overrides = {}) {
  return {
    title: `Test Recipe ${Date.now()}`,
    description: 'A delicious test recipe',
    ingredients: [
      { name: 'flour', amount: '2', unit: 'cups' },
      { name: 'sugar', amount: '1', unit: 'cup' },
      { name: 'eggs', amount: '2', unit: '' },
    ],
    instructions: [
      'Mix dry ingredients',
      'Add wet ingredients',
      'Bake at 350°F for 30 minutes',
    ],
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    dishType: 'Dessert',
    cuisine: 'American',
    tags: ['easy', 'quick'],
    ...overrides,
  };
}

/**
 * Create valid collection data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Collection data object
 */
export function createCollectionData(overrides = {}) {
  return {
    name: `Test Collection ${Date.now()}`,
    description: 'A test collection of recipes',
    recipeIds: [],
    isPublic: false,
    ...overrides,
  };
}

/**
 * Create valid meal plan data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Meal plan data object
 */
export function createMealPlanData(overrides = {}) {
  const today = new Date();
  return {
    name: `Test Meal Plan ${Date.now()}`,
    startDate: today.toISOString().split('T')[0],
    endDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    meals: [],
    ...overrides,
  };
}

/**
 * Create valid shopping list data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Shopping list data object
 */
export function createShoppingListData(overrides = {}) {
  return {
    name: `Test Shopping List ${Date.now()}`,
    items: [
      { name: 'Milk', quantity: '1 gallon', category: 'Dairy', checked: false },
      { name: 'Bread', quantity: '1 loaf', category: 'Bakery', checked: false },
    ],
    ...overrides,
  };
}

/**
 * Create valid user data
 * @param {Object} overrides - Fields to override
 * @returns {Object} User data object
 */
export function createUserData(overrides = {}) {
  return {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    displayName: 'Test User',
    ...overrides,
  };
}

/**
 * Create a valid MongoDB ObjectId (for testing)
 * @returns {string} Valid ObjectId string
 */
export function createObjectId() {
  return new mongoose.Types.ObjectId().toString();
}

/**
 * Create invalid MongoDB ObjectId (for error testing)
 * @returns {string} Invalid ObjectId string
 */
export function createInvalidObjectId() {
  return 'invalid-object-id';
}

/**
 * Create meal data for meal plan
 * @param {string} recipeId - Recipe ID
 * @param {Object} overrides - Fields to override
 * @returns {Object} Meal data object
 */
export function createMealData(recipeId, overrides = {}) {
  const today = new Date();
  return {
    date: today.toISOString().split('T')[0],
    mealType: 'dinner',
    recipeId,
    servings: 4,
    notes: '',
    ...overrides,
  };
}

/**
 * Create date range for testing
 * @param {number} daysFromNow - Days from today (negative for past)
 * @returns {Object} { startDate, endDate } in YYYY-MM-DD format
 */
export function createDateRange(daysFromNow = 7) {
  const start = new Date();
  const end = new Date(start.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

/**
 * Create pagination query params
 * @param {Object} overrides - Fields to override
 * @returns {Object} Pagination params
 */
export function createPaginationParams(overrides = {}) {
  return {
    page: 1,
    limit: 10,
    ...overrides,
  };
}