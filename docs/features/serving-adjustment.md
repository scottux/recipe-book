# Serving Adjustment

Automatically scale recipe ingredient amounts for any serving size.

## Overview

The Serving Adjustment feature intelligently recalculates ingredient amounts when you change the number of servings, maintaining proper proportions.

## How to Use

1. Open any recipe's detail page
2. Locate the servings section in the metadata area
3. Use the **−** and **+** buttons to adjust servings
4. Ingredient amounts update automatically
5. Click **Reset** to return to original servings

### Controls

- **− button:** Decrease servings by 1 (minimum: 1)
- **+ button:** Increase servings by 1 (no maximum)
- **Reset button:** Restore original serving size
- **Current number:** Shows adjusted serving count

## How It Works

### Scaling Algorithm

1. **Extract original amount** from ingredient
2. **Calculate ratio:** `newServings ÷ originalServings`
3. **Multiply amount** by ratio
4. **Format result** with appropriate precision

### Example Calculations

**Original Recipe: 4 servings**

| Ingredient | Original | Scaled to 8 (×2) | Scaled to 2 (×0.5) |
|------------|----------|------------------|--------------------|
| Flour | 2 cups | 4 cups | 1 cup |
| Sugar | 1 ½ cups | 3 cups | ¾ cup |
| Butter | ¼ cup | ½ cup | ⅛ cup |
| Eggs | 3 | 6 | 1.5 |

## Smart Fraction Handling

The feature recognizes and converts various fraction formats:

### Unicode Fractions

Recognized automatically:
- ½ (one-half)
- ¼ (one-quarter)
- ¾ (three-quarters)
- ⅓ (one-third)
- ⅔ (two-thirds)
- ⅛ (one-eighth)
- ⅜, ⅝, ⅞
- ⅕, ⅖, ⅗, ⅘

### Text Fractions

Parsed and converted:
- `1/2` → 0.5
- `3/4` → 0.75
- `2/3` → 0.667

### Mixed Numbers

Handles combinations:
- `1 1/2` → 1.5
- `2 3/4` → 2.75
- `3 ½` → 3.5

### Output Formatting

Results are displayed as fractions when appropriate:
- `0.5` → ½
- `0.25` → ¼
- `0.75` → ¾
- `1.5` → 1 ½
- `2.333` → 2.33 (when exact fraction not available)

## Amount Extraction

The feature intelligently extracts amounts from different ingredient formats:

### Structured Format
```javascript
{
  amount: "2",
  unit: "cups",
  name: "all-purpose flour"
}
```
**Display:** 2 cups all-purpose flour  
**Scaled (×2):** 4 cups all-purpose flour

### Unstructured Format
```javascript
{
  amount: "",
  unit: "",
  name: "2 cups all-purpose flour"
}
```
**Display:** 2 cups all-purpose flour  
**Scaled (×2):** 4 cups all-purpose flour

The system parses amounts from the name field when the amount field is empty (common with imported recipes).

## Edge Cases

### Non-numeric Amounts

Some ingredients can't be scaled:
- "A pinch of salt" → Not scaled
- "Salt to taste" → Not scaled
- "Garnish with parsley" → Not scaled

These display unchanged regardless of serving adjustment.

### Range Amounts

Handles ranges gracefully:
- "1-2 cups" → Uses first value (1 cup)
- "2 to 3 tablespoons" → Uses first value (2 tablespoons)

### Multiple Numbers

If ingredient name has multiple numbers:
- "2 15-ounce cans" → Scales the "2"
- Result (×2): "4 15-ounce cans"

## Visual Feedback

When servings are adjusted:
- Ingredients section shows: **"(adjusted for X servings)"**
- Reset button appears
- Changed amounts are recalculated in real-time

## Limitations

### What Gets Scaled
- ✅ Ingredient amounts
- ✅ Fraction values
- ✅ Decimal values
- ✅ Mixed numbers

### What Doesn't Get Scaled
- ❌ Instructions
- ❌ Cooking times
- ❌ Pan sizes
- ❌ Temperatures
- ❌ Descriptions

**Note:** Cooking times may need manual adjustment. Larger portions often require longer cooking times, but the relationship isn't always linear.

## Tips

1. **Round sensibly:** 1.33 cups might be easier as 1 ⅓ cups
2. **Check equipment:** Ensure you have pans large enough for scaled recipes
3. **Adjust cooking times:** May need to extend for larger portions
4. **Test temperatures:** Internal temperatures remain the same
5. **Start small:** When trying new recipes, stick to original servings first

## Precision

- Fractions accurate to closest eighth (⅛)
- Decimals rounded to 2 places when needed
- Prefers fraction display over decimals
- Minimizes rounding errors in calculations

## Examples

### Doubling a Recipe (4 → 8 servings)

**Before:**
- 1 ½ cups flour
- ¾ cup sugar
- 2 eggs
- ⅓ cup milk

**After:**
- 3 cups flour
- 1 ½ cups sugar
- 4 eggs
- ⅔ cup milk

### Halving a Recipe (6 → 3 servings)

**Before:**
- 3 cups broth
- 2 tablespoons oil
- 1 ½ pounds meat
- ¾ teaspoon salt

**After:**
- 1 ½ cups broth
- 1 tablespoon oil
- ¾ pound meat
- ⅜ teaspoon salt

### Scaling to Odd Numbers (4 → 5 servings)

**Before:**
- 2 cups flour
- 1 cup sugar
- 4 eggs

**After:**
- 2 ½ cups flour (2 × 1.25)
- 1 ¼ cups sugar (1 × 1.25)
- 5 eggs (4 × 1.25)

## Related

- [Recipe Management](recipe-management.md) - Edit recipe details
- [Recipe Import](recipe-import.md) - Import recipes with serving info