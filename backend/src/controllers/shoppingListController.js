import ShoppingList from '../models/ShoppingList.js';
import Recipe from '../models/Recipe.js';
import MealPlan from '../models/MealPlan.js';

// Helper function to consolidate ingredients
const consolidateIngredients = (ingredients) => {
  const consolidated = {};
  
  ingredients.forEach(ing => {
    const key = `${ing.item.toLowerCase()}_${ing.unit.toLowerCase()}`;
    
    if (consolidated[key]) {
      consolidated[key].quantity += ing.quantity;
    } else {
      consolidated[key] = {
        ingredient: ing.item,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category || 'Other',
      };
    }
  });
  
  return Object.values(consolidated);
};

// Get all shopping lists
export const getAllShoppingLists = async (req, res) => {
  try {
    const lists = await ShoppingList.find({ owner: req.user._id })
      .sort({ isActive: -1, createdAt: -1 })
      .populate('mealPlanId', 'name');
    
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single shopping list
export const getShoppingListById = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate('items.recipeId', 'title');
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create shopping list
export const createShoppingList = async (req, res) => {
  try {
    const { name, items = [], isActive = true } = req.body;
    
    const list = await ShoppingList.create({
      name,
      owner: req.user._id,
      items,
      isActive,
    });
    
    res.status(201).json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update shopping list
export const updateShoppingList = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    const { name, isActive } = req.body;
    
    if (name) list.name = name;
    if (typeof isActive === 'boolean') list.isActive = isActive;
    
    await list.save();
    
    res.json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete shopping list
export const deleteShoppingList = async (req, res) => {
  try {
    const list = await ShoppingList.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    res.json({ message: 'Shopping list deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate shopping list from recipe
export const generateFromRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { servings, listName, addToExisting } = req.body;
    
    const recipe = await Recipe.findOne({
      _id: recipeId,
      owner: req.user._id,
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Calculate scaling factor
    const scale = servings ? servings / recipe.servings : 1;
    
    // Convert recipe ingredients to shopping list items
    const items = recipe.ingredients.map(ing => ({
      ingredient: ing.item,
      quantity: ing.quantity * scale,
      unit: ing.unit,
      category: ing.category || 'Other',
      recipeId: recipe._id,
      checked: false,
      isCustom: false,
    }));
    
    let list;
    
    if (addToExisting) {
      // Add to active list or create new one
      list = await ShoppingList.findOne({
        owner: req.user._id,
        isActive: true,
      });
      
      if (!list) {
        list = await ShoppingList.create({
          name: listName || `Shopping List - ${new Date().toLocaleDateString()}`,
          owner: req.user._id,
          items,
          isActive: true,
        });
      } else {
        // Consolidate new items with existing
        const allItems = [...list.items, ...items];
        const itemsMap = {};
        
        allItems.forEach(item => {
          const key = `${item.ingredient.toLowerCase()}_${item.unit.toLowerCase()}`;
          if (itemsMap[key]) {
            itemsMap[key].quantity += item.quantity;
          } else {
            itemsMap[key] = { ...item };
          }
        });
        
        list.items = Object.values(itemsMap);
        await list.save();
      }
    } else {
      // Create new list
      list = await ShoppingList.create({
        name: listName || `${recipe.title} - ${new Date().toLocaleDateString()}`,
        owner: req.user._id,
        items,
        isActive: true,
      });
    }
    
    res.status(201).json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Generate shopping list from meal plan
export const generateFromMealPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { listName } = req.body;
    
    const mealPlan = await MealPlan.findOne({
      _id: planId,
      owner: req.user._id,
    }).populate('meals.recipes.recipe');
    
    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }
    
    // Collect all ingredients from all meals
    const allIngredients = [];
    
    for (const meal of mealPlan.meals) {
      for (const recipeEntry of meal.recipes) {
        const recipe = recipeEntry.recipe;
        if (!recipe) continue;
        
        // Calculate scaling factor
        const scale = recipeEntry.servings ? recipeEntry.servings / recipe.servings : 1;
        
        recipe.ingredients.forEach(ing => {
          allIngredients.push({
            item: ing.item,
            quantity: ing.quantity * scale,
            unit: ing.unit,
            category: ing.category || 'Other',
          });
        });
      }
    }
    
    // Consolidate ingredients
    const consolidatedItems = consolidateIngredients(allIngredients);
    
    // Convert to shopping list items
    const items = consolidatedItems.map(item => ({
      ingredient: item.ingredient,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      checked: false,
      isCustom: false,
    }));
    
    // Create shopping list
    const list = await ShoppingList.create({
      name: listName || `${mealPlan.name} - Shopping List`,
      owner: req.user._id,
      mealPlanId: mealPlan._id,
      items,
      isActive: true,
    });
    
    res.status(201).json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Add custom item
export const addItem = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    const { ingredient, quantity, unit, category, notes } = req.body;
    
    // Validate required fields
    if (!ingredient || !ingredient.trim()) {
      return res.status(400).json({ error: 'Ingredient is required' });
    }
    
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ error: 'Quantity is required' });
    }
    
    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be a non-negative number' });
    }
    
    if (!unit || !unit.trim()) {
      return res.status(400).json({ error: 'Unit is required' });
    }
    
    // Validate category if provided
    const validCategories = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Bakery', 'Beverages', 'Snacks', 'Other'];
    const itemCategory = category || 'Other';
    if (!validCategories.includes(itemCategory)) {
      return res.status(400).json({ error: `Category must be one of: ${validCategories.join(', ')}` });
    }
    
    list.items.push({
      ingredient: ingredient.trim(),
      quantity,
      unit: unit.trim(),
      category: itemCategory,
      notes: notes?.trim(),
      checked: false,
      isCustom: true,
    });
    
    await list.save();
    
    res.json(list);
  } catch (error) {
    // Check for Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(400).json({ error: error.message });
  }
};

// Update item
export const updateItem = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    const item = list.items.id(req.params.itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const { ingredient, quantity, unit, category, checked, notes } = req.body;
    
    if (ingredient) item.ingredient = ingredient;
    if (quantity !== undefined) item.quantity = quantity;
    if (unit) item.unit = unit;
    if (category) item.category = category;
    if (typeof checked === 'boolean') item.checked = checked;
    if (notes !== undefined) item.notes = notes;
    
    await list.save();
    
    res.json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete item
export const deleteItem = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    list.items.pull(req.params.itemId);
    await list.save();
    
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get shareable link (placeholder)
export const getShareableLink = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    // For now, just return the list ID
    // In production, you'd generate a secure token
    const shareUrl = `${req.protocol}://${req.get('host')}/shared/shopping-list/${list._id}`;
    
    res.json({ shareUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};