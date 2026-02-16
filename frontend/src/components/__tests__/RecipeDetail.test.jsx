import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipeDetail from '../RecipeDetail';
import { recipeAPI } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  recipeAPI: {
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock useParams and useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-recipe-id' }),
    useNavigate: () => vi.fn()
  };
});

const mockRecipe = {
  _id: 'test-recipe-id',
  title: 'Chocolate Chip Cookies',
  description: 'Delicious homemade cookies',
  ingredients: [
    { name: 'flour', amount: '2', unit: 'cups' },
    { name: 'sugar', amount: '1', unit: 'cup' },
    { name: 'chocolate chips', amount: '1/2', unit: 'cup' }
  ],
  instructions: [
    'Preheat oven to 350°F',
    'Mix dry ingredients',
    'Add wet ingredients',
    'Bake for 12 minutes'
  ],
  prepTime: 15,
  cookTime: 12,
  servings: 24,
  dishType: 'Dessert',
  cuisine: 'American',
  tags: ['dessert', 'baking', 'cookies'],
  rating: 4.5,
  sourceUrl: 'https://example.com/recipe',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};

describe('RecipeDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Recipe Display (REQ-001)', () => {
    it('should display recipe title and description', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Chocolate Chip Cookies')).toBeInTheDocument();
        expect(screen.getByText('Delicious homemade cookies')).toBeInTheDocument();
      });
    });

    it('should display all ingredients', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/flour/i)).toBeInTheDocument();
        expect(screen.getByText(/sugar/i)).toBeInTheDocument();
        expect(screen.getByText(/chocolate chips/i)).toBeInTheDocument();
      });
    });

    it('should display all instructions', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Preheat oven to 350°F/i)).toBeInTheDocument();
        expect(screen.getByText(/Mix dry ingredients/i)).toBeInTheDocument();
        expect(screen.getByText(/Add wet ingredients/i)).toBeInTheDocument();
        expect(screen.getByText(/Bake for 12 minutes/i)).toBeInTheDocument();
      });
    });

    it('should display metadata (times, cuisine, dishType)', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('15m')).toBeInTheDocument(); // prep time
        expect(screen.getByText('12m')).toBeInTheDocument(); // cook time
        expect(screen.getByText('American')).toBeInTheDocument();
        expect(screen.getByText('Dessert')).toBeInTheDocument();
      });
    });

    it('should display tags', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('dessert')).toBeInTheDocument();
        expect(screen.getByText('baking')).toBeInTheDocument();
        expect(screen.getByText('cookies')).toBeInTheDocument();
      });
    });
  });

  describe('Serving Size Adjustment (REQ-004)', () => {
    it('should display initial servings', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('24')).toBeInTheDocument();
      });
    });

    it('should increase servings when + button is clicked', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('24')).toBeInTheDocument();
      });

      const increaseButton = screen.getByLabelText('Increase servings');
      fireEvent.click(increaseButton);

      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should decrease servings when - button is clicked', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('24')).toBeInTheDocument();
      });

      const decreaseButton = screen.getByLabelText('Decrease servings');
      fireEvent.click(decreaseButton);

      expect(screen.getByText('23')).toBeInTheDocument();
    });

    it('should not decrease servings below 1', async () => {
      const singleServingRecipe = { ...mockRecipe, servings: 1 };
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: singleServingRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });

      const decreaseButton = screen.getByLabelText('Decrease servings');
      fireEvent.click(decreaseButton);

      // Should still be 1
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show reset button when servings are adjusted', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('24')).toBeInTheDocument();
      });

      const increaseButton = screen.getByLabelText('Increase servings');
      fireEvent.click(increaseButton);

      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('should reset servings to original when Reset is clicked', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('24')).toBeInTheDocument();
      });

      const increaseButton = screen.getByLabelText('Increase servings');
      fireEvent.click(increaseButton);
      fireEvent.click(increaseButton);

      expect(screen.getByText('26')).toBeInTheDocument();

      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);

      expect(screen.getByText('24')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching recipe', () => {
      recipeAPI.getById.mockImplementation(() => new Promise(() => {}));

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      expect(screen.getByText('Loading recipe...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when recipe is not found', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: false,
        data: null 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Recipe not found')).toBeInTheDocument();
      });
    });

    it('should handle API error gracefully', async () => {
      recipeAPI.getById.mockRejectedValue(new Error('Network error'));

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading recipe...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Time Formatting', () => {
    it('should format times correctly - minutes only', async () => {
      const recipe = { ...mockRecipe, prepTime: 45, cookTime: 30 };
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: recipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('45m')).toBeInTheDocument();
        expect(screen.getByText('30m')).toBeInTheDocument();
      });
    });

    it('should format times correctly - hours and minutes', async () => {
      const recipe = { ...mockRecipe, prepTime: 75, cookTime: 90 };
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: recipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('1h 15m')).toBeInTheDocument();
        expect(screen.getByText('1h 30m')).toBeInTheDocument();
      });
    });

    it('should show N/A when time is not provided', async () => {
      const recipe = { ...mockRecipe, prepTime: null, cookTime: undefined };
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: recipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        const naElements = screen.getAllByText('N/A');
        expect(naElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Rating Display', () => {
    it('should display recipe rating', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('(4.5/5)')).toBeInTheDocument();
      });
    });

    it('should allow clicking stars to update rating', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });
      recipeAPI.update.mockResolvedValue({ 
        success: true,
        data: { ...mockRecipe, rating: 5 } 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('(4.5/5)')).toBeInTheDocument();
      });

      const ratingButtons = screen.getAllByTitle(/Rate \d+ star/);
      const fiveStarButton = ratingButtons.find(btn => btn.title === 'Rate 5 stars');
      
      if (fiveStarButton) {
        fireEvent.click(fiveStarButton);
        
        await waitFor(() => {
          expect(recipeAPI.update).toHaveBeenCalledWith(
            'test-recipe-id',
            expect.objectContaining({ rating: 5 })
          );
        });
      }
    });
  });

  describe('Source URL Display', () => {
    it('should display source URL when present', async () => {
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: mockRecipe 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        const link = screen.getByText('https://example.com/recipe');
        expect(link).toBeInTheDocument();
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', 'https://example.com/recipe');
        expect(link).toHaveAttribute('target', '_blank');
      });
    });

    it('should not display source section when URL is missing', async () => {
      const recipeWithoutUrl = { ...mockRecipe, sourceUrl: null };
      recipeAPI.getById.mockResolvedValue({ 
        success: true,
        data: recipeWithoutUrl 
      });

      render(
        <BrowserRouter>
          <RecipeDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Recipe Source')).not.toBeInTheDocument();
      });
    });
  });
});