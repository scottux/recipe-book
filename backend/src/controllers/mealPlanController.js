import MealPlan from '../models/MealPlan.js';
import Recipe from '../models/Recipe.js';
import { parseLocalDate } from '../utils/dateUtils.js';

// Get all meal plans for the authenticated user
export const getAllMealPlans = async (req, res) => {
  try {
    const { isTemplate } = req.query;
    const query = { owner: req.user._id };

    if (isTemplate !== undefined) {
      query.isTemplate = isTemplate === 'true';
    }

    const mealPlans = await MealPlan.find(query)
      .sort({ startDate: -1, createdAt: -1 })
      .populate('meals.recipes.recipe', 'title image prepTime cookTime servings');

    res.json(mealPlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single meal plan by ID
export const getMealPlanById = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id).populate(
      'meals.recipes.recipe'
    );

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Check ownership
    if (mealPlan.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(mealPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new meal plan
export const createMealPlan = async (req, res) => {
  try {
    const { name, startDate, endDate, isTemplate } = req.body;

    // Check for overlapping plans (unless it's a template)
    if (!isTemplate) {
      const overlapping = await MealPlan.findOverlapping(
        req.user._id,
        parseLocalDate(startDate),
        parseLocalDate(endDate)
      );

      if (overlapping.length > 0) {
        return res.status(400).json({
          error: 'Meal plan overlaps with existing plan',
          overlappingPlans: overlapping.map((p) => ({
            id: p._id,
            name: p.name,
            startDate: p.startDate,
            endDate: p.endDate,
          })),
        });
      }
    }

    const mealPlan = new MealPlan({
      name,
      startDate: parseLocalDate(startDate),
      endDate: parseLocalDate(endDate),
      isTemplate: isTemplate || false,
      owner: req.user._id,
      meals: [],
    });

    await mealPlan.save();
    res.status(201).json(mealPlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update a meal plan
export const updateMealPlan = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Check ownership
    if (mealPlan.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, startDate, endDate, isTemplate } = req.body;

    // Check for overlapping plans if dates are being changed
    if ((startDate || endDate) && !isTemplate) {
      const newStartDate = startDate
        ? parseLocalDate(startDate)
        : mealPlan.startDate;
      const newEndDate = endDate ? parseLocalDate(endDate) : mealPlan.endDate;

      const overlapping = await MealPlan.findOverlapping(
        req.user._id,
        newStartDate,
        newEndDate,
        mealPlan._id
      );

      if (overlapping.length > 0) {
        return res.status(400).json({
          error: 'Updated dates would overlap with existing plan',
          overlappingPlans: overlapping.map((p) => ({
            id: p._id,
            name: p.name,
            startDate: p.startDate,
            endDate: p.endDate,
          })),
        });
      }
    }

    if (name !== undefined) mealPlan.name = name;
    if (startDate !== undefined) mealPlan.startDate = parseLocalDate(startDate);
    if (endDate !== undefined) mealPlan.endDate = parseLocalDate(endDate);
    if (isTemplate !== undefined) mealPlan.isTemplate = isTemplate;

    await mealPlan.save();

    const updatedPlan = await MealPlan.findById(mealPlan._id).populate(
      'meals.recipes.recipe'
    );
    res.json(updatedPlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a meal plan
export const deleteMealPlan = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Check ownership
    if (mealPlan.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await mealPlan.deleteOne();
    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a meal to a meal plan
export const addMeal = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Check ownership
    if (mealPlan.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { date, mealType, recipeId, servings, notes } = req.body;

    // Verify recipe exists
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Find or create meal entry for this date/mealType
    const mealDate = new Date(date);
    let meal = mealPlan.meals.find(
      (m) =>
        m.date.toDateString() === mealDate.toDateString() &&
        m.mealType === mealType.toLowerCase()
    );

    if (meal) {
      // Add recipe to existing meal
      meal.recipes.push({
        recipe: recipeId,
        servings: servings || null,
        notes: notes || '',
      });
    } else {
      // Create new meal
      mealPlan.meals.push({
        date: mealDate,
        mealType: mealType.toLowerCase(),
        recipes: [
          {
            recipe: recipeId,
            servings: servings || null,
            notes: notes || '',
          },
        ],
      });
    }

    await mealPlan.save();

    const updatedPlan = await MealPlan.findById(mealPlan._id).populate(
      'meals.recipes.recipe'
    );
    res.json(updatedPlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update a specific meal
export const updateMeal = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Check ownership
    if (mealPlan.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const meal = mealPlan.meals.id(req.params.mealId);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const { date, mealType, recipes } = req.body;

    if (date !== undefined) meal.date = new Date(date);
    if (mealType !== undefined) meal.mealType = mealType.toLowerCase();
    if (recipes !== undefined) meal.recipes = recipes;

    await mealPlan.save();

    const updatedPlan = await MealPlan.findById(mealPlan._id).populate(
      'meals.recipes.recipe'
    );
    res.json(updatedPlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Remove a meal from a meal plan
export const removeMeal = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Check ownership
    if (mealPlan.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const meal = mealPlan.meals.id(req.params.mealId);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    meal.deleteOne();
    await mealPlan.save();

    const updatedPlan = await MealPlan.findById(mealPlan._id).populate(
      'meals.recipes.recipe'
    );
    res.json(updatedPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove a specific recipe from a meal
export const removeRecipeFromMeal = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Check ownership
    if (mealPlan.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const meal = mealPlan.meals.id(req.params.mealId);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const recipe = meal.recipes.id(req.params.recipeId);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found in meal' });
    }

    recipe.deleteOne();

    // If meal has no recipes left, remove the meal entirely
    if (meal.recipes.length === 0) {
      meal.deleteOne();
    }

    await mealPlan.save();

    const updatedPlan = await MealPlan.findById(mealPlan._id).populate(
      'meals.recipes.recipe'
    );
    res.json(updatedPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate shopping list from meal plan
export const generateShoppingList = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Check ownership
    if (mealPlan.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shoppingList = await mealPlan.generateShoppingList();

    res.json({
      mealPlanId: mealPlan._id,
      mealPlanName: mealPlan.name,
      startDate: mealPlan.startDate,
      endDate: mealPlan.endDate,
      ingredients: shoppingList,
      generatedAt: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Duplicate meal plan as a template or new plan
export const duplicateMealPlan = async (req, res) => {
  try {
    const originalPlan = await MealPlan.findById(req.params.id).populate(
      'meals.recipes.recipe'
    );

    if (!originalPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Check ownership
    if (originalPlan.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { asTemplate, startDate } = req.body;

    let newStartDate, newEndDate;

    if (asTemplate) {
      // Templates don't have real dates
      newStartDate = new Date('2000-01-01');
      newEndDate = new Date(
        newStartDate.getTime() +
          (originalPlan.endDate - originalPlan.startDate)
      );
    } else if (startDate) {
      // Create new plan with new start date
      newStartDate = new Date(startDate);
      const duration = originalPlan.endDate - originalPlan.startDate;
      newEndDate = new Date(newStartDate.getTime() + duration);

      // Check for overlapping plans
      const overlapping = await MealPlan.findOverlapping(
        req.user._id,
        newStartDate,
        newEndDate
      );

      if (overlapping.length > 0) {
        return res.status(400).json({
          error: 'New plan would overlap with existing plan',
          overlappingPlans: overlapping.map((p) => ({
            id: p._id,
            name: p.name,
            startDate: p.startDate,
            endDate: p.endDate,
          })),
        });
      }
    } else {
      return res.status(400).json({
        error: 'Either asTemplate or startDate must be provided',
      });
    }

    // Create new meal plan
    const newPlan = new MealPlan({
      name: asTemplate
        ? `${originalPlan.name} (Template)`
        : `${originalPlan.name} (Copy)`,
      owner: req.user._id,
      startDate: newStartDate,
      endDate: newEndDate,
      isTemplate: asTemplate || false,
      meals: originalPlan.meals.map((meal) => {
        const dayOffset = Math.floor(
          (meal.date - originalPlan.startDate) / (1000 * 60 * 60 * 24)
        );
        const newMealDate = new Date(
          newStartDate.getTime() + dayOffset * 24 * 60 * 60 * 1000
        );

        return {
          date: newMealDate,
          mealType: meal.mealType,
          recipes: meal.recipes.map((r) => ({
            recipe: r.recipe._id,
            servings: r.servings,
            notes: r.notes,
          })),
        };
      }),
    });

    await newPlan.save();

    const populatedPlan = await MealPlan.findById(newPlan._id).populate(
      'meals.recipes.recipe'
    );
    res.status(201).json(populatedPlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};