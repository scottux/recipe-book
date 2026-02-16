# REQ-002: Recipe URL Import

## Metadata

- **ID**: REQ-002
- **Title**: Recipe URL Import via Web Scraping
- **Status**: ✅ Implemented
- **Priority**: High
- **Created**: 2024-01-15
- **Last Updated**: 2026-02-13

## Description

Users can import recipes by providing a URL. The system automatically extracts recipe data using web scraping techniques, supporting both JSON-LD schema and HTML parsing methods.

## User Stories

1. **As a user**, I want to import recipes from URLs so I don't have to manually copy ingredients and instructions
2. **As a user**, I want the scraper to extract clean data without blog content or ads
3. **As a user**, I want special characters to display correctly in imported recipes

## Acceptance Criteria

- [ ] ✅ User can paste URL into import form
- [ ] ✅ System attempts JSON-LD schema extraction first
- [ ] ✅ System falls back to HTML parsing if schema unavailable
- [ ] ✅ HTML entities are decoded (&#39; → ', &amp; → &, etc.)
- [ ] ✅ Recipe data is extracted: title, ingredients, instructions, times, servings
- [ ] ✅ User can review and edit before saving
- [ ] ✅ System handles errors gracefully with meaningful messages
- [ ] ✅ Cuisine arrays are handled correctly (["Italian"] → "Italian")
- [ ] ✅ No error messages included in scraped recipe content
- [ ] ✅ No images or image URLs are extracted
- [ ] ✅ Failed scrapes throw descriptive errors instead of returning placeholder data

## Technical Implementation

### Extraction Methods

1. **JSON-LD Schema (Primary)**
   - Searches for `<script type="application/ld+json">`
   - Looks for `@type: "Recipe"`
   - Supports `@graph` structures

2. **HTML Parsing (Fallback)**
   - Uses CSS selectors for common patterns
   - Searches ingredient and instruction lists

### HTML Entity Decoding

Implemented in `decodeHtmlEntities()` function:
- Named entities: `&amp;`, `&quot;`, `&apos;`, `&nbsp;`
- Decimal numeric: `&#39;`, `&#8217;`
- Hexadecimal: `&#x27;`, `&#x2F;`

### Supported Sites

- AllRecipes
- Food Network
- Serious Eats
- Bon Appétit
- Cafe Delites
- Any site using schema.org/Recipe

## Dependencies

- [REQ-005](REQ-005-html-decoding.md) - HTML Entity Decoding
- [REQ-006](REQ-006-data-model.md) - Recipe Data Model

## Testing Scenarios

1. Import from AllRecipes → Verify all fields extracted
2. Import from food blog with entities → Verify decoding
3. Import from site without schema → Verify HTML fallback
4. Import invalid URL → Verify error message
5. Import URL with arrays → Verify cuisine extracted correctly

## Future Enhancements

- [ ] Image extraction and storage
- [ ] Nutritional information extraction
- [ ] Multiple URL import (batch)
- [ ] Site-specific scrapers for better accuracy
- [ ] User reporting of scraping issues

## References

- [Recipe Import Documentation](../docs/features/recipe-import.md)
- [HTML Entity Decoding](../docs/features/html-entity-decoding.md)
- Code: `backend/src/services/scraper.js`