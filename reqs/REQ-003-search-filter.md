# REQ-003: Search & Filtering

## Metadata

- **ID**: REQ-003
- **Title**: Search and Filtering Capabilities  
- **Status**: ✅ Implemented
- **Priority**: High
- **Created**: 2024-01-15
- **Last Updated**: 2026-02-13

## Description

Users can search and filter recipes by text, ingredients, dish type, cuisine, and rating, with sorting options to organize results.

## User Stories

1. **As a user**, I want to search recipes by name so I can quickly find specific recipes
2. **As a user**, I want to search by ingredient so I can find recipes using what I have
3. **As a user**, I want to filter by cuisine or dish type so I can browse categories
4. **As a user**, I want to filter by rating so I can find my best recipes
5. **As a user**, I want to sort results so I can organize by time, rating, or date

## Acceptance Criteria

### Text Search
- [ ] ✅ Search box searches title and description
- [ ] ✅ Searches are case-insensitive
- [ ] ✅ Results update in real-time as user types
- [ ] ✅ Partial matches are supported

### Ingredient Search
- [ ] ✅ Dedicated ingredient search field
- [ ] ✅ Searches within ingredient names
- [ ] ✅ Partial matching (e.g., "tom" matches "tomatoes")

### Filters
- [ ] ✅ Dish type dropdown with all categories
- [ ] ✅ Cuisine dropdown with available cuisines
- [ ] ✅ Rating filter (minimum stars)
- [ ] ✅ Filters can be combined (AND logic)

### Sorting
- [ ] ✅ Sort by: title, rating, prepTime, cookTime, createdAt
- [ ] ✅ Ascending/descending order
- [ ] ✅ Default sort by creation date (newest first)

## Technical Implementation

### Frontend (Client-side)
- Filtering performed in React component
- No server roundtrip for instant results
- State management in RecipeList component

### Backend (API)
- Query parameters for filtering
- MongoDB queries for efficiency
- Indexed fields for performance

### Query Parameters

```
?search=chicken
?ingredient=tomatoes
?dishType=Main%20Course
?cuisine=Italian
?rating=4
?sortBy=prepTime&order=asc
```

## Dependencies

- [REQ-001](REQ-001-recipe-crud.md) - Recipe CRUD
- [REQ-006](REQ-006-data-model.md) - Recipe Data Model

## Testing Scenarios

1. Search "pasta" → Verify matches in title/description
2. Search ingredient "chicken" → Verify ingredient matching
3. Filter Italian + Main Course + 4 stars → Verify AND logic
4. Sort by prep time → Verify ascending order
5. Combine search + filters → Verify all work together
6. Clear all filters → Verify reset to all recipes

## Future Enhancements

- [ ] Multiple ingredient search (AND/OR logic)
- [ ] Tag-based filtering
- [ ] Advanced search with operators
- [ ] Search history
- [ ] Saved searches / favorite filters
- [ ] Full-text search (ElasticSearch)

## References

- [Search & Filtering Documentation](../docs/features/search-filtering.md)
- [API Reference](../docs/api/api-reference.md)