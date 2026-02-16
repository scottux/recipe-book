# REQ-012: Shopping Lists

**Status:** Planned  
**Priority:** Medium  
**Version:** 2.0  
**Dependencies:** REQ-001 (Recipe CRUD), REQ-011 (Meal Planning)

## Overview
Users can generate and manage shopping lists from recipes and meal plans, with smart ingredient consolidation and category organization.

## User Stories

### US-012-1: Generate from Single Recipe
**As a** recipe book user  
**I want to** create a shopping list from a recipe  
**So that** I can buy ingredients for that dish

**Acceptance Criteria:**
- "Add to Shopping List" button on recipe detail
- Can adjust servings before adding
- Ingredients added to active shopping list
- Can create new list or add to existing

### US-012-2: Generate from Meal Plan
**As a** recipe book user  
**I want to** create a shopping list from my meal plan  
**So that** I can shop for a week's worth of meals

**Acceptance Criteria:**
- One-click generate from meal plan
- Combines all ingredients from all recipes
- Accounts for adjusted servings
- Groups by category
- Consolidates duplicate ingredients

### US-012-3: Organize by Category
**As a** recipe book user  
**I want to** see ingredients grouped by category  
**So that** I can shop efficiently by store section

**Acceptance Criteria:**
- Auto-categorization (Produce, Dairy, Meat, etc.)
- Categories match typical grocery store layout
- Can customize category order
- Can manually recategorize items

### US-012-4: Check Off Items
**As a** recipe book user  
**I want to** check off items as I shop  
**So that** I can track what I've purchased

**Acceptance Criteria:**
- Checkbox next to each item
- Checked items visually distinguished (strikethrough)
- Can uncheck if needed
- Progress indicator (X of Y items)

### US-012-5: Edit Shopping List
**As a** recipe book user  
**I want to** add, edit, or remove items  
**So that** I can customize my list

**Acceptance Criteria:**
- Add custom items not from recipes
- Edit quantities and units
- Delete items
- Add notes to items

### US-012-6: Share Shopping List
**As a** recipe book user  
**I want to** share my shopping list  
**So that** someone else can shop for me

**Acceptance Criteria:**
- Generate shareable link
- Export as text/email
- Print-friendly format
- Optional: Real-time collaborative editing

## Data Model

### ShoppingList Schema
```javascript
{
  name: String,              // e.g., "Week of Jan 15"
  owner: ObjectId,           // References User
  items: [{
    ingredient: String,      // Ingredient name
    quantity: Number,        // Amount needed
    unit: String,            // Measurement unit
    category: String,        // Produce, Dairy, etc.
    checked: Boolean,        // Purchased or not
    recipeId: ObjectId,      // Source recipe (optional)
    notes: String,           // Optional notes
    isCustom: Boolean        // User-added vs recipe-generated
  }],
  mealPlanId: ObjectId,      // If generated from meal plan
  isActive: Boolean,         // Current active list
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date          // When all items checked
}
```

## API Endpoints

```
GET    /api/shopping-lists              - Get user's shopping lists
POST   /api/shopping-lists              - Create shopping list
GET    /api/shopping-lists/:id          - Get shopping list
PUT    /api/shopping-lists/:id          - Update shopping list
DELETE /api/shopping-lists/:id          - Delete shopping list

POST   /api/shopping-lists/from-recipe/:recipeId    - Generate from recipe
POST   /api/shopping-lists/from-meal-plan/:planId   - Generate from meal plan

PUT    /api/shopping-lists/:id/items/:itemId        - Update item
DELETE /api/shopping-lists/:id/items/:itemId        - Remove item
POST   /api/shopping-lists/:id/items                - Add custom item

GET    /api/shopping-lists/:id/share    - Get shareable link
```

## UI Components

### Shopping Lists Page (`/shopping-lists`)
- List of all shopping lists
- "Create New List" button
- Active list indicator
- Show completion percentage

### Shopping List Detail
- List name and date
- Progress bar (X% complete)
- Category sections
- Add item button
- Share/Export buttons
- Print button

### Item Card
- Checkbox (checked state)
- Quantity + Unit + Name
- Category badge
- Notes field
- Edit/Delete actions

### Add Item Dialog
- Item name input
- Quantity + Unit selectors
- Category dropdown
- Notes field
- Add/Cancel buttons

## Business Rules

1. **Active List**
   - Only one active list at a time
   - Creating new list makes it active
   - Can switch active list

2. **Ingredient Consolidation**
   - Same ingredient from multiple recipes combined
   - Quantities added together
   - Unit conversion when possible
   - Cannot consolidate different units (e.g., cups + lbs)

3. **Categories**
   - Default categories: Produce, Dairy, Meat, Pantry, Frozen, Bakery, Other
   - User can customize category order
   - Items without category go to "Other"

4. **Completion**
   - List marked complete when all items checked
   - Can still edit completed lists
   - Completed lists archived after 30 days

## Category Defaults

- **Produce**: Fruits, vegetables, herbs
- **Dairy**: Milk, cheese, yogurt, eggs
- **Meat**: Beef, chicken, pork, fish, seafood
- **Pantry**: Oils, spices, canned goods, grains, pasta
- **Frozen**: Frozen vegetables, ice cream, frozen meals
- **Bakery**: Bread, tortillas, bagels
- **Beverages**: Drinks, juice, soda
- **Snacks**: Chips, crackers, nuts
- **Other**: Uncategorized items

## Technical Implementation

### Backend
- [ ] ShoppingList model
- [ ] ShoppingList controller
- [ ] Ingredient consolidation logic
- [ ] Unit conversion utilities
- [ ] Category management

### Frontend
- [ ] Shopping lists page
- [ ] Shopping list detail view
- [ ] Item checkbox component
- [ ] Add/edit item dialog
- [ ] Share functionality
- [ ] Print styling

## Ingredient Consolidation Logic

```javascript
// Example: Combining ingredients
Input:
  - Recipe A: 2 cups flour
  - Recipe B: 1 cup flour
  
Output:
  - 3 cups flour

Input:
  - Recipe A: 200g butter
  - Recipe B: 8 oz butter
  
Output:
  - 200g butter, 8 oz butter (cannot combine different units)
```

## Testing Requirements

### Unit Tests
- Ingredient consolidation
- Unit validation
- Category assignment
- Completion calculation

### Integration Tests
- Generate from recipe
- Generate from meal plan
- Check/uncheck items
- Share list

### E2E Tests
- User creates shopping list from recipe
- User checks off items while shopping
- User shares list

## Future Enhancements (v2.1+)

1. **Smart Features**
   - Suggest quantities based on household size
   - "I already have" quick toggle
   - Price tracking and budgeting

2. **Store Integration**
   - Map to specific grocery stores
   - Store aisle numbers
   - Online grocery pickup integration

3. **Mobile App**
   - Offline access
   - Barcode scanning
   - Voice input for items

## Success Metrics

- % of users who create shopping lists
- Lists generated per user per month
- Average completion rate
- Share feature usage

## Dependencies

- REQ-001: Recipe CRUD
- REQ-011: Meal Planning

## Related Requirements

- REQ-011: Meal Planning (generates shopping lists)
- REQ-013: Export (shopping lists can be exported)