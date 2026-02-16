# REQ-010: Recipe Collections / Cookbooks

**Status:** In Progress  
**Priority:** High  
**Version:** 2.0  
**Dependencies:** REQ-001 (Recipe CRUD), Authentication System

## Overview
Users can organize their recipes into custom collections (cookbooks) for better organization and categorization.

## User Stories

### US-010-1: Create Collection
**As a** recipe book user  
**I want to** create custom collections  
**So that** I can organize my recipes into themed groups

**Acceptance Criteria:**
- User can create a new collection with name and description
- User can customize collection icon emoji (default: 📚)
- User can customize collection color (default: cookbook brown)
- Collection names must be unique per user
- Collection is automatically owned by the creating user

### US-010-2: View Collections
**As a** recipe book user  
**I want to** view all my collections  
**So that** I can see my recipe organization at a glance

**Acceptance Criteria:**
- User sees list of all their collections
- Each collection shows:
  - Name and icon
  - Description
  - Recipe count
  - Preview thumbnails of recipes
- Collections are sorted by custom order, then creation date
- Empty collections are displayed with placeholder

### US-010-3: Add Recipes to Collection
**As a** recipe book user  
**I want to** add recipes to collections  
**So that** I can organize my recipes thematically

**Acceptance Criteria:**
- User can add recipes to multiple collections
- User can add recipes from:
  - Recipe detail page
  - Recipe list (bulk actions)
  - Collection detail page
- Cannot add same recipe twice to one collection
- Can only add owned recipes to collections

### US-010-4: Remove Recipes from Collection
**As a** recipe book user  
**I want to** remove recipes from collections  
**So that** I can update my organization

**Acceptance Criteria:**
- User can remove individual recipes from collection
- User can remove multiple recipes at once
- Removing recipe from collection doesn't delete the recipe
- Visual confirmation before removal

### US-010-5: Reorder Recipes in Collection
**As a** recipe book user  
**I want to** reorder recipes within a collection  
**So that** I can arrange them in my preferred sequence

**Acceptance Criteria:**
- User can drag-and-drop to reorder recipes
- Order is persisted
- Visual feedback during drag operation

### US-010-6: Edit Collection
**As a** recipe book user  
**I want to** edit collection details  
**So that** I can update organization as needed

**Acceptance Criteria:**
- User can update name, description, icon, color
- Changes are saved immediately
- Cannot change to duplicate name

### US-010-7: Delete Collection
**As a** recipe book user  
**I want to** delete collections  
**So that** I can remove unused organizations

**Acceptance Criteria:**
- User can delete a collection
- Deleting collection doesn't delete recipes
- Confirmation dialog before deletion
- Cannot be undone

## API Endpoints

### Collection Management

```
GET    /api/collections              - List all user's collections
POST   /api/collections              - Create new collection
GET    /api/collections/:id          - Get collection by ID
PUT    /api/collections/:id          - Update collection
DELETE /api/collections/:id          - Delete collection
```

### Recipe Management in Collections

```
POST   /api/collections/:id/recipes          - Add recipe to collection
DELETE /api/collections/:id/recipes/:recipeId - Remove recipe from collection
PUT    /api/collections/:id/recipes/reorder  - Reorder recipes in collection
```

## Data Model

### Collection Schema
```javascript
{
  name: String,               // Required, max 100 chars
  description: String,        // Optional, max 500 chars
  owner: ObjectId,           // Required, references User
  recipes: [ObjectId],       // References Recipe
  isPublic: Boolean,         // Default false (future sharing feature)
  sharedWith: [ObjectId],    // Future sharing feature
  icon: String,              // Emoji, default '📚'
  color: String,             // Hex color, default '#8B4513'
  sortOrder: Number,         // For custom ordering, default 0
  createdAt: Date,
  updatedAt: Date
}
```

## UI Components

### Collections Page (`/collections`)
- Grid/list view of all collections
- "Create Collection" button
- Each collection card shows:
  - Icon and name
  - Recipe count
  - Preview of up to 3 recipe images
  - Last updated date

### Collection Detail Page (`/collections/:id`)
- Collection header with name, icon, description
- Edit button
- Recipe grid/list
- Add recipe button
- Remove recipe action on each recipe
- Drag-and-drop reordering

### Create/Edit Collection Modal
- Name input
- Description textarea
- Icon selector (emoji picker)
- Color picker
- Save/Cancel buttons

### Add to Collection UI
- Available from recipe detail page
- Multi-select checklist of user's collections
- "Create new collection" option
- Quick-add button

## Example Collections

**Suggested starter collections:**
- 🍽️ Weeknight Dinners
- 🎉 Party Food
- 🥗 Healthy Options
- 🍪 Baking
- 🌮 Favorites
- 📅 Meal Prep

## Business Rules

1. **Ownership**
   - Collections can only contain recipes owned by the user
   - Collections are private by default
   - Only owner can modify collection

2. **Limits**
   - No hard limit on collections per user
   - No hard limit on recipes per collection
   - Name max 100 characters
   - Description max 500 characters

3. **Deletion**
   - Deleting collection doesn't delete recipes
   - Confirmation required
   - Cannot be undone

4. **Ordering**
   - Collections ordered by sortOrder, then createdAt
   - Recipes within collection maintain custom order
   - Drag-and-drop updates sortOrder

## Technical Implementation

### Backend
- ✅ Collection model with Mongoose schema
- ✅ Collection controller with CRUD operations
- ✅ Collection routes with authentication
- ✅ Authorization checks (owner-only access)
- ✅ Recipe validation on add/remove
- ✅ Reordering support

### Frontend
- [ ] Collection API service
- [ ] Collections page component
- [ ] Collection detail component
- [ ] Create/Edit collection modal
- [ ] Add to collection from recipe detail
- [ ] Drag-and-drop reordering
- [ ] Icon/emoji picker
- [ ] Color picker

## Testing Requirements

### Unit Tests
- Collection model validation
- Controller authorization
- Recipe add/remove logic
- Reorder validation

### Integration Tests
- Create collection workflow
- Add/remove recipes workflow
- Edit collection workflow
- Delete collection workflow

### E2E Tests
- User creates first collection
- User adds recipes to collection
- User reorders recipes
- User deletes collection

## Future Enhancements (v2.1+)

1. **Collection Sharing**
   - Share collection with specific users
   - Public collection URLs
   - Collection templates/imports

2. **Smart Collections**
   - Auto-collections based on tags
   - Auto-collections based on cuisine
   - Saved search collections

3. **Collection Analytics**
   - Most-used collections
   - Recipe popularity within collections
   - Collection usage trends

4. **Collection Export**
   - Export collection as PDF cookbook
   - Print-friendly format
   - Custom cover page

## Success Metrics

- % of users who create at least one collection
- Average number of collections per user
- Average recipes per collection
- Collection feature engagement rate

## Dependencies

- REQ-001: Recipe CRUD operations
- Authentication system (Phase 1)

## Related Requirements

- REQ-003: Search and Filter (collections can be filtered)
- REQ-011: Meal Planning (collections used for meal plans)
- REQ-013: Export (collections can be exported)