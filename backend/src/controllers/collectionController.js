import Collection from '../models/Collection.js';
import Recipe from '../models/Recipe.js';

// Get all collections for the authenticated user
export const getAllCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ owner: req.user._id })
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate('recipes', 'title images');
    
    res.json({
      success: true,
      count: collections.length,
      data: collections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single collection by ID
export const getCollectionById = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('recipes');
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    // Check authorization
    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this collection'
      });
    }
    
    res.json({
      success: true,
      data: collection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new collection
export const createCollection = async (req, res) => {
  try {
    const collectionData = {
      ...req.body,
      owner: req.user._id
    };
    
    const collection = await Collection.create(collectionData);
    
    res.status(201).json({
      success: true,
      data: collection
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update collection
export const updateCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    // Check authorization
    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this collection'
      });
    }
    
    // Don't allow changing owner
    const { owner, ...updateData } = req.body;
    
    const updatedCollection = await Collection.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('recipes', 'title images');
    
    res.json({
      success: true,
      data: updatedCollection
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete collection
export const deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    // Check authorization
    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this collection'
      });
    }
    
    await Collection.findByIdAndDelete(req.params.id);
    
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

// Add recipe to collection
export const addRecipeToCollection = async (req, res) => {
  try {
    const { recipeId } = req.body;
    
    const collection = await Collection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    // Check authorization
    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to modify this collection'
      });
    }
    
    // Verify recipe exists and user owns it
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }
    
    if (recipe.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only add your own recipes to collections'
      });
    }
    
    // Check if recipe is already in collection
    if (collection.recipes.includes(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'Recipe is already in this collection'
      });
    }
    
    collection.recipes.push(recipeId);
    await collection.save();
    
    const updatedCollection = await Collection.findById(req.params.id)
      .populate('recipes', 'title images');
    
    res.json({
      success: true,
      data: updatedCollection
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Remove recipe from collection
export const removeRecipeFromCollection = async (req, res) => {
  try {
    const { recipeId } = req.params;
    
    const collection = await Collection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    // Check authorization
    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to modify this collection'
      });
    }
    
    collection.recipes = collection.recipes.filter(
      id => id.toString() !== recipeId
    );
    await collection.save();
    
    const updatedCollection = await Collection.findById(req.params.id)
      .populate('recipes', 'title images');
    
    res.json({
      success: true,
      data: updatedCollection
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Reorder recipes in collection
export const reorderRecipes = async (req, res) => {
  try {
    const { recipeIds } = req.body;
    
    const collection = await Collection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    // Check authorization
    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to modify this collection'
      });
    }
    
    // Validate that all recipe IDs belong to the collection
    const recipeIdStrings = collection.recipes.map(id => id.toString());
    const allValid = recipeIds.every(id => recipeIdStrings.includes(id));
    
    if (!allValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe IDs provided'
      });
    }
    
    collection.recipes = recipeIds;
    await collection.save();
    
    const updatedCollection = await Collection.findById(req.params.id)
      .populate('recipes', 'title images');
    
    res.json({
      success: true,
      data: updatedCollection
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};