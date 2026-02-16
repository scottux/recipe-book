# REQ-008: Batch Operations & View Modes

**Status:** ✅ Implemented  
**Priority:** Medium  
**Related:** REQ-001 (CRUD operations), REQ-003 (filtering/display)

## Description

Enable users to select multiple recipes and perform batch operations, with flexible viewing options (grid/list) for better recipe management.

## User Stories

### As a user:
- I want to view recipes in both grid and list layouts
- I want to select multiple recipes for batch deletion
- I want to easily switch between view modes
- I want confirmation before deleting multiple recipes
- I want to see selection counts and clear selections

## Features

### View Modes

#### Grid View (Card Layout)
- **3-Column Grid**: Responsive layout (1 col mobile, 2 col tablet, 3 col desktop)
- **Recipe Cards**: Each card displays:
  - Title and description
  - Prep/cook time
  - Cuisine and dish type badges
  - Star rating
  - Action buttons (select, edit, delete)
- **Click to View**: Card clickable to view full recipe
- **Hover Effects**: Visual feedback on card hover

#### List View (Table Layout)
- **Compact Rows**: Dense information display
- **Columns**:
  - Checkbox (select)
  - Recipe title & description
  - Cuisine badge
  - Dish type badge
  - Time (prep/cook combined)
  - Rating (stars + numeric)
  - Actions (edit, delete)
- **Sortable**: Headers clickable (future enhancement)
- **Row Hover**: Highlight on hover
- **Click Row**: Navigate to recipe detail

### Selection System

#### Individual Selection
- **Checkbox Icon**: ☐/☑ displayed in action row with edit/delete icons
- **Click Handler**: Stops propagation, doesn't trigger navigation
- **Visual State**: Checked (☑) or unchecked (☐) icon
- **Tooltip**: "Select recipe" / "Deselect recipe"
- **Grid View**: Icons in action row at card bottom
- **List View**: Checkbox in first column

#### Bulk Selection
- **Select All Button**: Toggle to select/deselect all visible recipes
- **State Indicator**: Button text changes based on state
  - "☐ Select All" when none selected
  - "☑ Deselect All" when all selected
- **Persistent Selection**: Selections maintained when switching views
- **Selection Counter**: Shows "X of Y selected"

### Batch Delete

#### Delete Flow
1. **Select Recipes**: User selects one or more recipes
2. **Delete Button Appears**: "🗑️ Delete Selected (N)" shown when selections exist
3. **Confirmation Modal**: Displays on delete button click
4. **Recipe List**: Shows titles of recipes to be deleted
5. **Confirm/Cancel**: User can proceed or cancel
6. **Batch Deletion**: All selected recipes deleted via parallel API calls
7. **Auto-Refresh**: Recipe list refreshes after successful deletion

#### Confirmation Modal
- **Warning Header**: "⚠️ Delete N Recipe(s)?"
- **Warning Text**: "This action cannot be undone..."
- **Recipe List**: Scrollable list of recipe titles
- **Action Buttons**:
  - "Cancel" - Closes modal
  - "🗑️ Delete All" - Executes deletion
- **Loading State**: Buttons disabled during deletion
- **Loading Text**: "⏳ Deleting..." shown during process

### UI Controls

#### View Toggle
```
[View: ⊞ Grid | ☰ List] [☐ Select All]
```
- Positioned at top of recipe list
- Active view highlighted with accent color
- Smooth transition between views

#### Selection Actions Bar
```
[3 of 45 selected] [✕ Clear] [🗑️ Delete Selected (3)]
```
- Appears when items selected
- Shows selection count
- Clear button removes all selections
- Delete button opens confirmation modal

## Technical Implementation

### State Management
```javascript
const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
const [selectedRecipes, setSelectedRecipes] = useState(new Set());
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [deleting, setDeleting] = useState(false);
```

### Selection Handlers
```javascript
// Toggle individual recipe
const toggleSelectRecipe = (id) => {
  const newSelected = new Set(selectedRecipes);
  newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
  setSelectedRecipes(newSelected);
};

// Toggle all recipes
const toggleSelectAll = () => {
  selectedRecipes.size === recipes.length 
    ? setSelectedRecipes(new Set())
    : setSelectedRecipes(new Set(recipes.map(r => r._id)));
};
```

### Batch Delete
```javascript
const handleBatchDelete = async () => {
  setDeleting(true);
  await Promise.all(
    Array.from(selectedRecipes).map(id => recipeAPI.delete(id))
  );
  setSelectedRecipes(new Set());
  setShowDeleteModal(false);
  fetchRecipes();
};
```

### Click Propagation Fix
- Action buttons use `e.stopPropagation()` to prevent card/row navigation
- Selection icons properly isolated from clickable card area
- Grid view: Card content wrapped in clickable div, actions below
- List view: Row clickable, action buttons stop propagation

## Acceptance Criteria

- [x] Grid view displays recipe cards in responsive grid
- [x] List view displays recipes in compact table
- [x] View toggle switches between modes seamlessly
- [x] Selection checkboxes work in both views
- [x] Select All/Deselect All functions correctly
- [x] Selection persists when switching views
- [x] Batch delete removes multiple recipes
- [x] Confirmation modal prevents accidental deletion
- [x] Selection counter displays accurate count
- [x] Clear selection button resets state
- [x] Click propagation properly handled (cards/rows clickable, actions isolated)
- [x] Loading states during batch operations
- [x] Error handling for failed deletions
- [x] Responsive design (mobile/desktop)

## Testing

### Test Scenarios
1. **View Toggle**: Switch between grid/list, verify layout changes
2. **Individual Selection**: Select recipe in grid, verify in list view
3. **Select All**: Click select all, verify all recipes selected
4. **Batch Delete**: Select 3 recipes, delete, verify removal
5. **Modal Cancel**: Open delete modal, cancel, verify no deletion
6. **Click Propagation**: Click select icon, verify no navigation
7. **Click Card**: Click card (not action), verify navigation to detail
8. **Partial Failure**: Simulate API error, verify graceful handling
9. **Empty State**: Delete all recipes, verify appropriate message

## Future Enhancements

- [ ] Batch edit (change cuisine/type for multiple recipes)
- [ ] Batch export (download multiple recipes as JSON/PDF)
- [ ] Batch tagging
- [ ] Sortable list view columns
- [ ] Column visibility toggles
- [ ] Saved view preferences
- [ ] Keyboard shortcuts (Ctrl+A for select all)
- [ ] Drag and drop for batch organization

## Dependencies

- React useState hooks
- Set() for efficient selection tracking
- Promise.all() for parallel deletions

## Related Documentation

- [Recipe CRUD](REQ-001-recipe-crud.md) - Delete operations
- [Search & Filtering](REQ-003-search-filter.md) - Display concepts
- [Recipe Management Guide](../docs/features/recipe-management.md) - User guide