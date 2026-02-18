import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import MealPlanningPage from '../MealPlanningPage';
import { mealPlanAPI, recipeAPI } from '../../services/api';

// Mock the API modules
vi.mock('../../services/api', () => ({
  mealPlanAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    addMeal: vi.fn(),
    removeMeal: vi.fn(),
  },
  recipeAPI: {
    getAll: vi.fn(),
  },
}));

const mockMealPlans = [
  {
    _id: 'plan1',
    name: 'Week of Jan 15',
    startDate: '2026-01-15',
    endDate: '2026-01-21',
    meals: [
      {
        _id: 'meal1',
        date: '2026-01-15',
        mealType: 'breakfast',
        recipes: [
          {
            _id: 'recipe1',
            recipe: {
              _id: 'r1',
              title: 'Pancakes',
            },
            servings: 4,
          },
        ],
      },
    ],
  },
];

const mockRecipes = [
  {
    _id: 'r1',
    title: 'Pancakes',
    servings: 4,
  },
  {
    _id: 'r2',
    title: 'Grilled Chicken',
    servings: 6,
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <MealPlanningPage />
    </BrowserRouter>
  );
};

describe('MealPlanningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mealPlanAPI.getAll.mockReturnValue(new Promise(() => {})); // Never resolves
    recipeAPI.getAll.mockReturnValue(new Promise(() => {}));
    
    renderComponent();
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('renders empty state when no meal plans exist', async () => {
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: [] 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('No meal plans yet')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Create your first meal plan/i)).toBeInTheDocument();
  });

  it('displays meal plans when they exist', async () => {
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Meal Planning')).toBeInTheDocument();
    });
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText(/Week of Jan 15/)).toBeInTheDocument();
  });

  it('displays calendar with 7 days', async () => {
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    
    renderComponent();
    
    await waitFor(() => {
      const days = screen.getAllByText(/Jan \d+/);
      expect(days.length).toBeGreaterThan(0);
    });
  });

  it('shows meals in calendar view', async () => {
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
    });
    
    expect(screen.getByText('(4 servings)')).toBeInTheDocument();
  });

  it('opens create meal plan modal', async () => {
    const user = userEvent.setup();
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: [] 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('No meal plans yet')).toBeInTheDocument();
    });
    
    const createButton = screen.getByRole('button', { name: /Create Your First Meal Plan/i });
    await user.click(createButton);
    
    expect(screen.getByText('Create Meal Plan')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Week of Jan 15')).toBeInTheDocument();
  });

  it('creates a new meal plan', async () => {
    const user = userEvent.setup();
    const newPlan = {
      _id: 'plan2',
      name: 'Week of Jan 22',
      startDate: '2026-01-22',
      endDate: '2026-01-28',
      meals: [],
    };
    
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: [] 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    mealPlanAPI.create.mockResolvedValue({ 
      success: true,
      data: newPlan 
    });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('No meal plans yet')).toBeInTheDocument();
    });
    
    // Open modal
    const createButton = screen.getByRole('button', { name: /Create Your First Meal Plan/i });
    await user.click(createButton);
    
    // Fill form
    await user.type(screen.getByPlaceholderText('Week of Jan 15'), 'Week of Jan 22');
    await user.type(screen.getByLabelText(/Start Date/i), '2026-01-22');
    await user.type(screen.getByLabelText(/End Date/i), '2026-01-28');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: 'Create Plan' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mealPlanAPI.create).toHaveBeenCalledWith({
        name: 'Week of Jan 22',
        startDate: '2026-01-22',
        endDate: '2026-01-28',
      });
    });
  });

  it('opens add meal modal when clicking add recipe', async () => {
    const user = userEvent.setup();
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Meal Planning')).toBeInTheDocument();
    });
    
    // Find and click an "Add recipe" button
    const addButtons = screen.getAllByText('+ Add recipe');
    await user.click(addButtons[0]);
    
    expect(screen.getByText(/Add.*Recipe/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Recipe')).toBeInTheDocument();
  });

  it('adds a meal to the plan', async () => {
    const user = userEvent.setup();
    const updatedPlan = {
      ...mockMealPlans[0],
      meals: [
        ...mockMealPlans[0].meals,
        {
          _id: 'meal2',
          date: '2026-01-15',
          mealType: 'lunch',
          recipes: [
            {
              _id: 'recipe2',
              recipe: mockRecipes[1],
              servings: null,
            },
          ],
        },
      ],
    };
    
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    mealPlanAPI.addMeal.mockResolvedValue({ 
      success: true,
      data: updatedPlan 
    });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Meal Planning')).toBeInTheDocument();
    });
    
    // Click an "Add recipe" button
    const addButtons = screen.getAllByText('+ Add recipe');
    await user.click(addButtons[0]);
    
    // Select recipe
    const recipeSelect = screen.getByLabelText('Recipe');
    await user.selectOptions(recipeSelect, 'r2');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: 'Add Recipe' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mealPlanAPI.addMeal).toHaveBeenCalled();
    });
  });

  it('removes a meal from the plan', async () => {
    const user = userEvent.setup();
    const updatedPlan = {
      ...mockMealPlans[0],
      meals: [],
    };
    
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    mealPlanAPI.removeMeal.mockResolvedValue({ 
      success: true,
      data: updatedPlan 
    });
    
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
    });
    
    // Find and click remove button
    const removeButton = screen.getByRole('button', { name: /Remove meal/i });
    await user.click(removeButton);
    
    await waitFor(() => {
      expect(mealPlanAPI.removeMeal).toHaveBeenCalledWith('plan1', 'meal1');
    });
    
    vi.restoreAllMocks();
  });

  it('deletes a meal plan', async () => {
    const user = userEvent.setup();
    
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    mealPlanAPI.delete.mockResolvedValue({
      success: true,
      data: {}
    });
    
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Week of Jan 15')).toBeInTheDocument();
    });
    
    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /Delete Plan/i });
    await user.click(deleteButton);
    
    await waitFor(() => {
      expect(mealPlanAPI.delete).toHaveBeenCalledWith('plan1');
    });
    
    vi.restoreAllMocks();
  });

  it('displays error message when loading fails', async () => {
    mealPlanAPI.getAll.mockRejectedValue(new Error('Network error'));
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load meal planning data/i)).toBeInTheDocument();
    });
  });

  it('cancels create meal plan modal', async () => {
    const user = userEvent.setup();
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: [] 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('No meal plans yet')).toBeInTheDocument();
    });
    
    // Open modal
    const createButton = screen.getByRole('button', { name: /Create Your First Meal Plan/i });
    await user.click(createButton);
    
    expect(screen.getByText('Create Meal Plan')).toBeInTheDocument();
    
    // Cancel
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Create Meal Plan')).not.toBeInTheDocument();
    });
  });

  it('displays all four meal types', async () => {
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Meal Planning')).toBeInTheDocument();
    });
    
    // Check for all meal type labels
    expect(screen.getAllByText('breakfast').length).toBeGreaterThan(0);
    expect(screen.getAllByText('lunch').length).toBeGreaterThan(0);
    expect(screen.getAllByText('dinner').length).toBeGreaterThan(0);
    expect(screen.getAllByText('snack').length).toBeGreaterThan(0);
  });

  // REGRESSION TEST: Bug fix for recipes.forEach error
  it('handles non-array recipes data gracefully', async () => {
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    // Simulate malformed API response where data is null/undefined
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
      data: null, // This should be handled gracefully
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalRecipes: 0,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });
    
    renderComponent();
    
    // Should not crash and should render the page
    await waitFor(() => {
      expect(screen.getByText('Meal Planning')).toBeInTheDocument();
    });
    
    // Can still interact with meal plans
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('handles non-array recipes data in RecipeSelectorModal', async () => {
    const user = userEvent.setup();
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    // Simulate malformed API response
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
      data: null, // Non-array data
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalRecipes: 0,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Meal Planning')).toBeInTheDocument();
    });
    
    // Open add meal modal
    const addButtons = screen.getAllByText('+ Add recipe');
    await user.click(addButtons[0]);
    
    // Modal should open without crashing
    await waitFor(() => {
      expect(screen.getByText(/Add.*Recipe/i)).toBeInTheDocument();
    });
    
    // Should show "No recipes available" message
    expect(screen.getByText(/No recipes available/i)).toBeInTheDocument();
  });

  it('handles recipes data as an object instead of array', async () => {
    const user = userEvent.setup();
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: mockMealPlans 
    });
    // Simulate malformed API response where data is an object, not array
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
      data: { recipes: mockRecipes }, // Wrong structure - object instead of array
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 2,
        limit: 50,
        hasNextPage: false,
        hasPrevPage: false
      }
    });
    
    renderComponent();
    
    // Should not crash
    await waitFor(() => {
      expect(screen.getByText('Meal Planning')).toBeInTheDocument();
    });
    
    // Open add meal modal
    const addButtons = screen.getAllByText('+ Add recipe');
    await user.click(addButtons[0]);
    
    // Modal should open and handle the non-array data gracefully
    await waitFor(() => {
      expect(screen.getByText(/Add.*Recipe/i)).toBeInTheDocument();
    });
    
    // Should show empty state message
    expect(screen.getByText(/No recipes available/i)).toBeInTheDocument();
  });

  // REGRESSION TEST: Date off-by-one bug fix
  it('correctly displays meal plan dates without timezone conversion errors', async () => {
    // Create a meal plan for Feb 15-21, 2026 (Sunday through Saturday)
    const mealPlanWithSpecificDates = {
      _id: 'plan-feb15',
      name: 'Week of Feb 15',
      startDate: '2026-02-15', // Sunday
      endDate: '2026-02-21',   // Saturday
      meals: [
        {
          _id: 'meal-sun',
          date: '2026-02-15', // Sunday
          mealType: 'breakfast',
          recipes: [
            {
              _id: 'recipe1',
              recipe: {
                _id: 'r1',
                title: 'Sunday Pancakes',
              },
              servings: 4,
            },
          ],
        },
        {
          _id: 'meal-sat',
          date: '2026-02-21', // Saturday
          mealType: 'dinner',
          recipes: [
            {
              _id: 'recipe2',
              recipe: {
                _id: 'r2',
                title: 'Saturday Steak',
              },
              servings: 2,
            },
          ],
        },
      ],
    };
    
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: [mealPlanWithSpecificDates]
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Week of Feb 15')).toBeInTheDocument();
    });
    
    // The calendar should display exactly 7 days: Feb 15-21
    // Key assertions: First day should be Feb 15 (not Feb 14), last day should be Feb 21 (not Feb 20)
    
    // Check that Sunday Feb 15 is displayed
    const sundayHeader = screen.getByText('Sun');
    expect(sundayHeader).toBeInTheDocument();
    const feb15Date = screen.getByText((content, element) => {
      return element?.textContent === 'Feb 15';
    });
    expect(feb15Date).toBeInTheDocument();
    
    // Check that Saturday Feb 21 is displayed
    const saturdayHeader = screen.getByText('Sat');
    expect(saturdayHeader).toBeInTheDocument();
    const feb21Date = screen.getByText((content, element) => {
      return element?.textContent === 'Feb 21';
    });
    expect(feb21Date).toBeInTheDocument();
    
    // Verify meals appear on correct dates
    expect(screen.getByText('Sunday Pancakes')).toBeInTheDocument();
    expect(screen.getByText('Saturday Steak')).toBeInTheDocument();
    
    // Additional verification: count day headers (should be exactly 7)
    const dayHeaders = screen.getAllByText(/(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/);
    expect(dayHeaders.length).toBe(7);
  });

  it('creates meal plan with correct dates from date picker', async () => {
    const user = userEvent.setup();
    const newPlan = {
      _id: 'plan-feb15',
      name: 'Week of Feb 15',
      startDate: '2026-02-15', // Sunday
      endDate: '2026-02-21',   // Saturday
      meals: [],
    };
    
    mealPlanAPI.getAll.mockResolvedValue({ 
      success: true,
      data: [] 
    });
    recipeAPI.getAll.mockResolvedValue({ 
      success: true,
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
    mealPlanAPI.create.mockResolvedValue({ 
      success: true,
      data: newPlan 
    });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('No meal plans yet')).toBeInTheDocument();
    });
    
    // Open modal
    const createButton = screen.getByRole('button', { name: /Create Your First Meal Plan/i });
    await user.click(createButton);
    
    // Fill form with Feb 15-21 dates
    await user.type(screen.getByPlaceholderText('Week of Jan 15'), 'Week of Feb 15');
    await user.type(screen.getByLabelText(/Start Date/i), '2026-02-15');
    await user.type(screen.getByLabelText(/End Date/i), '2026-02-21');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: 'Create Plan' });
    await user.click(submitButton);
    
    // Verify API was called with correct dates (no timezone conversion)
    await waitFor(() => {
      expect(mealPlanAPI.create).toHaveBeenCalledWith({
        name: 'Week of Feb 15',
        startDate: '2026-02-15', // Should be Feb 15, not Feb 14
        endDate: '2026-02-21',   // Should be Feb 21, not Feb 20
      });
    });
  });
});
