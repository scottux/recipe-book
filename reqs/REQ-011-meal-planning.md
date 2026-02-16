# REQ-011: Meal Planning

**Status:** Planned  
**Priority:** High  
**Version:** 2.0  
**Dependencies:** REQ-001 (Recipe CRUD), REQ-010 (Collections), Authentication

## Overview
Users can plan their meals for the week/month by assigning recipes to specific dates and meal times, helping with grocery shopping and meal preparation.

## User Stories

### US-011-1: Create Meal Plan
**As a** recipe book user  
**I want to** create a meal plan for a week  
**So that** I can organize my cooking schedule

**Acceptance Criteria:**
- User can create meal plans with start/end dates
- User can name the meal plan (e.g., "Week of Jan 15")
- User can specify meal types (Breakfast, Lunch, Dinner, Snack)
- Meal plan covers 1-4 weeks

### US-011-2: Assign Recipes to Meals
**As a** recipe book user  
**I want to** assign recipes to specific days and meals  
**So that** I know what to cook when

**Acceptance Criteria:**
- Drag-and-drop recipes onto calendar slots
- Click to add recipe to a meal slot
- Can assign multiple recipes to one meal
- Can leave meal slots empty
- Shows recipe thumbnail and name

### US-011-3: View Meal Plan Calendar
**As a** recipe book user  
**I want to** see my meal plan in calendar view  
**So that** I can visualize my weekly meals

**Acceptance Criteria:**
- Week view (default) showing 7 days
- Month view showing 4 weeks
- Each day shows meals (Breakfast, Lunch, Dinner)
- Can navigate previous/next week
- Can jump to specific date
- Shows today indicator

### US-011-4: Generate Shopping List
**As a** recipe book user  
**I want to** generate a shopping list from my meal plan  
**So that** I can buy all needed ingredients

**Acceptance Criteria:**
- One-click generate from meal plan
- Combines all ingredients from planned recipes
- Groups by ingredient category
- Accounts for recipe servings
- Can adjust quantities
- Can mark items as "have on hand"

### US-011-5: Adjust Servings for Meal
**As a** recipe book user  
**I want to** adjust recipe servings in the meal plan  
**So that** I can plan for different household sizes

**Acceptance Criteria:**
- Can override recipe's default servings
- Ingredient quantities adjust automatically
- Shows adjusted vs original servings
- Affects shopping list generation

### US-011-6: Reuse/Template Meal Plans
**As a** recipe book user  
**I want to** save meal plans as templates  
**So that** I can reuse successful plans

**Acceptance Criteria:**
- Can save current plan as template
- Can load template for new week
- Templates don't include dates
- Can edit after loading template

## Data Model

### MealPlan Schema
```javascript
{
  name: String,              // e.g., "Week of Jan 15"
  owner: ObjectId,           // References User
  startDate: Date,           // Plan start date
  endDate: Date,             // Plan end date
  meals: [{
    date: Date,              // Specific day
    mealType: String,        // breakfast, lunch, dinner, snack
    recipes: [{
      recipe: ObjectId,      // References Recipe
      servings: Number,      // Override servings
      notes: String          // Optional notes
    }]
  }],
  isTemplate: Boolean,       // If true, can be reused
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

```
GET    /api/meal-plans              - List user's meal plans
POST   /api/meal-plans              - Create meal plan
GET    /api/meal-plans/:id          - Get meal plan details
PUT    /api/meal-plans/:id          - Update meal plan
DELETE /api/meal-plans/:id          - Delete meal plan

POST   /api/meal-plans/:id/meals    - Add meal to plan
PUT    /api/meal-plans/:id/meals/:mealId - Update meal
DELETE /api/meal-plans/:id/meals/:mealId - Remove meal

GET    /api/meal-plans/:id/shopping-list - Generate shopping list
POST   /api/meal-plans/:id/duplicate     - Duplicate as template
```

## UI Components

### Meal Planning Page (`/meal-planning`)
- Calendar view (week/month toggle)
- Current meal plan selector
- "Create New Plan" button
- Date navigation (prev/next, jump to date)
- Recipe sidebar for adding

### Meal Plan Calendar
- 7-column grid for days
- 3-4 rows per day (meal types)
- Drag-drop zones for recipes
- Empty state: "Add recipe"
- Recipe cards show thumbnail + name

### Add to Meal Plan Dialog
- Date picker
- Meal type selector
- Servings adjuster
- Notes field
- Add/Cancel buttons

### Shopping List Generator
- "Generate Shopping List" button
- Shows combined ingredients
- Category grouping
- Checkboxes to mark items
- Print/export options

## Business Rules

1. **Date Constraints**
   - Meal plans span 1-4 weeks
   - Cannot create overlapping plans
   - Can plan up to 3 months in advance

2. **Meal Types**
   - Standard: Breakfast, Lunch, Dinner, Snack
   - User can customize meal type names
   - Each day can have 0-6 meals

3. **Servings**
   - Defaults to recipe's servings
   - Can override per meal assignment
   - Shopping list uses overridden values

4. **Templates**
   - Templates are date-agnostic
   - Loading template creates new plan
   - Original template unchanged

## Technical Implementation

### Backend
- [ ] MealPlan model
- [ ] MealPlan controller
- [ ] MealPlan routes
- [ ] Shopping list aggregation logic
- [ ] Template duplication logic

### Frontend
- [ ] Meal planning page
- [ ] Calendar component
- [ ] Drag-and-drop functionality
- [ ] Add to meal plan dialog
- [ ] Shopping list view
- [ ] Template management

## Testing Requirements

### Unit Tests
- MealPlan model validation
- Date overlap detection
- Servings calculation
- Shopping list aggregation

### Integration Tests
- Create meal plan workflow
- Add/remove meals workflow
- Generate shopping list
- Save/load template

### E2E Tests
- User plans a week of meals
- User generates shopping list
- User saves plan as template

## Future Enhancements (v2.1+)

1. **Smart Suggestions**
   - Recipe recommendations based on nutrition balance
   - "What's in season" suggestions
   - Budget-conscious meal plans

2. **Family Meal Planning**
   - Different plans for family members
   - Dietary preference filtering
   - Serving size auto-calculation

3. **Recurring Meals**
   - Set "Taco Tuesday" recurring
   - Auto-populate favorite breakfast
   - Weekly patterns

4. **Meal Prep Indicators**
   - Flag make-ahead meals
   - Batch cooking suggestions
   - Prep time optimization

## Success Metrics

- % of users who create meal plans
- Average meals planned per week
- Shopping list generation rate
- Template reuse rate

## Dependencies

- REQ-001: Recipe CRUD
- REQ-010: Collections
- REQ-012: Shopping Lists
- Authentication system

## Related Requirements

- REQ-012: Shopping Lists (generated from meal plans)
- REQ-013: Export (meal plans can be exported)