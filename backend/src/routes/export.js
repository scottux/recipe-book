import express from 'express';
import { exportRecipe, exportMultipleRecipes, exportCollectionCookbook, exportMealPlanPDF, exportShoppingListPDF, exportFullBackup } from '../controllers/exportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All export routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/export/bulk
 * @desc    Export multiple recipes as ZIP file
 * @body    recipeIds - Array of recipe IDs, format - Export format (pdf, json, markdown)
 * @access  Private (requires authentication, user must own recipes)
 */
router.post('/bulk', exportMultipleRecipes);

/**
 * @route   GET /api/export/recipe/:id
 * @desc    Export a single recipe in specified format (pdf, json, markdown)
 * @query   format - Export format (pdf, json, markdown) - defaults to pdf
 * @access  Private (requires authentication, user must own recipe)
 */
router.get('/recipe/:id', exportRecipe);

/**
 * @route   GET /api/export/collection/:id/cookbook
 * @desc    Export a collection as a professional PDF cookbook
 * @access  Private (requires authentication, user must own collection)
 */
router.get('/collection/:id/cookbook', exportCollectionCookbook);

/**
 * @route   GET /api/export/meal-plan/:id
 * @desc    Export a meal plan as PDF calendar view
 * @access  Private (requires authentication, user must own meal plan)
 */
router.get('/meal-plan/:id', exportMealPlanPDF);

/**
 * @route   GET /api/export/shopping-list/:id
 * @desc    Export a shopping list as print-friendly PDF
 * @access  Private (requires authentication, user must own shopping list)
 */
router.get('/shopping-list/:id', exportShoppingListPDF);

/**
 * @route   GET /api/export/backup
 * @desc    Export full user data backup as JSON
 * @access  Private (requires authentication)
 */
router.get('/backup', exportFullBackup);

export default router;
