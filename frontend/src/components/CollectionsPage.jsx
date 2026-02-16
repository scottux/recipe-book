import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collectionAPI } from '../services/api';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const response = await collectionAPI.getAll();
      setCollections(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load collections');
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = () => {
    setShowCreateModal(true);
  };

  const handleCollectionCreated = () => {
    setShowCreateModal(false);
    loadCollections();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cookbook-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-cookbook-darkbrown">My Collections</h1>
          <p className="mt-2 text-cookbook-accent font-body">
            Organize your recipes into themed cookbooks
          </p>
        </div>
        <button
          onClick={handleCreateCollection}
          className="bg-cookbook-accent text-white px-6 py-3 rounded-lg hover:bg-cookbook-darkbrown transition-all shadow-card hover:shadow-card-hover font-body font-medium flex items-center gap-2 justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Collection
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-body">
          {error}
        </div>
      )}

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div className="text-center py-16 bg-cookbook-paper rounded-lg border-2 border-cookbook-aged shadow-card">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-display font-semibold text-cookbook-darkbrown mb-2">
            No collections yet
          </h3>
          <p className="text-cookbook-accent font-body mb-6 max-w-md mx-auto">
            Create your first collection to start organizing your recipes
          </p>
          <button
            onClick={handleCreateCollection}
            className="bg-cookbook-accent text-white px-6 py-3 rounded-lg hover:bg-cookbook-darkbrown transition-all shadow-card hover:shadow-card-hover font-body font-medium"
          >
            Create Your First Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <CollectionCard
              key={collection._id}
              collection={collection}
              onUpdate={loadCollections}
            />
          ))}
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreateModal && (
        <CreateCollectionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCollectionCreated}
        />
      )}
    </div>
  );
}

function CollectionCard({ collection, onUpdate }) {
  const recipeCount = collection.recipeCount || 0;
  const previewRecipes = collection.recipes?.slice(0, 3) || [];

  return (
    <Link
      to={`/collections/${collection._id}`}
      className="block bg-cookbook-paper rounded-lg shadow-card hover:shadow-card-hover transition-all overflow-hidden border-2 border-cookbook-aged"
    >
      {/* Collection Header */}
      <div
        className="p-6"
        style={{ backgroundColor: collection.color || '#8B4513' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{collection.icon || '📚'}</span>
            <div className="text-white">
              <h3 className="text-xl font-bold">{collection.name}</h3>
              <p className="text-sm opacity-90">
                {recipeCount} {recipeCount === 1 ? 'recipe' : 'recipes'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Previews */}
      <div className="p-4">
        {collection.description && (
          <p className="text-cookbook-accent text-sm mb-4 line-clamp-2 font-body">
            {collection.description}
          </p>
        )}

        {previewRecipes.length > 0 ? (
          <div className="flex gap-2">
            {previewRecipes.map((recipe) => (
              <div
                key={recipe._id}
                className="w-20 h-20 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0"
              >
                {recipe.images?.[0] ? (
                  <img
                    src={recipe.images[0]}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-cookbook-brown text-2xl">
                    🍽️
                  </div>
                )}
              </div>
            ))}
            {recipeCount > 3 && (
              <div className="w-20 h-20 rounded-lg bg-cookbook-cream border border-cookbook-aged flex items-center justify-center text-cookbook-accent text-sm font-body font-medium">
                +{recipeCount - 3}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-cookbook-brown text-sm font-body">
            No recipes yet
          </div>
        )}

        <div className="mt-4 text-xs text-cookbook-accent font-body">
          Updated {new Date(collection.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}

function CreateCollectionModal({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📚',
    color: '#8B4513'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await collectionAPI.create(formData);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create collection');
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
          <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown">Create Collection</h2>
          <button
            onClick={onClose}
            className="text-cookbook-brown hover:text-cookbook-darkbrown"
          >
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
              placeholder="e.g., Weeknight Dinners"
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
              placeholder="Optional description..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
              Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`text-3xl p-2 rounded-lg border-2 transition-colors ${
                    formData.icon === icon
                      ? 'border-cookbook-accent bg-cookbook-cream'
                      : 'border-cookbook-aged hover:border-cookbook-brown'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
              Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    formData.color === color.value
                      ? 'border-cookbook-accent ring-2 ring-cookbook-cream'
                      : 'border-cookbook-aged'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
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
              className="flex-1 px-4 py-2 border-2 border-cookbook-aged rounded-lg hover:bg-cookbook-cream transition-colors font-body font-medium text-cookbook-darkbrown"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-cookbook-accent text-white px-4 py-2 rounded-lg hover:bg-cookbook-darkbrown transition-colors disabled:opacity-50 font-body font-medium shadow-card"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}