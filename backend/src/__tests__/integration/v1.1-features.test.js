import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { clearDatabase, ensureConnection } from '../setup/mongodb.js';
import Recipe from '../../models/Recipe.js';
import recipeRoutes from '../../routes/recipes.js';
import { clearCache } from '../../middleware/cache.js';

describe('V1.1 Features Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await ensureConnection();

    // Setup Express app with v1.1 features
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/api/recipes', recipeRoutes);
  });

  afterEach(async () => {
    await Recipe.deleteMany({});
    clearCache(); // Clear cache between tests
  });

  describe('Input Validation & Sanitization', () => {
    test('should reject recipe with missing required fields', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({
          description: 'Test description'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    test('should reject recipe with title exceeding max length', async () => {
      const longTitle = 'a'.repeat(201);
      const res = await request(app)
        .post('/api/recipes')
        .send({
          title: longTitle,
          ingredients: [{ name: 'test' }],
          instructions: ['step 1']
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should sanitize HTML in recipe fields', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({
          title: '<script>alert("xss")</script>Clean Title',
          description: '<b>Bold</b> description',
          ingredients: [{ name: '<img src=x onerror=alert(1)>flour' }],
          instructions: ['<a href="javascript:alert(1)">Click</a>Mix ingredients']
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).not.toContain('<script>');
      expect(res.body.data.title).not.toContain('alert');
      expect(res.body.data.description).not.toContain('<b>');
      expect(res.body.data.ingredients[0].name).not.toContain('<img');
      expect(res.body.data.instructions[0]).not.toContain('<a href');
    });

    test('should validate numeric fields', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({
          title: 'Test Recipe',
          ingredients: [{ name: 'test' }],
          instructions: ['step 1'],
          prepTime: -5, // Invalid negative
          servings: 0 // Invalid zero
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should validate dishType enum', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({
          title: 'Test Recipe',
          ingredients: [{ name: 'test' }],
          instructions: ['step 1'],
          dishType: 'Invalid Type'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should validate rating range', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({
          title: 'Test Recipe',
          ingredients: [{ name: 'test' }],
          instructions: ['step 1'],
          rating: 6 // Invalid, max is 5
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should validate URL format', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({
          title: 'Test Recipe',
          ingredients: [{ name: 'test' }],
          instructions: ['step 1'],
          sourceUrl: 'not-a-valid-url'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should accept valid recipe with all fields', async () => {
      const validRecipe = {
        title: 'Valid Recipe',
        description: 'A valid recipe description',
        ingredients: [
          { name: 'flour', amount: '2', unit: 'cups' },
          { name: 'sugar', amount: '1', unit: 'cup' }
        ],
        instructions: ['Mix ingredients', 'Bake at 350F'],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        dishType: 'Dessert',
        cuisine: 'American',
        tags: ['easy', 'quick'],
        rating: 4.5,
        sourceUrl: 'https://example.com/recipe'
      };

      const res = await request(app)
        .post('/api/recipes')
        .send(validRecipe);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Valid Recipe');
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create 25 test recipes
      const recipes = Array.from({ length: 25 }, (_, i) => ({
        title: `Recipe ${i + 1}`,
        ingredients: [{ name: 'ingredient' }],
        instructions: ['step 1']
      }));
      await Recipe.insertMany(recipes);
    });

    test('should return paginated results with default limit', async () => {
      const res = await request(app).get('/api/recipes');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(25); // Default limit is 50
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.currentPage).toBe(1);
      expect(res.body.pagination.totalRecipes).toBe(25);
    });

    test('should return correct page with custom limit', async () => {
      const res = await request(app)
        .get('/api/recipes')
        .query({ page: 2, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.pagination.currentPage).toBe(2);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.totalPages).toBe(3);
      expect(res.body.pagination.hasNextPage).toBe(true);
      expect(res.body.pagination.hasPrevPage).toBe(true);
    });

    test('should return last page correctly', async () => {
      const res = await request(app)
        .get('/api/recipes')
        .query({ page: 3, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5); // Only 5 recipes on last page
      expect(res.body.pagination.hasNextPage).toBe(false);
      expect(res.body.pagination.hasPrevPage).toBe(true);
    });

    test('should handle pagination with filters', async () => {
      // Add some recipes with specific cuisine
      await Recipe.create({
        title: 'Italian Recipe',
        cuisine: 'Italian',
        ingredients: [{ name: 'pasta' }],
        instructions: ['cook pasta']
      });

      const res = await request(app)
        .get('/api/recipes')
        .query({ cuisine: 'Italian', page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.pagination.totalRecipes).toBe(1);
    });
  });

  describe('Caching', () => {
    test('should cache GET requests', async () => {
      // Create a recipe
      const recipe = await Recipe.create({
        title: 'Cached Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['step 1']
      });

      // First request (cache miss)
      const res1 = await request(app).get(`/api/recipes/${recipe._id}`);
      expect(res1.status).toBe(200);

      // Second request (should be cached)
      const res2 = await request(app).get(`/api/recipes/${recipe._id}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data._id).toBe(recipe._id.toString());
    });

    test('should clear cache on recipe creation', async () => {
      // Get initial list (populates cache)
      await request(app).get('/api/recipes');

      // Create new recipe (should clear cache)
      await request(app)
        .post('/api/recipes')
        .send({
          title: 'New Recipe',
          ingredients: [{ name: 'test' }],
          instructions: ['step 1']
        });

      // Get list again (should reflect new recipe)
      const res = await request(app).get('/api/recipes');
      expect(res.body.data.length).toBe(1);
    });

    test('should clear cache on recipe update', async () => {
      const recipe = await Recipe.create({
        title: 'Original Title',
        ingredients: [{ name: 'test' }],
        instructions: ['step 1']
      });

      // Cache the recipe
      await request(app).get(`/api/recipes/${recipe._id}`);

      // Update recipe
      await request(app)
        .put(`/api/recipes/${recipe._id}`)
        .send({
          title: 'Updated Title',
          ingredients: [{ name: 'test' }],
          instructions: ['step 1']
        });

      // Get recipe again
      const res = await request(app).get(`/api/recipes/${recipe._id}`);
      expect(res.body.data.title).toBe('Updated Title');
    });

    test('should clear cache on recipe deletion', async () => {
      const recipe = await Recipe.create({
        title: 'To Delete',
        ingredients: [{ name: 'test' }],
        instructions: ['step 1']
      });

      // Cache the list
      await request(app).get('/api/recipes');

      // Delete recipe
      await request(app).delete(`/api/recipes/${recipe._id}`);

      // Get list again
      const res = await request(app).get('/api/recipes');
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('Lock Recipe Feature', () => {
    test('should toggle recipe lock status', async () => {
      const recipe = await Recipe.create({
        title: 'Lockable Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['step 1']
      });

      // Lock the recipe
      const lockRes = await request(app).put(`/api/recipes/${recipe._id}/lock`);
      expect(lockRes.status).toBe(200);
      expect(lockRes.body.data.isLocked).toBe(true);

      // Unlock the recipe
      const unlockRes = await request(app).put(`/api/recipes/${recipe._id}/lock`);
      expect(unlockRes.status).toBe(200);
      expect(unlockRes.body.data.isLocked).toBe(false);
    });

    test('should prevent deletion of locked recipe', async () => {
      const recipe = await Recipe.create({
        title: 'Locked Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['step 1'],
        isLocked: true
      });

      const res = await request(app).delete(`/api/recipes/${recipe._id}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('locked');

      // Verify recipe still exists
      const stillExists = await Recipe.findById(recipe._id);
      expect(stillExists).toBeTruthy();
    });

    test('should allow deletion of unlocked recipe', async () => {
      const recipe = await Recipe.create({
        title: 'Unlocked Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['step 1'],
        isLocked: false
      });

      const res = await request(app).delete(`/api/recipes/${recipe._id}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify recipe is deleted
      const deleted = await Recipe.findById(recipe._id);
      expect(deleted).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent recipe', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/recipes/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('should handle invalid MongoDB ID format', async () => {
      const res = await request(app).get('/api/recipes/invalid-id');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    test('should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(res.status).toBe(400);
    });
  });
});