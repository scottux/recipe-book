import { test, expect } from '@playwright/test';

test.describe('Recipe CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display recipe list on home page', async ({ page }) => {
    await expect(page).toHaveTitle(/Recipe Book/i);
    await expect(page.locator('h1')).toContainText(/recipe/i);
  });

  test('should create a new recipe manually', async ({ page }) => {
    // Navigate to add recipe page
    await page.click('text=Add Recipe');
    await expect(page).toHaveURL(/\/add/);

    // Switch to Manual Entry tab
    await page.click('text=Manual Entry');

    // Fill out the recipe form
    await page.fill('input[name="title"]', 'E2E Test Recipe');
    await page.fill('textarea[name="description"]', 'A recipe created by E2E test');
    
    // Add ingredients
    await page.fill('input[placeholder*="ingredient name"]', 'flour');
    await page.fill('input[placeholder*="amount"]', '2');
    await page.fill('input[placeholder*="unit"]', 'cups');
    await page.click('text=Add Ingredient');

    // Add instructions
    await page.fill('textarea[placeholder*="instruction"]', 'Mix all ingredients');
    await page.click('text=Add Step');

    // Fill additional fields
    await page.fill('input[name="prepTime"]', '15');
    await page.fill('input[name="cookTime"]', '30');
    await page.fill('input[name="servings"]', '4');
    
    // Select dish type
    await page.selectOption('select[name="dishType"]', 'Main Course');

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to recipe detail page
    await expect(page).toHaveURL(/\/recipes\/[a-f0-9]+/);
    await expect(page.locator('h1')).toContainText('E2E Test Recipe');
  });

  test('should view recipe details', async ({ page }) => {
    // First create a recipe
    await page.goto('/add');
    await page.click('text=Manual Entry');
    
    await page.fill('input[name="title"]', 'View Test Recipe');
    await page.fill('input[placeholder*="ingredient name"]', 'test ingredient');
    await page.click('text=Add Ingredient');
    await page.fill('textarea[placeholder*="instruction"]', 'test step');
    await page.click('text=Add Step');
    await page.click('button[type="submit"]');

    // Verify recipe details are displayed
    await expect(page.locator('h1')).toContainText('View Test Recipe');
    await expect(page.locator('text=test ingredient')).toBeVisible();
    await expect(page.locator('text=test step')).toBeVisible();
  });

  test('should edit an existing recipe', async ({ page }) => {
    // Create a recipe first
    await page.goto('/add');
    await page.click('text=Manual Entry');
    
    await page.fill('input[name="title"]', 'Original Title');
    await page.fill('input[placeholder*="ingredient name"]', 'ingredient');
    await page.click('text=Add Ingredient');
    await page.fill('textarea[placeholder*="instruction"]', 'step');
    await page.click('text=Add Step');
    await page.click('button[type="submit"]');

    // Click edit button
    await page.click('text=Edit');

    // Modify the title
    await page.fill('input[name="title"]', 'Updated Title');
    await page.click('button:has-text("Save")');

    // Verify the update
    await expect(page.locator('h1')).toContainText('Updated Title');
  });

  test('should delete a recipe', async ({ page }) => {
    // Create a recipe first
    await page.goto('/add');
    await page.click('text=Manual Entry');
    
    await page.fill('input[name="title"]', 'Recipe to Delete');
    await page.fill('input[placeholder*="ingredient name"]', 'ingredient');
    await page.click('text=Add Ingredient');
    await page.fill('textarea[placeholder*="instruction"]', 'step');
    await page.click('text=Add Step');
    await page.click('button[type="submit"]');

    // Click delete button
    page.on('dialog', dialog => dialog.accept());
    await page.click('text=Delete');

    // Should redirect to home page
    await expect(page).toHaveURL('/');
  });

  test('should prevent deletion of locked recipe', async ({ page }) => {
    // Create a recipe
    await page.goto('/add');
    await page.click('text=Manual Entry');
    
    await page.fill('input[name="title"]', 'Locked Recipe');
    await page.fill('input[placeholder*="ingredient name"]', 'ingredient');
    await page.click('text=Add Ingredient');
    await page.fill('textarea[placeholder*="instruction"]', 'step');
    await page.click('text=Add Step');
    await page.click('button[type="submit"]');

    // Lock the recipe
    await page.click('text=🔓');
    await expect(page.locator('text=🔒')).toBeVisible();

    // Try to delete - should show error
    page.on('dialog', dialog => dialog.accept());
    await page.click('text=Delete');
    
    // Should still be on the same page with error message
    await expect(page.locator('text=locked')).toBeVisible();
  });
});