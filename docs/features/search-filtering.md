# Search & Filtering

Find recipes quickly with powerful search and filtering capabilities.

## Overview

The Recipe Book provides multiple ways to find recipes: text search, ingredient search, filters by category/cuisine/rating, sorting options, and the fun "Surprise Me" feature for recipe inspiration.

## 🎲 Surprise Me Feature

**New!** Can't decide what to cook? Let the app inspire you!

### How It Works

1. Navigate to the **Discover Recipes** page
2. Click the **"🎲 Surprise Me!"** button below the search bar
3. A random creative search suggestion is automatically selected
4. The search is performed instantly across your selected recipe sites
5. Discover something new and exciting to cook!

### Creative Categories

The Surprise Me feature includes 70+ curated suggestions across diverse categories:

- **🌍 Around the World**: Vietnamese pho, Ethiopian injera, Turkish kebab, Japanese ramen, Korean bibimbap, Indian butter chicken, Thai green curry, Spanish paella, Greek moussaka, Moroccan tagine, Lebanese falafel
- **🍳 Cooking Challenges**: 5 ingredient dinner, 30 minute meal, one pot pasta, sheet pan dinner, slow cooker recipes, air fryer recipes, no bake desserts, instant pot meals
- **🍦 Indulgent Treats**: Molten lava cake, bacon wrapped appetizers, triple chocolate brownies, loaded nachos, cheesy comfort food, deep dish pizza, gourmet burgers, decadent desserts
- **🥗 Health Conscious**: Keto friendly dinner, meal prep bowls, vegan comfort food, high protein breakfast, gluten free pasta, low carb recipes, whole30 meals, plant based dinner
- **🎉 Fun & Quirky**: Campfire cooking, game day snacks, ramen upgrades, leftover makeover, breakfast for dinner, fancy grilled cheese, gourmet hot dogs, creative pizza toppings
- **🌿 Seasonal Favorites**: Pumpkin spice recipes, summer grilling, cozy soup recipes, picnic sandwiches, holiday cookies, spring salads, warm winter stews, refreshing summer drinks
- **🍷 Date Night**: Romantic dinner for two, homemade pasta, fancy appetizers, chocolate fondue, elegant seafood, impressive desserts, wine pairing recipes, tapas night
- **🥞 Breakfast & Brunch**: Fluffy pancakes, eggs benedict, breakfast burrito, french toast variations, homemade granola, smoothie bowls, savory crepes, breakfast casserole
- **🍲 Comfort Classics**: Mac and cheese, chicken noodle soup, meatloaf, pot roast, fried chicken, mashed potatoes, beef stew, biscuits and gravy

### Perfect For

- **Decision Fatigue**: When you can't decide what to cook
- **Inspiration**: Discovering new cuisines and cooking styles
- **Variety**: Breaking out of your usual recipe rotation
- **Adventure**: Trying something completely different
- **Fun**: Making meal planning more exciting
- **Learning**: Exploring recipes you wouldn't normally search for

### Visual Feedback

When you click "Surprise Me":
- The search box briefly scales up with an accent border
- The button bounces with animation
- The selected suggestion appears in the search box
- Results load automatically

---

## Text Search

Search across recipe titles and descriptions.

### How to Use

1. Enter text in the search box at the top of the recipe list
2. Results update automatically as you type
3. Clear the search box to see all recipes

### What Gets Searched

- Recipe titles
- Recipe descriptions

### Examples

- `"chicken"` - Finds all recipes with "chicken" in title or description
- `"pasta"` - Finds pasta-related recipes
- `"quick"` - Finds recipes described as quick

## Ingredient Search

Find recipes containing specific ingredients.

### How to Use

1. Click the **"Search by Ingredient"** filter
2. Enter an ingredient name
3. View recipes containing that ingredient

### How It Works

- Searches within ingredient names (partial matches)
- Case-insensitive
- Works with both manually entered and imported recipes

