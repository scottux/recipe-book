# REQ-023: V2.2.1 Critical Bugfix Release

**Version**: 2.2.1  
**Type**: Patch Release (Bug Fixes)  
**Priority**: CRITICAL  
**Status**: 📋 In Progress - Requirements Documentation  
**Created**: February 16, 2026  
**Target Release**: February 20, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Bug Specifications](#bug-specifications)
3. [Acceptance Criteria](#acceptance-criteria)
4. [Technical Requirements](#technical-requirements)
5. [Testing Requirements](#testing-requirements)
6. [Documentation Requirements](#documentation-requirements)

---

## Overview

This requirement document specifies the fixes for 5 critical bugs discovered during V2.1.5-V2.2.0 development that impact core functionality and user experience. This is a patch release following V2.2.0 (Google Drive Integration).

### Business Impact

**High Priority Issues**:
- Users cannot accurately plan meals (date off-by-one error)
- Users cannot add recipes to meal plans (missing UI component)
- Users cannot add recipes to shopping lists (broken functionality)

**Medium Priority Issues**:
- Visual inconsistency breaks design system compliance
- Poor UI layout impacts usability and accessibility

### Affected Users
- All users attempting to use meal planning (Bugs #1, #2, #4)
- All users attempting to manage shopping lists (Bug #3)
- All users viewing recipe details (Bug #5)

---

## Bug Specifications

### Bug #1: Meal Plan Date Selection Off-by-One Error

#### Current Behavior ❌
When a user selects a date range (e.g., Feb 15-21, 2026), the meal plan is created for dates one day earlier (Feb 14-20, 2026).

#### Root Cause
Timezone conversion issues in date handling between:
- Date picker component output
- Form submission processing
- API request formatting
- Backend date storage

#### Expected Behavior ✅
When a user selects a date range:
1. The date picker displays: "Feb 15 - Feb 21"
2. The meal plan is created for: Feb 15 - Feb 21
3. The meal plan detail shows: "Feb 15 - Feb 21"
4. Each day shows the correct date in the calendar grid

#### Technical Details

**Component**: `frontend/src/components/MealPlanningPage.jsx`

**Areas to Investigate**:
```javascript
// 1. Date picker configuration
<input type="date" ...>

// 2. Form submission handler
const handleSubmit = async (e) => {
  // Check how startDate and endDate are formatted
  const mealPlanData = {
    startDate: ..., // Format must preserve user's intended date
    endDate: ...,
  };
};

// 3. API request formatting
await api.post('/api/meal-plans', mealPlanData);
```

**Likely Issues**:
1. **UTC Conversion**: `new Date().toISOString()` converts to UTC, shifting dates
2. **Date Constructor**: `new Date('2026-02-15')` interprets as UTC midnight
3. **Input Value**: Date input `value` attribute may need format adjustment

**Proposed Solution**:
```javascript
// Use date string directly from input without conversion
// OR
// Use date-fns/dayjs to handle dates in user's timezone
import { format } from 'date-fns';

const formatDateForAPI = (dateString) => {
  // Keep as YYYY-MM-DD string, don't convert to Date object
  return dateString;
};
```

#### Acceptance Criteria
- [ ] Selected date range matches created meal plan dates exactly
- [ ] Test with multiple date ranges (past, present, future)
- [ ] Test across timezone boundaries (if possible)
- [ ] Calendar grid displays correct dates
- [ ] No off-by-one errors in any date display

---

### Bug #2: Meal Plan Missing Recipe Selection List

#### Current Behavior ❌
When users try to add recipes to meal plans:
- No recipe list/selector appears
- Cannot browse available recipes
- Cannot search for recipes
- Cannot add recipes to meals

#### Root Cause
Missing UI component and/or API integration for recipe selection within meal planning interface.

#### Expected Behavior ✅
When adding a recipe to a meal:
1. User clicks "Add Recipe" button for a specific meal slot
2. Modal/dropdown opens showing available recipes
3. User can search/filter recipes
4. User selects recipe(s) from the list
5. Selected recipes are added to the meal
6. Meal displays selected recipes

#### Technical Details

**Component**: `frontend/src/components/MealPlanningPage.jsx`

**Required Implementation**:

**Option A: Modal with Recipe List**
```jsx
const [showRecipeModal, setShowRecipeModal] = useState(false);
const [selectedMealSlot, setSelectedMealSlot] = useState(null);
const [availableRecipes, setAvailableRecipes] = useState([]);

// Load recipes when modal opens
const handleAddRecipe = (date, mealType) => {
  setSelectedMealSlot({ date, mealType });
  fetchRecipes(); // Load recipes from API
  setShowRecipeModal(true);
};

// Fetch recipes
const fetchRecipes = async () => {
  const response = await api.get('/api/recipes', {
    params: { page: 1, limit: 100 } // Get all recipes
  });
  setAvailableRecipes(response.data.data || response.data.recipes || []);
};

// Add recipe to meal
const handleSelectRecipe = async (recipe) => {
  await api.post(`/api/meal-plans/${mealPlanId}/meals`, {
    date: selectedMealSlot.date,
    mealType: selectedMealSlot.mealType,
    recipeId: recipe._id,
    servings: recipe.servings // or allow user to adjust
  });
  
  // Refresh meal plan
  fetchMealPlan();
  setShowRecipeModal(false);
};
```

**UI Components Needed**:
1. **Recipe Selector Modal**
   - Search bar for filtering
   - Recipe list with cards/rows
   - Click to select (or multi-select)
   - Loading state
   - Empty state
   - Error handling

2. **Recipe Card/Row** (in modal)
   - Recipe title
   - Cuisine/dish type
   - Prep/cook time
   - Photo (if available)
   - Select button

**Styling Requirements**:
- Follow cookbook brown theme
- Consistent with existing modals
- Responsive design
- Accessible (keyboard navigation)

#### Acceptance Criteria
- [ ] "Add Recipe" button opens recipe selector
- [ ] Recipe list loads successfully
- [ ] Can search/filter recipes in selector
- [ ] Can select recipe and add to meal
- [ ] Selected recipe appears in meal slot
- [ ] Multiple recipes can be added to same meal
- [ ] Modal closes after selection
- [ ] Loading and error states handled
- [ ] Keyboard navigation works
- [ ] Mobile-responsive design

---

### Bug #3: Cannot Add Recipe to Shopping List

#### Current Behavior ❌
Users cannot add recipes to shopping lists. The feature either:
- Doesn't exist in the UI
- Exists but doesn't work
- Returns errors when attempted

#### Root Cause
**Unknown** - Requires investigation

#### Expected Behavior ✅
Users should be able to:
1. Navigate to a shopping list (active or inactive)
2. Click "Add Recipe" or similar button
3. Select recipe(s) from available list
4. Recipe ingredients automatically added to shopping list
5. Items grouped by category
6. Duplicate ingredients consolidated

#### Technical Details

**Components to Investigate**:
- `frontend/src/components/ShoppingListDetail.jsx`
- `frontend/src/components/ShoppingListsPage.jsx`
- `backend/src/controllers/shoppingListController.js`
- `backend/src/routes/shoppingLists.js`

**Investigation Steps**:

1. **Check if UI exists**:
```jsx
// Look for "Add Recipe" button in ShoppingListDetail.jsx
// Does it exist? If so, what does it do?
```

2. **Check if API endpoint exists**:
```javascript
// Backend: shoppingListController.js
// Is there a method to add recipe to shopping list?
// Route might be: POST /api/shopping-lists/:id/recipes
```

3. **Test API endpoint manually**:
```bash
# If endpoint exists, test it
curl -X POST http://localhost:5000/api/shopping-lists/:id/recipes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipeId": "recipe_id_here"}'
```

4. **Check existing code for patterns**:
```javascript
// Meal plans can add recipes - check how they do it
// mealPlanController.js likely has similar logic
```

**Expected API Contract**:
```javascript
// Request
POST /api/shopping-lists/:id/recipes
{
  "recipeId": "507f1f77bcf86cd799439011",
  "servings": 4 // optional, for scaling
}

// Response
{
  "success": true,
  "data": {
    // Updated shopping list with new items
    "_id": "...",
    "name": "Weekly Groceries",
    "items": [
      // All items including newly added from recipe
    ]
  }
}
```

**Implementation Requirements** (if missing):

**Backend** (`backend/src/controllers/shoppingListController.js`):
```javascript
exports.addRecipeToList = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipeId, servings } = req.body;
    
    // 1. Get shopping list (verify ownership)
    const shoppingList = await ShoppingList.findOne({
      _id: id,
      owner: req.user._id
    });
    
    if (!shoppingList) {
      return res.status(404).json({
        success: false,
        message: 'Shopping list not found'
      });
    }
    
    // 2. Get recipe (verify ownership)
    const recipe = await Recipe.findOne({
      _id: recipeId,
      owner: req.user._id
    });
    
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }
    
    // 3. Scale ingredients if servings provided
    const scaleFactor = servings ? servings / recipe.servings : 1;
    
    // 4. Add ingredients to shopping list
    for (const ingredient of recipe.ingredients) {
      const scaledQuantity = ingredient.quantity * scaleFactor;
      
      // Check if ingredient already exists
      const existingItem = shoppingList.items.find(
        item => item.ingredient.toLowerCase() === ingredient.item.toLowerCase()
      );
      
      if (existingItem) {
        // Update quantity if units match, otherwise add new item
        if (existingItem.unit === ingredient.unit) {
          existingItem.quantity += scaledQuantity;
        } else {
          shoppingList.items.push({
            ingredient: ingredient.item,
            quantity: scaledQuantity,
            unit: ingredient.unit,
            category: categorizeIngredient(ingredient.item),
            checked: false
          });
        }
      } else {
        // Add new item
        shoppingList.items.push({
          ingredient: ingredient.item,
          quantity: scaledQuantity,
          unit: ingredient.unit,
          category: categorizeIngredient(ingredient.item),
          checked: false,
          notes: `From: ${recipe.title}`
        });
      }
    }
    
    // 5. Save updated shopping list
    await shoppingList.save();
    
    res.json({
      success: true,
      data: shoppingList,
      message: `Added ${recipe.ingredients.length} items from ${recipe.title}`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding recipe to shopping list',
      error: error.message
    });
  }
};

// Helper function for categorization
function categorizeIngredient(ingredient) {
  // Simplified categorization logic
  const lower = ingredient.toLowerCase();
  
  if (lower.match(/chicken|beef|pork|fish|meat|turkey/)) return 'Meat & Seafood';
  if (lower.match(/milk|cheese|yogurt|butter|cream/)) return 'Dairy';
  if (lower.match(/apple|banana|orange|berry|fruit/)) return 'Produce';
  if (lower.match(/bread|pasta|rice|flour|cereal/)) return 'Pantry';
  if (lower.match(/broccoli|carrot|lettuce|spinach|vegetable/)) return 'Produce';
  if (lower.match(/frozen|ice cream/)) return 'Frozen';
  if (lower.match(/soda|juice|water|coffee|tea/)) return 'Beverages';
  if (lower.match(/cookie|chip|candy|snack/)) return 'Snacks';
  if (lower.match(/cake|pie|muffin|donut/)) return 'Bakery';
  
  return 'Other';
}
```

**Frontend** (`frontend/src/components/ShoppingListDetail.jsx`):
```jsx
const [showRecipeModal, setShowRecipeModal] = useState(false);
const [recipes, setRecipes] = useState([]);
const [loading, setLoading] = useState(false);

const handleAddRecipe = async () => {
  setLoading(true);
  try {
    // Fetch available recipes
    const response = await api.get('/api/recipes', {
      params: { page: 1, limit: 100 }
    });
    setRecipes(response.data.data || response.data.recipes || []);
    setShowRecipeModal(true);
  } catch (error) {
    alert('Failed to load recipes');
  } finally {
    setLoading(false);
  }
};

const handleSelectRecipe = async (recipe) => {
  setLoading(true);
  try {
    await api.post(`/api/shopping-lists/${id}/recipes`, {
      recipeId: recipe._id,
      servings: recipe.servings
    });
    
    // Refresh shopping list
    await fetchShoppingList();
    setShowRecipeModal(false);
    
    // Show success message
    alert(`Added ${recipe.title} ingredients to shopping list`);
  } catch (error) {
    alert('Failed to add recipe to shopping list');
  } finally {
    setLoading(false);
  }
};
```

#### Acceptance Criteria
- [ ] Investigation completed - root cause identified
- [ ] "Add Recipe" button visible in shopping list detail
- [ ] Clicking button opens recipe selector modal
- [ ] Recipe list loads successfully
- [ ] Selecting recipe adds ingredients to shopping list
- [ ] Ingredients properly categorized
- [ ] Duplicate ingredients handled appropriately
- [ ] Success message displayed
- [ ] Shopping list updates in real-time
- [ ] Error handling works correctly
- [ ] Works for both active and inactive lists

---

### Bug #4: Meal Planning Blue Button (Theme Violation)

#### Current Behavior ❌
The meal planning page contains at least one button with blue styling instead of the cookbook brown theme.

#### Root Cause
Button was not updated during the V2.1.4 theme migration to cookbook brown.

#### Expected Behavior ✅
All buttons on the meal planning page should use cookbook brown theme colors:
- Primary buttons: `bg-cookbook-accent text-white hover:bg-cookbook-darkbrown`
- Secondary buttons: `border-2 border-cookbook-aged hover:bg-cookbook-cream`
- Danger buttons: `bg-red-600 text-white hover:bg-red-700`

#### Technical Details

**Component**: `frontend/src/components/MealPlanningPage.jsx`

**Search for Blue Classes**:
```bash
# Find blue-colored classes
grep -n "blue-" frontend/src/components/MealPlanningPage.jsx
grep -n "indigo-" frontend/src/components/MealPlanningPage.jsx
```

**Common Blue Classes to Replace**:
```css
/* OLD (Blue Theme) */
bg-blue-600 → bg-cookbook-accent
text-blue-600 → text-cookbook-accent
border-blue-600 → border-cookbook-aged
hover:bg-blue-700 → hover:bg-cookbook-darkbrown
focus:ring-blue-500 → focus:ring-cookbook-accent
```

**Button States to Check**:
1. Normal state
2. Hover state
3. Focus state (keyboard navigation)
4. Disabled state
5. Loading state (if applicable)

#### Acceptance Criteria
- [ ] No blue colors in MealPlanningPage
- [ ] All buttons use cookbook theme
- [ ] Hover states work correctly
- [ ] Focus rings are cookbook brown/accent
- [ ] Disabled states maintain theme
- [ ] Visual consistency with other pages
- [ ] Matches design system guidelines

---

### Bug #5: Recipe Detail Top-Right UI Cramped and Inconsistent

#### Current Behavior ❌
The action buttons in the top-right corner of the recipe detail page are:
- Too close together (cramped)
- Inconsistent sizing
- Inconsistent styling
- Poor touch targets (< 44x44px)
- Not responsive on mobile

#### Root Cause
Layout and spacing were not properly designed. Buttons were added incrementally without consistent design pattern.

#### Expected Behavior ✅
Action buttons should:
- Have consistent size (min 44x44px touch targets)
- Have appropriate spacing (min 8px between buttons)
- Follow cookbook theme styling
- Be responsive (stack on mobile if needed)
- Have clear visual hierarchy
- Be accessible (keyboard navigation, screen reader friendly)

#### Technical Details

**Component**: `frontend/src/components/RecipeDetail.jsx`

**Current Button Area** (likely):
```jsx
{/* Top-right action buttons - CURRENT (problematic) */}
<div className="flex gap-2">
  <button className="...">Edit</button>
  <button className="...">Export</button>
  <button className="...">Delete</button>
  <button className="...">Lock</button>
</div>
```

**Proposed Redesign**:

**Option A: Horizontal Button Bar** (Desktop)
```jsx
<div className="flex flex-wrap gap-3 items-center">
  {/* Primary Actions */}
  <button 
    onClick={handleEdit}
    className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 
               bg-cookbook-accent text-white hover:bg-cookbook-darkbrown 
               focus:ring-2 focus:ring-cookbook-accent focus:ring-offset-2
               rounded-md font-body transition-colors"
    aria-label="Edit recipe"
  >
    <PencilIcon className="w-5 h-5 mr-2" />
    Edit
  </button>
  
  {/* Secondary Actions */}
  <button 
    onClick={handleExport}
    className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2
               border-2 border-cookbook-aged bg-cookbook-cream hover:bg-white
               text-cookbook-darkbrown focus:ring-2 focus:ring-cookbook-accent
               rounded-md font-body transition-colors"
    aria-label="Export recipe"
  >
    <DownloadIcon className="w-5 h-5 mr-2" />
    Export
  </button>
  
  {/* Tertiary Actions - Dropdown Menu */}
  <div className="relative">
    <button
      onClick={() => setShowMenu(!showMenu)}
      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-3
                 border-2 border-cookbook-aged bg-cookbook-paper hover:bg-cookbook-cream
                 focus:ring-2 focus:ring-cookbook-accent
                 rounded-md transition-colors"
      aria-label="More actions"
      aria-expanded={showMenu}
    >
      <DotsVerticalIcon className="w-5 h-5 text-cookbook-darkbrown" />
    </button>
    
    {showMenu && (
      <div className="absolute right-0 mt-2 w-48 bg-cookbook-paper border-2 border-cookbook-aged
                      rounded-md shadow-cookbook z-10">
        <button
          onClick={handleLock}
          className="w-full px-4 py-3 text-left hover:bg-cookbook-cream
                     font-body text-cookbook-darkbrown flex items-center"
        >
          <LockIcon className="w-5 h-5 mr-3" />
          {recipe.locked ? 'Unlock' : 'Lock'} Recipe
        </button>
        
        <button
          onClick={handleDelete}
          className="w-full px-4 py-3 text-left hover:bg-red-50
                     font-body text-red-600 flex items-center border-t border-cookbook-aged"
        >
          <TrashIcon className="w-5 h-5 mr-3" />
          Delete Recipe
        </button>
      </div>
    )}
  </div>
</div>
```

**Option B: Icon Buttons + Dropdown** (Cleaner)
```jsx
<div className="flex gap-2 items-center">
  {/* Quick Actions */}
  <button
    onClick={handleEdit}
    className="p-2 min-w-[44px] min-h-[44px] bg-cookbook-accent text-white
               hover:bg-cookbook-darkbrown rounded-md focus:ring-2 focus:ring-cookbook-accent"
    aria-label="Edit recipe"
    title="Edit"
  >
    <PencilIcon className="w-6 h-6" />
  </button>
  
  <button
    onClick={handleExport}
    className="p-2 min-w-[44px] min-h-[44px] border-2 border-cookbook-aged
               text-cookbook-darkbrown hover:bg-cookbook-cream rounded-md
               focus:ring-2 focus:ring-cookbook-accent"
    aria-label="Export recipe"
    title="Export"
  >
    <DownloadIcon className="w-6 h-6" />
  </button>
  
  {/* More Actions Menu */}
  <MoreActionsMenu>
    <MenuItem onClick={handleLock}>
      {recipe.locked ? 'Unlock' : 'Lock'} Recipe
    </MenuItem>
    <MenuItem onClick={handleDelete} variant="danger">
      Delete Recipe
    </MenuItem>
  </MoreActionsMenu>
</div>
```

**Mobile Responsive** (< 640px):
```jsx
<div className="flex flex-col sm:flex-row gap-3">
  {/* Buttons stack vertically on mobile, horizontal on desktop */}
  <button className="w-full sm:w-auto ...">Edit</button>
  <button className="w-full sm:w-auto ...">Export</button>
  {/* Menu button stays same size */}
</div>
```

**Accessibility Requirements**:
- [ ] All interactive elements min 44x44px
- [ ] Clear focus indicators (2px ring)
- [ ] ARIA labels on icon-only buttons
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader friendly
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1)

**Design System Compliance**:
- [ ] Cookbook brown color palette
- [ ] Consistent with button patterns in CollectionsPage, MealPlanningPage
- [ ] Aged paper borders and shadows
- [ ] Font-body for button text
- [ ] Proper hover/focus transitions

#### Acceptance Criteria
- [ ] Buttons have min 44x44px touch targets
- [ ] At least 8px spacing between buttons
- [ ] All buttons follow cookbook theme
- [ ] Responsive design (works on mobile)
- [ ] Visual hierarchy clear (primary/secondary actions)
- [ ] Keyboard navigation works
- [ ] Screen reader accessible
- [ ] Focus indicators visible
- [ ] Hover states work correctly
- [ ] Matches design system
- [ ] No layout shift on interaction
- [ ] Dropdown menu (if used) works smoothly

---

## Acceptance Criteria

### Overall Release Criteria

#### Functional Requirements
- [ ] All 5 bugs fixed and verified
- [ ] No regressions in existing functionality
- [ ] All manual tests pass
- [ ] All automated tests pass

#### Quality Requirements
- [ ] Code review completed
- [ ] UX review completed
- [ ] No new accessibility issues
- [ ] No new performance issues
- [ ] Design system compliance verified

#### Documentation Requirements
- [ ] CHANGELOG.md updated
- [ ] KNOWN_BUGS.md updated
- [ ] Bug fix documentation created
- [ ] Code review document created

---

## Technical Requirements

### Technology Stack
- **Frontend**: React 18, Tailwind CSS, Vite
- **Backend**: Node.js, Express, MongoDB
- **Testing**: Vitest, Playwright

### Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Mobile Support
- iOS Safari
- Android Chrome
- Responsive design (320px - 1920px)

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support

---

## Testing Requirements

### Manual Testing

**Bug #1: Date Selection**
- [ ] Create meal plan for Feb 15-21, verify dates match
- [ ] Create meal plan for past dates
- [ ] Create meal plan for future dates
- [ ] Create meal plan crossing month boundary
- [ ] Verify calendar grid shows correct dates

**Bug #2: Recipe Selection**
- [ ] Open recipe selector from meal planning
- [ ] Search for recipes
- [ ] Filter recipes
- [ ] Select recipe and verify it's added
- [ ] Add multiple recipes to same meal
- [ ] Verify recipes display correctly in meal

**Bug #3: Shopping List Recipes**
- [ ] Open shopping list detail
- [ ] Click "Add Recipe"
- [ ] Select recipe from list
- [ ] Verify ingredients added to list
- [ ] Verify categorization correct
- [ ] Verify duplicate handling works
- [ ] Try with multiple recipes

**Bug #4: Theme Compliance**
- [ ] Visual inspection of all buttons
- [ ] Verify hover states
- [ ] Verify focus states
- [ ] Check disabled states
- [ ] Compare with other pages

**Bug #5: UI Layout**
- [ ] Verify button spacing (desktop)
- [ ] Verify button spacing (mobile)
- [ ] Test touch targets on mobile device
- [ ] Test keyboard navigation
- [ ] Verify dropdown/menu works (if implemented)
- [ ] Test all button states

### Automated Testing

**Integration Tests**:
- [ ] Meal planning date tests updated
- [ ] Shopping list tests updated (if backend changes)

**E2E Tests**:
- [ ] Meal planning workflow test updated
- [ ] Shopping list workflow test added/updated

**Regression Tests**:
- [ ] All existing tests still pass
- [ ] No new console errors
- [ ] No new warnings

---

## Documentation Requirements

### Code Documentation
- [ ] Inline comments for complex logic
- [ ] JSDoc comments for new functions
- [ ] Component prop documentation

### User Documentation
- [ ] Update any affected user guides
- [ ] Update feature documentation if needed

### Developer Documentation
- [ ] CHANGELOG.md updated with V2.1.7 entry
- [ ] KNOWN_BUGS.md updated (bugs marked fixed)
- [ ] Bug fix summary document created
- [ ] Code review document created

---

## Dependencies

### Internal Dependencies
- No breaking changes to existing components
- Must maintain API contracts
- Must follow cookbook theme design system

### External Dependencies
- No new npm packages required
- All existing dependencies maintained

---

## Risk Assessment

### High Risk
1. Bug #3 - Unknown root cause may reveal larger issues
2. Regression risk - Multiple changes could introduce new bugs

### Medium Risk
1. Date handling complexity
2. Recipe selector implementation scope

### Low Risk
1. Theme fixes (CSS only)
2. UI spacing fixes (CSS/layout only)

---

## Success Metrics

### Functional Success
- All 5 bugs fixed and verified
- Zero regressions introduced
- All tests passing

### Quality Success
- Code review rating: 4/5 or higher
- UX review: All issues resolved
- Accessibility: WCAG 2.1 AA maintained

### User Impact
- Users can accurately plan meals
- Users can add recipes to meal plans
- Users can add recipes to shopping lists
- Visual consistency restored
- Improved accessibility and usability

---

## Timeline

- **Day 1 Morning**: Investigation (Bugs #1-3)
- **Day 1 Afternoon - Day 2**: High priority fixes
- **Day 3 Morning**: Medium priority fixes
- **Day 3 Afternoon**: Testing & QA
- **Day 4**: Documentation & Review

**Total**: 3-4 days

---

## Related Documents

- [V2.2.1 Planning Document](../docs/planning/V2.2.1-BUGFIX-PLAN.md)
- [KNOWN_BUGS.md](../docs/KNOWN_BUGS_V2.1.md)
- [SDLC Documentation](../docs/SDLC.md)
- [Design System](.clinerules/SDLC.md#phase-55-ux-review--design-system-compliance)

---

## Document History

- **v1.0** (Feb 16, 2026): Initial requirements documentation
- **Status**: Requirements Complete → Ready for Phase 3 (Design & Architecture)

---

**Next Phase**: SDLC Phase 3 - Design & Architecture  
**Requirements Status**: ✅ COMPLETE  
**Ready to Proceed**: Yes - begin implementation planning