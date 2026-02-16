# REQ-007: Web Recipe Search

**Status:** ✅ Implemented  
**Priority:** High  
**Related:** REQ-002 (imports search results), REQ-003 (search/filter concepts)

## Description

Enable users to discover recipes by searching across multiple popular recipe websites, view results with metadata, and import recipes directly into their collection.

## User Stories

### As a user:
- I want to search for recipes across multiple websites simultaneously
- I want to see recipe metadata (ratings, cuisine, description) in search results
- I want to import search results directly without manually entering URLs
- I want random recipe suggestions when I'm unsure what to cook
- I want to filter which sites are searched

## Features

### Multi-Site Search
- **18+ Integrated Recipe Sites**: AllRecipes, Food Network, Bon Appétit, Simply Recipes, Serious Eats, Tasty, Delish, The Kitchn, Epicurious, BBC Good Food, Jamie Oliver, NYT Cooking, Cookie and Kate, Minimalist Baker, Budget Bytes, Damn Delicious, Allrecipes (UK), RecipeTin Eats
- **Parallel Search**: Searches multiple sites concurrently for fast results
- **Site Selection**: Users can choose which sites to search
- **Collapsible Filters**: Site filter panel expands/collapses to reduce clutter

### Search Results Display
- **Relevance Scoring**: Results ranked by keyword matching and cuisine relevance
- **Metadata Display**:
  - Recipe title and description
  - Source website with icon
  - Star ratings (when available)
  - Cuisine type badge (when available)
- **Card Layout**: Clean, scannable recipe cards
- **One-Click Import**: Import button on each result
- **View Source**: Link to original recipe page

### Cuisine-Based Search
- **Cuisine Extraction**: Automatically extracts cuisine data from search cards
- **Cuisine Matching**: Searching "Italian" prioritizes Italian cuisine recipes
- **Enhanced Scoring**: Results with matching cuisine types receive higher relevance scores

### Surprise Me Feature
- **Random Suggestions**: 70+ curated recipe search ideas
- **9 Categories**:
  - 🌍 Around the World (international)
  - 🍳 Cooking Challenges (time/equipment based)
  - 🍦 Indulgent Treats (desserts/comfort)
  - 🥗 Health Conscious (diet-friendly)
  - 🎉 Fun & Quirky (creative ideas)
  - 🌿 Seasonal Favorites
  - 🍷 Date Night
  - 🥞 Breakfast & Brunch
  - 🍲 Comfort Classics
- **Auto-Search**: Clicking "Surprise Me" fills search and executes automatically
- **Visual Feedback**: Bounce animation and input highlight

## Technical Implementation

### Backend (`/backend/src/config/favoriteSites.js`)
```javascript
{
  id: 'allrecipes',
  name: 'AllRecipes',
  domain: 'allrecipes.com',
  searchUrl: 'https://www.allrecipes.com/search?q=',
  icon: '🍳',
  enabled: true,
  selectors: {
    resultCards: 'a.mntl-card-list-card--extendable',
    title: (elem, $) => elem.find('.card__title-text').text().trim(),
    url: (elem) => elem.attr('href'),
    rating: (elem, $) => /* extract rating */,
    description: (elem, $) => /* extract description */,
    cuisine: (elem, $) => elem.find('.card__content').attr('data-tag')
  }
}
```

### Search Service (`/backend/src/services/recipeSearch.js`)
- `searchRecipes(query, siteIds)`: Main search orchestrator
- `searchSite(siteConfig, searchTerm)`: Scrapes individual site
- `calculateRelevanceScore(title, cuisine, query)`: Ranks results
- Returns: Array of {title, url, source, description, rating, cuisine, relevanceScore}

### Frontend (`/frontend/src/components/RecipeSearch.jsx`)
- Search input with site filter dropdowns
- "Surprise Me" button with random suggestion picker
- Result grid with import and view source buttons
- Loading states and error handling

## Acceptance Criteria

- [x] Search across 18+ recipe websites
- [x] Display results with metadata (title, description, rating, cuisine)
- [x] One-click import from search results
- [x] Site selection with persist across searches
- [x] Collapsible site filters to reduce UI clutter
- [x] Cuisine-based search matching
- [x] "Surprise Me" feature with 70+ suggestions
- [x] Visual feedback for "Surprise Me" action
- [x] Relevance scoring prioritizes keyword and cuisine matches
- [x] Error handling for failed searches
- [x] Responsive design (mobile/desktop)

## Testing

### Test Scenarios
1. **Basic Search**: Search for "chocolate cake", verify results from multiple sites
2. **Cuisine Search**: Search for "Italian", verify Italian recipes rank higher
3. **Site Filtering**: Deselect sites, verify they're excluded from results
4. **Import**: Click import, verify recipe saves to collection
5. **Surprise Me**: Click button multiple times, verify random suggestions
6. **No Results**: Search gibberish, verify graceful "no results" message
7. **Network Error**: Simulate offline, verify error handling

## Future Enhancements

- [ ] Search history
- [ ] Save favorite sites preference
- [ ] Advanced search filters (difficulty, time, dietary restrictions)
- [ ] Recipe preview modal before importing
- [ ] Bulk import multiple recipes
- [ ] Custom site addition via URL pattern
- [ ] Search result caching
- [ ] Pagination for large result sets

## Dependencies

- Axios (HTTP requests)
- Cheerio (HTML parsing)
- React Router (navigation)

## Related Documentation

- [Recipe Import](REQ-002-recipe-import.md) - Import functionality
- [Search & Filtering](REQ-003-search-filter.md) - Local search concepts
- [Feature Guide](../docs/features/search-filtering.md) - User documentation