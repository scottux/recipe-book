import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recipeAPI } from '../services/api';

const RecipeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dishType: 'Other',
    cuisine: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    rating: '',
    sourceUrl: '',
    tags: ''
  });
  
  const [ingredients, setIngredients] = useState([{ name: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchRecipe();
    }
  }, [id]);

  const fetchRecipe = async () => {
    try {
      setLoading(true);
      const response = await recipeAPI.getById(id);
      const recipe = response.data.data;
      
      setFormData({
        title: recipe.title || '',
        description: recipe.description || '',
        dishType: recipe.dishType || 'Other',
        cuisine: recipe.cuisine || '',
        prepTime: recipe.prepTime || '',
        cookTime: recipe.cookTime || '',
        servings: recipe.servings || '',
        rating: recipe.rating || '',
        sourceUrl: recipe.sourceUrl || '',
        tags: recipe.tags ? recipe.tags.join(', ') : ''
      });
      
      setIngredients(recipe.ingredients?.length > 0 ? recipe.ingredients : [{ name: '', amount: '', unit: '' }]);
      setInstructions(recipe.instructions?.length > 0 ? recipe.instructions : ['']);
    } catch (error) {
      console.error('Error fetching recipe:', error);
      setError('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  const removeIngredient = (index) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const handleInstructionChange = (index, value) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        ...formData,
        prepTime: formData.prepTime ? parseInt(formData.prepTime) : undefined,
        cookTime: formData.cookTime ? parseInt(formData.cookTime) : undefined,
        servings: formData.servings ? parseInt(formData.servings) : undefined,
        rating: formData.rating ? parseFloat(formData.rating) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        ingredients: ingredients.filter(ing => ing.name.trim()),
        instructions: instructions.filter(inst => inst.trim())
      };

      if (isEdit) {
        await recipeAPI.update(id, data);
      } else {
        await recipeAPI.create(data);
      }
      
      navigate('/');
    } catch (error) {
      console.error('Error saving recipe:', error);
      setError(error.response?.data?.error || 'Failed to save recipe');
    } finally {
      setLoading(false);
    }
  };

  const dishTypes = ['Appetizer', 'Main Course', 'Side Dish', 'Dessert', 'Beverage', 'Snack', 'Breakfast', 'Lunch', 'Dinner', 'Other'];

  if (loading && isEdit) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-cookbook-aged rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cookbook-accent rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-cookbook-brown font-display text-xl">Loading recipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="cookbook-page p-8">
        <h1 className="text-4xl font-display font-bold text-cookbook-text mb-6 text-center">
          {isEdit ? '🖊️ Edit Recipe' : '🖊️ Manual Entry'}
        </h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-red-300 rounded-lg text-red-700 font-body">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-body font-semibold text-cookbook-text mb-2">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
            />
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-cookbook-text mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-body font-semibold text-cookbook-text mb-2">Dish Type</label>
              <select
                name="dishType"
                value={formData.dishType}
                onChange={handleChange}
                className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
              >
                {dishTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-body font-semibold text-cookbook-text mb-2">Cuisine</label>
              <input
                type="text"
                name="cuisine"
                value={formData.cuisine}
                onChange={handleChange}
                placeholder="e.g., Italian, Mexican"
                className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-body font-semibold text-cookbook-text mb-2">Prep Time (min)</label>
              <input
                type="number"
                name="prepTime"
                value={formData.prepTime}
                onChange={handleChange}
                min="0"
                className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
              />
            </div>

            <div>
              <label className="block text-sm font-body font-semibold text-cookbook-text mb-2">Cook Time (min)</label>
              <input
                type="number"
                name="cookTime"
                value={formData.cookTime}
                onChange={handleChange}
                min="0"
                className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
              />
            </div>

            <div>
              <label className="block text-sm font-body font-semibold text-cookbook-text mb-2">Servings</label>
              <input
                type="number"
                name="servings"
                value={formData.servings}
                onChange={handleChange}
                min="1"
                className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
              />
            </div>

            <div>
              <label className="block text-sm font-body font-semibold text-cookbook-text mb-2">Rating (1-5)</label>
              <input
                type="number"
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                min="1"
                max="5"
                step="0.5"
                className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-cookbook-text mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., Vegetarian, Quick, Healthy"
              className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
            />
          </div>

          {/* Ingredients */}
          <div>
            <label className="block text-sm font-body font-semibold text-cookbook-text mb-3">Ingredients *</label>
            <div className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={ingredient.amount}
                    onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="w-24 border-2 border-cookbook-aged rounded-lg px-3 py-2 bg-white font-body"
                  />
                  <input
                    type="text"
                    value={ingredient.unit}
                    onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="w-24 border-2 border-cookbook-aged rounded-lg px-3 py-2 bg-white font-body"
                  />
                  <input
                    type="text"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                    placeholder="Ingredient name"
                    className="flex-1 border-2 border-cookbook-aged rounded-lg px-3 py-2 bg-white font-body"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-600 hover:text-white transition-colors font-body font-medium"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addIngredient}
              className="mt-3 px-4 py-2 bg-cookbook-accent text-white rounded-lg hover:bg-cookbook-brown transition-colors font-body font-medium"
            >
              + Add Ingredient
            </button>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-body font-semibold text-cookbook-text mb-3">Instructions *</label>
            <div className="space-y-3">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="step-number text-lg flex-shrink-0">
                    {index + 1}
                  </div>
                  <textarea
                    value={instruction}
                    onChange={(e) => handleInstructionChange(index, e.target.value)}
                    placeholder="Enter instruction step"
                    rows="2"
                    className="flex-1 border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-600 hover:text-white transition-colors font-body font-medium"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addInstruction}
              className="mt-3 px-4 py-2 bg-cookbook-accent text-white rounded-lg hover:bg-cookbook-brown transition-colors font-body font-medium"
            >
              + Add Step
            </button>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-cookbook-text mb-2">Source URL</label>
            <input
              type="url"
              name="sourceUrl"
              value={formData.sourceUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 bg-white font-body"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-6 border-t-2 border-cookbook-brown">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-cookbook-brown text-white rounded-lg hover:bg-cookbook-darkbrown transition-colors font-body font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (isEdit ? '💾 Update Recipe' : '✨ Create Recipe')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-cookbook-aged text-cookbook-darkbrown rounded-lg hover:bg-cookbook-brown hover:text-white transition-colors font-body font-medium shadow-md"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecipeForm;