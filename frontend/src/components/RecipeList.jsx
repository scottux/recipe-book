import { useState, useEffect, useRef } from 'react';
import { recipeAPI, exportAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const RecipeList = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dishType: '',
    cuisine: '',
    rating: '',
    sortBy: 'createdAt',
    order: 'desc',
    search: '',
    ingredient: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    dishTypes: [],
    cuisines: []
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedRecipes, setSelectedRecipes] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  
  const exportDropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecipes();
    fetchFilterOptions();
  }, [filters]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showExportDropdown]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const params = {};
      Object.keys(filters).forEach(key => {
        if (filters[key]) params[key] = filters[key];
      });
      
      const response = await recipeAPI.getAll(params);
      setRecipes(response.data.data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await recipeAPI.getFilterOptions();
      setFilterOptions(response.data.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await recipeAPI.delete(id);
        fetchRecipes();
      } catch (error) {
        console.error('Error deleting recipe:', error);
      }
    }
  };

  const handleBatchDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedRecipes).map(id => recipeAPI.delete(id))
      );
      setSelectedRecipes(new Set());
      setShowDeleteModal(false);
      fetchRecipes();
    } catch (error) {
      console.error('Error batch deleting recipes:', error);
      alert('Some recipes could not be deleted. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkExport = async (format) => {
    setExporting(true);
    setShowExportDropdown(false);
    
    try {
      const recipeIds = Array.from(selectedRecipes);
      const response = await exportAPI.exportMultiple(recipeIds, format);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const count = recipeIds.length;
      link.download = `recipes_${count}_${format}_${timestamp}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Clear selection after successful export
      setSelectedRecipes(new Set());
    } catch (error) {
      console.error('Error exporting recipes:', error);
      alert('Failed to export recipes. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleFullBackup = async () => {
    if (!window.confirm('Export a complete backup of all your data (recipes, collections, meal plans, and shopping lists)?')) {
      return;
    }

    setBackingUp(true);

    try {
      const response = await exportAPI.exportFullBackup();
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      link.download = `recipe-book-backup-${timestamp}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Failed to create backup. Please try again.');
    } finally {
      setBackingUp(false);
    }
  };

  const toggleSelectRecipe = (id) => {
    const newSelected = new Set(selectedRecipes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecipes(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRecipes.size === recipes.length) {
      setSelectedRecipes(new Set());
    } else {
      setSelectedRecipes(new Set(recipes.map(r => r._id)));
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

  const renderStars = (rating) => {
    if (!rating) return null;
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isHalf = rating >= i - 0.5 && rating < i;
      const isFull = rating >= i;
      
      if (isFull) {
        stars.push(<span key={i} className="text-amber-500">★</span>);
      } else if (isHalf) {
        stars.push(
          <span key={i} className="relative inline-block">
            <span className="text-gray-300">★</span>
            <span className="absolute left-0 top-0 text-amber-500 overflow-hidden" style={{ width: '50%' }}>★</span>
          </span>
        );
      } else {
        stars.push(<span key={i} className="text-gray-300">☆</span>);
      }
    }
    
    return <span className="inline-flex">{stars}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="cookbook-page p-6">
        <h2 className="text-2xl font-display font-bold mb-4 text-cookbook-text border-b-2 border-cookbook-brown pb-2">
          Find a Recipe
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search by name..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border-2 border-cookbook-aged rounded-lg px-3 py-2 bg-white focus:border-cookbook-brown focus:outline-none focus:ring-2 focus:ring-cookbook-accent font-body"
          />
          
          <input
            type="text"
            placeholder="Search by ingredient..."
            value={filters.ingredient}
            onChange={(e) => setFilters({ ...filters, ingredient: e.target.value })}
            className="border-2 border-cookbook-aged rounded-lg px-3 py-2 bg-white focus:border-cookbook-brown focus:outline-none focus:ring-2 focus:ring-cookbook-accent font-body"
          />
          
          <select
            value={filters.dishType}
            onChange={(e) => setFilters({ ...filters, dishType: e.target.value })}
            className="border-2 border-cookbook-aged rounded-lg px-3 py-2 bg-white focus:border-cookbook-brown focus:outline-none focus:ring-2 focus:ring-cookbook-accent font-body"
          >
            <option value="">All Dish Types</option>
            {filterOptions.dishTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          <select
            value={filters.cuisine}
            onChange={(e) => setFilters({ ...filters, cuisine: e.target.value })}
            className="border-2 border-cookbook-aged rounded-lg px-3 py-2 bg-white focus:border-cookbook-brown focus:outline-none focus:ring-2 focus:ring-cookbook-accent font-body"
          >
            <option value="">All Cuisines</option>
            {filterOptions.cuisines.map(cuisine => (
              <option key={cuisine} value={cuisine}>{cuisine}</option>
            ))}
          </select>
          
          <select
            value={filters.rating}
            onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
            className="border-2 border-cookbook-aged rounded-lg px-3 py-2 bg-white focus:border-cookbook-brown focus:outline-none focus:ring-2 focus:ring-cookbook-accent font-body"
          >
            <option value="">All Ratings</option>
            <option value="4">4+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="2">2+ Stars</option>
          </select>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-4">
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="border-2 border-cookbook-aged rounded-lg px-3 py-2 pr-8 bg-white focus:border-cookbook-brown focus:outline-none font-body"
          >
            <option value="createdAt">Date Added</option>
            <option value="title">Title</option>
            <option value="rating">Rating</option>
            <option value="prepTime">Prep Time</option>
            <option value="cookTime">Cook Time</option>
          </select>
          
          <select
            value={filters.order}
            onChange={(e) => setFilters({ ...filters, order: e.target.value })}
            className="border-2 border-cookbook-aged rounded-lg px-3 py-2 pr-8 bg-white focus:border-cookbook-brown focus:outline-none font-body"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          
          <button
            onClick={() => setFilters({
              dishType: '',
              cuisine: '',
              rating: '',
              sortBy: 'createdAt',
              order: 'desc',
              search: '',
              ingredient: ''
            })}
            className="px-4 py-2 bg-cookbook-aged text-cookbook-darkbrown rounded-lg hover:bg-cookbook-brown hover:text-white transition-colors font-body font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* View Controls and Batch Actions */}
      {!loading && recipes.length > 0 && (
        <div className="cookbook-page p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: View Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-body text-cookbook-accent">View:</span>
              <div className="flex bg-white border-2 border-cookbook-aged rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 font-body font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-cookbook-accent text-white'
                      : 'text-cookbook-darkbrown hover:bg-cookbook-aged'
                  }`}
                >
                  ⊞ Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 font-body font-medium transition-colors border-l-2 border-cookbook-aged ${
                    viewMode === 'list'
                      ? 'bg-cookbook-accent text-white'
                      : 'text-cookbook-darkbrown hover:bg-cookbook-aged'
                  }`}
                >
                  ☰ List
                </button>
              </div>

              {/* Select All Toggle */}
              <button
                onClick={toggleSelectAll}
                className="px-4 py-2 bg-white border-2 border-cookbook-aged rounded-lg hover:bg-cookbook-aged transition-colors font-body font-medium text-cookbook-darkbrown"
              >
                {selectedRecipes.size === recipes.length ? '☑ Deselect All' : '☐ Select All'}
              </button>
            </div>

            {/* Right: Backup Button and Batch Actions */}
            <div className="flex items-center gap-3">
              {/* Full Backup Button - Always visible */}
              <button
                onClick={handleFullBackup}
                disabled={backingUp}
                className="px-4 py-2 bg-cookbook-darkbrown text-white rounded-lg hover:bg-black transition-colors font-body font-medium shadow-md disabled:opacity-50 flex items-center gap-2"
                title="Export complete backup of all data"
              >
                {backingUp ? (
                  <>⏳ Creating Backup...</>
                ) : (
                  <>💾 Backup All Data</>
                )}
              </button>

              {selectedRecipes.size > 0 && (
                <>
                  <span className="text-sm font-body text-cookbook-brown">
                    {selectedRecipes.size} of {recipes.length} selected
                  </span>
                  <button
                    onClick={() => setSelectedRecipes(new Set())}
                    className="px-3 py-2 bg-white border-2 border-cookbook-aged rounded-lg hover:bg-cookbook-aged transition-colors font-body text-sm text-cookbook-darkbrown"
                  >
                    ✕ Clear
                  </button>
                  
                  {/* Export Dropdown */}
                  <div className="relative" ref={exportDropdownRef}>
                    <button
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      disabled={exporting}
                      className="px-4 py-2 bg-cookbook-brown text-white rounded-lg hover:bg-cookbook-darkbrown transition-colors font-body font-medium shadow-md disabled:opacity-50 flex items-center gap-2"
                    >
                      {exporting ? (
                        <>⏳ Exporting...</>
                      ) : (
                        <>
                          📥 Export Selected ({selectedRecipes.size})
                          <span className="text-xs">▼</span>
                        </>
                      )}
                    </button>
                    
                    {showExportDropdown && !exporting && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-cookbook-brown rounded-lg shadow-xl z-10 overflow-hidden">
                        <button
                          onClick={() => handleBulkExport('pdf')}
                          className="w-full px-4 py-3 text-left font-body hover:bg-cookbook-cream transition-colors border-b border-cookbook-aged flex items-center gap-2"
                        >
                          <span>📄</span>
                          <span>PDF Format</span>
                        </button>
                        <button
                          onClick={() => handleBulkExport('json')}
                          className="w-full px-4 py-3 text-left font-body hover:bg-cookbook-cream transition-colors border-b border-cookbook-aged flex items-center gap-2"
                        >
                          <span>💾</span>
                          <span>JSON Format</span>
                        </button>
                        <button
                          onClick={() => handleBulkExport('markdown')}
                          className="w-full px-4 py-3 text-left font-body hover:bg-cookbook-cream transition-colors flex items-center gap-2"
                        >
                          <span>📝</span>
                          <span>Markdown Format</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 bg-cookbook-accent text-white rounded-lg hover:bg-cookbook-brown transition-colors font-body font-medium shadow-md"
                  >
                    🗑️ Delete Selected ({selectedRecipes.size})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recipe Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-cookbook-aged rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cookbook-accent rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-cookbook-accent font-display text-xl">Loading recipes...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="cookbook-page p-12 text-center max-w-lg mx-auto">
          <div className="text-6xl mb-4">📖</div>
          <h3 className="text-cookbook-accent font-display text-2xl mb-3">No recipes found</h3>
          <p className="text-cookbook-text font-body mb-6">
            {filters.search || filters.ingredient || filters.dishType || filters.cuisine || filters.rating
              ? "Try adjusting your filters to see more recipes."
              : "Your recipe collection is empty. Start building your cookbook!"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/add')}
              className="px-6 py-3 bg-cookbook-brown text-white rounded-lg hover:bg-cookbook-darkbrown transition-colors font-body font-medium shadow-md"
            >
              🖊️ Add Your First Recipe
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div
              key={recipe._id}
              className="recipe-card p-6 relative"
            >
              <div 
                className="flex-grow cursor-pointer"
                onClick={() => navigate(`/recipe/${recipe._id}`)}
              >
                {/* Recipe Title */}
                <h3 className="text-2xl font-display font-bold text-cookbook-text mb-3 line-clamp-2">
                  {recipe.title}
                </h3>

                {/* Description */}
                {recipe.description && (
                  <p className="text-sm text-cookbook-darkbrown font-body mb-4 line-clamp-2 italic">
                    {recipe.description}
                  </p>
                )}

                {/* Decorative divider */}
                <div className="decorative-divider"></div>

                {/* Meta Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="text-xs text-cookbook-accent uppercase tracking-wide font-body">Prep</div>
                    <div className="text-lg font-display font-semibold text-cookbook-text">
                      {formatTime(recipe.prepTime)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-cookbook-accent uppercase tracking-wide font-body">Cook</div>
                    <div className="text-lg font-display font-semibold text-cookbook-text">
                      {formatTime(recipe.cookTime)}
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {recipe.cuisine && (
                    <span className="vintage-badge">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.dishType && (
                    <span className="vintage-badge">
                      {recipe.dishType}
                    </span>
                  )}
                </div>

                {/* Rating */}
                {recipe.rating && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-amber-500 text-lg">{renderStars(recipe.rating)}</span>
                    <span className="text-sm text-cookbook-brown font-body">
                      {recipe.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-cookbook-aged justify-end items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectRecipe(recipe._id);
                  }}
                  className="text-cookbook-brown/60 hover:text-cookbook-brown transition-colors text-lg"
                  title={selectedRecipes.has(recipe._id) ? "Deselect recipe" : "Select recipe"}
                >
                  {selectedRecipes.has(recipe._id) ? '☑' : '☐'}
                </button>
                <div className="h-4 w-px bg-cookbook-aged"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/edit/${recipe._id}`);
                  }}
                  className="text-cookbook-brown/60 hover:text-cookbook-brown transition-colors text-lg"
                  title="Edit recipe"
                >
                  🖊️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(recipe._id);
                  }}
                  className="text-cookbook-brown/60 hover:text-red-600 transition-colors text-lg"
                  title="Delete recipe"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="cookbook-page overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cookbook-aged border-b-2 border-cookbook-brown">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRecipes.size === recipes.length && recipes.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded border-2 border-cookbook-brown text-cookbook-accent focus:ring-2 focus:ring-cookbook-accent cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-display font-bold text-cookbook-text">Recipe</th>
                  <th className="px-4 py-3 text-left font-display font-bold text-cookbook-text">Cuisine</th>
                  <th className="px-4 py-3 text-left font-display font-bold text-cookbook-text">Type</th>
                  <th className="px-4 py-3 text-left font-display font-bold text-cookbook-text">Time</th>
                  <th className="px-4 py-3 text-left font-display font-bold text-cookbook-text">Rating</th>
                  <th className="px-4 py-3 text-right font-display font-bold text-cookbook-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cookbook-aged">
                {recipes.map((recipe) => (
                  <tr
                    key={recipe._id}
                    className="hover:bg-cookbook-cream transition-colors cursor-pointer"
                    onClick={() => navigate(`/recipe/${recipe._id}`)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRecipes.has(recipe._id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectRecipe(recipe._id);
                        }}
                        className="w-5 h-5 rounded border-2 border-cookbook-brown text-cookbook-accent focus:ring-2 focus:ring-cookbook-accent cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-display font-semibold text-cookbook-text">{recipe.title}</div>
                      {recipe.description && (
                        <div className="text-xs text-cookbook-brown font-body line-clamp-1 mt-1">{recipe.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {recipe.cuisine ? (
                        <span className="vintage-badge text-xs">{recipe.cuisine}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {recipe.dishType ? (
                        <span className="vintage-badge text-xs">{recipe.dishType}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-body text-cookbook-text">
                        ⏱️ {formatTime(recipe.prepTime)} / {formatTime(recipe.cookTime)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {recipe.rating ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{renderStars(recipe.rating)}</span>
                          <span className="text-xs text-cookbook-brown font-body">{recipe.rating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit/${recipe._id}`);
                          }}
                          className="text-cookbook-brown/60 hover:text-cookbook-brown transition-colors"
                          title="Edit recipe"
                        >
                          🖊️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(recipe._id);
                          }}
                          className="text-cookbook-brown/60 hover:text-red-600 transition-colors"
                          title="Delete recipe"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border-4 border-cookbook-brown">
            <h3 className="text-2xl font-display font-bold text-cookbook-text mb-4">
              ⚠️ Delete {selectedRecipes.size} Recipe{selectedRecipes.size > 1 ? 's' : ''}?
            </h3>
            <p className="text-cookbook-brown font-body mb-4">
              This action cannot be undone. The following recipe{selectedRecipes.size > 1 ? 's' : ''} will be permanently deleted:
            </p>
            <div className="bg-cookbook-cream rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
              <ul className="space-y-2">
                {Array.from(selectedRecipes).map(id => {
                  const recipe = recipes.find(r => r._id === id);
                  return recipe ? (
                    <li key={id} className="flex items-center gap-2 text-cookbook-text font-body">
                      <span className="text-red-500">•</span>
                      <span className="font-semibold">{recipe.title}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 bg-white border-2 border-cookbook-aged rounded-lg hover:bg-cookbook-aged transition-colors font-body font-medium text-cookbook-darkbrown disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-body font-medium shadow-md disabled:opacity-50"
              >
                {deleting ? '⏳ Deleting...' : '🗑️ Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeList;