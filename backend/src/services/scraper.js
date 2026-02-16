import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Decode HTML entities
 */
const decodeHtmlEntities = (text) => {
  if (!text) return text;
  
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&nbsp;': ' ',
    '&#8217;': "'",
    '&#8216;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8211;': '–',
    '&#8212;': '—',
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return decoded;
};

/**
 * Clean instruction text by removing HTML tags and URLs
 */
const cleanInstructionText = (text) => {
  if (!text) return null;
  
  let cleaned = text;
  
  // Strip all HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  
  // Remove URLs (http/https)
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  
  // Remove image credits and attribution patterns
  cleaned = cleaned.replace(/(?:Photo|Image|Credit|Photography)\s*(?:by|:)\s*[^\n.]*/gi, '');
  cleaned = cleaned.replace(/©\s*\d{4}[^\n.]*/g, '');
  
  // Collapse multiple whitespaces into single space
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Trim
  cleaned = cleaned.trim();
  
  // Filter out if too short (likely not a real instruction)
  if (cleaned.length < 10) return null;
  
  return cleaned;
};

/**
 * Site-specific adapters for popular recipe sites
 */
const SITE_ADAPTERS = {
  'allrecipes.com': {
    name: 'AllRecipes',
    cleanIngredient: (text) => {
      // Remove UI elements specific to AllRecipes
      const badPatterns = [
        /^(Keep Screen Awake|Oops!|Something went wrong|Our team is working on it)/i,
        /^(This recipe was developed|Ingredient amounts are|Note that not all)/i,
        /^(Original recipe|Deselect All)/i,
        /^\d+\/\d+x\s+\d+x\s+\d+x/,  // Scale buttons like "1/2x 1x 2x"
        /^Add all ingredients to/i,
        /^shopping list/i
      ];
      
      for (const pattern of badPatterns) {
        if (pattern.test(text)) return null;
      }
      
      return text;
    },
    extractServings: (text) => {
      // Look for "yields X servings" or "X servings"
      const patterns = [
        /yields?\s+(\d+)\s+servings?/i,
        /serves?\s+(\d+)/i,
        /\((\d+)\s+servings?\)/i
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return parseInt(match[1]);
      }
      return null;
    }
  },
  
  'recipetineats.com': {
    name: 'RecipeTinEats',
    cleanIngredient: (text) => {
      // RecipeTinEats uses WPRM and is generally clean
      // But may have notes in parentheses we want to preserve
      const badPatterns = [
        /^Recipe video above/i,
        /^Tap on the times/i,
        /^HUNGRY FOR MORE/i
      ];
      
      for (const pattern of badPatterns) {
        if (pattern.test(text)) return null;
      }
      
      return text;
    },
    extractServings: (text) => {
      const match = text.match(/serves?\s+(\d+)/i);
      return match ? parseInt(match[1]) : null;
    }
  },
  
  'onceuponachef.com': {
    name: 'Once Upon A Chef',
    cleanIngredient: (text) => {
      // Clean but may have author notes
      const badPatterns = [
        /^Note:/i,
        /^Jennifer says/i,
        /^Make Ahead/i
      ];
      
      for (const pattern of badPatterns) {
        if (pattern.test(text)) return null;
      }
      
      return text;
    },
    extractServings: (text) => {
      const match = text.match(/(?:serves?|yields?)\s+(\d+)(?:-(\d+))?/i);
      if (match) {
        // If range like "serves 4-6", use the first number
        return parseInt(match[1]);
      }
      return null;
    }
  },
  
  'cafedelites.com': {
    name: 'Cafe Delites',
    cleanIngredient: (text) => {
      // Uses WPRM, generally clean
      const badPatterns = [
        /^Watch How/i,
        /^Video Recipe/i,
        /^Click on the stars/i
      ];
      
      for (const pattern of badPatterns) {
        if (pattern.test(text)) return null;
      }
      
      return text;
    },
    extractServings: (text) => {
      const match = text.match(/serves?\s+(\d+)/i);
      return match ? parseInt(match[1]) : null;
    }
  },
  
  'jocooks.com': {
    name: 'Jo Cooks',
    cleanIngredient: (text) => {
      const badPatterns = [
        /^Recipe video/i,
        /^If you make this/i
      ];
      
      for (const pattern of badPatterns) {
        if (pattern.test(text)) return null;
      }
      
      return text;
    },
    extractServings: (text) => {
      const match = text.match(/serves?\s+(\d+)/i);
      return match ? parseInt(match[1]) : null;
    }
  }
};

/**
 * Detect which site adapter to use
 */
const getSiteAdapter = (url) => {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return SITE_ADAPTERS[hostname] || null;
  } catch {
    return null;
  }
};

/**
 * Common ingredient cleanup (applied to all sites)
 */
