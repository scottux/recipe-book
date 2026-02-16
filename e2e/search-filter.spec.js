import { test, expect } from '@playwright/test';

test.describe('Search and Filter Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Create some test recipes with different attributes
    await page.goto('/add');
    await page.click('text=Manual Entry');
    
    // Create Italian pasta recipe
    await page.fill('input[name="title"]', 'Italian Pasta Carbonara');
    await page.fill('textarea[name="description"]', 'Classic Italian pasta dish');
    await page.selectOption('select[name="cuisine"]', 'Italian');
    await page.selectOption('select[name="dishType"]', 'Main Course');
    await page.fill('input[placeholder*="ingredient name"]', 'pasta');
    await page.click('text=Add Ingredient');
    await page.fill('textarea[placeholder*="instruction"]', 'Cook pasta');
    await page.click('text=Add Step');
    await page.click('button[type="submit"]');

    // Go back and create another recipe
    await page.goto('/add');
    await page.click('text=Manual Entry');
    
    // Create American dessert
    await page.fill('input[name="title"]', 'American Chocolate Cake');
    await page.fill('textarea[name="description"]', 'Rich chocolate dessert');
    await page.selectOption('select[name="cuisine"]', 'American');
    await page.selectOption('select[name="dishType"]', 'Dessert');
    await page.fill('input[placeholder*="ingredient name"]', 'chocolate');
    await page.click('text=Add Ingredient');
    await page.fill('textarea[placeholder*="instruction"]', 'Bake cake');
    await page.click('text=Add Step');
    await page.click('button[type="submit"]');

    // Navigate to home
    await page.goto('/');
  });

  test('should search recipes by text', async ({ page }) => {
    await page.goto('/');
    
    // Search for 'pasta'
    await page.fill('input[placeholder*="Search"]', 'pasta');
    await page.keyboard.press('Enter');

    // Should find the pasta recipe
    await expect(page.locator('text=Italian Pasta Carbonara')).toBeVisible();
    await expect(page.locator('text=American Chocolate Cake')).not.toBeVisible();
  });

  test('should filter recipes by cuisine', async ({ page }) => {
    await page.goto('/');
    
    // Filter by Italian cuisine
    await page.selectOption('select[name="cuisine"]', 'Italian');

    // Should show only Italian recipe
    await expect(page.locator('text=Italian Pasta Carbonara')).toBeVisible();
    await expect(page.locator('text=American Chocolate Cake')).not.toBeVisible();
  });

  test('should filter recipes by dish type', async ({ page }) => {
    await page.goto('/');
    
    // Filter by Dessert
    await page.selectOption('select[name="dishType"]', 'Dessert');

    // Should show only dessert
    await expect(page.locator('text=American Chocolate Cake')).toBeVisible();
    await expect(page.locator('text=Italian Pasta Carbonara')).not.toBeVisible();
  });

  test('should combine search and filters', async ({ page }) => {
    await page.goto('/');
    
    // Search and filter
    await page.fill('input[placeholder*="Search"]', 'chocolate');
    await page.selectOption('select[name="cuisine"]', 'American');

    // Should find the American chocolate cake
    await expect(page.locator('text=American Chocolate Cake')).toBeVisible();
    await expect(page.locator('text=Italian Pasta Carbonara')).not.toBeVisible();
  });

  test('should sort recipes', async ({ page }) => {
    await page.goto('/');
    
    // Sort by title
    await page.selectOption('select[name="sortBy"]', 'title');

    // Verify order (American before Italian alphabetically)
    const recipes = await page.locator('.recipe-card h3').allTextContents();
    expect(recipes[0]).toContain('American');
    expect(recipes[1]).toContain('Italian');
  });

  test('should clear filters', async ({ page }) => {
    await page.goto('/');
    
    // Apply filters
    await page.selectOption('select[name="cuisine"]', 'Italian');
    await expect(page.locator('text=American Chocolate Cake')).not.toBeVisible();

    // Clear filters
    await page.click('text=Clear Filters');

    // Should show all recipes
    await expect(page.locator('text=Italian Pasta Carbonara')).toBeVisible();
    await expect(page.locator('text=American Chocolate Cake')).toBeVisible();
  });

  test('should handle pagination', async ({ page }) => {
    await page.goto('/');
    
    // If there are many recipes, test pagination
    const paginationExists = await page.locator('text=Next').isVisible().catch(() => false);
    
    if (paginationExists) {
      await page.click('text=Next');
      await expect(page).toHaveURL(/page=2/);
      
      await page.click('text=Previous');
      await expect(page).toHaveURL(/page=1/);
    }
  });

  test('should toggle grid and list views', async ({ page }) => {
    await page.goto('/');
    
    // Switch to list view
    await page.click('[title="List View"]');
    
    // Verify list view is active
    const listView = page.locator('.list-view');
    await expect(listView).toBeVisible();

    // Switch back to grid view
    await page.click('[title="Grid View"]');
    
    // Verify grid view is active
    const gridView = page.locator('.grid-view');
    await expect(gridView).toBeVisible();
  });
});