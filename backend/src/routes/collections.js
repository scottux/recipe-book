import express from 'express';
import {
  getAllCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
  reorderRecipes
} from '../controllers/collectionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All collection routes require authentication
router.use(authenticate);

// CRUD routes
router.get('/', getAllCollections);
router.get('/:id', getCollectionById);
router.post('/', createCollection);
router.put('/:id', updateCollection);
router.delete('/:id', deleteCollection);

// Recipe management
router.post('/:id/recipes', addRecipeToCollection);
router.delete('/:id/recipes/:recipeId', removeRecipeFromCollection);
router.put('/:id/recipes/reorder', reorderRecipes);

export default router;