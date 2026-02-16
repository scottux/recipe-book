import axios from 'axios';
import * as cheerio from 'cheerio';
import { getEnabledSites } from '../config/favoriteSites.js';

/**
 * Search for recipes across favorite recipe websites
 */
export const searchRecipes = async (query, siteIds = null) => {
  try {
    const searchTerm = encodeURIComponent(query);
    const rawQuery = query.toLowerCase();
    
    // Get sites to search (all enabled or specific ones)
    let sitesToSearch = getEnabledSites();
    if (siteIds && Array.isArray(siteIds) && siteIds.length > 0) {
      sitesToSearch = sitesToSearch.filter(site => siteIds.includes(site.id));
    }
    
    // Search all sites in parallel
    const searchPromises = sitesToSearch.map(site => 
      searchSite(site, searchTerm)
    );
    
    const results = await Promise.allSettled(searchPromises);
    
    // Combine and filter successful results
    const allRecipes = results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value);
    
    // Calculate relevance scores (keep all results, but sort by relevance)
    const recipesWithRelevance = allRecipes
      .map(recipe => ({
        ...recipe,
        relevanceScore: calculateRelevanceScore(recipe.title, recipe.cuisine, rawQuery)
      }));
      // Don't filter - show all results sorted by relevance instead
    
    console.log(`Found ${allRecipes.length} total recipes, ${recipesWithRelevance.filter(r => r.relevanceScore > 0).length} with relevance match`);
    
    // Sort by relevance score, then rating, then source popularity
    const sorted = recipesWithRelevance.sort((a, b) => {
      // Primary: relevance score (higher is better)
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // Secondary: rating (higher is better)
      if (b.rating !== a.rating) {
        return (b.rating || 0) - (a.rating || 0);
      }
      // Tertiary: source rank (lower is better)
      return a.sourceRank - b.sourceRank;
    });
    
    // Return top 30 results
    return sorted.slice(0, 30);
  } catch (error) {
    console.error('Recipe search error:', error);
    throw new Error('Failed to search recipes');
  }
};

/**
 * Search a single site using its configuration
 */
const searchSite = async (siteConfig, searchTerm) => {
  try {
    const url = siteConfig.searchUrl.replace('{query}', searchTerm);
    
    console.log(`[${siteConfig.name}] Searching: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const recipes = [];
    const selectors = siteConfig.selectors;
    
    // Debug: Check how many potential result cards were found
    const resultCards = $(selectors.resultCards);
    console.log(`[${siteConfig.name}] Found ${resultCards.length} potential result cards using selector: ${selectors.resultCards}`);
    
    // Find recipe result cards using site-specific selector
    $(selectors.resultCards).each((i, elem) => {
      if (i >= 10) return; // Limit to 10 results per site
      
      const $elem = $(elem);
      
      // Extract title
      const title = typeof selectors.title === 'function'
        ? selectors.title($elem, $)
        : $elem.find(selectors.title).text().trim();
      
      // Extract URL
      let url = typeof selectors.url === 'function'
        ? selectors.url($elem, $)
        : $elem.find(selectors.url).attr('href') || $elem.attr('href');
      
      // Ensure URL is absolute
      if (url && !url.startsWith('http')) {
        const baseUrl = new URL(siteConfig.searchUrl);
        url = `${baseUrl.protocol}//${baseUrl.hostname}${url}`;
      }
      
      // Apply URL filter
      const urlFilter = selectors.urlFilter;
      if (!urlFilter || !urlFilter(url)) return;
      
      // Extract rating
      const rating = typeof selectors.rating === 'function'
        ? selectors.rating($elem, $)
        : null;
      
      // Extract description
      const description = typeof selectors.description === 'function'
        ? selectors.description($elem, $)
        : '';
      
      // Extract cuisine if available
      const cuisine = typeof selectors.cuisine === 'function'
        ? selectors.cuisine($elem, $)
        : null;
      
      if (title && url) {
        recipes.push({
          title: cleanTitle(title),
          url: url,
          source: siteConfig.name,
          sourceIcon: siteConfig.icon,
          sourceRank: FAVORITE_SITES_ORDER[siteConfig.id] || 99,
          rating: rating,
          description: description,
          cuisine: cuisine
        });
      } else {
        console.log(`[${siteConfig.name}] Skipped result ${i}: title=${title ? 'found' : 'missing'}, url=${url ? url.substring(0, 50) : 'missing'}`);
      }
    });
    
    console.log(`[${siteConfig.name}] Extracted ${recipes.length} recipes`);
    
    return recipes;
  } catch (error) {
    console.error(`[${siteConfig.name}] Search error:`, error.message);
    return [];
  }
};