### Examples

- `"tomatoes"` - Finds recipes with tomatoes, cherry tomatoes, sun-dried tomatoes, etc.
- `"chicken"` - Finds recipes with chicken breast, chicken thighs, ground chicken, etc.
- `"garlic"` - Finds any recipe using garlic

## Filters

### Dish Type Filter

Filter by meal category or course.

**Available Options:**
- Appetizer
- Main Course
- Side Dish
- Dessert
- Beverage
- Snack
- Breakfast
- Lunch
- Dinner
- Other

**Example:** Select "Main Course" to see only entrées

### Cuisine Filter

Filter by culinary tradition.

**Common Options:**
- Italian
- Mexican
- Chinese
- French
- Indian
- Thai
- American
- Mediterranean
- Japanese

Plus any custom cuisines from imported recipes.

**Example:** Select "Italian" to see pasta, pizza, risotto, etc.

### Rating Filter

Filter by minimum star rating.

**Options:**
- 1 star or higher
- 2 stars or higher
- 3 stars or higher
- 4 stars or higher
- 5 stars only

**Example:** Select "4 stars" to see only highly-rated recipes

## Sorting

Sort recipes by different criteria.

### Sort Options

1. **Title (A-Z / Z-A)**
   - Alphabetical order
   - Useful for finding recipes by name

2. **Rating (High-Low / Low-High)**
   - Sort by star rating
   - Find your favorites or recipes needing improvement

3. **Prep Time (Short-Long / Long-Short)**
   - Sort by preparation time
   - Find quick recipes or plan ahead

4. **Cook Time (Short-Long / Long-Short)**
   - Sort by cooking time
   - Useful for time-constrained cooking

5. **Date Added (Newest-Oldest / Oldest-Newest)**
   - Sort by when recipes were created
   - Find recently added recipes

### How to Sort

1. Click the **"Sort By"** dropdown
2. Select your sort field
3. Choose ascending (↑) or descending (↓) order

## Combining Filters

All filters can be combined for powerful searches:

### Example Combinations

**Quick Italian Pasta Dishes:**
- Search: "pasta"
- Cuisine: Italian
- Dish Type: Main Course
- Sort By: Prep Time (Short-Long)

**Highly-Rated Desserts:**
- Dish Type: Dessert
- Rating: 4 stars minimum
- Sort By: Rating (High-Low)

**Recipes with Chicken:**
- Ingredient Search: "chicken"
- Dish Type: Main Course
- Sort By: Cook Time (Short-Long)

**Recent Additions:**
- Sort By: Date Added (Newest-Oldest)
- View what you've added lately

## Clearing Filters

To reset all filters and see all recipes:
1. Clear the search box
2. Set all dropdowns to "All" or default
3. Or refresh the page

## Tips

1. **Start broad, then narrow:** Begin with a text search, then add filters
2. **Use ingredient search:** Great for "what can I make with X?"
3. **Sort by time:** When you're in a hurry
4. **Sort by rating:** To find your favorites
5. **Combine filters:** Get very specific results

## Filter Behavior

- **AND logic:** All active filters must match
  - Example: Italian AND Main Course AND 4+ stars
- **Partial matches:** Text searches match substrings
  - "tom" matches "tomato", "tomatoes", "stomach" (use wisely!)
- **Case-insensitive:** All searches ignore case

## Performance

- Searches are performed client-side (fast)
- No server roundtrip required
- Works with large recipe collections
- Instant results as you type

## Future Enhancements

Planned improvements:
- [ ] Multiple ingredient search (AND/OR logic)
- [ ] Tag-based filtering
- [ ] Advanced search with operators
- [ ] Recipe collections/favorites
- [ ] Recently viewed recipes
- [ ] Search history

## Related

- [Recipe Management](recipe-management.md) - Manage your recipes
- [API Reference](../api/api-reference.md) - Filter query parameters