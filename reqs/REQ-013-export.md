# REQ-013: Recipe Export

**Status:** Planned  
**Priority:** Medium  
**Version:** 2.0  
**Dependencies:** REQ-001 (Recipe CRUD), REQ-010 (Collections)

## Overview
Users can export their recipes, collections, and meal plans in various formats for sharing, backup, and offline use.

## User Stories

### US-013-1: Export Single Recipe
**As a** recipe book user  
**I want to** export a recipe to PDF  
**So that** I can print it or share it offline

**Acceptance Criteria:**
- Export button on recipe detail page
- Format options: PDF, JSON, Markdown
- PDF includes images, ingredients, instructions
- Print-optimized layout
- Filename: recipe-name-date.ext

### US-013-2: Export Collection as Cookbook
**As a** recipe book user  
**I want to** export a collection as a PDF cookbook  
**So that** I can create a printed recipe book

**Acceptance Criteria:**
- Export entire collection
- Includes cover page with collection name/icon
- Table of contents with page numbers
- Each recipe on new page
- Index by recipe name
- Professional cookbook layout

###
 US-013-3: Export Multiple Recipes
**As a** recipe book user  
**I want to** select and export multiple recipes  
**So that** I can share a curated set

**Acceptance Criteria:**
- Bulk select from recipe list
- Export as single PDF or zip of individual files
- Can choose format per export
- Progress indicator for large exports

### US-013-4: Export Meal Plan
**As a** recipe book user  
**I want to** export my meal plan  
**So that** I can view it offline or share it

**Acceptance Criteria:**
- Export as PDF calendar view
- Export as JSON for backup
- Includes all recipe details
- Shopping list included

### US-013-5: Export Shopping List
**As a** recipe book user  
**I want to** export my shopping list  
**So that** I can access it while shopping

**Acceptance Criteria:**
- Print-friendly format
- Grouped by category
- Checkboxes for print version
- Text/Email format option

### US-013-6: Backup All Data
**As a** recipe book user  
**I want to** export all my data  
**So that** I have a complete backup

**Acceptance Criteria:**
- One-click full export
- JSON format (importable)
- Includes recipes, collections, meal plans
- Zip archive with organized structure

## Export Formats

### PDF Format
- **Recipe**: Single-page or multi-page recipe card
- **Collection**: Multi-page cookbook with TOC
- **Meal Plan**: Weekly calendar layout
- **Shopping List**: Categorized checklist

### JSON Format
- **Recipe**: Schema-compliant JSON
- **Collection**: Recipes array with metadata
- **Full Backup**: Complete data export
- **Importable**: Can re-import to restore

### Markdown Format
- **Recipe**: Markdown-formatted recipe
- **Human-readable**
- **Version-control friendly**
- **Easy to edit/share**

## PDF Templates

### Recipe Card Template
```
┌─────────────────────────────┐
│  [Image]                    │
│                             │
│  Recipe Name                │
│  ⏱ Prep: X  🍳 Cook: Y      │
│  👥 Servings: Z             │
│                             │
│  INGREDIENTS                │
│  • Item 1                   │
│  • Item 2                   │
│                             │
│  INSTRUCTIONS               │
│  1. Step 1                  │
│  2. Step 2                  │
│                             │
│  NOTES                      │
│  Additional info            │
└─────────────────────────────┘
```

### Cookbook Template
```
Cover Page:
  - Collection name & icon
  - User name
  - Date created
  - Recipe count

Table of Contents:
  - Recipe 1 ............ p.3
  - Recipe 2 ............ p.5
  
Recipe Pages:
  - One recipe per page
  - Consistent formatting
  
Index:
  - Alphabetical listing
```

## API Endpoints

```
GET /api/export/recipe/:id?format=pdf          - Export single recipe
GET /api/export/collection/:id?format=pdf      - Export collection
POST /api/export/recipes                        - Export multiple recipes
GET /api/export/meal-plan/:id?format=pdf       - Export meal plan
GET /api/export/shopping-list/:id?format=pdf   - Export shopping list
GET /api/export/backup                          - Full data backup
```

