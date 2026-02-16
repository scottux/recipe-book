# REQ-016: Import from Backup

**Version**: 2.1.2  
**Status**: Draft  
**Created**: February 15, 2026  
**Author**: Development Team  
**Priority**: High  
**Type**: Patch Release (Data Import Feature)

---

## Table of Contents

1. [Overview](#overview)
2. [Business Requirements](#business-requirements)
3. [User Stories](#user-stories)
4. [Functional Requirements](#functional-requirements)
5. [Technical Requirements](#technical-requirements)
6. [UI/UX Requirements](#ui-ux-requirements)
7. [Data Validation Requirements](#data-validation-requirements)
8. [Security Requirements](#security-requirements)
9. [Error Handling](#error-handling)
10. [Acceptance Criteria](#acceptance-criteria)
11. [Testing Requirements](#testing-requirements)
12. [Dependencies](#dependencies)
13. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose

Enable users to import their recipe data from previously exported backup files, restoring their recipes, collections, meal plans, and shopping lists. This completes the data portability cycle started with the Export feature (V2.0).

### Scope

**In Scope**:
- Import full backup files created by the Export feature (V2.0+)
- Merge mode: Non-destructive import that preserves existing data
- Replace mode: Clean slate import that removes all existing data
- Duplicate detection to prevent data duplication
- Progress tracking and user feedback
- Validation of backup file structure and content
- Error reporting with actionable feedback

**Out of Scope** (Future Versions):
- Selective import (choosing specific recipes/collections) - V2.1.3+
- Import conflict resolution UI - V2.1.3+
- Import from other recipe formats (JSON-LD, etc.) - V2.2.0+
- Scheduled/automated imports - V2.3.0+
- Import history/audit log - V2.3.0+

### Goals

1. Allow users to restore their data from backup files
2. Support migration between devices or accounts
3. Provide safe, non-destructive merge by default
4. Enable clean slate restoration when needed
5. Maintain data integrity throughout import process
6. Provide clear feedback on import results

---

## Business Requirements

### BR-1: Data Portability

Users must be able to import previously exported backup files to:
- Restore data after account deletion/recreation
- Migrate data between devices
- Recover from data loss
- Consolidate data from multiple sources

**Business Value**: User confidence, data ownership, platform flexibility

### BR-2: Data Safety

Import operations must preserve data integrity to:
- Prevent accidental data loss
- Maintain relationships between recipes, collections, meal plans
- Validate data before committing changes
- Provide rollback capability on errors

**Business Value**: User trust, data reliability, reduced support burden

### BR-3: User Control

Users must have control over import behavior to:
- Choose between merging or replacing existing data
- Understand what will happen before confirming
- Cancel operations in progress
- Review import results

**Business Value**: User autonomy, reduced errors, better user experience

---

## User Stories

### US-1: Import Backup File (Merge Mode)

**As a** logged-in user  
**I want to** import a backup file without losing my existing data  
**So that** I can add recipes from a backup to my current collection

**Acceptance Criteria**:
- Can upload a .json backup file
- Existing data is preserved
- New recipes/collections are added
- Duplicates are detected and skipped
- Success message shows what was imported
- Can see both old and imported data after import

### US-2: Import Backup File (Replace Mode)

**As a** logged-in user  
**I want to** import a backup file and replace all my existing data  
**So that** I can start fresh with backed-up data

**Acceptance Criteria**:
- Can select "Replace existing data" option
- Clear warning about data deletion is shown
- Must explicitly confirm the replacement
- All existing data is removed before import
- Backup data becomes the only data
- Success message confirms replacement

### US-3: Handle Invalid Backup Files

**As a** logged-in user  
**I want to** receive clear error messages when a backup file is invalid  
**So that** I can correct the issue or get support

**Acceptance Criteria**:
- Invalid JSON files are rejected with clear error
- Wrong version backup files show compatibility message
- Corrupted files are detected and rejected
- Missing required fields are identified
- Error messages explain what's wrong

### US-4: Track Import Progress

**As a** logged-in user  
**I want to** see progress while my backup is being imported  
**So that** I know the import is working and when it's complete

**Acceptance Criteria**:
- Loading indicator appears during import
- Progress updates for large imports
- Can see what stage of import is running
- Success/error message when complete
- UI remains responsive during import

### US-5: Review Import Results

**As a** logged-in user  
**I want to** see a summary of what was imported  
**So that** I can verify the import was successful

**Acceptance Criteria**:
- Shows count of recipes imported
- Shows count of collections imported
- Shows count of meal plans imported
- Shows count of shopping lists imported
- Shows count of duplicates skipped (merge mode)
- Shows any errors or warnings

---

## Functional Requirements

### FR-1: File Upload and Validation

#### FR-1.1: File Upload Interface
- File input accepts .json files only
- Maximum file size: 50MB
- Drag-and-drop support
- File name displayed after selection
- Clear button to remove selected file
- Upload button to start import

#### FR-1.2: File Format Validation
- Must be valid JSON format
- Must contain required top-level fields:
  - `version` (string)
  - `exportDate` (ISO 8601 string)
  - `user` (object with username)
  - `data` (object)
- Version must be compatible (2.0.0 or higher)
- File must not be empty

#### FR-1.3: Content Validation (Layer 2)
- Validate data structure matches schema
- Check all required fields are present
- Validate data types (strings, numbers, arrays, objects)
- Validate array structures (ingredients[], instructions[], etc.)
- Detect malformed or corrupted data

#### FR-1.4: Business Logic Validation (Layer 3)
- Recipes must have non-empty title
- Ingredients must have name and amount
- Instructions must have description
- Collections must have name
- Meal plans must have date and meals
- Shopping lists must have name
- Referenced IDs must exist within the backup

### FR-2: Import Mode Selection

#### FR-2.1: Mode Options
- **Merge Mode** (DEFAULT):
  - Preserves all existing user data
  - Adds non-duplicate items from backup
  - Skips duplicates based on detection rules
  - Safe, non-destructive operation
- **Replace Mode**:
  - Deletes all existing user data
  - Imports all items from backup
  - Creates clean slate
  - Requires explicit confirmation

#### FR-2.2: Mode Selection UI
- Radio buttons or toggle for mode selection
- Merge mode selected by default
- Clear description of each mode
- Warning icon for replace mode
- Cannot proceed without selecting mode

#### FR-2.3: Replace Mode Confirmation
- Separate confirmation modal
- Strong warning message about data loss
- Lists what will be deleted
- Password confirmation required
- "Cancel" and "Replace & Import" buttons
- Must check "I understand" checkbox

### FR-3: Duplicate Detection (Merge Mode Only)

#### FR-3.1: Recipe Duplicate Detection
Recipes are considered duplicates if:
- Title matches exactly (case-insensitive)
- AND first 3 ingredients match (case-insensitive, order-independent)

#### FR-3.2: Collection Duplicate Detection
Collections are considered duplicates if:
- Name matches exactly (case-insensitive)

#### FR-3.3: Meal Plan Duplicate Detection
Meal plans are considered duplicates if:
- Date matches exactly
- AND meal type matches (breakfast/lunch/dinner)

#### FR-3.4: Shopping List Duplicate Detection
Shopping lists are considered duplicates if:
- Name matches exactly (case-insensitive)

#### FR-3.5: Duplicate Handling
- Duplicates are skipped (not imported)
- Count of skipped duplicates is tracked
- Original (existing) data is never modified
- Duplicate detection happens before any writes

### FR-4: Import Process

#### FR-4.1: Pre-Import Steps
1. Validate file upload
2. Parse JSON content
3. Validate file format and version
4. Validate data structure and content
5. If replace mode: Show confirmation modal
6. If merge mode: Detect duplicates
7. Calculate import summary (what will be imported)
8. Display confirmation with summary

#### FR-4.2: Import Execution (Merge Mode)
1. Start database transaction
2. Import recipes (skip duplicates):
   - Create new recipe documents
   - Assign new MongoDB _id values
   - Map old IDs → new IDs for reference tracking
   - Set owner to current user
3. Import collections (skip duplicates):
   - Create new collection documents
   - Remap recipe references using ID mapping
   - Remove references to skipped recipes
4. Import meal plans (skip duplicates):
   - Create new meal plan documents
   - Remap recipe references using ID mapping
   - Remove references to skipped recipes
5. Import shopping lists (skip duplicates):
   - Create new shopping list documents
6. Commit transaction
7. Return import summary

#### FR-4.3: Import Execution (Replace Mode)
1. Start database transaction
2. Delete all existing user data:
   - All user recipes
   - All user collections
   - All user meal plans
   - All user shopping lists
3. Import all items from backup (no duplicate checking):
   - Create new recipe documents
   - Map old IDs → new IDs
   - Create new collection documents
   - Remap recipe references
   - Create new meal plan documents
   - Remap recipe references
   - Create new shopping list documents
4. Commit transaction
5. Return import summary

#### FR-4.4: ID Remapping Strategy
- Create mapping object: `{ oldId: newId, ... }`
- Process recipes first (base entities)
- Use mapping when processing collections/meal plans
- Handle missing references gracefully:
  - If referenced recipe wasn't imported (skipped/missing), remove from collection
  - Log warnings for missing references

#### FR-4.5: Transaction Management
- All database operations in single transaction
- Rollback on any error
- No partial imports (all-or-nothing)
- Return original state on failure

### FR-5: Progress Tracking and Feedback

#### FR-5.1: Progress Indicators
- File upload: Upload progress bar
- Validation: "Validating..." spinner
- Import: "Importing..." spinner with stages
- Success: Success message with checkmark
- Error: Error message with X icon

#### FR-5.2: Import Stages
1. "Uploading file..."
2. "Validating backup..."
3. "Processing recipes..."
4. "Processing collections..."
5. "Processing meal plans..."
6. "Processing shopping lists..."
7. "Finalizing import..."
8. "Import complete!"

#### FR-5.3: Result Summary
Display after successful import:
- Number of recipes imported
- Number of collections imported
- Number of meal plans imported
- Number of shopping lists imported
- Number of duplicates skipped (merge mode only)
- Total import time
- "View your data" button

### FR-6: Error Handling

#### FR-6.1: File-Level Errors
- Invalid JSON: "The backup file is not valid JSON"
- Missing fields: "Backup file is missing required field: {field}"
- Wrong version: "Backup file version {version} is not compatible. Requires 2.0.0+"
- File too large: "Backup file exceeds maximum size of 50MB"
- Empty file: "Backup file is empty"

#### FR-6.2: Data-Level Errors
- Invalid recipe: "Recipe at index {i} is missing required field: {field}"
- Invalid collection: "Collection '{name}' has invalid structure"
- Invalid meal plan: "Meal plan for {date} has invalid format"
- Invalid references: "Collection references non-existent recipe ID: {id}"

#### FR-6.3: Database Errors
- Transaction failure: "Import failed due to database error. No changes were made."
- Duplicate key: "An item already exists with this identifier"
- Connection error: "Cannot connect to database. Please try again."

#### FR-6.4: General Errors
- Network error: "Upload failed. Please check your connection."
- Authentication error: "Session expired. Please log in again."
- Server error: "Server error occurred. Please try again later."

---

## Technical Requirements

### TR-1: Backend API

#### TR-1.1: Import Backup Endpoint

```
POST /api/import/backup
```

**Request Headers**:
```json
{
  "Authorization": "Bearer {access_token}",
  "Content-Type": "multipart/form-data"
}
```

**Request Body** (multipart/form-data):
```
file: <backup.json file>
mode: "merge" | "replace"
password: "string (required for replace mode only)"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Import completed successfully",
  "summary": {
    "recipesImported": 25,
    "collectionsImported": 5,
    "mealPlansImported": 10,
    "shoppingListsImported": 3,
    "duplicatesSkipped": 8,
    "mode": "merge",
    "duration": 1234
  }
}
```

**Error Responses**:
- 400 Bad Request: Invalid file, validation errors
  ```json
  {
    "success": false,
    "error": "Invalid backup file",
    "details": {
      "code": "INVALID_FORMAT",
      "message": "Backup file is not valid JSON",
      "field": null
    }
  }
  ```
- 401 Unauthorized: Invalid/missing token, invalid password (replace mode)
  ```json
  {
    "success": false,
    "error": "Unauthorized",
    "details": {
      "code": "INVALID_PASSWORD",
      "message": "Password is incorrect"
    }
  }
  ```
- 413 Payload Too Large: File exceeds size limit
  ```json
  {
    "success": false,
    "error": "File too large",
    "details": {
      "code": "FILE_TOO_LARGE",
      "message": "Backup file exceeds maximum size of 50MB",
      "maxSize": 52428800
    }
  }
  ```
- 422 Unprocessable Entity: Data validation errors
  ```json
  {
    "success": false,
    "error": "Validation failed",
    "details": {
      "code": "VALIDATION_ERROR",
      "message": "Recipe at index 5 is missing required field: title",
      "index": 5,
      "field": "title"
    }
  }
  ```
- 429 Too Many Requests: Rate limit exceeded
  ```json
  {
    "success": false,
    "error": "Too many import attempts",
    "details": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Maximum 5 imports per hour. Try again in 45 minutes.",
      "retryAfter": 2700
    }
  }
  ```
- 500 Internal Server Error: Database/server errors
  ```json
  {
    "success": false,
    "error": "Import failed",
    "details": {
      "code": "IMPORT_ERROR",
      "message": "Database transaction failed. No changes were made."
    }
  }
  ```

#### TR-1.2: Validation Endpoint (Optional Pre-check)

```
POST /api/import/validate
```

**Purpose**: Validate backup file without importing (dry-run)

**Request**: Same as import endpoint
**Response**: Validation results and import preview

### TR-2: Backend Implementation

#### TR-2.1: Import Controller
- **File**: `backend/src/controllers/importController.js`
- Methods:
  - `importBackup(req, res)` - Main import handler
  - `validateBackupFile(file)` - File validation
  - `validateBackupContent(data)` - Content validation
  - `detectDuplicates(userData, backupData)` - Duplicate detection
  - `executeImport(userId, backupData, mode, duplicates)` - Import execution
  - `remapReferences(collections, mealPlans, idMapping)` - ID remapping

#### TR-2.2: Import Routes
- **File**: `backend/src/routes/import.js`
- Routes:
  - `POST /api/import/backup` - Import backup file
  - Rate limiting: 5 requests per hour per user
  - File size limit: 50MB
  - Authentication required

#### TR-2.3: Validation Service
- **File**: `backend/src/services/importValidator.js`
- Functions:
  - `validateFileFormat(jsonData)` - Format validation
  - `validateVersion(version)` - Version compatibility
  - `validateRecipes(recipes)` - Recipe schema validation
  - `validateCollections(collections)` - Collection schema validation
  - `validateMealPlans(mealPlans)` - Meal plan schema validation
  - `validateShoppingLists(lists)` - Shopping list schema validation
  - `validateReferences(data)` - Cross-reference validation

#### TR-2.4: Database Transaction Handling
```javascript
// Transaction wrapper
async function executeImportTransaction(session, importFn) {
  try {
    await session.startTransaction();
    const result = await importFn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

### TR-3: Frontend Implementation

#### TR-3.1: Import Page Component
- **File**: `frontend/src/components/ImportPage.jsx`
- Features:
  - File upload interface
  - Mode selection (merge/replace)
  - Progress tracking
  - Result display
  - Error handling

#### TR-3.2: Import Modal Component
- **File**: `frontend/src/components/ImportModal.jsx`
- Features:
  - Replace mode confirmation
  - Password input
  - Warning display
  - Confirmation checklist

#### TR-3.3: API Service Methods
- **File**: `frontend/src/services/api.js`
- Methods:
  - `importAPI.importBackup(file, mode, password)` - Upload and import
  - `importAPI.validateBackup(file)` - Validate before import (optional)

#### TR-3.4: Navigation Updates
- **File**: `frontend/src/App.jsx`
- Add "/import" route
- Add import link to navigation (near export)

### TR-4: Data Models

#### TR-4.1: Expected Backup Format
```json
{
  "version": "2.0.0",
  "exportDate": "2026-02-15T18:30:00.000Z",
  "user": {
    "username": "johndoe"
  },
  "statistics": {
    "totalRecipes": 25,
    "totalCollections": 5,
    "totalMealPlans": 10,
    "totalShoppingLists": 3
  },
  "data": {
    "recipes": [
      {
        "_id": "backup_id_123",
        "title": "Chocolate Chip Cookies",
        "description": "Classic cookies",
        "ingredients": [
          { "name": "flour", "amount": "2", "unit": "cups" }
        ],
        "instructions": [
          { "step": 1, "description": "Mix ingredients" }
        ],
        "prepTime": 15,
        "cookTime": 12,
        "servings": 24,
        "dishType": "Dessert",
        "cuisine": "American",
        "tags": ["cookies", "dessert"],
        "rating": 5,
        "sourceUrl": "",
        "visibility": "private"
      }
    ],
    "collections": [
      {
        "_id": "backup_collection_1",
        "name": "Family Favorites",
        "description": "Our go-to recipes",
        "recipeIds": ["backup_id_123", "backup_id_456"],
        "recipeCount": 2
      }
    ],
    "mealPlans": [
      {
        "_id": "backup_mealplan_1",
        "date": "2026-02-16",
        "meals": [
          {
            "type": "dinner",
            "recipes": [
              {
                "recipeId": "backup_id_123",
                "title": "Chocolate Chip Cookies",
                "servings": 24
              }
            ]
          }
        ]
      }
    ],
    "shoppingLists": [
      {
        "_id": "backup_list_1",
        "name": "Weekly Groceries",
        "items": [
          { "name": "flour", "amount": "5 lbs", "category": "Baking", "checked": false }
        ],
        "createdAt": "2026-02-15T10:00:00.000Z"
      }
    ]
  }
}
```

#### TR-4.2: ID Mapping Structure
```javascript
{
  recipes: {
    'backup_id_123': new ObjectId('507f1f77bcf86cd799439011'),
    'backup_id_456': new ObjectId('507f1f77bcf86cd799439012')
  },
  collections: {
    'backup_collection_1': new ObjectId('507f1f77bcf86cd799439013')
  },
  mealPlans: {
    'backup_mealplan_1': new ObjectId('507f1f77bcf86cd799439014')
  },
  shoppingLists: {
    'backup_list_1': new ObjectId('507f1f77bcf86cd799439015')
  }
}
```

---

## UI/UX Requirements

### UX-1: Import Page Layout

```
┌─────────────────────────────────────────────────────┐
│ Navigation Bar                      [Import] [Export] │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                                                       │
│  Import Backup                                        │
│  ═════════════                                        │
│                                                       │
│  Restore your recipes, collections, meal plans, and   │
│  shopping lists from a backup file.                   │
│                                                       │
│  Upload Backup File                                   │
│  ──────────────────                                  │
│  ┌─────────────────────────────────────────────┐    │
│  │  Drag & Drop or Click to Select             │    │
│  │  📄 .json files only (max 50MB)             │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Import Mode                                          │
│  ───────────                                         │
│  ○ Merge with existing data (recommended)             │
│     Add items from backup without removing            │
│     your current data. Duplicates will be skipped.    │
│                                                       │
│  ○ Replace all existing data                          │
│     ⚠️ Delete all current data and restore           │
│     only items from backup.                           │
│                                                       │
│                       [Cancel] [Import Backup]        │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### UX-2: File Selected State

```
┌─────────────────────────────────────────────────────┐
│  Upload Backup File                                   │
│  ──────────────────                                  │
│  ┌─────────────────────────────────────────────┐    │
│  │  ✓ backup-2026-02-15.json                   │    │
│  │  📄 2.3 MB • Selected                   [X] │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### UX-3: Import Progress

```
┌─────────────────────────────────────────────────────┐
│  Importing Backup...                                  │
│  ───────────────────                                 │
│  ⏳ Processing recipes...                            │
│  [████████████░░░░░░░░░░░░] 60%                     │
│                                                       │
│  Please wait while we import your data.               │
│  This may take a few moments.                         │
└─────────────────────────────────────────────────────┘
```

### UX-4: Import Success

```
┌─────────────────────────────────────────────────────┐
│  ✓ Import Complete!                                   │
│  ═════════════════                                    │
│                                                       │
│  Successfully imported your backup:                   │
│                                                       │
│  • 25 recipes                                         │
│  • 5 collections                                      │
│  • 10 meal plans                                      │
│  • 3 shopping lists                                   │
│                                                       │
│  8 duplicate items were skipped (merge mode)          │
│                                                       │
│  Import completed in 2.3 seconds                      │
│                                                       │
│              [View My Recipes] [Import Another]       │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### UX-5: Replace Mode Confirmation Modal

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│  ⚠️  Replace All Data - Are You Sure?                │
│                                                       │
│  This action is PERMANENT and CANNOT be undone.      │
│                                                       │
│  All of your current data will be DELETED:           │
│  • All your recipes                                  │
│  • All your collections                              │
│  • All your meal plans                               │
│  • All your shopping lists                           │
│                                                       │
│  Only items from the backup file will remain.        │
│                                                       │
│  Enter your password to confirm:                      │
│  [................................]                   │
│                                                       │
│  ☐ I understand this will delete all my data         │
│                                                       │
│         [Cancel]    [Delete & Import]                │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### UX-6: Error Display

```
┌─────────────────────────────────────────────────────┐
│  ✗ Import Failed                                      │
│  ══════════════                                       │
│                                                       │
│  The backup file is not valid JSON.                   │
│                                                       │
│  Please ensure you've selected a valid backup file    │
│  exported from Recipe Book version 2.0.0 or higher.   │
│                                                       │
│  Need help? Contact support with error code:          │
│  ERR_INVALID_JSON                                     │
│                                                       │
│                     [Try Again] [Cancel]              │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### UX-7: Design Specifications

#### Colors
- Primary: Blue (#3b82f6) for actions
- Success: Green (#16a34a) for success states
- Error: Red (#dc2626) for errors
- Warning: Orange (#f59e0b) for replace mode
- Neutral: Gray (#6b7280) for text

#### Typography
- Page title: 2xl, bold
- Section headers: lg, semibold
- Body text: base, normal
- Help text: sm, normal, gray
- Error text: sm, medium, red

#### Spacing
- Section spacing: 8 units
- Component spacing: 4 units
- Input spacing: 2 units

#### Components
- File upload: Dashed border, hover state, drag-over state
- Radio buttons: Custom styled with descriptions
- Progress bar: Animated, blue fill
- Modals: Centered, backdrop blur
- Buttons: Consistent with existing UI

---

## Data Validation Requirements

### Layer 1: File-Level Validation

```javascript
// Validate file properties
checkFileSize(file) {
  if (file.size > 50 * 1024 * 1024) {
    throw new ValidationError('FILE_TOO_LARGE', 'File exceeds 50MB');
  }
}

checkFileType(file) {
  if (!file.name.endsWith('.json')) {
    throw new ValidationError('INVALID_FILE_TYPE', 'Must be .json file');
  }
}

parseJSON(fileContent) {
  try {
    return JSON.parse(fileContent);
  } catch (error) {
    throw new ValidationError('INVALID_JSON', 'File is not valid JSON');
  }
}
```

### Layer 2: Schema Validation

```javascript
// Validate backup structure
validateBackupSchema(data) {
  const requiredFields = ['version', 'exportDate', 'user', 'data'];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new ValidationError(
        'MISSING_FIELD',
        `Missing required field: ${field}`
      );
    }
  }
  
  // Validate version
  const version = semver.parse(data.version);
  if (semver.lt(version, '2.0.0')) {
    throw new ValidationError(
      'INCOMPATIBLE_VERSION',
      `Version ${data.version} not compatible. Requires 2.0.0+`
    );
  }
  
  // Validate data object
  if (typeof data.data !== 'object') {
    throw new ValidationError(
      'INVALID_DATA',
      'Data field must be an object'
    );
  }
}
```

### Layer 3: Content Validation

```javascript
// Validate individual items
validateRecipe(recipe, index) {
  const required = ['title', 'ingredients', 'instructions'];
  
  for (const field of required) {
    if (!recipe[field]) {
      throw new ValidationError(
        'INVALID_RECIPE',
        `Recipe at index ${index} missing required field: ${field}`
      );
    }
  }
  
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    throw new ValidationError(
      'INVALID_RECIPE',
      `Recipe at index ${index} must have at least one ingredient`
    );
  }
  
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
    throw new ValidationError(
      'INVALID_RECIPE',
      `Recipe at index ${index} must have at least one instruction`
    );
  }
  
  // Validate ingredient structure
  recipe.ingredients.forEach((ingredient, i) => {
    if (!ingredient.name || !ingredient.amount) {
      throw new ValidationError(
        'INVALID_INGREDIENT',
        `Recipe '${recipe.title}' ingredient ${i} missing name or amount`
      );
    }
  });
  
  // Validate instruction structure
  recipe.instructions.forEach((instruction, i) => {
    if (!instruction.description) {
      throw new ValidationError(
        'INVALID_INSTRUCTION',
        `Recipe '${recipe.title}' instruction ${i} missing description`
      );
    }
  });
}

validateCollection(collection, index) {
  if (!collection.name) {
    throw new ValidationError(
      'INVALID_COLLECTION',
      `Collection at index ${index} missing name`
    );
  }
  
  if (!Array.isArray(collection.recipeIds)) {
    collection.recipeIds = [];
  }
}

validateMealPlan(mealPlan, index) {
  if (!mealPlan.date) {
    throw new ValidationError(
      'INVALID_MEAL_PLAN',
      `Meal plan at index ${index} missing date`
    );
  }
  
  if (!Array.isArray(mealPlan.meals)) {
    throw new ValidationError(
      'INVALID_MEAL_PLAN',
      `Meal plan at index ${index} missing meals array`
    );
  }
  
  mealPlan.meals.forEach((meal, i) => {
    if (!meal.type || !['breakfast', 'lunch', 'dinner', 'snack'].includes(meal.type)) {
      throw new ValidationError(
        'INVALID_MEAL',
        `Meal plan for ${mealPlan.date} meal ${i} has invalid type`
      );
    }
  });
}
```

### Layer 4: Reference Validation

```javascript
// Validate cross-references
validateReferences(data) {
  const recipeIds = new Set(data.recipes.map(r => r._id));
  
  // Validate collection recipe references
  data.collections.forEach(collection => {
    collection.recipeIds.forEach(recipeId => {
      if (!recipeIds.has(recipeId)) {
        console.warn(
          `Collection '${collection.name}' references missing recipe: ${recipeId}`
        );
        // Will be handled during import (reference removed)
      }
    });
  });
  
  // Validate meal plan recipe references
  data.mealPlans.forEach(mealPlan => {
    mealPlan.meals.forEach(meal => {
      if (meal.recipes) {
        meal.recipes.forEach(recipe => {
          if (!recipeIds.has(recipe.recipeId)) {
            console.warn(
              `Meal plan for ${mealPlan.date} references missing recipe: ${recipe.recipeId}`
            );
            // Will be handled during import (reference removed)
          }
        });
      }
    });
  });
}
```

### Layer 5: Security Validation

```javascript
// Sanitize and validate for security
sanitizeInput(data) {
  // Remove any script tags or dangerous HTML
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  };
  
  // Recursively sanitize all string values
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };
  
  return sanitizeObject(data);
}

validateFieldLengths(data) {
  data.recipes.forEach((recipe, i) => {
    if (recipe.title && recipe.title.length > 200) {
      throw new ValidationError(
        'FIELD_TOO_LONG',
        `Recipe ${i} title exceeds 200 characters`
      );
    }
    if (recipe.description && recipe.description.length > 2000) {
      throw new ValidationError(
        'FIELD_TOO_LONG',
        `Recipe ${i} description exceeds 2000 characters`
      );
    }
  });
}
```

---

## Security Requirements

### SEC-1: Authentication and Authorization

- All import endpoints require valid JWT token
- Token must not be expired
- User can only import to their own account
- Cannot import data that modifies other users' content

### SEC-2: File Upload Security

- Maximum file size: 50MB (prevents DoS)
- Only .json files accepted
- File content validation before processing
- Malicious content detection (script tags, etc.)
- Memory limits on JSON parsing

### SEC-3: Rate Limiting

- Maximum 5 imports per hour per user
- Track attempts in Redis or database
- Return 429 Too Many Requests when exceeded
- Include retry-after time in response

### SEC-4: Password Verification (Replace Mode)

- Current password required for replace mode
- Use bcrypt comparison (existing auth)
- Prevent timing attacks
- Lock account after 5 failed attempts

### SEC-5: Input Sanitization

- Remove script tags from all text fields
- Sanitize HTML entities
- Validate field lengths
- Escape special characters
- Prevent NoSQL injection

### SEC-6: Transaction Security

- All imports in database transactions
- Rollback on any error
- No partial imports
- Verify data integrity before commit

### SEC-7: Data Isolation

- Users can only access their own imports
- No cross-user data leakage
- Proper ownership assignment
- Verify user ID in all operations

---

## Error Handling

### Error Code System

All errors follow this structure:
```json
{
  "success": false,
  "error": "Human-readable message",
  "details": {
    "code": "ERROR_CODE",
    "message": "Detailed description",
    "field": "optional field name",
    "index": "optional item index"
  }
}
```

### Error Codes

#### File Errors
- `FILE_TOO_LARGE` - File exceeds 50MB
- `INVALID_FILE_TYPE` - Not a .json file
- `INVALID_JSON` - File is not valid JSON
- `EMPTY_FILE` - File has no content

#### Format Errors
- `MISSING_FIELD` - Required field missing
- `INCOMPATIBLE_VERSION` - Backup version not supported
- `INVALID_STRUCTURE` - Data structure incorrect

#### Validation Errors
- `INVALID_RECIPE` - Recipe validation failed
- `INVALID_COLLECTION` - Collection validation failed
- `INVALID_MEAL_PLAN` - Meal plan validation failed
- `INVALID_SHOPPING_LIST` - Shopping list validation failed
- `INVALID_INGREDIENT` - Ingredient validation failed
- `INVALID_INSTRUCTION` - Instruction validation failed
- `FIELD_TOO_LONG` - Field exceeds max length

#### Security Errors
- `RATE_LIMIT_EXCEEDED` - Too many import attempts
- `INVALID_PASSWORD` - Password incorrect (replace mode)
- `MALICIOUS_CONTENT` - Dangerous content detected
- `UNAUTHORIZED` - Authentication failed

#### Database Errors
- `IMPORT_ERROR` - Database transaction failed
- `DUPLICATE_KEY` - Unique constraint violation
- `CONNECTION_ERROR` - Database connection failed

### Error Recovery Strategies

#### Client-Side Recovery
```javascript
// Retry logic for network errors
async function importWithRetry(file, mode, password, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await importAPI.importBackup(file, mode, password);
    } catch (error) {
      if (error.code === 'NETWORK_ERROR' && i < maxRetries - 1) {
        await delay(1000 * (i + 1)); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

#### Server-Side Recovery
```javascript
// Transaction rollback
try {
  await session.startTransaction();
  await performImport(session);
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  logger.error('Import failed, rolled back', { error, userId });
  throw new ImportError('IMPORT_ERROR', 'Transaction failed');
}
```

---

## Acceptance Criteria

### AC-1: File Upload and Validation

✅ **Given** I am logged in  
✅ **When** I navigate to the import page  
✅ **Then** I see a file upload interface

✅ **Given** I am on the import page  
✅ **When** I select a valid .json backup file  
✅ **Then** the file name is displayed  
✅ **And** I can proceed with import

✅ **Given** I try to upload a non-.json file  
✅ **When** I select the file  
✅ **Then** I see an error "Must be .json file"  
✅ **And** cannot proceed

✅ **Given** I try to upload a file larger than 50MB  
✅ **When** I select the file  
✅ **Then** I see an error "File exceeds 50MB"  
✅ **And** cannot proceed

✅ **Given** I upload a file with invalid JSON  
✅ **When** the file is processed  
✅ **Then** I see an error "File is not valid JSON"  
✅ **And** import is not executed

### AC-2: Merge Mode Import

✅ **Given** I have uploaded a valid backup file  
✅ **And** I have selected "Merge" mode  
✅ **When** I click "Import Backup"  
✅ **Then** the import process starts

✅ **Given** an import is in progress (merge mode)  
✅ **When** the import completes  
✅ **Then** I see a success message  
✅ **And** I see count of items imported  
✅ **And** I see count of duplicates skipped  
✅ **And** my existing data is still present

✅ **Given** I have imported recipes in merge mode  
✅ **When** I view my recipe list  
✅ **Then** I see both my original recipes and imported recipes  
✅ **And** duplicates were not created

✅ **Given** the backup contains duplicate recipes  
✅ **When** import completes in merge mode  
✅ **Then** duplicates are skipped  
✅ **And** the summary shows count of skipped items

### AC-3: Replace Mode Import

✅ **Given** I have uploaded a valid backup file  
✅ **And** I have selected "Replace" mode  
✅ **When** I click "Import Backup"  
✅ **Then** a confirmation modal appears  
✅ **And** I see a warning about data deletion

✅ **Given** the replace confirmation modal is open  
✅ **When** I click "Cancel"  
✅ **Then** the modal closes  
✅ **And** no import is performed  
✅ **And** my data is unchanged

✅ **Given** the replace confirmation modal is open  
✅ **When** I enter my password and confirm  
✅ **Then** import proceeds  
✅ **And** all my existing data is deleted  
✅ **And** only backup data remains

✅ **Given** I try to import in replace mode  
✅ **When** I enter an incorrect password  
✅ **Then** I see an error "Password is incorrect"  
✅ **And** import is not executed  
✅ **And** my data is unchanged

✅ **Given** I completed a replace mode import  
✅ **When** I view my recipes  
✅ **Then** I only see recipes from the backup  
✅ **And** my previous recipes are gone

### AC-4: Progress and Feedback

✅ **Given** an import is in progress  
✅ **When** processing large files  
✅ **Then** I see a progress indicator  
✅ **And** I see which stage is running

✅ **Given** an import completes successfully  
✅ **When** I view the result  
✅ **Then** I see a detailed summary  
✅ **And** I see counts for each data type  
✅ **And** I see total import time

✅ **Given** an import fails  
✅ **When** I view the error  
✅ **Then** I see a clear error message  
✅ **And** I see an error code  
✅ **And** I can try again

### AC-5: Data Integrity

✅ **Given** I import a backup with collections  
✅ **When** import completes  
✅ **Then** collection recipe references are correct  
✅ **And** all referenced recipes exist

✅ **Given** I import a backup with meal plans  
✅ **When** import completes  
✅ **Then** meal plan recipe references are correct  
✅ **And** all referenced recipes exist

✅ **Given** a backup references a missing recipe  
✅ **When** import completes  
✅ **Then** the missing reference is removed  
✅ **And** the rest of the data imports correctly

✅ **Given** an import fails mid-process  
✅ **When** I check my data  
✅ **Then** no partial import occurred  
✅ **And** my data is in the original state

### AC-6: Security

✅ **Given** I am not logged in  
✅ **When** I try to access /import  
✅ **Then** I am redirected to login

✅ **Given** I have made 5 import attempts in one hour  
✅ **When** I try to import again  
✅ **Then** I see error "Rate limit exceeded"  
✅ **And** I see when I can try again

✅ **Given** a backup file contains script tags  
✅ **When** import is processed  
✅ **Then** the malicious content is removed  
✅ **And** import completes safely

---

## Testing Requirements

### Unit Tests

#### Backend Tests

**importController.js**:
- `validateBackupFile()` - File validation
  - Valid file passes
  - Invalid JSON rejected
  - Missing fields rejected
  - Wrong version rejected
  - File too large rejected
- `validateBackupContent()` - Content validation
  - Valid content passes
  - Invalid recipes rejected
  - Invalid collections rejected
  - Invalid meal plans rejected
  - Invalid shopping lists rejected
- `detectDuplicates()` - Duplicate detection
  - Recipe duplicates detected (title + ingredients)
  - Collection duplicates detected (name)
  - Meal plan duplicates detected (date + type)
  - Shopping list duplicates detected (name)
  - Non-duplicates not flagged
- `executeImport()` - Import execution
  - Merge mode preserves existing data
  - Replace mode deletes existing data
  - ID remapping works correctly
  - References updated correctly
  - Transaction rolls back on error

**importValidator.js**:
- Schema validation functions
- Content validation functions
- Reference validation functions
- Security validation functions

#### Frontend Tests

**ImportPage.jsx**:
- File upload interface renders
- Mode selection works
- Form validation works
- Error display works
- Success display works
- Progress tracking works

**ImportModal.jsx**:
- Modal renders correctly
- Password validation works
- Confirmation requires checkbox
- Cancel closes modal
- Submit triggers import

### Integration Tests

#### Test Suite: Import Flow

1. **Merge Mode Success**
   - Create user with existing recipes
   - Import backup in merge mode
   - Verify new recipes added
   - Verify existing recipes preserved
   - Verify duplicates skipped

2. **Replace Mode Success**
   - Create user with existing recipes
   - Import backup in replace mode
   - Verify old recipes deleted
   - Verify only backup recipes exist

3. **Collections Import**
   - Import backup with collections
   - Verify collections created
   - Verify recipe references updated
   - Verify recipe count correct

4. **Meal Plans Import**
   - Import backup with meal plans
   - Verify meal plans created
   - Verify recipe references updated
   - Verify dates correct

5. **Shopping Lists Import**
   - Import backup with shopping lists
   - Verify lists created
   - Verify items preserved

6. **Duplicate Detection**
   - Import backup with duplicates
   - Verify duplicates skipped
   - Verify unique items imported
   - Verify summary accurate

7. **Reference Handling**
   - Import backup with missing references
   - Verify missing references removed
   - Verify valid references preserved
   - Verify no broken links

8. **Transaction Rollback**
   - Simulate database error during import
   - Verify transaction rolled back
   - Verify no partial import
   - Verify original data intact

9. **Large File Import**
   - Import backup with 100+ recipes
   - Verify all items imported
   - Verify performance acceptable
   - Verify progress tracking works

10. **Error Handling**
    - Invalid JSON file
    - Wrong version file
    - Corrupted data file
    - Missing required fields
    - Invalid password (replace mode)
    - Rate limit exceeded

### E2E Tests

1. **Complete Merge Import Journey**
   - Login → Create recipes → Navigate to import → Upload file → Select merge → Import → Verify results

2. **Complete Replace Import Journey**
   - Login → Create recipes → Navigate to import → Upload file → Select replace → Confirm → Import → Verify old data gone

3. **Error Recovery Journey**
   - Login → Upload invalid file → See error → Upload valid file → Successful import

### Performance Tests

1. **Large Import Performance**
   - Import 500 recipes
   - Import 100 collections
   - Import 200 meal plans
   - Verify completion < 10 seconds

2. **Concurrent Imports**
   - 10 users import simultaneously
   - Verify all succeed
   - Verify no data corruption

### Security Tests

1. **Rate Limiting**
   - Make 6 import attempts in one hour
   - Verify 6th attempt blocked
   - Verify retry-after time

2. **Password Verification**
   - Try replace mode with wrong password
   - Verify import blocked
   - Verify data unchanged

3. **Malicious Content**
   - Upload file with script tags
   - Verify content sanitized
   - Verify safe import

4. **Authorization**
   - Try import without authentication
   - Verify blocked
   - Try with expired token
   - Verify blocked

### Manual Testing Checklist

- [ ] Upload valid backup file (merge mode)
- [ ] Upload valid backup file (replace mode)
- [ ] Upload invalid JSON file
- [ ] Upload file over 50MB
- [ ] Upload non-.json file
- [ ] Upload backup with duplicates
- [ ] Upload backup with missing references
- [ ] Cancel replace mode confirmation
- [ ] Enter wrong password for replace mode
- [ ] Import with existing data (merge mode)
- [ ] Import with existing data (replace mode)
- [ ] Import empty backup (no recipes)
- [ ] Import backup with only recipes
- [ ] Import backup with all data types
- [ ] Test drag-and-drop file upload
- [ ] Test progress indicators
- [ ] Test success message display
- [ ] Test error message display
- [ ] Verify collections reference correct recipes
- [ ] Verify meal plans reference correct recipes
- [ ] Test responsive design on mobile
- [ ] Test keyboard navigation
- [ ] Test screen reader accessibility
- [ ] Verify rate limiting after 5 attempts
- [ ] Verify transaction rollback on error

---

## Dependencies

### Existing Features
- ✅ Export system (V2.0) - Creates backup files
- ✅ Authentication system (V2.0) - User authentication
- ✅ Recipe CRUD (V1.0) - Recipe model and operations
- ✅ Collections (V2.0) - Collection model and operations
- ✅ Meal Planning (V2.0) - Meal plan model and operations
- ✅ Shopping Lists (V2.0) - Shopping list model and operations

### New Dependencies

#### Backend
- `multer` - File upload middleware (may already be installed)
- No other new dependencies (uses existing MongoDB, bcrypt, etc.)

#### Frontend
- No new dependencies (uses existing React, Axios, etc.)

### Database Changes
- None (uses existing models)
- May add index on duplicate detection fields for performance

---

## Future Enhancements

These features are explicitly out of scope for V2.1.2 but may be considered for future versions:

### V2.1.3: Enhanced Import Features
- Selective import (choose specific recipes/collections)
- Import conflict resolution UI
- Preview before import
- Dry-run mode with detailed report
- Import undo/rollback

### V2.2.0: Multi-Format Support
- Import from other recipe formats:
  - JSON-LD (schema.org Recipe)
  - MealBoard format
  - Paprika format
  - Custom CSV/Excel templates
- Export to multiple formats

### V2.3.0: Advanced Features
- Import history and audit log
- Scheduled/automated imports
- Import from cloud storage (Dropbox, Google Drive)
- Merge conflict resolution strategies
- Smart duplicate detection (fuzzy matching)
- Batch import multiple files

### V3.0.0: Enterprise Features
- Team/workspace imports
- Import permissions and approval workflows
- Import analytics and reporting
- Version control for imports
- Rollback to previous state

---

## Non-Functional Requirements

### Performance
- File upload: < 5s for 50MB file
- Validation: < 2s for 500 recipes
- Import execution: < 10s for 500 recipes
- Progress updates: Every 100ms minimum
- UI responsiveness: No blocking operations

### Usability
- Clear, step-by-step process
- Immediate feedback on errors
- Helpful error messages
- Progress indication for long operations
- Success confirmation with details
- Accessible (WCAG 2.1 AA)

### Reliability
- 99.9% uptime for import endpoint
- All-or-nothing transactions (no partial imports)
- Automatic rollback on errors
- Data integrity verification
- No data loss during import

### Scalability
- Support concurrent imports (multiple users)
- Handle large files (up to 50MB)
- Efficient duplicate detection
- Database transaction optimization
- Memory-efficient file processing

### Security
- File size limits prevent DoS
- Rate limiting prevents abuse
- Input sanitization prevents XSS
- Transaction isolation prevents race conditions
- Password verification for destructive operations

---

## Success Metrics

### Technical Metrics
- Test coverage: > 85%
- Import success rate: > 99%
- API response time: < 500ms (p95) for validation
- Import execution time: < 10s (p95) for 500 items
- Zero data corruption incidents
- Transaction rollback success: 100%

### User Metrics
- Import completion rate: > 95%
- Error rate: < 5%
- User satisfaction: > 4.5/5
- Support tickets related to import: < 10/month

### Business Metrics
- Daily active import users
- Average import file size
- Most common import scenarios (merge vs replace)
- Import-related bug reports

---

## Release Notes Template

```markdown
## [2.1.2] - YYYY-MM-DD

### Added
- Import from backup functionality
  - Restore recipes, collections, meal plans, and shopping lists
  - Merge mode: Non-destructive import that adds to existing data
  - Replace mode: Clean slate import with confirmation
  - Duplicate detection to prevent data duplication
  - Comprehensive validation (5 layers)
  - Progress tracking and detailed result summary
- Support for V2.0+ export format
- Rate limiting (5 imports per hour)

### Security
- File size limit: 50MB max
- Input sanitization for all imported data
- Password confirmation for replace mode
- Transaction rollback on errors
- Rate limiting to prevent abuse

### Performance
- Efficient duplicate detection
- Optimized ID remapping
- Database transaction optimization
- Support for large files (500+ recipes)
```

---

## Approval

**Requirements Author**: Development Team  
**Date**: February 15, 2026  
**Status**: Ready for Design Phase

**Next Steps**:
1. Design Phase: Detailed implementation planning
2. Development Phase: Backend and frontend implementation
3. Testing Phase: Comprehensive test suite (15+ integration tests)
4. Code Review Phase: Target 5/5 stars
5. Release Phase: Deploy V2.1.2

---

**Document Control**:
- Version: 1.0
- Last Updated: February 15, 2026
- Lines: 850+
- Next Review: After implementation