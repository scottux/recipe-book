import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipeList from '../RecipeList';
import * as api from '../../services/api';

// Mock the API
vi.mock('../../services/api');

const mockRecipes = [
  {
    _id: '1',
    title: 'Pasta Carbonara',
    description: 'Classic Italian pasta',
    cuisine: 'Italian',
    dishType: 'Main Course',
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    rating: 5,
    ingredients: [{ name: 'pasta' }],
    instructions: ['Cook pasta'],
    isLocked: false
  },
  {
    _id: '2',
    title: 'Chocolate Cake',
    description: 'Rich chocolate dessert',
    cuisine: 'American',
    dishType: 'Dessert',
    prepTime: 20,
    cookTime: 30,
    servings: 8,
    rating: 4.5,
    ingredients: [{ name: 'flour' }],
    instructions: ['Mix ingredients'],
    isLocked: true
  }
];

describe('RecipeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders loading state initially', () => {
    api.getRecipes.mockReturnValue(new Promise(() => {})); // Never resolves
    
    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    expect(screen.getByText(/loading/i)).toBeDefined();
  });

  test('renders recipe cards after loading', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 2,
      data: mockRecipes,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 2,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeDefined();
      expect(screen.getByText('Chocolate Cake')).toBeDefined();
    });
  });

  test('renders error message on API failure', async () => {
    api.getRecipes.mockRejectedValue(new Error('API Error'));

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeDefined();
    });
  });

  test('displays recipe ratings', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 2,
      data: mockRecipes,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 2,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('⭐ 5')).toBeDefined();
      expect(screen.getByText('⭐ 4.5')).toBeDefined();
    });
  });

  test('displays lock icon for locked recipes', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 2,
      data: mockRecipes,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 2,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    await waitFor(() => {
      const chocolateCake = screen.getByText('Chocolate Cake').closest('.recipe-card');
      expect(chocolateCake?.textContent).toContain('🔒');
    });
  });

  test('displays cuisine and dish type', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 2,
      data: mockRecipes,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 2,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Italian')).toBeDefined();
      expect(screen.getByText('Main Course')).toBeDefined();
      expect(screen.getByText('American')).toBeDefined();
      expect(screen.getByText('Dessert')).toBeDefined();
    });
  });

  test('filters recipes by search term', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 1,
      data: mockRecipes.filter(r => r.title.includes('Pasta')),
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 1,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Pasta' } });

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeDefined();
      expect(screen.queryByText('Chocolate Cake')).toBeNull();
    });
  });

  test('filters recipes by cuisine', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 1,
      data: mockRecipes.filter(r => r.cuisine === 'Italian'),
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 1,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    const cuisineSelect = screen.getByLabelText(/cuisine/i);
    fireEvent.change(cuisineSelect, { target: { value: 'Italian' } });

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeDefined();
      expect(screen.queryByText('Chocolate Cake')).toBeNull();
    });
  });

  test('displays pagination controls', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 2,
      data: mockRecipes,
      pagination: {
        currentPage: 1,
        totalPages: 3,
        totalRecipes: 75,
        limit: 50,
        hasNextPage: true,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/i)).toBeDefined();
    });
  });

  test('handles page navigation', async () => {
    let currentPage = 1;
    api.getRecipes.mockImplementation((params) => {
      currentPage = params.page || 1;
      return Promise.resolve({
        success: true,
        count: mockRecipes.length,
        data: mockRecipes,
        pagination: {
          currentPage,
          totalPages: 3,
          totalRecipes: 75,
          limit: 50,
          hasNextPage: currentPage < 3,
          hasPrevPage: currentPage > 1
        }
      });
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/i)).toBeDefined();
    });

    const nextButton = screen.getByText(/next/i);
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(api.getRecipes).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  test('toggles between grid and list view', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 2,
      data: mockRecipes,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 2,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeDefined();
    });

    const listViewButton = screen.getByTitle(/list view/i);
    fireEvent.click(listViewButton);

    // Verify view changed (implementation dependent)
    expect(listViewButton.className).toContain('active');
  });

  test('sorts recipes by different fields', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 2,
      data: [...mockRecipes].reverse(),
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 2,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    const sortSelect = screen.getByLabelText(/sort by/i);
    fireEvent.change(sortSelect, { target: { value: 'rating' } });

    await waitFor(() => {
      expect(api.getRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'rating' })
      );
    });
  });

  test('displays empty state when no recipes', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 0,
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalRecipes: 0,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no recipes found/i)).toBeDefined();
    });
  });

  test('navigates to recipe detail on click', async () => {
    api.getRecipes.mockResolvedValue({
      success: true,
      count: 2,
      data: mockRecipes,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 2,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    render(
      <BrowserRouter>
        <RecipeList />
      </BrowserRouter>
    );

    await waitFor(() => {
      const recipeCard = screen.getByText('Pasta Carbonara');
      expect(recipeCard.closest('a')).toHaveAttribute('href', '/recipes/1');
    });
  });
});