## Data Model

### Export Job (for async exports)
```javascript
{
  owner: ObjectId,
  type: String,              // recipe, collection, meal-plan, backup
  format: String,            // pdf, json, markdown
  resourceIds: [ObjectId],   // Items being exported
  status: String,            // pending, processing, completed, failed
  downloadUrl: String,       // S3 URL or local path
  expiresAt: Date,          // URL expiration
  createdAt: Date
}
```

## UI Components

### Export Dialog
- Format selector (PDF, JSON, Markdown)
- Options per format:
  - PDF: Include images, page size
  - JSON: Prettify, minify
- Export button
- Download progress

### Bulk Export
- Select multiple recipes
- "Export Selected" button
- Format and options dialog
- Batch progress indicator

### Settings > Export
- Full backup button
- Export history
- Auto-backup schedule (future)

## Technical Implementation

### Backend
- [ ] PDF generation library (PDFKit or Puppeteer)
- [ ] Export controllers
- [ ] Template rendering
- [ ] File storage/cleanup
- [ ] Async job queue for large exports

### Frontend
- [ ] Export dialog components
- [ ] Download handling
- [ ] Progress indicators
- [ ] Format selection UI

## PDF Generation Strategy

### Option 1: Server-side (PDFKit)
- Generate PDF on backend
- Return download link
- Pros: Consistent output, no client load
- Cons: Server resource intensive

### Option 2: Client-side (jsPDF)
- Generate PDF in browser
- Direct download
- Pros: No server load, instant
- Cons: Browser limitations

### Recommended: Hybrid
- Simple exports: Client-side
- Complex exports (cookbooks): Server-side

## File Naming Convention

```
Single Recipe:
  recipe-name-YYYY-MM-DD.pdf

Collection:
  collection-name-cookbook-YYYY-MM-DD.pdf

Meal Plan:
  meal-plan-week-of-YYYY-MM-DD.pdf

Shopping List:
  shopping-list-YYYY-MM-DD.pdf

Full Backup:
  recipe-book-backup-YYYY-MM-DD-HHMMSS.zip
```

## Testing Requirements

### Unit Tests
- PDF generation for different content
- JSON schema validation
- Markdown formatting
- Filename generation

### Integration Tests
- Export single recipe workflow
- Export collection workflow
- Full backup workflow

### E2E Tests
- User exports recipe as PDF
- User creates cookbook from collection
- User downloads full backup

## Performance Considerations

1. **Large Collections**
   - Async processing for >50 recipes
   - Progress updates via websocket
   - Background job queue

2. **Image Handling**
   - Compress images for PDF
   - Limit resolution
   - Optional: exclude images

3. **Caching**
   - Cache generated PDFs for 1 hour
   - Invalidate on recipe update

## Business Rules

1. **File Retention**
   - Generated files expire after 24 hours
   - User notified before expiration
   - Can regenerate anytime

2. **Size Limits**
   - Single PDF: 50MB max
   - Backup zip: 500MB max
   - Batch export: 100 recipes max

3. **Rate Limiting**
   - 10 exports per hour per user
   - 1 full backup per day

## Future Enhancements (v2.1+)

1. **Advanced Features**
   - Custom PDF templates
   - Watermarks for shared recipes
   - QR codes linking to online version

2. **Import Features**
   - Import from JSON backup
   - Import from other recipe apps
   - Bulk import from spreadsheet

3. **Cloud Storage**
   - Auto-backup to Dropbox/Google Drive
   - Sync across devices
   - Version history

## Success Metrics

- % of users who export recipes
- Most popular export format
- Average exports per user per month
- Cookbook creation rate

## Dependencies

- REQ-001: Recipe CRUD
- REQ-010: Collections  
- REQ-011: Meal Planning
- REQ-012: Shopping Lists

## Related Requirements

- REQ-014: Import (future - reverse of export)
- REQ-015: Sharing (uses export capabilities)