# REQ-001: Recipe CRUD Operations

## Metadata

- **ID**: REQ-001
- **Title**: Recipe CRUD Operations
- **Status**: ✅ Implemented
- **Priority**: High
- **Created**: 2024-01-15
- **Last Updated**: 2026-02-13

## Description

Users must be able to create, read, update, and delete recipes through both the web interface and REST API.

## User Stories

### As a user, I want to:

1. **Create recipes manually** so I can add my family recipes to the collection
2. **View all my recipes** so I can browse my collection
3. **View recipe details** so I can follow cooking instructions
4. **Edit existing recipes** so I can fix mistakes or make improvements
5. **Delete recipes** so I can remove ones I no longer want

## Acceptance Criteria

### Create Recipe (POST)

- [ ] ✅ User can access a form to create new recipes
- [ ] ✅ Form validates required fields (title, ingredients, instructions)
- [ ] ✅ User can add multiple ingredients dynamically
- [ ] ✅ User can add multiple instruction steps dynamically
- [ ] ✅ User can set optional metadata (times, servings, ratings, etc.)
- [ ] ✅ Recipe is saved to database with timestamp
- [ ] ✅ User is redirected to recipe detail page after creation
- [ ] ✅ API endpoint returns created recipe with 201 status

### Read Recipes (GET)

- [ ] ✅ User can view list of all recipes on home page
- [ ] ✅ List displays title, description preview, metadata
- [ ] ✅ User can click recipe to view full details
- [ ] ✅ Detail page shows all recipe information
- [ ] ✅ API endpoint supports filtering and sorting
- [ ] ✅ API returns proper error for non-existent recipes

### Update Recipe (PUT)

- [ ] ✅ User can access edit form from recipe detail page
- [ ] ✅ Form is pre-populated with existing data
- [ ] ✅ User can modify any field
- [ ] ✅ User can add/remove ingredients and instructions
- [ ] ✅ Changes are saved to database
- [ ] ✅ Updated timestamp is modified
- [ ] ✅ User sees updated recipe after saving

### Delete Recipe (DELETE)

- [ ] ✅ User can initiate delete from recipe detail page
- [ ] ✅ Confirmation dialog prevents accidental deletion
- [ ] ✅ Recipe is permanently removed from database
- [ ] ✅ User is redirected to home page after deletion
- [ ] ✅ API returns success message

## Technical Implementation

### Frontend Components

- `RecipeList.jsx` - Displays all recipes
- `RecipeDetail.jsx` - Shows full recipe details
- `RecipeForm.jsx` - Create/edit recipe form

### Backend Routes

```javascript
GET    /api/recipes      // List all recipes
GET    /api/recipes/:id  // Get single recipe
POST   /api/recipes      // Create recipe
PUT    /api/recipes/:id  // Update recipe
DELETE /api/recipes/:id  // Delete recipe
```

### Database Model

```javascript
{
  title: String (required),
  description: String,
  ingredients: Array (required, min 1),
  instructions: Array (required, min 1),
  prepTime: Number,
  cookTime: Number,
  servings: Number,
  dishType: String (enum),
  cuisine: String,
  tags: Array,
  rating: Number (1-5),
  sourceUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Dependencies

- [REQ-006](REQ-006-data-model.md) - Recipe Data Model

## Testing Scenarios

### Create Recipe

1. Navigate to "Add Recipe" form
2. Leave title blank → Should show validation error
3. Fill in title, add 2 ingredients, add 3 instructions
4. Submit form → Should create recipe and redirect
5. Verify recipe appears in list

### Read Recipe

1. Click on recipe from list
2. Verify all fields display correctly
3. Check timestamps are shown
4. Verify ingredients and instructions are numbered

### Update Recipe

1. Open recipe detail page
2. Click "Edit" button
3. Change title and add ingredient
4. Save changes
5. Verify updates are reflected
6. Check updated timestamp changed

### Delete Recipe

1. Open recipe detail page
2. Click "Delete" button
3. Cancel confirmation → Recipe not deleted
4. Click "Delete" again
5. Confirm deletion → Recipe removed
6. Verify redirected to home page
7. Confirm recipe no longer in list

## Future Enhancements

- [ ] Batch operations (delete multiple)
- [ ] Recipe templates
- [ ] Duplicate recipe function
- [ ] Version history / undo
- [ ] Recipe export (PDF, JSON)
- [ ] Recipe sharing via link

## Related Requirements

- [REQ-002](REQ-002-recipe-import.md) - Recipe URL Import
- [REQ-003](REQ-003-search-filter.md) - Search & Filtering
- [REQ-006](REQ-006-data-model.md) - Recipe Data Model

## References

- [Recipe Management Documentation](../docs/features/recipe-management.md)
- [API Reference](../docs/api/api-reference.md)