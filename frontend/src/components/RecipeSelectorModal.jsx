import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * RecipeSelectorModal - Enhanced recipe selection with search and filtering
 * 
 * Provides an improved UX for selecting recipes when adding meals to a meal plan.
 * Features: search by title, filter by tags/cuisine, recipe preview cards
 */
export default function RecipeSelectorModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  recipes = [],
  selectedMealType = 'dinner',
  selectedDate = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [servings, setServings] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);

  const mealTypeIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎'
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedTag('');
      setSelectedCuisine('');
      setServings('');
      setNotes('');
      setSelectedRecipeId(null);
    }
  }, [isOpen]);

  // Extract unique tags and cuisines from recipes
  const { allTags, allCuisines } = useMemo(() => {
    const tags = new Set();
    const cuisines = new Set();
    
    recipes.forEach(recipe => {
      recipe.tags?.forEach(tag => tags.add(tag));
      if (recipe.cuisine) cuisines.add(recipe.cuisine);
    });
    
    return {
      allTags: Array.from(tags).sort(),
      allCuisines: Array.from(cuisines).sort()
    };
  }, [recipes]);

  // Filter recipes based on search and filters
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      // Search filter (title and description)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = recipe.title?.toLowerCase().includes(search);
        const matchesDesc = recipe.description?.toLowerCase().includes(search);
        if (!matchesTitle && !matchesDesc) return false;
      }
      
      // Tag filter
      if (selectedTag && !recipe.tags?.includes(selectedTag)) {
        return false;
      }
      
      // Cuisine filter
      if (selectedCuisine && recipe.cuisine !== selectedCuisine) {
        return false;
      }
      
      return true;
    });
  }, [recipes, searchTerm, selectedTag, selectedCuisine]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedRecipeId) {
      alert('Please select a recipe');
      return;
    }
    
    onSelect({
      recipeId: selectedRecipeId,
      servings: servings ? parseInt(servings) : null,
      notes: notes.trim() || ''
    });
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

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFull = rating >= i;
      const isHalf = rating >= i - 0.5 && rating < i;
      
      stars.push(
        <span key={i} className="text-lg">
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
      );
    }
    return <div className="flex">{stars}</div>;
  };

  if (!isOpen) return null;

  const selectedRecipe = recipes.find(r => r._id === selectedRecipeId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-cookbook-paper rounded-lg shadow-cookbook max-w-4xl w-full border-2 border-cookbook-aged my-8">
        {/* Header */}
        <div className="border-b-2 border-cookbook-aged p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-display font-bold text-cookbook-darkbrown flex items-center gap-2">
              <span>{mealTypeIcons[selectedMealType]}</span>
              Add {selectedMealType?.charAt(0).toUpperCase() + selectedMealType?.slice(1)} Recipe
            </h2>
            <button
              onClick={onClose}
              className="text-cookbook-accent hover:text-cookbook-darkbrown transition-colors text-3xl leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          {selectedDate && (
            <p className="text-sm text-cookbook-accent font-body">
              📅 {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Filters Section */}
          <div className="p-6 border-b-2 border-cookbook-aged bg-cookbook-aged/20 space-y-4">
            {/* Search Bar */}
            <div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search recipes by name or description..."
                className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
                  Filter by Tag
                </label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent bg-white"
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
                  Filter by Cuisine
                </label>
                <select
                  value={selectedCuisine}
                  onChange={(e) => setSelectedCuisine(e.target.value)}
                  className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent bg-white"
                >
                  <option value="">All Cuisines</option>
                  {allCuisines.map(cuisine => (
                    <option key={cuisine} value={cuisine}>{cuisine}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-cookbook-accent font-body">
              Showing {filteredRecipes.length} of {recipes.length} recipes
              {(searchTerm || selectedTag || selectedCuisine) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTag('');
                    setSelectedCuisine('');
                  }}
                  className="ml-2 text-cookbook-accent hover:text-cookbook-darkbrown underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Recipe Cards Grid */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {filteredRecipes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🍳</div>
                <p className="text-cookbook-accent font-body">
                  {searchTerm || selectedTag || selectedCuisine 
                    ? 'No recipes match your filters. Try adjusting your search.'
                    : 'No recipes available. Add some recipes first!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecipes.map(recipe => (
                  <div
                    key={recipe._id}
                    onClick={() => setSelectedRecipeId(recipe._id)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedRecipeId === recipe._id
                        ? 'border-cookbook-accent bg-cookbook-accent/10 shadow-card'
                        : 'border-cookbook-aged hover:border-cookbook-accent/50 hover:shadow-sm'
                    }`}
                  >
                    {/* Recipe Header */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-display font-bold text-lg text-cookbook-darkbrown flex-1 leading-tight">
                        {recipe.title}
                      </h3>
                      {selectedRecipeId === recipe._id && (
                        <span className="text-cookbook-accent text-2xl leading-none ml-2">✓</span>
                      )}
                    </div>

                    {/* Description */}
                    {recipe.description && (
                      <p className="text-sm text-cookbook-accent font-body mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}

                    {/* Recipe Metadata */}
                    <div className="space-y-2 text-sm font-body">
                      {/* Times */}
                      <div className="flex gap-4">
                        {recipe.prepTime && (
                          <span className="text-cookbook-brown">⏰ Prep: {formatTime(recipe.prepTime)}</span>
                        )}
                        {recipe.cookTime && (
                          <span className="text-cookbook-brown">🍳 Cook: {formatTime(recipe.cookTime)}</span>
                        )}
                      </div>

                      {/* Servings & Rating */}
                      <div className="flex items-center justify-between">
                        {recipe.servings && (
                          <span className="text-cookbook-accent">🍽️ {recipe.servings} servings</span>
                        )}
                        {recipe.rating > 0 && (
                          <div className="flex items-center gap-1">
                            {renderStars(recipe.rating)}
                            <span className="text-cookbook-accent ml-1">({recipe.rating})</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {recipe.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-cookbook-aged/50 text-cookbook-brown rounded font-body"
                            >
                              {tag}
                            </span>
                          ))}
                          {recipe.tags.length > 3 && (
                            <span className="text-xs px-2 py-1 text-cookbook-accent font-body">
                              +{recipe.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Recipe Details & Form */}
          {selectedRecipe && (
            <div className="p-6 border-t-2 border-cookbook-aged bg-cookbook-aged/10">
              <h3 className="font-display font-bold text-lg text-cookbook-darkbrown mb-4">
                📋 Meal Details for: {selectedRecipe.title}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
                    Servings (optional)
                  </label>
                  <input
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    min="1"
                    placeholder={`Default: ${selectedRecipe.servings || 'N/A'}`}
                    className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent"
                  />
                  <p className="text-xs text-cookbook-accent mt-1 font-body">
                    Leave blank to use recipe's default servings
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="2"
                    placeholder="Any special notes..."
                    maxLength={500}
                    className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="p-6 border-t-2 border-cookbook-aged flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-cookbook-darkbrown hover:bg-cookbook-cream transition-colors rounded-lg font-body font-medium border-2 border-cookbook-aged"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedRecipeId}
              className="bg-cookbook-accent text-white px-6 py-2 rounded-lg hover:bg-cookbook-darkbrown transition-colors font-body font-medium shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Recipe to {selectedMealType?.charAt(0).toUpperCase() + selectedMealType?.slice(1)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

RecipeSelectorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  recipes: PropTypes.array,
  selectedMealType: PropTypes.string,
  selectedDate: PropTypes.string
};