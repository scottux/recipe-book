import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recipeAPI, exportAPI, shoppingListAPI } from '../services/api';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adjustedServings, setAdjustedServings] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [addingToShoppingList, setAddingToShoppingList] = useState(false);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const exportDropdownRef = useRef(null);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRecipe = async () => {
    try {
      setLoading(true);
      const response = await recipeAPI.getById(id);
      const recipeData = response.data.data;
      setRecipe(recipeData);
      setAdjustedServings(recipeData.servings);
    } catch (error) {
      console.error('Error fetching recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseAmount = (amountStr) => {
    if (!amountStr) return null;
    
    // Handle fractions
    const fractionMap = {
      '¼': 0.25, '½': 0.5, '¾': 0.75,
      '⅓': 0.333, '⅔': 0.667,
      '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
      '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8
    };
    
    let amount = amountStr.trim();
    
    // Replace unicode fractions
    for (const [frac, val] of Object.entries(fractionMap)) {
      amount = amount.replace(frac, val.toString());
    }
    
    // Handle text fractions like "1/2"
    amount = amount.replace(/(\d+)\/(\d+)/g, (match, num, den) => (num / den).toString());
    
    // Handle mixed numbers like "1 1/2" (already converted to "1 0.5")
    const parts = amount.split(/\s+/);
    let total = 0;
    for (const part of parts) {
      const num = parseFloat(part);
      if (!isNaN(num)) {
        total += num;
      }
    }
    
    return total || null;
  };

  const formatAmount = (num) => {
    if (num === null || num === undefined) return '';
    
    // Handle common fractions
    const fractions = [
      [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'],
      [0.5, '½'], [0.625, '⅝'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞']
    ];
    
    const wholePart = Math.floor(num);
    const decimalPart = num - wholePart;
    
    // Find closest fraction
    for (const [val, frac] of fractions) {
      if (Math.abs(decimalPart - val) < 0.01) {
        return wholePart > 0 ? `${wholePart} ${frac}` : frac;
      }
    }
    
    // Round to 2 decimal places
    return num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '');
  };

  const scaleIngredient = (ingredient) => {
    if (!recipe.servings || !adjustedServings || recipe.servings === adjustedServings) {
      return ingredient;
    }
    
    const ratio = adjustedServings / recipe.servings;
    
    // Try to get amount from the amount field first
    let originalAmount = parseAmount(ingredient.amount);
    let ingredientName = ingredient.name;
    let scaledAmountStr = ingredient.amount;
    
    // If amount field is empty, try to extract from the name field
    if (originalAmount === null && ingredient.name) {
      // Match numbers at the beginning of the ingredient name
      const match = ingredient.name.match(/^([\d\s\/¼½¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘.]+)/);
      if (match) {
        const amountPart = match[1].trim();
        originalAmount = parseAmount(amountPart);
        
        if (originalAmount !== null) {
          ingredientName = ingredient.name.substring(match[0].length).trim();
          scaledAmountStr = amountPart;
        }
      }
    }
    
    if (originalAmount === null) {
      return ingredient;
    }
    
    const scaledAmount = originalAmount * ratio;
    const scaledFormatted = formatAmount(scaledAmount);
    
    // If amount was in the name, reconstruct it
    if (ingredient.amount) {
      return {
        ...ingredient,
        amount: scaledFormatted
      };
    } else {
      return {
        ...ingredient,
        name: `${scaledFormatted} ${ingredientName}`
      };
    }
  };

  const increaseServings = () => {
    if (adjustedServings) {
      setAdjustedServings(adjustedServings + 1);
    }
  };

  const decreaseServings = () => {
    if (adjustedServings && adjustedServings > 1) {
      setAdjustedServings(adjustedServings - 1);
    }
  };

  const resetServings = () => {
    if (recipe) {
      setAdjustedServings(recipe.servings);
    }
  };

  const formatTime = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const handleRatingClick = async (newRating) => {
    try {
      setSavingRating(true);
      await recipeAPI.update(recipe._id, { ...recipe, rating: newRating });
      setRecipe({ ...recipe, rating: newRating });
    } catch (error) {
      console.error('Error updating rating:', error);
      alert('Failed to update rating');
    } finally {
      setSavingRating(false);
    }
  };

  const toggleLock = async () => {
    try {
      setTogglingLock(true);
      const response = await recipeAPI.toggleLock(recipe._id);
      setRecipe(response.data.data);
    } catch (error) {
      console.error('Error toggling lock:', error);
      alert('Failed to toggle lock status');
    } finally {
      setTogglingLock(false);
    }
  };

  const handleDelete = async () => {
    if (recipe.isLocked) {
      alert('This recipe is locked. Please unlock it first before deleting.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await recipeAPI.delete(recipe._id);
        navigate('/');
      } catch (error) {
        if (error.response?.status === 403) {
          alert('Cannot delete a locked recipe. Please unlock it first.');
        } else {
          alert('Failed to delete recipe');
        }
      }
    }
  };

  const handleAddToShoppingList = async (addToExisting = false) => {
    try {
      setAddingToShoppingList(true);
      const listName = addToExisting ? undefined : `${recipe.title} - ${new Date().toLocaleDateString()}`;
      
      await shoppingListAPI.generateFromRecipe(recipe._id, {
        servings: adjustedServings,
        listName,
        addToExisting
      });
      
      setShowShoppingListModal(false);
      
      // Show success message and navigate
      if (confirm('Shopping list created! Would you like to view it now?')) {
        navigate('/shopping-lists');
      }
    } catch (error) {
      console.error('Error creating shopping list:', error);
      alert('Failed to create shopping list. Please try again.');
    } finally {
      setAddingToShoppingList(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      setExportDropdownOpen(false);
      
      const response = await exportAPI.exportRecipe(recipe._id, format);
      
      // Create blob from response
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'json' ? 'application/json' : 
              'text/markdown'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const filename = `${recipe.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.${format}`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting recipe:', error);
      alert(`Failed to export recipe as ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  const renderInteractiveStars = (currentRating) => {
    const displayRating = hoverRating || currentRating || 0;
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      const starValue = i;
      const halfStarValue = i - 0.5;
      const isFull = displayRating >= starValue;
      const isHalf = displayRating >= halfStarValue && displayRating < starValue;
      
      stars.push(
        <span key={i} className="relative inline-block">
          {/* Half star click area (left half) */}
          <button
            onClick={() => handleRatingClick(halfStarValue)}
            onMouseEnter={() => setHoverRating(halfStarValue)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={savingRating}
            className={`absolute left-0 top-0 w-1/2 h-full z-10 ${
              savingRating ? 'cursor-wait' : 'cursor-pointer'
            }`}
            title={`Rate ${halfStarValue} stars`}
            style={{ background: 'transparent' }}
          />
          {/* Full star click area (right half) */}
          <button
            onClick={() => handleRatingClick(starValue)}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={savingRating}
            className={`absolute right-0 top-0 w-1/2 h-full z-10 ${
              savingRating ? 'cursor-wait' : 'cursor-pointer'
            }`}
            title={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
            style={{ background: 'transparent' }}
          />
          {/* Visual star display */}
          <span className={`text-3xl transition-all pointer-events-none relative ${
            savingRating ? 'opacity-50' : ''
          }`}>
            {isFull ? (
              <span className="text-amber-500">★</span>
            ) : isHalf ? (
              <span className="relative inline-block">
                <span className="text-gray-300">★</span>
                <span className="absolute left-0 top-0 text-amber-500 overflow-hidden" style={{ width: '50%' }}>★</span>
              </span>
            ) : (
              <span className="text-gray-300">☆</span>
            )}
          </span>
        </span>
      );
    }
    
    return (
      <div className="flex items-center gap-1">
        {stars}
        {currentRating > 0 && (
          <span className="ml-2 text-sm text-cookbook-brown font-body">
            ({currentRating}/5)
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-cookbook-aged rounded-full"></div>
          <div className="absolute inset-0 border-4 border-cookbook-accent rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p className="text-cookbook-brown font-display text-xl">Loading recipe...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-16">
        <p className="font-display text-2xl text-cookbook-brown">Recipe not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="cookbook-page p-8 relative">
        {/* Action Buttons - Improved Layout with Better Spacing and Accessibility */}
        <div className="absolute top-4 right-4 flex flex-col sm:flex-row gap-3 action-buttons no-print">
          {/* Primary Actions Group - With Labels on Desktop */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowShoppingListModal(true)}
              className="min-h-[44px] px-4 py-2 bg-cookbook-accent/10 hover:bg-cookbook-accent text-cookbook-accent hover:text-white transition-all rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:ring-offset-2 font-body font-medium flex items-center gap-2"
              title="Add ingredients to shopping list"
              aria-label="Add recipe ingredients to shopping list"
            >
              <span className="text-lg">🛒</span>
              <span className="hidden lg:inline">Shopping List</span>
            </button>
            <button
              onClick={() => navigate(`/edit/${recipe._id}`)}
              className="min-h-[44px] px-4 py-2 bg-cookbook-accent/10 hover:bg-cookbook-accent text-cookbook-accent hover:text-white transition-all rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:ring-offset-2 font-body font-medium flex items-center gap-2"
              title="Edit this recipe"
              aria-label="Edit recipe"
            >
              <span className="text-lg">🖊️</span>
              <span className="hidden lg:inline">Edit</span>
            </button>
            
            {/* Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                disabled={exporting}
                className={`min-h-[44px] px-4 py-2 bg-cookbook-accent/10 hover:bg-cookbook-accent text-cookbook-accent hover:text-white transition-all rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:ring-offset-2 font-body font-medium flex items-center gap-2 ${
                  exporting ? 'opacity-50 cursor-wait' : ''
                }`}
                title="Export recipe in different formats"
                aria-label="Export recipe"
              >
                <span className="text-lg">{exporting ? '⏳' : '📥'}</span>
                <span className="hidden lg:inline">Export</span>
              </button>
              
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border-2 border-cookbook-aged z-50">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full text-left px-4 py-2 text-sm font-body text-cookbook-darkbrown hover:bg-cookbook-cream transition-colors flex items-center gap-2"
                    >
                      <span className="text-lg">📄</span>
                      <span>Export as PDF</span>
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="w-full text-left px-4 py-2 text-sm font-body text-cookbook-darkbrown hover:bg-cookbook-cream transition-colors flex items-center gap-2"
                    >
                      <span className="text-lg">💾</span>
                      <span>Export as JSON</span>
                    </button>
                    <button
                      onClick={() => handleExport('markdown')}
                      className="w-full text-left px-4 py-2 text-sm font-body text-cookbook-darkbrown hover:bg-cookbook-cream transition-colors flex items-center gap-2"
                    >
                      <span className="text-lg">📝</span>
                      <span>Export as Markdown</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Actions Group - Icon Only */}
          <div className="flex gap-3">
            <button
              onClick={toggleLock}
              disabled={togglingLock}
              className={`w-11 h-11 rounded-full transition-all flex items-center justify-center shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                recipe.isLocked
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 focus:ring-amber-500'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 focus:ring-gray-500'
              } ${togglingLock ? 'opacity-50 cursor-wait' : ''}`}
              title={recipe.isLocked ? 'Unlock recipe to allow editing and deletion' : 'Lock recipe to prevent accidental changes'}
              aria-label={recipe.isLocked ? 'Unlock recipe' : 'Lock recipe'}
            >
              <span className="text-lg">{recipe.isLocked ? '🔒' : '🔓'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="w-11 h-11 rounded-full bg-cookbook-aged hover:bg-cookbook-brown text-cookbook-darkbrown hover:text-white transition-all flex items-center justify-center shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cookbook-brown focus:ring-offset-2"
              title="Print this recipe"
              aria-label="Print recipe"
            >
              <span className="text-lg">🖨️</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={recipe.isLocked}
              className={`w-11 h-11 rounded-full transition-all flex items-center justify-center shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                recipe.isLocked
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-red-100 hover:bg-red-600 text-red-600 hover:text-white focus:ring-red-500'
              }`}
              title={recipe.isLocked ? 'Unlock recipe first to delete it' : 'Delete this recipe permanently'}
              aria-label={recipe.isLocked ? 'Cannot delete locked recipe' : 'Delete recipe'}
            >
              <span className="text-lg">🗑️</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-display font-bold text-cookbook-text mb-3 leading-tight">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-lg text-cookbook-darkbrown font-body italic max-w-3xl mx-auto">
              {recipe.description}
            </p>
          )}
          <div className="decorative-divider mt-6"></div>
        </div>

        {/* Meta Information Bar */}
        <div className="mb-8 p-5 bg-cookbook-aged/30 rounded-lg border border-cookbook-brown space-y-4">
          {/* First Row: Times and Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-cookbook-accent uppercase tracking-wide font-body mb-1">⏰ Prep Time</div>
              <div className="text-xl font-display font-bold text-cookbook-text">{formatTime(recipe.prepTime)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-cookbook-accent uppercase tracking-wide font-body mb-1">🍳 Cook Time</div>
              <div className="text-xl font-display font-bold text-cookbook-text">{formatTime(recipe.cookTime)}</div>
            </div>
            {recipe.cuisine && (
              <div className="text-center">
                <div className="text-xs text-cookbook-accent uppercase tracking-wide font-body mb-1">🌍 Cuisine</div>
                <div className="text-lg font-display font-semibold text-cookbook-text">{recipe.cuisine}</div>
              </div>
            )}
            {recipe.dishType && (
              <div className="text-center">
                <div className="text-xs text-cookbook-accent uppercase tracking-wide font-body mb-1">🍴 Dish Type</div>
                <div className="text-lg font-display font-semibold text-cookbook-text">{recipe.dishType}</div>
              </div>
            )}
          </div>

          {/* Second Row: Interactive Elements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-cookbook-brown/20">
            <div className="text-center">
              <div className="text-xs text-cookbook-accent uppercase tracking-wide font-body mb-2">🍽️ Servings</div>
              {recipe.servings ? (
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={decreaseServings}
                    className="w-9 h-9 rounded-full bg-cookbook-brown hover:bg-cookbook-darkbrown text-white flex items-center justify-center text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cookbook-brown focus:ring-offset-2"
                    disabled={adjustedServings <= 1}
                    aria-label="Decrease servings"
                  >
                    −
                  </button>
                  <span className="text-2xl font-display font-bold text-cookbook-text min-w-[3rem]">
                    {adjustedServings}
                  </span>
                  <button
                    onClick={increaseServings}
                    className="w-9 h-9 rounded-full bg-cookbook-brown hover:bg-cookbook-darkbrown text-white flex items-center justify-center text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cookbook-brown focus:ring-offset-2"
                    aria-label="Increase servings"
                  >
                    +
                  </button>
                  {adjustedServings !== recipe.servings && (
                    <button
                      onClick={resetServings}
                      className="text-sm text-cookbook-accent hover:text-cookbook-brown font-body ml-2 underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-2xl font-display font-bold text-cookbook-text">N/A</div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-cookbook-accent uppercase tracking-wide font-body mb-2">⭐ Rating</div>
              <div className="flex justify-center">
                {renderInteractiveStars(recipe.rating)}
              </div>
              <div className="text-xs text-cookbook-accent/70 font-body mt-2 italic">
                Click to rate
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {recipe.tags.map((tag, index) => (
              <span key={index} className="vintage-badge px-3 py-1">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Two Column Layout - Cookbook Style */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Ingredients */}
          <div>
            <h2 className="text-3xl font-display font-bold text-cookbook-text mb-4 pb-2 border-b-2 border-cookbook-brown">
              Ingredients
              {adjustedServings !== recipe.servings && (
                <span className="block text-sm font-body font-normal text-cookbook-brown italic mt-1">
                  (adjusted for {adjustedServings} servings)
                </span>
              )}
            </h2>
            <ul className="space-y-3">
              {recipe.ingredients && recipe.ingredients.map((ingredient, index) => {
                const scaledIng = scaleIngredient(ingredient);
                return (
                  <li key={index} className="flex items-start group">
                    <span className="text-cookbook-accent mr-3 text-lg group-hover:scale-125 transition-transform">✓</span>
                    <span className="font-body text-cookbook-text">
                      {scaledIng.amount && <span className="font-semibold text-cookbook-brown">{scaledIng.amount} </span>}
                      {scaledIng.unit && <span className="font-semibold text-cookbook-brown">{scaledIng.unit} </span>}
                      {scaledIng.name}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right Column - Instructions */}
          <div>
            <h2 className="text-3xl font-display font-bold text-cookbook-text mb-4 pb-2 border-b-2 border-cookbook-brown">
              Instructions
            </h2>
            <ol className="space-y-5">
              {recipe.instructions && recipe.instructions.map((step, index) => (
                <li key={index} className="flex gap-4 items-center">
                  <span className="step-number">
                    {index + 1}
                  </span>
                  <span className="font-body text-cookbook-text leading-relaxed flex-1">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Source */}
        {recipe.sourceUrl && (
          <div className="mb-8 p-4 bg-cookbook-aged/20 rounded-lg border border-cookbook-aged">
            <div className="text-sm text-cookbook-accent font-body font-semibold mb-2">📌 Recipe Source</div>
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cookbook-accent hover:text-cookbook-brown font-body break-all underline"
            >
              {recipe.sourceUrl}
            </a>
          </div>
        )}

        {/* Shopping List Modal */}
        {showShoppingListModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-cookbook-paper rounded-lg shadow-cookbook max-w-md w-full p-6 border-2 border-cookbook-aged">
              <h3 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
                🛒 Add to Shopping List
              </h3>
              <p className="text-cookbook-brown font-body mb-6">
                Create a shopping list with ingredients from <strong>{recipe.title}</strong>
                {adjustedServings !== recipe.servings && (
                  <span className="block text-sm text-cookbook-accent mt-2">
                    (scaled for {adjustedServings} servings)
                  </span>
                )}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleAddToShoppingList(false)}
                  disabled={addingToShoppingList}
                  className="w-full bg-cookbook-accent text-white px-6 py-3 rounded-lg hover:bg-cookbook-darkbrown transition-colors font-body font-medium shadow-card disabled:opacity-50"
                >
                  {addingToShoppingList ? '⏳ Creating...' : '📋 Create New List'}
                </button>
                <button
                  onClick={() => handleAddToShoppingList(true)}
                  disabled={addingToShoppingList}
                  className="w-full bg-cookbook-brown text-white px-6 py-3 rounded-lg hover:bg-cookbook-darkbrown transition-colors font-body font-medium shadow-card disabled:opacity-50"
                >
                  {addingToShoppingList ? '⏳ Adding...' : '➕ Add to Active List'}
                </button>
                <button
                  onClick={() => setShowShoppingListModal(false)}
                  disabled={addingToShoppingList}
                  className="w-full px-6 py-3 border-2 border-cookbook-aged rounded-lg hover:bg-cookbook-aged transition-colors font-body font-medium text-cookbook-darkbrown disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RecipeDetail;
