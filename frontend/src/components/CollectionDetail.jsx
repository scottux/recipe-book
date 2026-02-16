import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collectionAPI, recipeAPI, exportAPI } from '../services/api';

export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadCollection();
  }, [id]);

  const loadCollection = async () => {
    try {
      setLoading(true);
      const response = await collectionAPI.getById(id);
      // Backend returns { success, data: collection }
      setCollection(response.data.data || response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load collection');
      console.error('Error loading collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRecipe = async (recipeId) => {
    if (!confirm('Remove this recipe from the collection?')) return;

    try {
      await collectionAPI.removeRecipe(id, recipeId);
      loadCollection();
    } catch (err) {
      alert('Failed to remove recipe');
      console.error('Error removing recipe:', err);
    }
  };

  const handleDeleteCollection = async () => {
    try {
      await collectionAPI.delete(id);
      navigate('/collections');
    } catch (err) {
      alert('Failed to delete collection');
      console.error('Error deleting collection:', err);
    }
  };

  const handleExportCookbook = async () => {
    if (recipeCount === 0) {
      alert('Cannot export an empty collection');
      return;
    }

    setExporting(true);

    try {
      const response = await exportAPI.exportCollectionCookbook(id);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const safeName = collection.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `${safeName}-cookbook-${timestamp}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting cookbook:', err);
      alert('Failed to export cookbook. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cookbook-accent"></div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-lg font-body">
          {error || 'Collection not found'}
        </div>
        <Link to="/collections" className="inline-block mt-4 text-cookbook-accent hover:text-cookbook-darkbrown font-body">
          ← Back to Collections
        </Link>
      </div>
    );
  }

  const recipeCount = collection.recipes?.length || 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/collections" className="text-cookbook-accent hover:text-cookbook-darkbrown inline-flex items-center gap-2 mb-4 font-body font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Collections
        </Link>

        <div 
          className="rounded-lg p-8 shadow-cookbook border-2 border-cookbook-aged"
          style={{ backgroundColor: collection.color || '#8B4513' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="text-6xl">{collection.icon || '📚'}</span>
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-2">{collection.name}</h1>
                {collection.description && (
                  <p className="text-lg opacity-90">{collection.description}</p>
                )}
                <p className="text-sm opacity-75 mt-2">
                  {recipeCount} {recipeCount === 1 ? 'recipe' : 'recipes'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddRecipeModal(true)}
                className="bg-white text-cookbook-darkbrown px-4 py-2 rounded-lg hover:bg-cookbook-cream transition-colors flex items-center gap-2 font-body font-medium shadow-card"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Recipe
              </button>
              <button
                onClick={handleExportCookbook}
                disabled={exporting || recipeCount === 0}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-body font-medium"
                title={recipeCount === 0 ? "Add recipes to export" : "Export as PDF Cookbook"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exporting ? 'Exporting...' : 'Export Cookbook'}
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors font-body"
                title="Edit Collection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 bg-opacity-80 text-white px-4 py-2 rounded-lg hover:bg-opacity-100 transition-colors font-body"
                title="Delete Collection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recipes Grid */}
      {recipeCount === 0 ? (
        <div className="text-center py-16 bg-cookbook-paper rounded-lg shadow-cookbook border-2 border-cookbook-aged">
          <div className="text-6xl mb-4">🍽️</div>
          <h3 className="text-xl font-display font-semibold text-cookbook-darkbrown mb-2">
            No recipes in this collection yet
          </h3>
          <p className="text-cookbook-accent mb-6 font-body">
            Start adding recipes to build your cookbook
          </p>
          <button
            onClick={() => setShowAddRecipeModal(true)}
            className="bg-cookbook-accent text-white px-6 py-3 rounded-lg hover:bg-cookbook-darkbrown transition-colors font-body font-medium shadow-card"
          >
            Add Your First Recipe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collection.recipes.map((recipe) => (
            <RecipeCard
              key={recipe._id}
              recipe={recipe}
              onRemove={() => handleRemoveRecipe(recipe._id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showEditModal && (
        <EditCollectionModal
          collection={collection}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            setShowEditModal(false);
            loadCollection();
          }}
        />
      )}

      {showAddRecipeModal && (
        <AddRecipeModal
          collectionId={id}
          onClose={() => setShowAddRecipeModal(false)}
          onAdded={() => {
            setShowAddRecipeModal(false);
            loadCollection();
          }}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          collectionName={collection.name}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteCollection}
        />
      )}
    </div>
  );
}

function RecipeCard({ recipe, onRemove }) {
  return (
    <div className="bg-cookbook-paper rounded-lg shadow-card hover:shadow-cookbook transition-shadow overflow-hidden group border-2 border-cookbook-aged">
      <Link to={`/recipe/${recipe._id}`} className="block">
        {recipe.images?.[0] ? (
          <img
            src={recipe.images[0]}
            alt={recipe.title}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-cookbook-cream flex items-center justify-center text-cookbook-accent text-6xl">
            🍽️
          </div>
        )}
      </Link>

      <div className="p-4">
        <Link to={`/recipe/${recipe._id}`}>
          <h3 className="font-display font-bold text-lg text-cookbook-darkbrown hover:text-cookbook-accent mb-2 transition-colors">
            {recipe.title}
          </h3>
        </Link>

        <div className="flex items-center justify-between text-sm text-cookbook-accent font-body">
          <div className="flex items-center gap-4">
            {recipe.prepTime && (
              <span className="flex items-center gap-1">
                ⏱️ {recipe.prepTime}m
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                👥 {recipe.servings}
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
            className="text-red-600 hover:text-red-700 text-xs font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCollectionModal({ collection, onClose, onUpdated }) {
  const [formData, setFormData] = useState({
    name: collection.name,
    description: collection.description || '',
    icon: collection.icon || '📚',
    color: collection.color || '#8B4513'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await collectionAPI.update(collection._id, formData);
      onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update collection');
      setLoading(false);
    }
  };

  const iconOptions = ['📚', '🍽️', '🎉', '🥗', '🍪', '🌮', '🍕', '🍜', '🥘', '🍱', '🧁', '☕'];
  const colorOptions = [
    { name: 'Brown', value: '#8B4513' },
    { name: 'Red', value: '#DC2626' },
    { name: 'Orange', value: '#EA580C' },
    { name: 'Yellow', value: '#CA8A04' },
    { name: 'Green', value: '#16A34A' },
    { name: 'Blue', value: '#2563EB' },
    { name: 'Purple', value: '#9333EA' },
    { name: 'Pink', value: '#DB2777' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-cookbook-paper rounded-lg max-w-md w-full p-6 border-2 border-cookbook-aged shadow-cookbook">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown">Edit Collection</h2>
          <button onClick={onClose} className="text-cookbook-accent hover:text-cookbook-darkbrown">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-body">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
              Collection Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
              rows={3}
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`text-3xl p-2 rounded-lg border-2 transition-colors ${
                    formData.icon === icon ? 'border-cookbook-accent bg-cookbook-cream' : 'border-cookbook-aged'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">Color</label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`p-3 rounded-lg border-2 ${
                    formData.color === color.value ? 'border-cookbook-accent ring-2 ring-cookbook-aged' : 'border-cookbook-aged'
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {formData.color === color.value && (
                    <svg className="w-5 h-5 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border-2 border-cookbook-aged rounded-lg hover:bg-cookbook-cream font-body font-medium text-cookbook-darkbrown"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-cookbook-accent text-white px-4 py-2 rounded-lg hover:bg-cookbook-darkbrown disabled:opacity-50 font-body font-medium shadow-card"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddRecipeModal({ collectionId, onClose, onAdded }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const response = await recipeAPI.getAll();
      // API returns { success, data: [...recipes], pagination }
      // So response.data is the full response object, and response.data.data is the recipes array
      setRecipes(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load recipes:', err);
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipe = async (recipeId) => {
    setAdding(true);
    setError(null);

    try {
      await collectionAPI.addRecipe(collectionId, recipeId);
      onAdded();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add recipe');
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-cookbook-paper rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col border-2 border-cookbook-aged shadow-cookbook">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown">Add Recipe to Collection</h2>
          <button onClick={onClose} className="text-cookbook-accent hover:text-cookbook-darkbrown">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 font-body">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cookbook-accent"></div>
          </div>
        ) : !recipes || recipes.length === 0 ? (
          <div className="text-center py-12 text-cookbook-accent font-body">
            No recipes available to add
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <div className="grid grid-cols-1 gap-3">
              {recipes.map((recipe) => (
                <button
                  key={recipe._id}
                  onClick={() => handleAddRecipe(recipe._id)}
                  disabled={adding}
                  className="flex items-center gap-4 p-3 border-2 border-cookbook-aged rounded-lg hover:border-cookbook-accent hover:bg-cookbook-cream transition-colors text-left disabled:opacity-50"
                >
                  {recipe.images?.[0] ? (
                    <img
                      src={recipe.images[0]}
                      alt={recipe.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-cookbook-cream rounded flex items-center justify-center text-2xl">
                      🍽️
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-cookbook-darkbrown">{recipe.title}</h3>
                    <p className="text-sm text-cookbook-accent font-body">
                      {recipe.prepTime && `${recipe.prepTime}m`}
                      {recipe.servings && ` • ${recipe.servings} servings`}
                    </p>
                  </div>
                  <svg className="w-6 h-6 text-cookbook-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteConfirmModal({ collectionName, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-cookbook-paper rounded-lg max-w-md w-full p-6 border-2 border-cookbook-aged shadow-cookbook">
        <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">Delete Collection?</h2>
        <p className="text-cookbook-accent mb-6 font-body">
          Are you sure you want to delete "<strong className="text-cookbook-darkbrown">{collectionName}</strong>"? This will remove the collection but won't delete the recipes themselves.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border-2 border-cookbook-aged rounded-lg hover:bg-cookbook-cream font-body font-medium text-cookbook-darkbrown"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-body font-medium shadow-card"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Collection'}
          </button>
        </div>
      </div>
    </div>
  );
}
