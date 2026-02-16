import express from 'express';
import {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getFilterOptions,
  searchWebRecipes,
  getFavoriteSites,
  toggleRecipeLock
} from '../controllers/recipeController.js';
import { scrapeRecipe } from '../services/scraper.js';
import Recipe from '../models/Recipe.js';
import {
  recipeValidationRules,
  urlValidationRules,
  searchValidationRules,
  validate
} from '../middleware/validation.js';
import { cacheMiddleware, clearCacheMiddleware } from '../middleware/cache.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get filter options (dish types, cuisines, tags) - cache for 10 minutes
router.get('/filter-options', authenticate, cacheMiddleware(600), getFilterOptions);

// Get list of favorite recipe sites - cache for 1 hour (public)
router.get('/favorite-sites', cacheMiddleware(3600), getFavoriteSites);

// Search for recipes across the web - cache for 5 minutes (public)
router.post('/search-web', searchValidationRules(), validate, cacheMiddleware(300), searchWebRecipes);

// Scrape and create recipe from URL (requires authentication)
router.post('/scrape', authenticate, urlValidationRules(), validate, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    // Scrape the recipe
    const scrapedData = await scrapeRecipe(url);
    
    // Add source URL and owner
    scrapedData.sourceUrl = url;
    scrapedData.owner = req.user._id;
    
    // Create recipe in database
    const recipe = await Recipe.create(scrapedData);
    
    res.status(201).json({
      success: true,
      data: recipe
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// CRUD routes (all require authentication)
router.get('/', authenticate, cacheMiddleware(300), getAllRecipes);
router.get('/:id', authenticate, cacheMiddleware(300), getRecipeById);
router.post('/', authenticate, recipeValidationRules(), validate, clearCacheMiddleware, createRecipe);
router.put('/:id', authenticate, recipeValidationRules(), validate, clearCacheMiddleware, updateRecipe);
router.put('/:id/lock', authenticate, clearCacheMiddleware, toggleRecipeLock);
router.delete('/:id', authenticate, clearCacheMiddleware, deleteRecipe);

export default router;