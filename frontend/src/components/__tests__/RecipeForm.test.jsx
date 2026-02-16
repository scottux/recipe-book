import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipeForm from '../RecipeForm';
import * as api from '../../services/api';

vi.mock('../../services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('RecipeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders empty form for new recipe', () => {
    render(
      <BrowserRouter>
        <RecipeForm />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue('');
    expect(screen.getByLabelText(/description/i)).toHaveValue('');
  });

  test('validates required fields', async () => {
    render(
      <BrowserRouter>
        <RecipeForm />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /save|submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeVisible();
    });
  });

  test('adds ingredient to list', () => {
    render(
      <BrowserRouter>
        <RecipeForm />
      </BrowserRouter>
    );

    const nameInput = screen.getByPlaceholderText(/ingredient name/i);
    const amountInput = screen.getByPlaceholderText(/amount/i);
    const unitInput = screen.getByPlaceholderText(/unit/i);
    const addButton = screen.getByText(/add ingredient/i);

    fireEvent.change(nameInput, { target: { value: 'flour' } });
    fireEvent.change(amountInput, { target: { value: '2' } });
    fireEvent.change(unitInput, { target: { value: 'cups' } });
    fireEvent.click(addButton);

    expect(screen.getByText(/flour/i)).toBeVisible();
    expect(screen.getByText(/2 cups/i)).toBeVisible();
  });

  test('removes ingredient from list', () => {
    render(
      <BrowserRouter>
        <RecipeForm />
      </BrowserRouter>
    );

    // Add ingredient
    fireEvent.change(screen.getByPlaceholderText(/ingredient name/i), {
      target: { value: 'sugar' }
    });
    fireEvent.click(screen.getByText(/add ingredient/i));

    // Verify it's added
    expect(screen.getByText(/sugar/i)).toBeVisible();

    // Remove it
    const removeButton = screen.getByTitle(/remove ingredient/i);
    fireEvent.click(removeButton);

    // Verify it's removed
    expect(screen.queryByText(/sugar/i)).not.toBeInTheDocument();
  });

  test('adds instruction step', () => {
    render(
      <BrowserRouter>
        <RecipeForm />
      </BrowserRouter>
    );

    const stepInput = screen.getByPlaceholderText(/instruction/i);
    const addButton = screen.getByText(/add step/i);

    fireEvent.change(stepInput, { target: { value: 'Mix ingredients' } });
    fireEvent.click(addButton);

    expect(screen.getByText(/1\. Mix ingredients/i)).toBeVisible();
  });

  test('removes instruction step', () => {
    render(
      <BrowserRouter>
        <RecipeForm />
      </BrowserRouter>
    );

    // Add step
    fireEvent.change(screen.getByPlaceholderText(/instruction/i), {
      target: { value: 'Bake at 350F' }
    });
    fireEvent.click(screen.getByText(/add step/i));

    // Verify it's added
    expect(screen.getByText(/Bake at 350F/i)).toBeVisible();

    // Remove it
    const removeButton = screen.getByTitle(/remove step/i);
    fireEvent.click(removeButton);

    // Verify it's removed
    expect(screen.queryByText(/Bake at 350F/i)).not.toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    api.createRecipe.mockResolvedValue({
      success: true,
      data: { _id: '123', title: 'Test Recipe' }
    });

    render(
      <BrowserRouter>
        <RecipeForm />
      </BrowserRouter>
    );

    // Fill out form
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test Recipe' }
    });
    
    // Add ingredient
    fireEvent.change(screen.getByPlaceholderText(/ingredient name/i), {
      target: { value: 'flour' }
    });
    fireEvent.click(screen.getByText(/add ingredient/i));

    // Add instruction
    fireEvent.change(screen.getByPlaceholderText(/instruction/i), {
      target: { value: 'Mix' }
    });
    fireEvent.click(screen.getByText(/add step/i));

    // Submit
    const submitButton = screen.getByRole('button', { name: /save|submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Recipe'
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/recipes/123');
    });
  });

  test('populates form when editing existing recipe', () => {
    const existingRecipe = {
      _id: '123',
      title: 'Existing Recipe',
      description: 'Test description',
      ingredients: [{ name: 'flour', amount: '2', unit: 'cups' }],
      instructions: ['Mix ingredients', 'Bake'],
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      dishType: 'Dessert'
    };

    render(
      <BrowserRouter>
        <RecipeForm recipe={existingRecipe} />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue('Existing Recipe');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Test description');
    expect(screen.getByText(/flour/i)).toBeVisible();
    expect(screen.getByText(/Mix ingredients/i)).toBeVisible();
  });

  test('updates existing recipe', async () => {
    const existingRecipe = {
      _id: '123',
      title: 'Original Title',
      ingredients: [{ name: 'flour' }],
      instructions: ['Mix']
    };

    api.updateRecipe.mockResolvedValue({
      success: true,
      data: { ...existingRecipe, title: 'Updated Title' }
    });

    render(
      <BrowserRouter>
        <RecipeForm recipe={existingRecipe} />
      </BrowserRouter>
    );

    // Update title
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Updated Title' }
    });

    // Submit
    const submitButton = screen.getByRole('button', { name: /save|update/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.updateRecipe).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          title: 'Updated Title'
        })
      );
    });
  });

  test('displays error message on submit failure', async () => {
    api.createRecipe.mockRejectedValue(new Error('Network error'));

    render(
      <BrowserRouter>
        <RecipeForm />
      </BrowserRouter>
    );

    // Fill minimum required fields
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test' }
    });
    fireEvent.change(screen.getByPlaceholderText(/ingredient name/i), {
      target: { value: 'flour' }
    });
    fireEvent.click(screen.getByText(/add ingredient/i));
    fireEvent.change(screen.getByPlaceholderText(/instruction/i), {
      target: { value: 'Mix' }
    });
    fireEvent.click(screen.getByText(/add step/i));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /save|submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeVisible();
    });
  });

  test('validates numeric fields', async () => {
    render(
      <BrowserRouter>
        <RecipeForm />
      </BrowserRouter>
    );

    const prepTimeInput = screen.getByLabelText(/prep time/i);
    fireEvent.change(prepTimeInput, { target: { value: '-5' } });

    const submitButton = screen.getByRole('button', { name: /save|submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/must be positive/i)).toBeVisible();
    });
  });

  test('resets form when cancel is clicked', () => {
    render(
      <BrowserRouter>
        <RecipeForm />
      </BrowserRouter>
    );

    // Fill some fields
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test' }
    });

    // Click cancel
    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);

    // Should navigate away or reset
    expect(mockNavigate).toHaveBeenCalled();
  });
});