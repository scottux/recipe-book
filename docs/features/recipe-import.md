# Recipe Import

Import recipes from URLs using intelligent web scraping.

## Overview

The Recipe Import feature automatically extracts recipe data from web pages, eliminating the need to manually copy ingredients and instructions.

## How to Import

1. Click **"Import from URL"** button on the home page
2. Paste a recipe URL into the input field
3. Click **"Import"**
4. Wait for the scraper to extract the data
5. Review the imported recipe
6. Make any necessary edits
7. Save the recipe

## Supported Websites

The scraper works best with sites that use structured data (schema.org/Recipe markup):

- **AllRecipes** - Excellent support
- **Food Network** - Excellent support
- **Serious Eats** - Excellent support
- **Bon Appétit** - Excellent support
- **NYT Cooking** - Excellent support
- **Cafe Delites** - Excellent support
- **Most food blogs** - Good support (if they use recipe schema)

### How It Works

The scraper uses two extraction methods:

#### 1. JSON-LD Schema (Primary)

Looks for structured data in `<script type="application/ld+json">` tags with `@type: "Recipe"`.

**Advantages:**
- Most reliable
- Captures complete metadata
- Works with major recipe sites

#### 2. HTML Parsing (Fallback)

Uses CSS selectors to find recipe data in the HTML.

**Advantages:**
- Works when structured data isn't available
- Better than nothing

**Limitations:**
- Less reliable
- May miss some data
- Requires common HTML patterns

## What Gets Imported

The scraper automatically extracts:

- ✅ **Title** - Recipe name
- ✅ **Description** - Recipe summary
- ✅ **Ingredients** - Complete ingredient list
- ✅ **Instructions** - Step-by-step directions
- ✅ **Prep Time** - Preparation time (converted to minutes)
- ✅ **Cook Time** - Cooking time (converted to minutes)
- ✅ **Servings** - Number of servings
- ✅ **Cuisine** - Culinary tradition (Italian, Mexican, etc.)
- ✅ **Dish Type** - Category (automatically mapped to valid values)
- ✅ **Rating** - Aggregate rating (if available)
- ✅ **Source URL** - Original recipe URL

What **doesn't** get imported:
- ❌ Images
- ❌ Blog posts or stories
- ❌ Comments
- ❌ Advertisements
- ❌ Nutritional information (planned feature)

## Special Features

### HTML Entity Decoding

The scraper automatically converts HTML entities to proper characters:

- `&amp;` → `&`
- `&#39;` → `'`
- `&quot;` → `"`
- `&nbsp;` → ` ` (space)
- `&#8217;` → `'` (smart apostrophe)
- And many more...

This ensures imported text displays correctly without encoding artifacts like "don&#39;t" instead of "don't".

### Array Handling

Some sites provide cuisine or category as arrays:
- Input: `["Italian"]`
- Extracted: `"Italian"`

The scraper automatically extracts the first value.

### Time Parsing

Converts ISO 8601 duration format to minutes:
- `PT1H30M` → 90 minutes
- `PT45M` → 45 minutes
- `PT2H` → 120 minutes

### Dish Type Mapping

The scraper automatically maps recipe categories from websites to valid dish type values:

**Valid dish types:**
- Appetizer
- Main Course
- Side Dish
- Dessert
- Beverage
- Snack
- Breakfast
- Lunch
- Dinner
- Other (default)

**Common mappings:**
- "Sweet", "Sweets", "Cake", "Cookie", "Pie", "Pastry" → Dessert
- "Starter", "Starters" → Appetizer
- "Main", "Main Dish", "Entree", "Entrée" → Main Course
- "Side", "Sides" → Side Dish
- "Drink", "Drinks", "Cocktail", "Smoothie" → Beverage
- "Brunch" → Breakfast
- "Supper" → Dinner
- Unrecognized categories → Other

This ensures all imported recipes have valid, consistent dish type values that work with the filtering system.

## Troubleshooting

### Import Failed

**Problem:** "Failed to scrape recipe" error

**Possible causes:**
1. The URL is invalid or inaccessible
2. The site blocks automated requests
3. The site doesn't use standard recipe markup
4. Network connectivity issues

**Solutions:**
- Verify the URL is correct and accessible
- Try a different recipe from the same site
- Try a recipe from a different site
- Check your internet connection
- Copy and paste manually as a last resort

### Missing Data

**Problem:** Some fields are empty after import

**Why:** The source page may not include all data in structured format

**Solutions:**
- Edit the recipe to fill in missing information
- Check the source page to see if the data is available
- Some fields (like tags, dish type) may need manual entry

### Incorrect Data

**Problem:** Imported data is wrong or garbled

**Possible causes:**
- Site uses non-standard markup
- HTML entities not decoded properly
- Structured data is malformed

**Solutions:**
- Edit the recipe to fix incorrect data
- Report the issue (helps improve the scraper)
- Use manual entry for problematic sites

## Tips for Best Results

1. **Use popular recipe sites** - They typically have good structured data
2. **Check imports** - Always review imported recipes before saving
3. **Edit as needed** - Fill in missing data or fix errors
4. **Test URLs first** - Open the URL in your browser to verify it exists
5. **Report issues** - Help improve the scraper by reporting problematic sites

## Example URLs to Try

```
https://cafedelites.com/garlic-butter-shrimp-scampi/
https://www.allrecipes.com/recipe/[any-recipe-id]/
https://www.foodnetwork.com/recipes/[any-recipe]
```

## Technical Details

For developers interested in how the scraper works:

- Located in: `backend/src/services/scraper.js`
- Uses: Cheerio for HTML parsing, Axios for HTTP requests
- Timeout: 10 seconds
- User Agent: Mimics a standard browser
- Error handling: Graceful degradation with fallbacks

## Related

- [HTML Entity Decoding](html-entity-decoding.md) - Character encoding details
- [Recipe Management](recipe-management.md) - Edit imported recipes
- [API Reference](../api/api-reference.md) - Scraper API endpoint