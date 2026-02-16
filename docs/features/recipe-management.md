# Recipe Management

Complete guide to creating, reading, updating, and deleting recipes.

## Overview

The Recipe Book application provides full CRUD (Create, Read, Update, Delete) operations for managing your recipe collection.

## Creating Recipes

### Manual Entry

1. Click the **"+ Add Recipe"** button on the home page
2. Fill in the recipe form:
   - **Title** (required)
   - **Description** (optional)
   - **Ingredients** (at least one required)
   - **Instructions** (at least one required)
   - **Prep Time** (minutes)
   - **Cook Time** (minutes)
   - **Servings**
   - **Dish Type** (dropdown)
   - **Cuisine**
   - **Tags** (comma-separated)
   - **Rating** (1-5 stars)
3. Click **"Save Recipe"**

### Adding Ingredients

- Click **"Add Ingredient"** to add a new ingredient field
- Enter:
  - **Amount** (e.g., "2", "1/2", "1 ½")
  - **Unit** (e.g., "cups", "tablespoons", "oz")
  - **Name** (e.g., "all-purpose flour")
- Click the **×** button to remove an ingredient

### Adding Instructions

- Click **"Add Step"** to add a new instruction
- Enter the step text
- Steps are automatically numbered
- Click the **×** button to remove a step

## Viewing Recipes

### Recipe List

The home page displays all recipes with:
- Title
- Description preview
- Dish type
- Cuisine
- Rating (star display)
- Prep and cook times

### Recipe Details

Click any recipe title to view full details:
- Complete ingredient list
- Step-by-step instructions
- All metadata (times, servings, ratings, etc.)
- Source URL (if imported)
- Action buttons (Edit, Delete)

## Updating Recipes

1. Open a recipe's detail page
2. Click the **"Edit Recipe"** button
3. Modify any fields
4. Click **"Save Recipe"** to apply changes
5. Or click **"Cancel"** to discard changes

### What Can Be Updated

- All recipe fields (title, description, etc.)
- Ingredients (add, remove, or modify)
- Instructions (add, remove, or modify)
- Metadata (times, servings, ratings, etc.)

## Deleting Recipes

1. Open a recipe's detail page
2. Click the **"Delete Recipe"** button
3. Confirm the deletion in the popup dialog
4. The recipe is permanently removed

⚠️ **Warning:** Deletion is permanent and cannot be undone.

## Recipe Data Model

A recipe consists of:

```javascript
{
  title: String,              // Required
  description: String,
  ingredients: [{
    name: String,             // Required
    amount: String,
    unit: String
  }],
  instructions: [String],     // Required, array of steps
  prepTime: Number,           // Minutes
  cookTime: Number,           // Minutes
  servings: Number,
  dishType: String,           // Enum (see below)
  cuisine: String,
  tags: [String],
  rating: Number,             // 1-5
  sourceUrl: String,
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-generated
}
```

### Dish Types

- Appetizer
- Main Course
- Side Dish
- Dessert
- Beverage
- Snack
- Breakfast
- Lunch
- Dinner
- Other

## Tips

- **Use descriptive titles**: Make recipes easy to find
- **Add tags**: Helps with searching and categorization
- **Include times**: Helps with meal planning
- **Rate your recipes**: Remember which ones are favorites
- **Source URLs**: Keep track of where you found recipes

## Related

- [Recipe Import](recipe-import.md) - Import recipes from URLs
- [Search & Filtering](search-filtering.md) - Find recipes quickly
- [Serving Adjustment](serving-adjustment.md) - Scale recipes