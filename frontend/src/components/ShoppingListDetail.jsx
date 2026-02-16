import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { shoppingListAPI, exportAPI } from '../services/api';

export default function ShoppingListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadList();
  }, [id]);

  const loadList = async () => {
    try {
      setLoading(true);
      const response = await shoppingListAPI.getById(id);
      setList(response.data);
      setNewName(response.data.name);
      setError(null);
    } catch (err) {
      setError('Failed to load shopping list');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (itemId) => {
    const item = list.items.find(i => i._id === itemId);
    try {
      const updated = await shoppingListAPI.updateItem(id, itemId, {
        checked: !item.checked
      });
      setList(updated.data);
    } catch (err) {
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const updated = await shoppingListAPI.deleteItem(id, itemId);
      setList(updated.data);
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    try {
      const updated = await shoppingListAPI.addItem(id, {
        ingredient: newItemText.trim(),
        quantity: 1,
        unit: 'item',
        category: 'Other'
      });
      setList(updated.data);
      setNewItemText('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add item');
      console.error('Add item error:', err);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === list.name) {
      setEditingName(false);
      setNewName(list.name);
      return;
    }

    try {
      const updated = await shoppingListAPI.update(id, { name: newName.trim() });
      setList(updated.data);
      setEditingName(false);
    } catch (err) {
      alert('Failed to update name');
      setNewName(list.name);
      setEditingName(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const updated = await shoppingListAPI.update(id, { isActive: !list.isActive });
      setList(updated.data);
    } catch (err) {
      alert('Failed to update list status');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this shopping list? This action cannot be undone.')) return;

    try {
      await shoppingListAPI.delete(id);
      navigate('/shopping-lists');
    } catch (err) {
      alert('Failed to delete shopping list');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await exportAPI.exportShoppingList(id);
      
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

  if (error || !list) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-body">
          {error || 'Shopping list not found'}
        </div>
        <Link
          to="/shopping-lists"
          className="text-cookbook-accent hover:text-cookbook-darkbrown font-body"
        >
          ← Back to Shopping Lists
        </Link>
      </div>
    );
  }

  const checkedCount = list.items.filter(i => i.checked).length;
  const totalCount = list.items.length;
  const completionPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/shopping-lists"
          className="text-cookbook-accent hover:text-cookbook-darkbrown font-body mb-4 inline-block"
        >
          ← Back to Shopping Lists
        </Link>

        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="flex-1">
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleUpdateName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateName();
                    if (e.key === 'Escape') {
                      setEditingName(false);
                      setNewName(list.name);
                    }
                  }}
                  className="text-3xl font-display font-bold text-cookbook-darkbrown border-2 border-cookbook-accent rounded-lg px-3 py-1 flex-1"
                  autoFocus
                  maxLength={100}
                />
              </div>
            ) : (
              <h1
                onClick={() => setEditingName(true)}
                className="text-3xl md:text-4xl font-display font-bold text-cookbook-darkbrown cursor-pointer hover:text-cookbook-accent transition-colors"
                title="Click to edit"
              >
                {list.name}
                {list.isActive && (
                  <span className="ml-3 text-xs bg-cookbook-accent text-white px-3 py-1 rounded-full font-body font-bold">
                    ACTIVE
                  </span>
                )}
              </h1>
            )}
            <p className="mt-2 text-cookbook-accent font-body">
              {checkedCount} of {totalCount} items checked • {completionPercentage}% complete
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleToggleActive}
              className={`px-4 py-2 rounded-lg transition-colors font-body font-medium ${
                list.isActive
                  ? 'bg-cookbook-aged text-cookbook-darkbrown hover:bg-cookbook-brown'
                  : 'bg-cookbook-accent text-white hover:bg-cookbook-darkbrown'
              }`}
            >
              {list.isActive ? 'Mark Inactive' : 'Mark Active'}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-cookbook-accent text-white px-4 py-2 rounded-lg hover:bg-cookbook-darkbrown transition-colors disabled:opacity-50 font-body font-medium flex items-center gap-2"
              title="Export as PDF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-body font-medium"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-cookbook-paper rounded-lg shadow-card p-6 mb-6 border-2 border-cookbook-aged">
        <div className="w-full bg-cookbook-aged rounded-full h-3">
          <div
            className="bg-cookbook-accent h-3 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add item to list..."
            className="flex-1 px-4 py-3 border-2 border-cookbook-aged rounded-lg focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
            maxLength={200}
          />
          <button
            type="submit"
            className="bg-cookbook-accent text-white px-6 py-3 rounded-lg hover:bg-cookbook-darkbrown transition-colors font-body font-medium shadow-card"
          >
            Add
          </button>
        </div>
      </form>

      {/* Shopping List Items */}
      <div className="bg-cookbook-paper rounded-lg shadow-card border-2 border-cookbook-aged overflow-hidden">
        {list.items.length === 0 ? (
          <div className="p-8 text-center text-cookbook-accent font-body">
            <p className="text-lg mb-2">No items yet</p>
            <p className="text-sm">Add your first item to get started!</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-cookbook-aged">
            {list.items.map((item) => (
              <div
                key={item._id}
                className={`p-4 flex items-center gap-3 hover:bg-cookbook-cream transition-colors ${
                  item.checked ? 'opacity-60' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleToggleItem(item._id)}
                  className="w-5 h-5 text-cookbook-accent rounded border-2 border-cookbook-aged focus:ring-2 focus:ring-cookbook-accent cursor-pointer"
                />
                <span
                  className={`flex-1 font-body ${
                    item.checked
                      ? 'line-through text-cookbook-accent'
                      : 'text-cookbook-darkbrown'
                  }`}
                >
                  {item.ingredient}
                  {item.quantity && item.quantity !== 1 && (
                    <span className="text-cookbook-accent ml-2">
                      ({item.quantity} {item.unit})
                    </span>
                  )}
                </span>
                {item.category && item.category !== 'Other' && (
                  <span className="text-xs bg-cookbook-aged text-cookbook-brown px-2 py-1 rounded font-body">
                    {item.category}
                  </span>
                )}
                <button
                  onClick={() => handleDeleteItem(item._id)}
                  className="text-red-600 hover:text-red-800 transition-colors p-1"
                  aria-label="Delete item"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-6 text-sm text-cookbook-accent font-body text-center">
        {list.completedAt ? (
          <p>Completed on {new Date(list.completedAt).toLocaleDateString()}</p>
        ) : (
          <p>Last updated {new Date(list.updatedAt).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
}