/**
 * Source ranking for sorting (lower = higher priority)
 */
const FAVORITE_SITES_ORDER = {
  'allrecipes': 1,
  'recipetineats': 2,
  'seriouseats': 3,
  'onceuponachef': 4,
  'cafedelites': 5,
  'budgetbytes': 6,
  'jocooks': 7,
  'minimalistbaker': 8,
  'pinchofyum': 9,
  'skinnytaste': 10,
  'cookieandkate': 11,
  'bonappetit': 12,
  'epicurious': 13,
  'delish': 14,
  'tasty': 15,
  'damndelicious': 16,
  'simplyrecipes': 17,
  'foodnetwork': 18
};

/**
 * Calculate relevance score based on how well the title and cuisine match the query
 * Returns a score from 0 (no match) to 100 (perfect match)
 */
const calculateRelevanceScore = (title, cuisine, query) => {
  if (!title || !query) return 0;
  
  const titleLower = title.toLowerCase();
  const cuisineLower = cuisine ? cuisine.toLowerCase() : '';
  const queryLower = query.toLowerCase();
  
  // Check if query is a cuisine type search
  const commonCuisines = ['italian', 'mexican', 'chinese', 'japanese', 'thai', 'indian', 'french', 'greek', 'spanish', 'korean', 'vietnamese', 'mediterranean', 'american', 'asian'];
  const isCuisineSearch = commonCuisines.some(c => queryLower.includes(c));
  
  // If searching for cuisine and this recipe has a matching cuisine, boost score
  if (isCuisineSearch && cuisineLower && queryLower.includes(cuisineLower)) {
    return 100;
  }
  
  // Exact title match gets highest score
  if (titleLower.includes(queryLower)) {
    return 100;
  }
  
  // Split query into words (remove common stop words)
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'best', 'easy', 'simple', 'homemade', 'classic'];
  const queryWords = queryLower
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  if (queryWords.length === 0) return 0;
  
  // Count how many query words appear in the title
  const matchingWords = queryWords.filter(word => titleLower.includes(word));
  
  if (matchingWords.length === 0) return 0;
  
  // Calculate score based on percentage of matching words
  const matchPercentage = matchingWords.length / queryWords.length;
  
  // All query words present = 80 points
  if (matchPercentage === 1.0) {
    return 80;
  }
  
  // Some query words present = 40-70 points based on percentage
  return Math.floor(40 + (matchPercentage * 40));
};

/**
 * Clean up title (remove site name suffixes)
 */
const cleanTitle = (title) => {
  // Remove common suffixes like " - AllRecipes", " | Food Network", etc.
  return title
    .replace(/\s*[-|]\s*(AllRecipes|Food Network|RecipeTin Eats|Once Upon A Chef|Cafe Delites|Jo Cooks|Serious Eats|Bon Appétit|Bon Appetit|Epicurious|Delish|Tasty|Budget Bytes|Pinch of Yum|Skinnytaste|Minimalist Baker|Cookie and Kate|Damn Delicious|Simply Recipes).*$/i, '')
    .replace(/\s*[-|]\s*Recipe.*$/i, '')
    .trim();
};
