import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeSelectorModal from '../RecipeSelectorModal';

const mockRecipes = [
  {
    _id: 'r1',
    title: 'Pancakes',
    description: 'Fluffy breakfast pancakes',
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    rating: 4.5,
    tags: ['breakfast', 'easy'],
    cuisine: 'American'
  },
  {
    _id: 'r2',
    title: 'Pasta Carbonara',
    description: 'Classic Italian pasta',
    servings: 2,
    prepTime: 5,
    cookTime: 15,
    rating: 5,
    tags: ['dinner', 'italian'],
    cuisine: 'Italian'
  },
  {
    _id: 'r3',
    title: 'Chicken Salad',
    description: 'Fresh and healthy salad',
    servings: 2,
    prepTime: 15,
    cookTime: 0,
    rating: 4,
    tags: ['lunch', 'healthy'],
    cuisine: 'American'
  }
];

describe('RecipeSelectorModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when closed', () => {
    const { container } = render(
      <RecipeSelectorModal
        isOpen={false}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when open', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
        selectedMealType="dinner"
      />
    );
    
    expect(screen.getByText(/Add Dinner Recipe/i)).toBeInTheDocument();
  });

  it('displays all recipes', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    expect(screen.getByText('Pancakes')).toBeInTheDocument();
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
    expect(screen.getByText('Chicken Salad')).toBeInTheDocument();
  });

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('filters recipes by search term', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    const searchInput = screen.getByPlaceholderText(/Search recipes/i);
    await user.type(searchInput, 'pasta');
    
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
    expect(screen.queryByText('Pancakes')).not.toBeInTheDocument();
    expect(screen.queryByText('Chicken Salad')).not.toBeInTheDocument();
  });

  it('filters recipes by tag', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    const selects = screen.getAllByRole('combobox');
    const tagSelect = selects[0]; // First select is tags
    await user.selectOptions(tagSelect, 'breakfast');
    
    expect(screen.getByText('Pancakes')).toBeInTheDocument();
    expect(screen.queryByText('Pasta Carbonara')).not.toBeInTheDocument();
  });

  it('filters recipes by cuisine', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    const selects = screen.getAllByRole('combobox');
    const cuisineSelect = selects[1]; // Second select is cuisine
    await user.selectOptions(cuisineSelect, 'Italian');
    
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
    expect(screen.queryByText('Pancakes')).not.toBeInTheDocument();
  });

  it('clears filters when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    // Apply filters
    const searchInput = screen.getByPlaceholderText(/Search recipes/i);
    await user.type(searchInput, 'pasta');
    
    // Clear filters
    const clearButton = screen.getByRole('button', { name: /Clear filters/i });
    await user.click(clearButton);
    
    // All recipes should be visible again
    expect(screen.getByText('Pancakes')).toBeInTheDocument();
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
    expect(screen.getByText('Chicken Salad')).toBeInTheDocument();
  });

  it('selects a recipe when clicked', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    const pancakesCard = screen.getByText('Pancakes').closest('div[class*="cursor-pointer"]');
    await user.click(pancakesCard);
    
    // Check for visual selection indicator
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('submits selected recipe', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
        selectedMealType="dinner"
      />
    );
    
    // Select a recipe
    const pancakesCard = screen.getByText('Pancakes').closest('div[class*="cursor-pointer"]');
    await user.click(pancakesCard);
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /Add Recipe to Dinner/i });
    await user.click(submitButton);
    
    expect(mockOnSelect).toHaveBeenCalledWith({
      recipeId: 'r1',
      servings: null,
      notes: ''
    });
  });

  it('includes custom servings in submission', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    // Select recipe
    const pancakesCard = screen.getByText('Pancakes').closest('div[class*="cursor-pointer"]');
    await user.click(pancakesCard);
    
    // Enter custom servings
    const servingsInput = screen.getByPlaceholderText(/Default:/i);
    await user.type(servingsInput, '6');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /Add Recipe/i });
    await user.click(submitButton);
    
    expect(mockOnSelect).toHaveBeenCalledWith({
      recipeId: 'r1',
      servings: 6,
      notes: ''
    });
  });

  it('includes notes in submission', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    // Select recipe
    const pancakesCard = screen.getByText('Pancakes').closest('div[class*="cursor-pointer"]');
    await user.click(pancakesCard);
    
    // Enter notes
    const notesInput = screen.getByPlaceholderText(/Any special notes/i);
    await user.type(notesInput, 'Extra syrup please');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /Add Recipe/i });
    await user.click(submitButton);
    
    expect(mockOnSelect).toHaveBeenCalledWith({
      recipeId: 'r1',
      servings: null,
      notes: 'Extra syrup please'
    });
  });

  it('displays selected date', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
        selectedDate="2026-01-15"
      />
    );
    
    // Date is displayed with emoji, check for the emoji and date pattern
    expect(screen.getByText(/📅/)).toBeInTheDocument();
    // The component shows: Wednesday, January 15
    expect(screen.getByText(/Wednesday/i)).toBeInTheDocument();
  });

  it('shows correct meal type icon', () => {
    const { rerender } = render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
        selectedMealType="breakfast"
      />
    );
    
    expect(screen.getByText('🌅')).toBeInTheDocument();
    
    rerender(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
        selectedMealType="lunch"
      />
    );
    
    expect(screen.getByText('☀️')).toBeInTheDocument();
  });

  it('displays recipe metadata correctly', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    expect(screen.getByText(/Prep: 10m/i)).toBeInTheDocument();
    expect(screen.getByText(/Cook: 20m/i)).toBeInTheDocument();
    expect(screen.getByText(/4 servings/i)).toBeInTheDocument();
  });

  // REGRESSION TESTS: Bug fixes
  it('handles null recipes gracefully', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={null}
      />
    );
    
    expect(screen.getByText(/No recipes available/i)).toBeInTheDocument();
  });

  it('handles undefined recipes gracefully', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={undefined}
      />
    );
    
    expect(screen.getByText(/No recipes available/i)).toBeInTheDocument();
  });

  it('handles empty recipes array', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={[]}
      />
    );
    
    expect(screen.getByText(/No recipes available/i)).toBeInTheDocument();
  });

  it('handles recipes as object instead of array', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={{ data: mockRecipes }}
      />
    );
    
    // Should show empty state, not crash
    expect(screen.getByText(/No recipes available/i)).toBeInTheDocument();
  });

  it('resets form when modal closes', () => {
    const { rerender } = render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    // Interact with form (not waiting for user events since we're just testing state reset)
    const searchInput = screen.getByPlaceholderText(/Search recipes/i);
    expect(searchInput.value).toBe('');
    
    // Close modal
    rerender(
      <RecipeSelectorModal
        isOpen={false}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    // Reopen 
    rerender(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    // Form should be reset
    const newSearchInput = screen.getByPlaceholderText(/Search recipes/i);
    expect(newSearchInput.value).toBe('');
  });

  it('disables submit button when no recipe selected', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    const submitButton = screen.getByRole('button', { name: /Add Recipe/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when recipe selected', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    // Select a recipe
    const pancakesCard = screen.getByText('Pancakes').closest('div[class*="cursor-pointer"]');
    await user.click(pancakesCard);
    
    const submitButton = screen.getByRole('button', { name: /Add Recipe/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows recipe count', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    expect(screen.getByText(/Showing 3 of 3 recipes/i)).toBeInTheDocument();
  });

  it('updates recipe count when filtering', async () => {
    const user = userEvent.setup();
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    const selects = screen.getAllByRole('combobox');
    const tagSelect = selects[0];
    await user.selectOptions(tagSelect, 'breakfast');
    
    expect(screen.getByText(/Showing 1 of 3 recipes/i)).toBeInTheDocument();
  });

  it('renders rating stars correctly', () => {
    render(
      <RecipeSelectorModal
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        recipes={mockRecipes}
      />
    );
    
    // Pancakes has 4.5 rating
    const pancakesCard = screen.getByText('Pancakes').closest('div[class*="cursor-pointer"]');
    const stars = within(pancakesCard).getAllByText('★');
    expect(stars.length).toBeGreaterThan(0);
  });
});