const cleanIngredientText = (text, siteAdapter) => {
  if (!text) return null;
  
  let cleaned = text.trim();
  
  // Apply site-specific cleaning first
  if (siteAdapter?.cleanIngredient) {
    cleaned = siteAdapter.cleanIngredient(cleaned);
    if (!cleaned) return null;
  }
  
  // Common patterns to remove/filter
  const commonBadPatterns = [
    /^(Print|Save|Pin|Share|Rate)/i,
    /^Add to (shopping list|collection)/i,
    /^Ingredients?$/i,  // Just the word "Ingredients"
    /^Instructions?$/i,  // Just the word "Instructions"
    /^\d+\/\d+x\s+\d+x\s+\d+x/,  // Scaling buttons
    /(?:Photo|Image|Credit|Photography)\s*(?:by|:)/i,  // Image credits
    /^©\s*\d{4}/,  // Copyright notices
  ];
  
  for (const pattern of commonBadPatterns) {
    if (pattern.test(cleaned)) return null;
  }
  
  // Filter out items that are too short or too long
  if (cleaned.length < 2 || cleaned.length > 300) return null;
  
  return cleaned;
};

/**
 * Map common recipe category names to valid dishType enum values
 */
const mapDishType = (category) => {
  if (!category) return 'Other';
  
  const normalized = category.toLowerCase().trim();
  
  // Valid enum values: 'Appetizer', 'Main Course', 'Side Dish', 'Dessert', 
  // 'Beverage', 'Snack', 'Breakfast', 'Lunch', 'Dinner', 'Other'
  
  // Exact matches (case-insensitive)
  const exactMatches = {
    'appetizer': 'Appetizer',
    'appetizers': 'Appetizer',
    'starter': 'Appetizer',
    'starters': 'Appetizer',
    'main course': 'Main Course',
    'main dish': 'Main Course',
    'main': 'Main Course',
    'entree': 'Main Course',
    'entrée': 'Main Course',
    'side dish': 'Side Dish',
    'side': 'Side Dish',
    'sides': 'Side Dish',
    'dessert': 'Dessert',
    'desserts': 'Dessert',
    'sweet': 'Dessert',
    'sweets': 'Dessert',
    'beverage': 'Beverage',
    'beverages': 'Beverage',
    'drink': 'Beverage',
    'drinks': 'Beverage',
    'snack': 'Snack',
    'snacks': 'Snack',
    'breakfast': 'Breakfast',
    'lunch': 'Lunch',
    'dinner': 'Dinner',
    'supper': 'Dinner'
  };
  
  if (exactMatches[normalized]) {
    return exactMatches[normalized];
  }
  
  // Partial matches for common patterns
  if (normalized.includes('appetizer') || normalized.includes('starter')) {
    return 'Appetizer';
  }
  if (normalized.includes('main') || normalized.includes('entree') || normalized.includes('entrée')) {
    return 'Main Course';
  }
  if (normalized.includes('side')) {
    return 'Side Dish';
  }
  if (normalized.includes('dessert') || normalized.includes('sweet') || normalized.includes('cake') || 
      normalized.includes('cookie') || normalized.includes('pie') || normalized.includes('pastry')) {
    return 'Dessert';
  }
  if (normalized.includes('drink') || normalized.includes('beverage') || normalized.includes('cocktail') ||
      normalized.includes('smoothie') || normalized.includes('juice')) {
    return 'Beverage';
  }
  if (normalized.includes('snack')) {
    return 'Snack';
  }
  if (normalized.includes('breakfast') || normalized.includes('brunch')) {
    return 'Breakfast';
  }
  if (normalized.includes('lunch')) {
    return 'Lunch';
  }
  if (normalized.includes('dinner') || normalized.includes('supper')) {
    return 'Dinner';
  }
  
  return 'Other';
};

/**
 * Extract servings from text using site-specific or common patterns
 */
const extractServingsFromText = (text, siteAdapter) => {
  if (!text) return null;
  
  // Try site-specific extraction first
  if (siteAdapter?.extractServings) {
    const servings = siteAdapter.extractServings(text);
    if (servings) return servings;
  }
  
  // Trim whitespace
  const trimmed = text.trim();
  
  // Check if it's just a plain number (like "4" or "6")
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed);
    if (num > 0 && num < 1000) return num;  // Sanity check
  }
  
  // Expanded common patterns for better coverage
  const patterns = [
    /yields?\s+(\d+)\s+servings?/i,
    /serves?\s+(\d+)(?:\s+(?:people|portions?|persons?))?/i,
    /(\d+)\s+servings?/i,
    /(\d+)\s+people/i,  // "4 people"
    /makes?\s+(\d+)\s+(?:servings?|portions?)/i,
    /recipe\s+yields?\s+(\d+)/i,
    /for\s+(\d+)\s+(?:people|persons?)/i,
    /(\d+)\s+to\s+\d+\s+servings?/i,  // "4 to 6 servings" - take first number
    /(\d+)\s*-\s*\d+\s+(?:servings?|people)/i,  // "4-6 servings" or "4 - 6 people"
    /(\d+)-\d+\s+servings?/i,  // "4-6 servings" - take first number
    /portions?:\s*(\d+)/i,
    /yield:\s*(\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (num > 0 && num < 1000) return num;  // Sanity check
    }
  }
  
  return null;
};

