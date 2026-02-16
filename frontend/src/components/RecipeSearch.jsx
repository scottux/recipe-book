import { useState, useEffect } from 'react';
import { recipeAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

// Creative search suggestions for "Surprise Me" feature
const SURPRISE_SUGGESTIONS = [
  // Around the World 🌍
  'Vietnamese pho', 'Ethiopian injera', 'Peruvian ceviche', 'Turkish kebab',
  'Japanese ramen', 'Korean bibimbap', 'Indian butter chicken', 'Thai green curry',
  'Spanish paella', 'Greek moussaka', 'Moroccan tagine', 'Lebanese falafel',
  
  // Cooking Challenges 🍳
  '5 ingredient dinner', '30 minute meal', 'one pot pasta', 'sheet pan dinner',
  'slow cooker recipes', 'air fryer recipes', 'no bake desserts', 'instant pot meals',
  
  // Indulgent Treats 🍦
  'molten lava cake', 'bacon wrapped appetizers', 'triple chocolate brownies', 'loaded nachos',
  'cheesy comfort food', 'deep dish pizza', 'gourmet burgers', 'decadent desserts',
  
  // Health Conscious 🥗
  'keto friendly dinner', 'meal prep bowls', 'vegan comfort food', 'high protein breakfast',
  'gluten free pasta', 'low carb recipes', 'whole30 meals', 'plant based dinner',
  
  // Fun & Quirky 🎉
  'campfire cooking', 'game day snacks', 'ramen upgrades', 'leftover makeover',
  'breakfast for dinner', 'fancy grilled cheese', 'gourmet hot dogs', 'creative pizza toppings',
  
  // Seasonal Favorites 🌿
  'pumpkin spice recipes', 'summer grilling', 'cozy soup recipes', 'picnic sandwiches',
  'holiday cookies', 'spring salads', 'warm winter stews', 'refreshing summer drinks',
  
  // Date Night 🍷
  'romantic dinner for two', 'homemade pasta', 'fancy appetizers', 'chocolate fondue',
  'elegant seafood', 'impressive desserts', 'wine pairing recipes', 'tapas night',
  
  // Breakfast & Brunch 🥞
  'fluffy pancakes', 'eggs benedict', 'breakfast burrito', 'french toast variations',
  'homemade granola', 'smoothie bowls', 'savory crepes', 'breakfast casserole',
  
  // Comfort Classics 🍲
  'mac and cheese', 'chicken noodle soup', 'meatloaf', 'pot roast',
  'fried chicken', 'mashed potatoes', 'beef stew', 'biscuits and gravy'
];

const RecipeSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState({});
  const [error, setError] = useState('');
  const [favoriteSites, setFavoriteSites] = useState([]);
  const [selectedSites, setSelectedSites] = useState([]);
  const [showSiteFilters, setShowSiteFilters] = useState(false);
  const [surpriseAnimation, setSurpriseAnimation] = useState(false);
  const navigate = useNavigate();

  // Load favorite sites on mount
  useEffect(() => {
    const loadSites = async () => {
      try {
        const response = await recipeAPI.getFavoriteSites();
        setFavoriteSites(response.data.data);
        // Select all sites by default
        setSelectedSites(response.data.data.filter(s => s.enabled).map(s => s.id));
      } catch (err) {
        console.error('Failed to load favorite sites:', err);
      }
    };
    loadSites();
  }, []);

  const handleSurpriseMe = () => {
    // Pick a random suggestion
    const randomIndex = Math.floor(Math.random() * SURPRISE_SUGGESTIONS.length);
    const suggestion = SURPRISE_SUGGESTIONS[randomIndex];
    
    // Set query and trigger animation
    setQuery(suggestion);
    setSurpriseAnimation(true);
    
    // Remove animation after a moment
    setTimeout(() => setSurpriseAnimation(false), 600);
    
    // Auto-trigger search after a brief delay
    setTimeout(() => {
      performSearch(suggestion);
    }, 300);
  };

  const performSearch = async (searchQuery) => {
    const queryToUse = searchQuery || query;
    
    if (!queryToUse.trim()) {
      setError('Please enter a search term');
      return;
    }

    if (selectedSites.length === 0) {
      setError('Please select at least one site to search');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await recipeAPI.searchWeb(queryToUse, selectedSites);
      setResults(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search recipes');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    if (selectedSites.length === 0) {
      setError('Please select at least one site to search');
      return;
    }

    performSearch();
  };

  const toggleSite = (siteId) => {
    setSelectedSites(prev => 
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const toggleAllSites = () => {
    if (selectedSites.length === favoriteSites.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(favoriteSites.map(s => s.id));
    }
  };

  const handleImport = async (recipeUrl) => {
    try {
      setImporting({ ...importing, [recipeUrl]: true });
      const response = await recipeAPI.scrape(recipeUrl);
      
      // Navigate to the newly imported recipe
      navigate(`/recipe/${response.data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import recipe');
      console.error('Import error:', err);
      setImporting({ ...importing, [recipeUrl]: false });
    }
  };

  const renderStars = (rating) => {
    if (!rating) return <span className="text-gray-400 text-sm">No rating</span>;
    // Ensure rating is between 0 and 5
    const normalizedRating = Math.min(Math.max(rating, 0), 5);
    const filledStars = Math.floor(normalizedRating);
    const emptyStars = 5 - filledStars;
    const stars = '★'.repeat(filledStars) + '☆'.repeat(emptyStars);
    return (
      <div className="flex items-center gap-2">
        <span className="text-amber-500 text-lg">{stars}</span>
        <span className="text-sm text-cookbook-brown font-body">{normalizedRating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div>
      {/* Search Header */}
      <div className="cookbook-page p-8 mb-6">
        <h1 className="text-4xl font-display font-bold text-cookbook-text mb-2 text-center">
          🔍 Discover New Recipes
        </h1>
        <p className="text-center text-cookbook-brown font-body mb-6">
          Search across popular recipe websites and import your favorites
        </p>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for recipes... (e.g., 'chicken parmesan', 'chocolate cake')"
              className={`flex-1 border-2 border-cookbook-aged rounded-lg px-4 py-3 bg-white focus:border-cookbook-brown focus:outline-none focus:ring-2 focus:ring-cookbook-accent font-body text-lg transition-all ${
                surpriseAnimation ? 'scale-105 border-cookbook-accent' : ''
              }`}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-cookbook-accent text-white rounded-lg hover:bg-cookbook-brown transition-colors shadow-md font-body font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {/* Surprise Me Button */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleSurpriseMe}
              disabled={loading}
              className={`px-6 py-2.5 bg-cookbook-aged text-cookbook-darkbrown rounded-lg hover:bg-cookbook-brown hover:text-white transition-all font-body font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${
                surpriseAnimation ? 'animate-bounce' : ''
              }`}
            >
              🎲 Surprise Me!
            </button>
            <p className="text-xs text-cookbook-brown mt-2 font-body">
              Not sure what to cook? Let us inspire you!
            </p>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border-2 border-red-300 rounded-lg text-red-700 font-body text-center">
            {error}
          </div>
        )}

        {/* Favorite Sites Selection */}
        {favoriteSites.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowSiteFilters(!showSiteFilters)}
              className="w-full flex items-center justify-between p-3 bg-cookbook-aged rounded-lg hover:bg-cookbook-brown hover:text-white transition-colors font-body font-medium text-cookbook-darkbrown"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{showSiteFilters ? '▼' : '▶'}</span>
                <span>Recipe Sites ({selectedSites.length}/{favoriteSites.length} selected)</span>
              </div>
              <span className="text-sm opacity-75">
                {showSiteFilters ? 'Click to collapse' : 'Click to expand'}
              </span>
            </button>
            
            {showSiteFilters && (
              <div className="mt-3 p-4 bg-white border-2 border-cookbook-aged rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-display font-semibold text-cookbook-text">
                    Select Sites to Search:
                  </h3>
                  <button
                    onClick={toggleAllSites}
                    className="text-sm text-cookbook-accent hover:text-cookbook-brown font-body font-medium"
                  >
                    {selectedSites.length === favoriteSites.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favoriteSites.map(site => (
                    <button
                      key={site.id}
                      onClick={() => toggleSite(site.id)}
                      className={`px-3 py-1.5 rounded-lg border-2 font-body font-medium transition-all text-sm ${
                        selectedSites.includes(site.id)
                          ? 'bg-cookbook-accent text-white border-cookbook-accent shadow-md'
                          : 'bg-white text-cookbook-darkbrown border-cookbook-aged hover:border-cookbook-brown'
                      }`}
                    >
                      <span className="mr-1.5">{site.icon}</span>
                      {site.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Results */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-cookbook-aged rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cookbook-accent rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-cookbook-brown font-display text-xl">Searching for recipes...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div className="mb-4 text-center">
            <p className="text-cookbook-brown font-body">
              Found <span className="font-semibold">{results.length}</span> recipes for "<span className="font-semibold">{query}</span>"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((recipe, index) => (
              <div key={index} className="recipe-card p-6">
                <div className="flex-grow">
                  {/* Recipe Title */}
                  <h3 className="text-2xl font-display font-bold text-cookbook-text mb-2 line-clamp-2">
                    {recipe.title}
                  </h3>

                  {/* Source Badge */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="vintage-badge text-sm">
                      {recipe.sourceIcon && <span className="mr-1">{recipe.sourceIcon}</span>}
                      {recipe.source}
                    </span>
                    {recipe.cuisine && (
                      <span className="px-2 py-1 bg-cookbook-accent text-white rounded text-xs font-body font-medium">
                        {recipe.cuisine}
                      </span>
                    )}
                    {recipe.rating && renderStars(recipe.rating)}
                  </div>

                  {/* Description */}
                  {recipe.description && (
                    <p className="text-sm text-cookbook-darkbrown font-body mb-4 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}

                  {/* Decorative divider */}
                  <div className="decorative-divider my-4"></div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleImport(recipe.url)}
                    disabled={importing[recipe.url]}
                    className="flex-1 px-4 py-2.5 bg-cookbook-accent text-white rounded-lg hover:bg-cookbook-brown transition-colors font-body font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing[recipe.url] ? '⏳ Importing...' : '📥 Import Recipe'}
                  </button>
                  <a
                    href={recipe.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-cookbook-aged text-cookbook-darkbrown rounded-lg hover:bg-cookbook-brown hover:text-white transition-colors font-body font-medium shadow-md text-center"
                  >
                    🔗 View Source
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && results.length === 0 && query && (
        <div className="text-center py-16">
          <p className="text-cookbook-brown font-display text-2xl mb-2">No recipes found</p>
          <p className="text-cookbook-text font-body">Try a different search term or check your spelling</p>
        </div>
      )}

      {!loading && results.length === 0 && !query && (
        <div className="text-center py-16">
          <p className="text-cookbook-brown font-display text-2xl mb-2">Start Your Search</p>
          <p className="text-cookbook-text font-body">Enter a recipe or ingredient to discover delicious recipes from across the web</p>
        </div>
      )}
    </div>
  );
};

export default RecipeSearch;