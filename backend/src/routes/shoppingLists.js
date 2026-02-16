import express from 'express';
import * as shoppingListController from '../controllers/shoppingListController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Basic CRUD
router.get('/', shoppingListController.getAllShoppingLists);
router.post('/', shoppingListController.createShoppingList);
router.get('/:id', shoppingListController.getShoppingListById);
router.put('/:id', shoppingListController.updateShoppingList);
router.delete('/:id', shoppingListController.deleteShoppingList);

// Generate from recipe or meal plan
router.post('/from-recipe/:recipeId', shoppingListController.generateFromRecipe);
router.post('/from-meal-plan/:planId', shoppingListController.generateFromMealPlan);

// Item management
router.post('/:id/items', shoppingListController.addItem);
router.put('/:id/items/:itemId', shoppingListController.updateItem);
router.delete('/:id/items/:itemId', shoppingListController.deleteItem);

// Sharing
router.get('/:id/share', shoppingListController.getShareableLink);

export default router;