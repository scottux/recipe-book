import request from 'supertest';
import mongoose from 'mongoose';
import { clearDatabase, ensureConnection } from '../setup/mongodb.js';
import app from '../../index.js';
import User from '../../models/User.js';
import Recipe from '../../models/Recipe.js';
import Collection from '../../models/Collection.js';
import MealPlan from '../../models/MealPlan.js';
import ShoppingList from '../../models/ShoppingList.js';

describe('Import from Backup - Integration Tests', () => {
  let authToken;
  let userId;
  let testUser;

  // Sample backup data
  const validBackupV2 = {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    user: {
      username: 'testuser',
      email: 'test@example.com',
    },
    data: {
      recipes: [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Test Recipe 1',
          description: 'A test recipe',
          ingredients: [
            { item: 'Flour', amount: '2', unit: 'cups' },
            { item: 'Sugar', amount: '1', unit: 'cup' },
            { item: 'Eggs', amount: '3', unit: '' },
          ],
          instructions: ['Mix ingredients', 'Bake at 350F'],
          prepTime: 15,
          cookTime: 30,
          servings: 4,
          dishType: 'dessert',
          cuisine: 'American',
          difficulty: 'easy',
          tags: ['sweet', 'baked'],
          rating: 5,
          notes: 'Delicious!',
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: 'Test Recipe 2',
          description: 'Another test recipe',
          ingredients: [
            { item: 'Pasta', amount: '1', unit: 'lb' },
            { item: 'Tomato Sauce', amount: '2', unit: 'cups' },
          ],
          instructions: ['Boil pasta', 'Add sauce'],
          prepTime: 10,
          cookTime: 20,
          servings: 6,
          dishType: 'main',
          cuisine: 'Italian',
          difficulty: 'easy',
        },
      ],
      collections: [
        {
          _id: '507f1f77bcf86cd799439021',
          name: 'Test Collection',
          description: 'A test collection',
          icon: '📚',
          recipeIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        },
      ],
      mealPlans: [
        {
          _id: '507f1f77bcf86cd799439031',
          name: 'Weekly Plan',
          startDate: '2026-02-16',
          endDate: '2026-02-22',
          meals: [
            {
              date: '2026-02-16',
              mealType: 'breakfast',
              recipes: [
                {
                  recipe: '507f1f77bcf86cd799439011',
                  servings: 4,
                },
              ],
            },
          ],
        },
      ],
      shoppingLists: [
        {
          _id: '507f1f77bcf86cd799439041',
          name: 'Groceries',
          items: [
            { ingredient: 'Milk', amount: '1', unit: 'gallon', checked: false },
            { ingredient: 'Bread', amount: '2', unit: 'loaves', checked: true },
          ],
        },
      ],
    },
  };

  beforeAll(async () => {
    await ensureConnection();
    // Create test user
    testUser = await User.create({
      email: 'import@test.com',
      password: 'Password123',
      displayName: 'Import Test User',
    });

    userId = testUser._id;

    // Get auth token
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'import@test.com',
      password: 'Password123',
    });

    authToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Recipe.deleteMany({});
    await Collection.deleteMany({});
    await MealPlan.deleteMany({});
    await ShoppingList.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear user's data before each test
    await Recipe.deleteMany({ owner: userId });
    await Collection.deleteMany({ owner: userId });
    await MealPlan.deleteMany({ owner: userId });
    await ShoppingList.deleteMany({ owner: userId });
  });

  describe('POST /api/import/backup - File Validation', () => {
    it('should reject request with no file', async () => {
      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'merge');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.code).toBe('NO_FILE');
    });

    it('should reject non-JSON file', async () => {
      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('not json'), 'backup.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid JSON', async () => {
      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('{ invalid json }'), 'backup.json');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.code).toBe('INVALID_JSON');
    });

    it('should reject backup missing required fields', async () => {
      const invalidBackup = { version: '2.0.0' }; // Missing exportDate, user, data

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(JSON.stringify(invalidBackup)), 'backup.json');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.code).toBe('MISSING_FIELD');
    });

    it('should reject incompatible version (< 2.0.0)', async () => {
      const oldBackup = {
        ...validBackupV2,
        version: '1.9.0',
      };

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(JSON.stringify(oldBackup)), 'backup.json');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.code).toBe('INCOMPATIBLE_VERSION');
    });
  });

  describe('POST /api/import/backup - Content Validation', () => {
    it('should reject recipe missing title', async () => {
      const invalidBackup = {
        ...validBackupV2,
        data: {
          recipes: [
            {
              _id: '507f1f77bcf86cd799439011',
              // Missing title
              ingredients: [{ item: 'Flour', amount: '2', unit: 'cups' }],
              instructions: ['Mix'],
              servings: 4,
            },
          ],
        },
      };

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(JSON.stringify(invalidBackup)), 'backup.json');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.code).toBe('INVALID_RECIPE');
    });

    it('should reject recipe with empty ingredients', async () => {
      const invalidBackup = {
        ...validBackupV2,
        data: {
          recipes: [
            {
              _id: '507f1f77bcf86cd799439011',
              title: 'Test',
              ingredients: [], // Empty
              instructions: ['Mix'],
              servings: 4,
            },
          ],
        },
      };

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(JSON.stringify(invalidBackup)), 'backup.json');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.code).toBe('INVALID_RECIPE');
    });

    it('should reject recipe with empty instructions', async () => {
      const invalidBackup = {
        ...validBackupV2,
        data: {
          recipes: [
            {
              _id: '507f1f77bcf86cd799439011',
              title: 'Test',
              ingredients: [{ item: 'Flour', amount: '2', unit: 'cups' }],
              instructions: [], // Empty
              servings: 4,
            },
          ],
        },
      };

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(JSON.stringify(invalidBackup)), 'backup.json');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.code).toBe('INVALID_RECIPE');
    });
  });

  describe('POST /api/import/backup - Merge Mode', () => {
    it('should successfully import backup in merge mode', async () => {
      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'merge')
        .attach('file', Buffer.from(JSON.stringify(validBackupV2)), 'backup.json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary).toMatchObject({
        mode: 'merge',
        recipesImported: 2,
        collectionsImported: 1,
        mealPlansImported: 1,
        shoppingListsImported: 1,
        duplicatesSkipped: 0,
      });

      // Verify data was created
      const recipes = await Recipe.find({ owner: userId });
      const collections = await Collection.find({ owner: userId });
      const mealPlans = await MealPlan.find({ owner: userId });
      const shoppingLists = await ShoppingList.find({ owner: userId });

      expect(recipes).toHaveLength(2);
      expect(collections).toHaveLength(1);
      expect(mealPlans).toHaveLength(1);
      expect(shoppingLists).toHaveLength(1);
    });

    it('should skip duplicates in merge mode', async () => {
      // Create existing recipe
      await Recipe.create({
        owner: userId,
        title: 'Test Recipe 1',
        ingredients: [
          { item: 'Flour', amount: '2', unit: 'cups' },
          { item: 'Sugar', amount: '1', unit: 'cup' },
          { item: 'Eggs', amount: '3', unit: '' },
        ],
        instructions: ['Mix ingredients', 'Bake at 350F'],
        servings: 4,
      });

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'merge')
        .attach('file', Buffer.from(JSON.stringify(validBackupV2)), 'backup.json');

      expect(res.status).toBe(200);
      expect(res.body.summary.recipesImported).toBe(1); // Only 1 new recipe
      expect(res.body.summary.duplicatesSkipped).toBe(1); // 1 duplicate skipped

      const recipes = await Recipe.find({ owner: userId });
      expect(recipes).toHaveLength(2); // 1 existing + 1 new
    });

    it('should preserve existing data in merge mode', async () => {
      // Create existing data
      const existingRecipe = await Recipe.create({
        owner: userId,
        title: 'Existing Recipe',
        ingredients: [{ item: 'Chicken', amount: '1', unit: 'lb' }],
        instructions: ['Cook chicken'],
        servings: 2,
      });

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'merge')
        .attach('file', Buffer.from(JSON.stringify(validBackupV2)), 'backup.json');

      expect(res.status).toBe(200);

      // Verify existing data still exists
      const stillExists = await Recipe.findById(existingRecipe._id);
      expect(stillExists).toBeTruthy();

      // Total should be existing + imported
      const recipes = await Recipe.find({ owner: userId });
      expect(recipes).toHaveLength(3); // 1 existing + 2 imported
    });
  });

  describe('POST /api/import/backup - Replace Mode', () => {
    it('should reject replace mode without password', async () => {
      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'replace')
        .attach('file', Buffer.from(JSON.stringify(validBackupV2)), 'backup.json');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.code).toBe('INVALID_PASSWORD');
    });

    it('should reject replace mode with wrong password', async () => {
      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'replace')
        .field('password', 'WrongPassword')
        .attach('file', Buffer.from(JSON.stringify(validBackupV2)), 'backup.json');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.code).toBe('INVALID_PASSWORD');
    });

    it('should delete all existing data in replace mode', async () => {
      // Create existing data
      await Recipe.create({
        owner: userId,
        title: 'Existing Recipe',
        ingredients: [{ item: 'Chicken', amount: '1', unit: 'lb' }],
        instructions: ['Cook chicken'],
        servings: 2,
      });

      await Collection.create({
        owner: userId,
        name: 'Existing Collection',
        recipes: [],
      });

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'replace')
        .field('password', 'Password123')
        .attach('file', Buffer.from(JSON.stringify(validBackupV2)), 'backup.json');

      expect(res.status).toBe(200);
      expect(res.body.summary.mode).toBe('replace');

      // Verify old data is gone, only imported data exists
      const recipes = await Recipe.find({ owner: userId });
      const collections = await Collection.find({ owner: userId });

      expect(recipes).toHaveLength(2); // Only imported recipes
      expect(collections).toHaveLength(1); // Only imported collection
      expect(recipes[0].title).not.toBe('Existing Recipe');
      expect(collections[0].name).not.toBe('Existing Collection');
    });
  });

  describe('POST /api/import/backup - ID Remapping', () => {
    it('should remap recipe IDs in collections', async () => {
      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'merge')
        .attach('file', Buffer.from(JSON.stringify(validBackupV2)), 'backup.json');

      expect(res.status).toBe(200);

      // Get imported collection
      const collection = await Collection.findOne({ owner: userId });
      expect(collection.recipes).toHaveLength(2);

      // Verify references point to real recipes
      const recipe1 = await Recipe.findById(collection.recipes[0]);
      const recipe2 = await Recipe.findById(collection.recipes[1]);
      expect(recipe1).toBeTruthy();
      expect(recipe2).toBeTruthy();
    });

    it('should remap recipe IDs in meal plans', async () => {
      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'merge')
        .attach('file', Buffer.from(JSON.stringify(validBackupV2)), 'backup.json');

      expect(res.status).toBe(200);

      // Get imported meal plan
      const mealPlan = await MealPlan.findOne({ owner: userId });
      expect(mealPlan.meals).toHaveLength(1);
      expect(mealPlan.meals[0].recipes).toHaveLength(1);

      // Verify reference points to real recipe
      const recipeId = mealPlan.meals[0].recipes[0].recipe;
      const recipe = await Recipe.findById(recipeId);
      expect(recipe).toBeTruthy();
    });

    it('should handle missing recipe references gracefully', async () => {
      const backupWithMissingRefs = {
        ...validBackupV2,
        data: {
          recipes: validBackupV2.data.recipes,
          collections: [
            {
              _id: '507f1f77bcf86cd799439021',
              name: 'Test Collection',
              recipeIds: [
                '507f1f77bcf86cd799439011', // Exists
                '507f1f77bcf86cd799439099', // Missing
              ],
            },
          ],
        },
      };

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'merge')
        .attach(
          'file',
          Buffer.from(JSON.stringify(backupWithMissingRefs)),
          'backup.json'
        );

      expect(res.status).toBe(200);

      // Collection should only have valid reference
      const collection = await Collection.findOne({ owner: userId });
      expect(collection.recipes).toHaveLength(1); // Missing ref removed
    });
  });

  describe('POST /api/import/backup - Transaction Rollback', () => {
    it('should rollback on validation error', async () => {
      // Create invalid backup (will fail mid-import)
      const invalidBackup = {
        ...validBackupV2,
        data: {
          recipes: validBackupV2.data.recipes,
          collections: [
            {
              _id: '507f1f77bcf86cd799439021',
              // Missing name - will fail validation
              recipeIds: [],
            },
          ],
        },
      };

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'merge')
        .attach('file', Buffer.from(JSON.stringify(invalidBackup)), 'backup.json');

      expect(res.status).toBe(400);

      // Verify NO data was created (rollback successful)
      const recipes = await Recipe.find({ owner: userId });
      const collections = await Collection.find({ owner: userId });

      expect(recipes).toHaveLength(0);
      expect(collections).toHaveLength(0);
    });
  });

  describe('POST /api/import/backup - Security', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/import/backup')
        .attach('file', Buffer.from(JSON.stringify(validBackupV2)), 'backup.json');

      expect(res.status).toBe(401);
    });

    it('should sanitize XSS in recipe titles', async () => {
      const xssBackup = {
        ...validBackupV2,
        data: {
          recipes: [
            {
              _id: '507f1f77bcf86cd799439011',
              title: '<script>alert("XSS")</script>Safe Title',
              ingredients: [{ item: 'Flour', amount: '2', unit: 'cups' }],
              instructions: ['Mix'],
              servings: 4,
            },
          ],
        },
      };

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'merge')
        .attach('file', Buffer.from(JSON.stringify(xssBackup)), 'backup.json');

      expect(res.status).toBe(200);

      const recipe = await Recipe.findOne({ owner: userId });
      expect(recipe.title).not.toContain('<script>');
      expect(recipe.title).toContain('Safe Title');
    });
  });

  describe('POST /api/import/backup - Performance', () => {
    it('should complete import within reasonable time', async () => {
      const startTime = Date.now();

      const res = await request(app)
        .post('/api/import/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mode', 'merge')
        .attach('file', Buffer.from(JSON.stringify(validBackupV2)), 'backup.json');

      const duration = Date.now() - startTime;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete in < 5s
      expect(res.body.summary.duration).toBeLessThan(5000);
    });
  });
});