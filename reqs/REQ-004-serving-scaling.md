# REQ-004: Serving Size Adjustment

## Metadata

- **ID**: REQ-004
- **Title**: Automatic Ingredient Scaling for Serving Adjustments
- **Status**: ✅ Implemented
- **Priority**: Medium
- **Created**: 2026-02-13
- **Last Updated**: 2026-02-13

## Description

Users can adjust recipe servings, and ingredient amounts automatically scale proportionally using intelligent fraction handling and formatting.

## User Stories

1. **As a user**, I want to increase servings so I can cook for more people
2. **As a user**, I want to decrease servings so I don't waste food
3. **As a user**, I want fractions to display properly (½ instead of 0.5)
4. **As a user**, I want to reset to original servings easily

## Acceptance Criteria

- [ ] ✅ +/- buttons adjust serving count
- [ ] ✅ Ingredient amounts scale by ratio (newServings / originalServings)
- [ ] ✅ Fractions display naturally (½, ¼, ⅓, etc.)
- [ ] ✅ Handles Unicode fractions (½), text fractions (1/2), mixed numbers (1 ½)
- [ ] ✅ Minimum servings is 1
- [ ] ✅ Reset button restores original servings
- [ ] ✅ Visual indicator shows adjusted servings
- [ ] ✅ Parses amounts from ingredient name if amount field empty

## Technical Implementation

### Scaling Algorithm

```javascript
ratio = adjustedServings / originalServings
scaledAmount = originalAmount × ratio
```

### Fraction Handling

**Input Parsing:**
- Unicode: ½, ¼, ¾, ⅓, ⅔, ⅛, ⅜, ⅝, ⅞
- Text: 1/2, 3/4, 2/3
- Mixed: 1 1/2, 2 3/4

**Output Formatting:**
- Prefers fractions over decimals
- Rounds to closest eighth (⅛)
- Falls back to 2 decimal places

### Amount Extraction

1. Check `ingredient.amount` field first
2. If empty, parse from `ingredient.name`
3. Extract leading numbers/fractions
4. Handle multiple numbers (e.g., "2 15-oz cans")

## Dependencies

- [REQ-001](REQ-001-recipe-crud.md) - Recipe CRUD
- [REQ-006](REQ-006-data-model.md) - Recipe Data Model

## Testing Scenarios

### Basic Scaling

| Original (4 servings) | Scaled to 8 (×2) | Scaled to 2 (×0.5) |
|-----------------------|------------------|---------------------|
| 2 cups flour | 4 cups | 1 cup |
| 1 ½ cups sugar | 3 cups | ¾ cup |
| ¼ cup butter | ½ cup | ⅛ cup |

### Edge Cases

1. Amount in name field: "2 cups flour" → Scales correctly
2. No amount: "Salt to taste" → Unchanged
3. Range: "1-2 cups" → Uses first value (1)
4. Fraction precision: 1.333 → 1 ⅓
5. Very small amounts: 0.125 → ⅛

## Future Enhancements

- [ ] Adjust cooking times (non-linear scaling)
- [ ] Suggest pan size adjustments
- [ ] Temperature recommendations for scaled portions
- [ ] Unit conversions (cups ↔ grams)
- [ ] Smart rounding suggestions

## References

- [Serving Adjustment Documentation](../docs/features/serving-adjustment.md)
- Code: `frontend/src/components/RecipeDetail.jsx`