/**
 * Scrape recipe from a URL
 */
export const scrapeRecipe = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Remove image-related elements before processing
    $('img').remove();
    $('figcaption').remove();
    $('[class*="photo-credit"]').remove();
    $('[class*="image-credit"]').remove();
    $('[class*="image-caption"]').remove();
    $('[class*="photo-caption"]').remove();
    $('[class*="attribution"]').remove();
    
    const siteAdapter = getSiteAdapter(url);
    
    // Try to extract JSON-LD recipe data
    const jsonLdRecipe = extractJsonLd($, url, siteAdapter);
    if (jsonLdRecipe) {
      return jsonLdRecipe;
    }
    
    // Fallback to HTML parsing
    return extractFromHtml($, url, siteAdapter);
  } catch (error) {
    throw new Error(`Failed to scrape recipe: ${error.message}`);
  }
};

/**
 * Extract recipe from JSON-LD schema
 */
const extractJsonLd = ($, url, siteAdapter) => {
  try {
    const scripts = $('script[type="application/ld+json"]');
    
    for (let i = 0; i < scripts.length; i++) {
      const scriptContent = $(scripts[i]).html();
      if (!scriptContent) continue;
      
      const data = JSON.parse(scriptContent);
      
      // Handle both single objects and arrays
      const recipes = Array.isArray(data) ? data : [data];
      
      for (const item of recipes) {
        // Check if this is a Recipe type (or within @graph)
        const recipe = item['@type'] === 'Recipe' ? item : 
                      (item['@graph']?.find(g => g['@type'] === 'Recipe'));
        
        if (recipe) {
          return formatJsonLdRecipe(recipe, url, siteAdapter);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('JSON-LD parsing error:', error.message);
    return null;
  }
};

/**
 * Format JSON-LD recipe data to our schema
 */
const formatJsonLdRecipe = (recipe, url, siteAdapter) => {
  const parseTime = (duration) => {
    if (!duration) return null;
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return null;
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    return hours * 60 + minutes;
  };
  
  const parseIngredients = (ingredients) => {
    if (!ingredients) return [];
    
    const ingredientList = Array.isArray(ingredients) ? ingredients : [ingredients];
    const cleaned = [];
    
    for (const ing of ingredientList) {
      let text = typeof ing === 'string' ? ing : (ing.text || ing.name || '');
      text = decodeHtmlEntities(text.trim());
      
      // Apply cleaning
      const cleanedText = cleanIngredientText(text, siteAdapter);
      if (cleanedText) {
        cleaned.push({
          name: cleanedText,
          amount: '',
          unit: ''
        });
      }
    }
    
    // Remove duplicates
    const unique = [];
    const seen = new Set();
    for (const item of cleaned) {
      if (!seen.has(item.name.toLowerCase())) {
        seen.add(item.name.toLowerCase());
        unique.push(item);
      }
    }
    
    return unique;
  };
  
  const parseInstructions = (instructions) => {
    if (!instructions) return [];
    
    let steps = [];
    
    if (Array.isArray(instructions)) {
      steps = instructions.map(inst => {
        let text = '';
        if (typeof inst === 'string') {
          text = inst;
        } else if (inst.text) {
          text = inst.text;
        }
        
        // Clean and decode
        text = decodeHtmlEntities(text);
        text = cleanInstructionText(text);
        
        return text;
      }).filter(Boolean);
    } else if (typeof instructions === 'string') {
      const cleaned = cleanInstructionText(decodeHtmlEntities(instructions));
      if (cleaned) steps = [cleaned];
    } else if (instructions.text) {
      const cleaned = cleanInstructionText(decodeHtmlEntities(instructions.text));
      if (cleaned) steps = [cleaned];
    }
    
    // Remove duplicates
    return [...new Set(steps)];
  };
  
  // Parse servings from multiple possible JSON-LD fields
  let servings = null;
  
  // Try recipeYield first (most common)
  if (recipe.recipeYield) {
    if (typeof recipe.recipeYield === 'number') {
      servings = recipe.recipeYield;
    } else if (typeof recipe.recipeYield === 'string') {
      servings = extractServingsFromText(recipe.recipeYield, siteAdapter);
    } else if (Array.isArray(recipe.recipeYield)) {
      // Sometimes it's an array, take first element
      servings = extractServingsFromText(String(recipe.recipeYield[0]), siteAdapter);
    }
  }
  
  // Try alternative fields if recipeYield didn't work
  if (!servings && recipe.yield) {
    servings = extractServingsFromText(String(recipe.yield), siteAdapter);
  }
  
  if (!servings && recipe.numberOfServings) {
    servings = typeof recipe.numberOfServings === 'number' 
      ? recipe.numberOfServings 
      : parseInt(recipe.numberOfServings);
  }
  
  if (!servings && recipe.portion) {
    servings = extractServingsFromText(String(recipe.portion), siteAdapter);
  }
  
  // Check description for servings info
  if (!servings && recipe.description) {
    servings = extractServingsFromText(recipe.description, siteAdapter);
  }
  
  // Extract dish type/category from recipeCategory
  let dishType = 'Other';
  if (recipe.recipeCategory) {
    let category = '';
    if (Array.isArray(recipe.recipeCategory)) {
      category = recipe.recipeCategory[0];
    } else if (typeof recipe.recipeCategory === 'string') {
      category = recipe.recipeCategory;
    }
    
    // Map common recipe categories to valid enum values
    dishType = mapDishType(category);
  }

  return {
    title: decodeHtmlEntities(recipe.name || ''),
    description: decodeHtmlEntities(recipe.description || ''),
    ingredients: parseIngredients(recipe.recipeIngredient),
    instructions: parseInstructions(recipe.recipeInstructions),
    prepTime: parseTime(recipe.prepTime),
    cookTime: parseTime(recipe.cookTime),
    servings: servings,
    cuisine: Array.isArray(recipe.recipeCuisine) 
      ? recipe.recipeCuisine[0] 
      : (recipe.recipeCuisine || ''),
    dishType: dishType,
    rating: recipe.aggregateRating?.ratingValue ? parseFloat(recipe.aggregateRating.ratingValue) : null,
    sourceUrl: url
  };
};

/**
 * Extract recipe from HTML (fallback method)
 */
const extractFromHtml = ($, url, siteAdapter) => {
  // Common selectors for recipe sites
  const title = $('h1').first().text().trim() || 
                $('[class*="recipe-title"]').first().text().trim() ||
                $('[class*="RecipeTitle"]').first().text().trim();
  
  const description = $('[class*="description"]').first().text().trim() ||
                     $('meta[name="description"]').attr('content') || '';
  
  // Try to find ingredients
  const ingredients = [];
  const ingredientSelectors = [
    '[class*="ingredient"]',
    '[itemprop="recipeIngredient"]',
    'ul.ingredients li',
    '.recipe-ingredients li'
  ];
  
  for (const selector of ingredientSelectors) {
    const items = $(selector);
    if (items.length > 0) {
      items.each((_, el) => {
        const text = $(el).text().trim();
        const cleaned = cleanIngredientText(decodeHtmlEntities(text), siteAdapter);
        if (cleaned) {
          ingredients.push({ name: cleaned, amount: '', unit: '' });
        }
      });
      if (ingredients.length > 0) break;
    }
  }
  
  // Try to find instructions
  const instructions = [];
  const instructionSelectors = [
    '[class*="instruction"] li',
    '[itemprop="recipeInstructions"] li',
    '.recipe-steps li',
    'ol li'
  ];
  
  for (const selector of instructionSelectors) {
    const items = $(selector);
    if (items.length > 0) {
      items.each((_, el) => {
        const text = $(el).text().trim();
        const cleaned = cleanInstructionText(decodeHtmlEntities(text));
        if (cleaned) {
          instructions.push(cleaned);
        }
      });
      if (instructions.length > 0) break;
    }
  }
  
  // Try to extract servings from multiple sources
  let servings = null;
  
  // Try specific serving selectors first
  const servingSelectors = [
    '[class*="servings"]',
    '[class*="yield"]',
    '[class*="recipe-yield"]',
    '[itemprop="recipeYield"]',
    '[class*="recipe-servings"]',
  ];
  
  for (const selector of servingSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      const text = element.text().trim();
      servings = extractServingsFromText(text, siteAdapter);
      if (servings) break;
    }
  }
  
  // Fallback to searching entire page text
  if (!servings) {
    const pageText = $('body').text();
    servings = extractServingsFromText(pageText, siteAdapter);
  }
  
  // Validate that we found the required data
  if (!title) {
    throw new Error('Could not extract recipe title from this page');
  }
  
  if (ingredients.length === 0) {
    throw new Error('Could not extract ingredients from this page');
  }
  
  if (instructions.length === 0) {
    throw new Error('Could not extract instructions from this page');
  }
  
  return {
    title: decodeHtmlEntities(title),
    description: decodeHtmlEntities(description.substring(0, 500)),
    ingredients,
    instructions,
    servings,
    sourceUrl: url
  };
};