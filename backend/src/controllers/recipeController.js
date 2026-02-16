import Recipe from '../models/Recipe.js';
import { searchRecipes } from '../services/recipeSearch.js';
import { FAVORITE_SITES } from '../config/favoriteSites.js';

// Get all recipes with optional filters and sorting
export const getAllRecipes = async (req, res) => {
  try {
    const { 
      dishType, 
      cuisine, 
      rating, 
      sortBy, 
      order, 
      search, 
      ingredient,
      page = 1,
      limit = 50
    } = req.query;
    
    let query = {};
    
    // Filter by user ownership (only show user's own recipes)
    if (req.user) {
      query.owner = req.user._id;
    }
    
    // Apply filters
    if (dishType) query.dishType = dishType;
    if (cuisine) query.cuisine = new RegExp(cuisine, 'i');
    if (rating) query.rating = { $gte: parseFloat(rating) };
    if (search) query.$text = { $search: search };
    if (ingredient) query['ingredients.name'] = new RegExp(ingredient, 'i');
    
    // Build sort object
    let sort = {};
    if (sortBy) {
      const sortOrder = order === 'desc' ? -1 : 1;
      sort[sortBy] = sortOrder;
    } else {
      sort.createdAt = -1; // Default: newest first
    }
    
    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination metadata
    const totalRecipes = await Recipe.countDocuments(query);
    
    // Get paginated recipes
    const recipes = await Recipe.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalRecipes / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    res.json({
      success: true,
      count: recipes.length,
      data: recipes,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRecipes,
        limit: limitNum,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single recipe by ID
export const getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }
    
    // Check authorization (user must own the recipe)
    if (req.user && recipe.owner && recipe.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this recipe'
      });
    }
    
    res.json({
      success: true,
      data: recipe
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new recipe
export const createRecipe = async (req, res) => {
  try {
    // Attach owner to recipe
    const recipeData = {
      ...req.body,
      owner: req.user._id
    };
    
    const recipe = await Recipe.create(recipeData);
    
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
};

// Update recipe
export const updateRecipe = async (req, res) => {
  try {
    // First find the recipe to check ownership
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }
    
    // Check authorization
    if (recipe.owner && recipe.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this recipe'
      });
    }
    
    // Update recipe (don't allow changing owner)
    const { owner, ...updateData } = req.body;
    
    const updatedRecipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.json({
      success: true,
      data: updatedRecipe
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete recipe
export const deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }
    
    // Check authorization
    if (recipe.owner && recipe.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this recipe'
      });
    }
    
    // Prevent deletion if recipe is locked
    if (recipe.isLocked) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete a locked recipe. Unlock it first.'
      });
    }
    
    await Recipe.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get unique values for filters
export const getFilterOptions = async (req, res) => {
  try {
    // Only get filter options for user's recipes
    const query = req.user ? { owner: req.user._id } : {};
    
    const dishTypes = await Recipe.distinct('dishType', query);
    const cuisines = await Recipe.distinct('cuisine', query);
    const tags = await Recipe.distinct('tags', query);
    
    res.json({
      success: true,
      data: {
        dishTypes: dishTypes.filter(Boolean),
        cuisines: cuisines.filter(Boolean),
        tags: tags.filter(Boolean)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Search for recipes across the web
export const searchWebRecipes = async (req, res) => {
  try {
    const { query, siteIds } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    const results = await searchRecipes(query, siteIds);
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get list of favorite recipe sites
export const getFavoriteSites = async (req, res) => {
  try {
    // Return site info without the selector functions (not JSON serializable)
    const sites = FAVORITE_SITES.map(site => ({
      id: site.id,
      name: site.name,
      domain: site.domain,
      enabled: site.enabled,
      icon: site.icon
    }));
    
    res.json({
      success: true,
      count: sites.length,
      data: sites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Toggle recipe lock status
export const toggleRecipeLock = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }
    
    // Check authorization
    if (recipe.owner && recipe.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to lock/unlock this recipe'
      });
    }
    
    recipe.isLocked = !recipe.isLocked;
    await recipe.save();
    
    res.json({
      success: true,
      data: recipe
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
