import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recipeAPI } from '../services/api';

const ScraperInput = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleScrape = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await recipeAPI.scrape(url);
      const recipeId = response.data.data._id;
      
      // Navigate to the newly created recipe
      navigate(`/recipe/${recipeId}`);
    } catch (error) {
      console.error('Error scraping recipe:', error);
      setError(error.response?.data?.error || 'Failed to scrape recipe. Make sure the URL is valid and contains a recipe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="cookbook-page p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-cookbook-text mb-3">
            🔗 Import Recipe from URL
          </h1>
          <p className="text-lg text-cookbook-darkbrown font-body">
            Paste a URL from a recipe website to automatically extract the recipe details.
          </p>
          <div className="decorative-divider mt-6"></div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg font-body">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleScrape} className="space-y-6">
          <div>
            <label className="block text-sm font-body font-semibold text-cookbook-brown uppercase tracking-wide mb-2">
              Recipe URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.example.com/recipe"
              required
              className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-3 text-lg font-body bg-white focus:border-cookbook-brown focus:ring-2 focus:ring-cookbook-brown/30 transition-colors"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !url}
            className="w-full px-6 py-4 bg-cookbook-accent text-white rounded-lg hover:bg-cookbook-brown disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-body font-semibold shadow-md hover:shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Importing Recipe...
              </span>
            ) : (
              '📥 Import Recipe'
            )}
          </button>
        </form>

        <div className="mt-8 p-6 bg-cookbook-aged/30 rounded-lg border border-cookbook-brown">
          <h3 className="font-display font-bold text-cookbook-text text-xl mb-3">💡 Import Tips</h3>
          <ul className="text-sm font-body text-cookbook-darkbrown space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-cookbook-accent mt-0.5">✓</span>
              <span>Works best with popular recipe sites like AllRecipes, Food Network, Serious Eats, NYT Cooking, and more</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cookbook-accent mt-0.5">✓</span>
              <span>Extracts only the recipe data (ingredients, instructions, prep/cook times)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cookbook-accent mt-0.5">✓</span>
              <span>No ads, images, or long stories - just clean recipe information!</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cookbook-accent mt-0.5">✓</span>
              <span>After importing, you can edit the recipe to make any adjustments or corrections</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScraperInput;
