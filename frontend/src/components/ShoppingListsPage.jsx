import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shoppingListAPI, exportAPI } from '../services/api';

export default function ShoppingListsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      const response = await shoppingListAPI.getAll();
      setLists(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load shopping lists');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this shopping list?')) return;
    
    try {
      await shoppingListAPI.delete(id);
      setLists(lists.filter(l => l._id !== id));
    } catch (err) {
      alert('Failed to delete shopping list');
    }
  };

  const handleExport = async (list, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await exportAPI.exportShoppingList(list._id);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const safeName = list.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `${safeName}-shopping-list-${timestamp}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting shopping list:', err);
      alert('Failed to export shopping list. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cookbook-accent"></div>
      </div>
    );
  }

  const activeList = lists.find(l => l.isActive);
  const otherLists = lists.filter(l => !l.isActive);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-cookbook-darkbrown">
            Shopping Lists
          </h1>
          <p className="mt-2 text-cookbook-accent font-body">
            Organize your grocery shopping from recipes and meal plans
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-cookbook-accent text-white px-6 py-3 rounded-lg hover:bg-cookbook-darkbrown transition-all shadow-card hover:shadow-card-hover font-body font-medium flex items-center gap-2 justify-center"
        >
          <span className="text-xl">🛒</span>
          Create Shopping List
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-body">
          {error}
        </div>
      )}

      {lists.length === 0 ? (
        <div className="text-center py-16 bg-cookbook-paper rounded-lg border-2 border-cookbook-aged shadow-card">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="text-xl font-display font-semibold text-cookbook-darkbrown mb-2">
            No shopping lists yet
          </h3>
          <p className="text-cookbook-accent font-body mb-6 max-w-md mx-auto">
            Create a shopping list from your recipes or meal plans
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cookbook-accent text-white px-6 py-3 rounded-lg hover:bg-cookbook-darkbrown transition-all shadow-card hover:shadow-card-hover font-body font-medium"
          >
            Create Your First List
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active List */}
          {activeList && (
            <div>
              <h2 className="text-xl font-display font-bold text-cookbook-darkbrown mb-4">Active List</h2>
              <ShoppingListCard list={activeList} onDelete={handleDelete} onExport={handleExport} isActive={true} />
            </div>
          )}

          {/* Other Lists */}
          {otherLists.length > 0 && (
            <div>
              <h2 className="text-xl font-display font-bold text-cookbook-darkbrown mb-4">Previous Lists</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherLists.map(list => (
                  <ShoppingListCard key={list._id} list={list} onDelete={handleDelete} onExport={handleExport} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateListModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadLists}
        />
      )}
    </div>
  );
}

function ShoppingListCard({ list, onDelete, onExport, isActive }) {
  const completionPercentage = list.completionPercentage || 0;
  const itemCount = list.items?.length || 0;
  const checkedCount = list.checkedCount || 0;

  return (
    <Link
      to={`/shopping-lists/${list._id}`}
      className="block bg-cookbook-paper rounded-lg shadow-card hover:shadow-card-hover transition-all border-2 border-cookbook-aged p-6"
    >
      {isActive && (
        <div className="inline-block bg-cookbook-accent text-white text-xs font-body font-bold px-3 py-1 rounded-full mb-3">
          ACTIVE
        </div>
      )}
      
      <h3 className="text-xl font-display font-bold text-cookbook-darkbrown mb-2">
        {list.name}
      </h3>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm font-body text-cookbook-accent mb-1">
          <span>{checkedCount} of {itemCount} items</span>
          <span>{completionPercentage}%</span>
        </div>
        <div className="w-full bg-cookbook-aged rounded-full h-2">
          <div
            className="bg-cookbook-accent h-2 rounded-full transition-all"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm font-body text-cookbook-brown">
        <span>
          {list.completedAt
            ? `Completed ${new Date(list.completedAt).toLocaleDateString()}`
            : `Updated ${new Date(list.updatedAt).toLocaleDateString()}`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={(e) => onExport(list, e)}
            className="text-cookbook-accent hover:text-cookbook-darkbrown transition-colors"
            title="Export as PDF"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete(list._id);
            }}
            className="text-red-600 hover:text-red-800 transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
    </Link>
  );
}

function CreateListModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await shoppingListAPI.create({ name, items: [], isActive: true });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create shopping list');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-cookbook-paper rounded-lg max-w-md w-full p-6 border-2 border-cookbook-aged shadow-cookbook">
        <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-6">
          Create Shopping List
        </h2>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-body mb-4">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
              List Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
              placeholder="e.g., Weekly Groceries"
              required
              maxLength={100}
            />
          </div>

          <div className="flex gap-3">
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
              {loading ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}