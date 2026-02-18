import { useState, useEffect } from 'react';
import { mealPlanAPI, recipeAPI, exportAPI, shoppingListAPI } from '../services/api';
import { getLocalDateString, getUTCDateString } from '../utils/dateUtils';
import RecipeSelectorModal from './RecipeSelectorModal';

export default function MealPlanningPage() {
  const [mealPlans, setMealPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [generatingShoppingList, setGeneratingShoppingList] = useState(false);

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealTypeIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎'
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansResponse, recipesResponse] = await Promise.all([
        mealPlanAPI.getAll({ isTemplate: false }),
        recipeAPI.getAll()
      ]);
      
      // Ensure data is always an array
      setMealPlans(Array.isArray(plansResponse.data) ? plansResponse.data : []);
      
      // Handle paginated recipe response - ensure data is always an array
      const recipesData = recipesResponse.data;
      setRecipes(Array.isArray(recipesData) ? recipesData : []);
      
      // Select most recent plan by default
      const plans = Array.isArray(plansResponse.data) ? plansResponse.data : [];
      if (plans.length > 0 && !selectedPlan) {
        setSelectedPlan(plans[0]);
      }
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load meal planning data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const newPlan = await mealPlanAPI.create({
        name: formData.get('name'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
      });
      setMealPlans([newPlan.data, ...mealPlans]);
      setSelectedPlan(newPlan.data);
      setShowCreateModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create meal plan');
    }
  };

  const handleRecipeSelect = async (selectedData) => {
    try {
      const updated = await mealPlanAPI.addMeal(selectedPlan._id, {
        date: selectedDate,
        mealType: selectedMealType,
        recipeId: selectedData.recipeId,
        servings: selectedData.servings,
        notes: selectedData.notes,
      });
      setSelectedPlan(updated.data);
      setMealPlans(mealPlans.map(p => p._id === updated.data._id ? updated.data : p));
      setShowAddMealModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add meal');
    }
  };

  const handleRemoveMeal = async (mealId) => {
    if (!window.confirm('Remove this meal from the plan?')) return;
    
    try {
      const updated = await mealPlanAPI.removeMeal(selectedPlan._id, mealId);
      setSelectedPlan(updated.data);
      setMealPlans(mealPlans.map(p => p._id === updated.data._id ? updated.data : p));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove meal');
    }
  };

  const handleDeletePlan = async () => {
    if (!window.confirm('Delete this meal plan? This action cannot be undone.')) return;
    
    try {
      await mealPlanAPI.delete(selectedPlan._id);
      const remainingPlans = mealPlans.filter(p => p._id !== selectedPlan._id);
      setMealPlans(remainingPlans);
      setSelectedPlan(remainingPlans[0] || null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete meal plan');
    }
  };

  const openAddMealModal = (date, mealType) => {
    setSelectedDate(date.toISOString().split('T')[0]);
    setSelectedMealType(mealType);
    setShowAddMealModal(true);
  };

  const handleGenerateShoppingList = async () => {
    if (!selectedPlan) return;

    setGeneratingShoppingList(true);

    try {
      await shoppingListAPI.generateFromMealPlan(selectedPlan._id, {
        listName: `${selectedPlan.name} - Shopping List`
      });
      
      if (confirm('Shopping list created from meal plan! Would you like to view it now?')) {
        window.location.href = '/shopping-lists';
      }
    } catch (error) {
      console.error('Error generating shopping list:', error);
      alert('Failed to generate shopping list. Please try again.');
    } finally {
      setGeneratingShoppingList(false);
    }
  };

  const handleExportMealPlan = async () => {
    if (!selectedPlan) return;

    setExporting(true);

    try {
      const response = await exportAPI.exportMealPlan(selectedPlan._id);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const safeName = selectedPlan.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `${safeName}-meal-plan-${timestamp}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting meal plan:', err);
      alert('Failed to export meal plan. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const generateWeekDays = () => {
    if (!selectedPlan) return [];
    
    const start = new Date(selectedPlan.startDate);
    const end = new Date(selectedPlan.endDate);
    const days = [];
    
    for (let d = new Date(start); d <= end && days.length < 7; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  };

  const getMealsForDateAndType = (date, mealType) => {
    if (!selectedPlan) return null;
    
    // Use LOCAL date string formatting (no timezone conversion)
    const localDateStr = getLocalDateString(date);
    
    return selectedPlan.meals.find(m => {
      // Parse UTC date and extract date components (timezone-safe)
      const mealDate = new Date(m.date);
      const mealDateStr = getUTCDateString(mealDate);
      
      return mealDateStr === localDateStr && m.mealType === mealType;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cookbook-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-cookbook-darkbrown">
            Meal Planning
          </h1>
          <p className="mt-2 text-cookbook-accent font-body">
            Plan your weekly meals and never wonder "what's for dinner?" again
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-cookbook-accent text-white px-6 py-3 rounded-lg hover:bg-cookbook-darkbrown transition-all shadow-card hover:shadow-card-hover font-body font-medium inline-flex items-center gap-2 justify-center"
        >
          <span className="text-xl">📅</span>
          Create Meal Plan
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-body">
          {error}
        </div>
      )}

      {/* Meal Plan Selector */}
      {mealPlans.length > 0 && (
        <div className="bg-cookbook-paper rounded-lg shadow-card p-6 mb-6 border-2 border-cookbook-aged">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
                Select Meal Plan:
              </label>
              <select
                value={selectedPlan?._id || ''}
                onChange={(e) => setSelectedPlan(mealPlans.find(p => p._id === e.target.value))}
                className="border-2 border-cookbook-aged rounded-lg px-4 py-2 w-full font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent bg-white"
              >
                {mealPlans.map(plan => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name} ({new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
            {selectedPlan && (
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateShoppingList}
                  disabled={generatingShoppingList}
                  className="bg-cookbook-accent text-white px-4 py-2 rounded-lg hover:bg-cookbook-darkbrown transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body font-medium flex items-center gap-2"
                  title="Generate Shopping List"
                >
                  🛒
                  {generatingShoppingList ? 'Generating...' : 'Shopping List'}
                </button>
                <button
                  onClick={handleExportMealPlan}
                  disabled={exporting}
                  className="bg-cookbook-accent text-white px-4 py-2 rounded-lg hover:bg-cookbook-darkbrown transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body font-medium flex items-center gap-2"
                  title="Export as PDF"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? 'Exporting...' : 'Export PDF'}
                </button>
                <button
                  onClick={handleDeletePlan}
                  className="text-red-600 hover:text-red-800 font-body font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  🗑️ Delete Plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar View */}
      {selectedPlan && (
        <div className="bg-cookbook-paper rounded-lg shadow-cookbook border-2 border-cookbook-aged overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-cookbook-aged">
            {generateWeekDays().map((date, idx) => (
              <div key={idx} className="bg-cookbook-paper min-h-[400px]">
                {/* Day Header */}
                <div className="bg-cookbook-aged p-3 text-center border-b-2 border-cookbook-brown">
                  <div className="font-display font-bold text-cookbook-darkbrown">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-sm text-cookbook-accent font-body">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                
                {/* Meals for the day */}
                <div className="p-2 space-y-2">
                  {mealTypes.map(mealType => {
                    const meal = getMealsForDateAndType(date, mealType);
                    return (
                      <div key={mealType} className="bg-white border-2 border-cookbook-aged rounded-lg p-2 min-h-[80px]">
                        <div className="flex items-center gap-1 text-xs font-body font-semibold text-cookbook-accent capitalize mb-1">
                          <span>{mealTypeIcons[mealType]}</span>
                          <span>{mealType}</span>
                        </div>
                        {meal ? (
                          <div className="space-y-1">
                            {meal.recipes.map((r, i) => (
                              <div key={i} className="text-xs bg-cookbook-cream p-2 rounded border border-cookbook-aged flex justify-between items-start gap-2 font-body">
                                <span className="flex-1 text-cookbook-darkbrown line-clamp-2">
                                  {r.recipe?.title || 'Recipe'}
                                  {r.servings && <span className="text-cookbook-accent ml-1">({r.servings} servings)</span>}
                                </span>
                                <button
                                  onClick={() => handleRemoveMeal(meal._id)}
                                  className="text-red-500 hover:text-red-700 flex-shrink-0 font-bold text-base leading-none"
                                  aria-label="Remove meal"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => openAddMealModal(date, mealType)}
                            className="text-xs text-cookbook-brown hover:text-cookbook-accent w-full text-left font-body py-1 transition-colors"
                          >
                            + Add recipe
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedPlan && mealPlans.length === 0 && (
        <div className="text-center py-16 bg-cookbook-paper rounded-lg border-2 border-cookbook-aged shadow-card">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-display font-semibold text-cookbook-darkbrown mb-2">
            No meal plans yet
          </h3>
          <p className="text-cookbook-accent font-body mb-6 max-w-md mx-auto">
            Create your first meal plan to start organizing your weekly meals and make dinner time stress-free
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cookbook-accent text-white px-6 py-3 rounded-lg hover:bg-cookbook-darkbrown transition-all shadow-card hover:shadow-card-hover font-body font-medium"
          >
            Create Your First Meal Plan
          </button>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-cookbook-paper rounded-lg p-6 max-w-md w-full border-2 border-cookbook-aged shadow-cookbook">
            <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
              Create Meal Plan
            </h2>
            <form onSubmit={handleCreatePlan}>
              <div className="mb-4">
                <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
                  Plan Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="border-2 border-cookbook-aged rounded-lg px-4 py-2 w-full font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent"
                  placeholder="Week of Jan 15"
                  maxLength={100}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  required
                  className="border-2 border-cookbook-aged rounded-lg px-4 py-2 w-full font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-body font-medium text-cookbook-darkbrown mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  required
                  className="border-2 border-cookbook-aged rounded-lg px-4 py-2 w-full font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent"
                />
                <p className="text-xs text-cookbook-accent mt-1 font-body">
                  Plans can span 1-28 days (up to 4 weeks)
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 text-cookbook-darkbrown hover:bg-cookbook-cream transition-colors rounded-lg font-body font-medium border-2 border-cookbook-aged"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cookbook-accent text-white px-6 py-2 rounded-lg hover:bg-cookbook-darkbrown transition-colors font-body font-medium shadow-card"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipe Selector Modal */}
      <RecipeSelectorModal
        isOpen={showAddMealModal}
        onClose={() => setShowAddMealModal(false)}
        onSelect={handleRecipeSelect}
        recipes={recipes}
        selectedMealType={selectedMealType}
        selectedDate={selectedDate}
      />
    </div>
  );
}