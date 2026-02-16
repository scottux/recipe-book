# HTML Entity Decoding

Automatic conversion of HTML entities to proper characters in imported recipes.

## Overview

When importing recipes from websites, HTML entities (character codes) are automatically decoded to display text correctly.

## The Problem

Websites often encode special characters as HTML entities:
- Apostrophes as `&#39;` or `&apos;`
- Quotes as `&quot;`
- Ampersands as `&amp;`
- Special punctuation as numeric codes

Without decoding, recipes would display incorrectly:
- ❌ "Don&#39;t overcook"
- ❌ "Mix &amp; match ingredients"
- ❌ "Add 2&quot; cinnamon stick"

## The Solution

The scraper automatically decodes these entities:
- ✅ "Don't overcook"
- ✅ "Mix & match ingredients"
- ✅ "Add 2\" cinnamon stick"

## Supported Entities

### Named Entities

Common HTML entity names:

| Entity | Character | Name |
|--------|-----------|------|
| `&amp;` | & | Ampersand |
| `&lt;` | < | Less than |
| `&gt;` | > | Greater than |
| `&quot;` | " | Quotation mark |
| `&#39;` | ' | Apostrophe |
| `&apos;` | ' | Apostrophe (alt) |
| `&nbsp;` | (space) | Non-breaking space |

### Numeric Entities (Decimal)

Character code in decimal format:

| Entity | Character | Description |
|--------|-----------|-------------|
| `&#39;` | ' | Apostrophe |
| `&#34;` | " | Quote |
| `&#38;` | & | Ampersand |
| `&#8211;` | – | En dash |
| `&#8212;` | — | Em dash |
| `&#8216;` | ' | Left single quote |
| `&#8217;` | ' | Right single quote |
| `&#8220;` | " | Left double quote |
| `&#8221;` | " | Right double quote |

### Numeric Entities (Hexadecimal)

Character code in hexadecimal format:

| Entity | Character | Description |
|--------|-----------|-------------|
| `&#x27;` | ' | Apostrophe |
| `&#x2F;` | / | Slash |
| `&#x22;` | " | Quote |

## Where Decoding Occurs

Decoding is applied to:
- ✅ Recipe titles
- ✅ Descriptions
- ✅ Ingredient names
- ✅ Instructions
- ✅ Any text content

Decoding does NOT affect:
- ❌ URLs
- ❌ Image paths
- ❌ Metadata fields
- ❌ Numeric values

## Examples

### Recipe Title

**Raw HTML:**
```html
Grandma&#8217;s &quot;Secret&quot; Apple Pie
```

**Decoded:**
```
Grandma's "Secret" Apple Pie
```

### Ingredient

**Raw HTML:**
```html
1 &amp; 1/2 cups all-purpose flour
```

**Decoded:**
```
1 & 1/2 cups all-purpose flour
```

### Instruction

**Raw HTML:**
```html
Don&#39;t overmix &#8212; fold gently until just combined.
```

**Decoded:**
```
Don't overmix — fold gently until just combined.
```

## Technical Details

### Implementation

Located in: `backend/src/services/scraper.js`

```javascript
const decodeHtmlEntities = (text) => {
  // Named entities
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    // ... more entities
  };
  
  // Numeric entities (decimal)
  text = text.replace(/&#(\d+);/g, 
    (match, dec) => String.fromCharCode(dec)
  );
  
  // Numeric entities (hexadecimal)
  text = text.replace(/&#x([0-9a-fA-F]+);/g,
    (match, hex) => String.fromCharCode(parseInt(hex, 16))
  );
  
  return text;
};
```

### Processing Flow

1. Recipe scraped from URL
2. Raw text extracted from HTML
3. `decodeHtmlEntities()` applied to text fields
4. Decoded recipe stored in database
5. Clean text displayed to user

## Edge Cases

### Already Decoded
If text is already properly encoded, decoding has no effect:
- Input: "Don't overmix"
- Output: "Don't overmix"

### Mixed Encoding
Some sites have both encoded and unencoded characters:
- Input: "Don't overmix &amp; fold"
- Output: "Don't overmix & fold"

### Multiple Entities
Multiple entities in one string are all decoded:
- Input: "Mix &amp; match &#8212; don&#39;t worry!"
- Output: "Mix & match — don't worry!"

### Unknown Entities
Unrecognized entities are left as-is:
- Input: "&xyz; test"
- Output: "&xyz; test"

## Why This Matters

### User Experience
- **Readability:** Text displays naturally
- **Professionalism:** No technical artifacts
- **Accuracy:** Recipes match original intent

### Data Quality
- **Consistent storage:** Clean data in database
- **Searchability:** Searches work with proper characters
- **Export:** Clean data for PDF/print features

## Limitations

### What's Not Supported
- Complex Unicode beyond common characters
- HTML tags (stripped separately)
- Emoji entity codes
- Non-standard entity names

### Workarounds
If imported text still has encoding issues:
1. Edit the recipe manually
2. Copy-paste from original source
3. Report the issue for future fixes

## Testing

To verify decoding works:

1. Import a recipe with entities
2. Check title, ingredients, instructions
3. Look for natural quotation marks (", ')
4. Verify ampersands (&) display correctly
5. Check dashes are proper (—, –)

## Related

- [Recipe Import](recipe-import.md) - How recipe scraping works
- [Recipe Management](recipe-management.md) - Edit imported recipes