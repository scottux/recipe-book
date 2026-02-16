# REQ-005: HTML Entity Decoding

## Metadata

- **ID**: REQ-005
- **Title**: HTML Entity Decoding for Imported Recipes
- **Status**: ✅ Implemented
- **Priority**: Medium
- **Created**: 2026-02-13
- **Last Updated**: 2026-02-13

## Description

Automatically decode HTML entities in scraped recipe content to ensure proper display of special characters, quotes, apostrophes, and symbols.

## User Stories

1. **As a user**, I want apostrophes to display correctly (don't, not don&#39;t)
2. **As a user**, I want quotation marks to render properly
3. **As a user**, I want ampersands and special characters to be readable
4. **As a user**, I want imported recipes to look natural without encoding artifacts

## Acceptance Criteria

- [ ] ✅ Named entities decoded (&amp; → &, &quot; → ")
- [ ] ✅ Numeric decimal entities decoded (&#39; → ')
- [ ] ✅ Numeric hex entities decoded (&#x27; → ')
- [ ] ✅ Decoding applied to all text fields (title, description, ingredients, instructions)
- [ ] ✅ Special punctuation handled (—, –, ', ', ", ")
- [ ] ✅ Non-breaking spaces converted to regular spaces

## Technical Implementation

### Supported Entities

**Named:**
- `&amp;` → &
- `&lt;` → <
- `&gt;` → >
- `&quot;` → "
- `&#39;` / `&apos;` → '
- `&nbsp;` → (space)

**Numeric (Decimal):**
- `&#39;` → '
- `&#8217;` → ' (smart quote)
- `&#8211;` → – (en dash)
- `&#8212;` → — (em dash)

**Numeric (Hexadecimal):**
- `&#x27;` → '
- `&#x2F;` → /

### Implementation

Located in `backend/src/services/scraper.js`:

```javascript
const decodeHtmlEntities = (text) => {
  // Replace named entities
  // Replace decimal numeric entities
  // Replace hexadecimal numeric entities
  return decodedText;
};
```

Applied to:
- `recipe.title`
- `recipe.description`
- `ingredient.name`
- `instruction` steps

## Dependencies

- [REQ-002](REQ-002-recipe-import.md) - Recipe URL Import

## Testing Scenarios

1. Import recipe with `&#39;` → Verify displays as '
2. Import recipe with `&amp;` → Verify displays as &
3. Import recipe with `&quot;` → Verify displays as "
4. Import recipe with smart quotes (&#8217;) → Verify proper display
5. Import recipe with em dash (&#8212;) → Verify displays as —

### Examples

**Input:**
```
Don&#39;t forget to add 1 &amp; 1/2 cups &quot;all-purpose&quot; flour.
```

**Output:**
```
Don't forget to add 1 & 1/2 cups "all-purpose" flour.
```

## Future Enhancements

- [ ] Support for more Unicode ranges
- [ ] Emoji entity decoding
- [ ] HTML tag stripping (if needed)
- [ ] Custom entity definitions

## References

- [HTML Entity Decoding Documentation](../docs/features/html-entity-decoding.md)
- Code: `backend/src/services/scraper.js`