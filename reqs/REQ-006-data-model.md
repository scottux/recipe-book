# REQ-006: Recipe Data Model

## Metadata

- **ID**: REQ-006
- **Title**: Recipe Data Model and Schema
- **Status**: ✅ Implemented
- **Priority**: High
- **Created**: 2024-01-15
- **Last Updated**: 2026-02-13

## Description

Define the complete data structure for recipes including validation rules, constraints, and indexes for optimal performance.

## Data Schema

```javascript
{
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  ingredients: [{
    name: { 
      type: String, 
      required: true 
    },
    amount: String,
    unit: String
  }],
  instructions: [{
    type: String,
    required: true
  }],
  prepTime: {
    type: Number,
    min: 0  // minutes
  },
  cookTime: {
    type: Number,
    min: 0  // minutes
  },
  servings: {
    type: Number,
    min: 1
  },
  dishType: {
    type: String,
    enum: [
      'Appetizer', 'Main Course', 'Side Dish',
      'Dessert', 'Beverage', 'Snack',
      'Breakfast', 'Lunch', 'Dinner', 'Other'
    ],
    default: 'Other'
  },
  cuisine: {
    type: String,
    trim: true
  },
  tags: [String],
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

## Field Specifications

### Required Fields
- `title` - Recipe name
- `ingredients` - At least one ingredient
- `instructions` - At least one instruction step

### Optional Fields
- All other fields are optional but recommended

### Constraints

**Times:**
- Must be non-negative integers (minutes)
- `prepTime`: 0 to unlimited
- `cookTime`: 0 to unlimited

**Servings:**
- Must be positive integer (min: 1)

**Rating:**
- Must be between 1 and 5 (inclusive)
- Represents star rating

**Dish Type:**
- Must be one of predefined enum values
- Defaults to "Other" if not specified

### Indexes

For query performance:
- Text index: `title`, `description`
- Single indexes: `dishType`, `cuisine`, `rating`
- Array index: `ingredients.name`
- Date index: `createdAt`, `updatedAt`

## Validation Rules

### Title
- Cannot be empty
- Trimmed of whitespace
- No length limits (but recommended < 100 chars)

### Ingredients
- Array cannot be empty
- Each ingredient must have `name`
- `amount` and `unit` are optional

### Instructions
- Array cannot be empty
- Each step must be non-empty string
- Recommended: clear, numbered steps

### Cuisine
- Free-form text field
- Trimmed of whitespace
- Common values: Italian, Mexican, Chinese, etc.

### Tags
- Array of strings
- No duplicates enforced at app level
- Used for flexible categorization

## Database Configuration

**Collection**: `recipes`
**Database**: `recipe-book`

```javascript
// Mongoose model location
backend/src/models/Recipe.js
```

## Migration Notes

### Future Schema Changes

Planned additions:
- `imageUrl` - Recipe photo
- `nutrition` - Nutritional information object
- `difficulty` - Easy/Medium/Hard
- `allergens` - Array of allergen warnings
- `equipment` - Required cooking equipment
- `cost` - Estimated cost rating

## Dependencies

All other requirements depend on this data model.

## Testing

- Validate required fields enforcement
- Test min/max constraints
- Verify enum values
- Check index performance
- Test timestamp auto-generation

## References

- Code: `backend/src/models/Recipe.js`
- [API Reference](../docs/api/api-reference.md)
- [Recipe Management](../docs/features/recipe-management.md)