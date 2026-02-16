import express from 'express';
import * as mealPlanController from '../controllers/mealPlanController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Meal plan CRUD
router.get('/', mealPlanController.getAllMealPlans);
router.post('/', mealPlanController.createMealPlan);
router.get('/:id', mealPlanController.getMealPlanById);
router.put('/:id', mealPlanController.updateMealPlan);
router.delete('/:id', mealPlanController.deleteMealPlan);

// Meal management within a plan
router.post('/:id/meals', mealPlanController.addMeal);
router.put('/:id/meals/:mealId', mealPlanController.updateMeal);
router.delete('/:id/meals/:mealId', mealPlanController.removeMeal);
router.delete(
  '/:id/meals/:mealId/recipes/:recipeId',
  mealPlanController.removeRecipeFromMeal
);

// Shopping list generation
router.get('/:id/shopping-list', mealPlanController.generateShoppingList);

// Duplicate meal plan
router.post('/:id/duplicate', mealPlanController.duplicateMealPlan);

export default router;
