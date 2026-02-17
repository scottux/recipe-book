import mongoose from 'mongoose';

const mealPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Meal plan name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    meals: [
      {
        date: {
          type: Date,
          required: true,
        },
        mealType: {
          type: String,
          required: true,
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          lowercase: true,
        },
        recipes: [
          {
            recipe: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Recipe',
              required: true,
            },
            servings: {
              type: Number,
              min: [1, 'Servings must be at least 1'],
              default: null, // null means use recipe default
            },
            notes: {
              type: String,
              maxlength: [500, 'Notes cannot exceed 500 characters'],
            },
          },
        ],
      },
    ],
    isTemplate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
mealPlanSchema.index({ owner: 1, startDate: 1 });
mealPlanSchema.index({ owner: 1, isTemplate: 1 });

// Validate date range (1-4 weeks)
mealPlanSchema.pre('save', function (next) {
  const daysDiff = Math.ceil(
    (this.endDate - this.startDate) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff < 1) {
    next(new Error('Meal plan must span at least 1 day'));
  } else if (daysDiff > 28) {
    next(new Error('Meal plan cannot exceed 4 weeks (28 days)'));
  } else {
    next();
  }
});

// Validate meal dates are within plan range
mealPlanSchema.pre('save', function (next) {
  if (this.isTemplate) {
    return next(); // Templates don't need date validation
  }

  for (const meal of this.meals) {
    if (meal.date < this.startDate || meal.date > this.endDate) {
      return next(
        new Error('Meal date must be within meal plan date range')
      );
    }
  }
  next();
});

// Virtual for duration in days
mealPlanSchema.virtual('durationDays').get(function () {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Method to check for date overlap with another plan
mealPlanSchema.methods.overlapsWithPlan = function (otherPlan) {
  if (this.isTemplate || otherPlan.isTemplate) {
    return false; // Templates don't have date constraints
  }

  return (
    (this.startDate >= otherPlan.startDate &&
      this.startDate <= otherPlan.endDate) ||
    (this.endDate >= otherPlan.startDate &&
      this.endDate <= otherPlan.endDate) ||
    (this.startDate <= otherPlan.startDate &&
      this.endDate >= otherPlan.endDate)
  );
};

// Method to add a meal
mealPlanSchema.methods.addMeal = function (date, mealType, recipeId, servings, notes) {
  this.meals.push({
    date,
    mealType,
    recipes: [
      {
        recipe: recipeId,
        servings,
        notes,
      },
    ],
  });
  return this.save();
};

// Method to remove a meal
mealPlanSchema.methods.removeMeal = function (mealId) {
  this.meals.id(mealId).remove();
  return this.save();
};

// Method to generate shopping list data
mealPlanSchema.methods.generateShoppingList = async function () {
  await this.populate('meals.recipes.recipe');

  const ingredientMap = new Map();

  this.meals.forEach((meal) => {
    meal.recipes.forEach((mealRecipe) => {
      const recipe = mealRecipe.recipe;
      if (!recipe) return;

      const servingMultiplier =
        (mealRecipe.servings || recipe.servings) / recipe.servings;

      recipe.ingredients.forEach((ingredient) => {
        const itemName = ingredient.name || ingredient.item; // Support both name (current) and item (legacy)
        if (!itemName) return; // Skip if no name/item
        
        const key = `${itemName.toLowerCase()}-${ingredient.unit || 'unit'}`;

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          existing.quantity += (ingredient.amount || ingredient.quantity || 1) * servingMultiplier;
        } else {
          ingredientMap.set(key, {
            item: itemName,
            quantity: (ingredient.amount || ingredient.quantity || 1) * servingMultiplier,
            unit: ingredient.unit || '',
            category: ingredient.category || 'Other',
          });
        }
      });
    });
  });

  // Group by category
  const groupedIngredients = {};
  ingredientMap.forEach((ingredient) => {
    const category = ingredient.category;
    if (!groupedIngredients[category]) {
      groupedIngredients[category] = [];
    }
    groupedIngredients[category].push({
      item: ingredient.item,
      quantity: Math.round(ingredient.quantity * 100) / 100, // Round to 2 decimals
      unit: ingredient.unit,
    });
  });

  return groupedIngredients;
};

// Static method to check for overlapping plans
mealPlanSchema.statics.findOverlapping = async function (
  userId,
  startDate,
  endDate,
  excludeId = null
) {
  const query = {
    owner: userId,
    isTemplate: false,
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
    ],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return this.find(query);
};

export default mongoose.model('MealPlan', mealPlanSchema);
