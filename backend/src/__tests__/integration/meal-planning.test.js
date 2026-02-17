import request from 'supertest';
import mongoose from 'mongoose';
import { clearDatabase, ensureConnection } from '../setup/mongodb.js';
import app from '../../index.js';
import User from '../../models/User.js';
import Recipe from '../../models/Recipe.js';
import MealPlan from '../../models/MealPlan.js';

describe('Meal Planning API Integration Tests', () => {
  let authToken;
  let userId;
  let testRecipe;

  beforeAll(async () => {
    await ensureConnection();
    
    // Create test user and login
    const testUser = {
      email: 'mealplan@test.com',
      password: 'Password123',
      displayName: 'Meal Planner',
    };

    await User.create(testUser);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    authToken = loginRes.body.data.accessToken;
    userId = loginRes.body.data.user.id;

    // Create a test recipe
    testRecipe = await Recipe.create({
      title: 'Test Recipe',
      servings: 4,
      ingredients: [
        { item: 'Flour', quantity: 2, unit: 'cups', category: 'Baking' },
        { item: 'Sugar', quantity: 1, unit: 'cup', category: 'Baking' },
      ],
      instructions: ['Mix ingredients', 'Bake'],
      owner: userId,
    });
  }, 30000);

  afterAll(async () => {
    // DO NOT disconnect - shared connection managed by global teardown
  });

  afterEach(async () => {
    await MealPlan.deleteMany({ owner: userId });
  });

  describe('POST /api/meal-plans', () => {
    it('should create a new meal plan', async () => {
      const startDate = new Date('2026-01-15');
      const endDate = new Date('2026-01-21');

      const res = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Week of Jan 15',
          startDate,
          endDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Week of Jan 15');
      expect(res.body.owner).toBe(userId);
      expect(res.body.meals).toEqual([]);
      expect(new Date(res.body.startDate)).toEqual(startDate);
      expect(new Date(res.body.endDate)).toEqual(endDate);
    });

    it('should reject meal plans longer than 28 days', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-02-15'); // 45 days

      const res = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Too Long',
          startDate,
          endDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot exceed 4 weeks/i);
    });

    it('should detect overlapping meal plans', async () => {
      const startDate = new Date('2026-01-15');
      const endDate = new Date('2026-01-21');

      // Create first plan
      await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Week 1',
          startDate,
          endDate,
        });

      // Try to create overlapping plan
      const res = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Week 2',
          startDate: new Date('2026-01-18'),
          endDate: new Date('2026-01-24'),
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/overlaps/i);
      expect(res.body.overlappingPlans).toBeDefined();
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/meal-plans')
        .send({
          name: 'Test Plan',
          startDate: new Date(),
          endDate: new Date(),
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/meal-plans', () => {
    it('should get all meal plans for authenticated user', async () => {
      // Create multiple plans
      await MealPlan.create([
        {
          name: 'Plan 1',
          startDate: new Date('2026-01-15'),
          endDate: new Date('2026-01-21'),
          owner: userId,
        },
        {
          name: 'Plan 2',
          startDate: new Date('2026-01-22'),
          endDate: new Date('2026-01-28'),
          owner: userId,
        },
      ]);

      const res = await request(app)
        .get('/api/meal-plans')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].name).toBeTruthy();
    });

    it('should filter templates when requested', async () => {
      await MealPlan.create([
        {
          name: 'Regular Plan',
          startDate: new Date('2026-01-15'),
          endDate: new Date('2026-01-21'),
          owner: userId,
          isTemplate: false,
        },
        {
          name: 'Template Plan',
          startDate: new Date('2000-01-01'),
          endDate: new Date('2000-01-07'),
          owner: userId,
          isTemplate: true,
        },
      ]);

      const res = await request(app)
        .get('/api/meal-plans?isTemplate=false')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Regular Plan');
    });
  });

  describe('POST /api/meal-plans/:id/meals', () => {
    let mealPlan;

    beforeEach(async () => {
      mealPlan = await MealPlan.create({
        name: 'Test Plan',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-21'),
        owner: userId,
      });
    });

    it('should add a meal to the plan', async () => {
      const res = await request(app)
        .post(`/api/meal-plans/${mealPlan._id}/meals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2026-01-15',
          mealType: 'breakfast',
          recipeId: testRecipe._id,
          servings: 4,
          notes: 'Make extra',
        });

      expect(res.status).toBe(200);
      expect(res.body.meals.length).toBe(1);
      expect(res.body.meals[0].mealType).toBe('breakfast');
      expect(res.body.meals[0].recipes[0].servings).toBe(4);
      expect(res.body.meals[0].recipes[0].notes).toBe('Make extra');
    });

    it('should reject invalid recipe ID', async () => {
      const res = await request(app)
        .post(`/api/meal-plans/${mealPlan._id}/meals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2026-01-15',
          mealType: 'breakfast',
          recipeId: new mongoose.Types.ObjectId(),
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/recipe not found/i);
    });

    it('should add multiple recipes to same meal', async () => {
      // Add first recipe
      await request(app)
        .post(`/api/meal-plans/${mealPlan._id}/meals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2026-01-15',
          mealType: 'breakfast',
          recipeId: testRecipe._id,
        });

      // Add second recipe to same meal
      const recipe2 = await Recipe.create({
        title: 'Second Recipe',
        servings: 2,
        ingredients: [],
        instructions: [],
        owner: userId,
      });

      const res = await request(app)
        .post(`/api/meal-plans/${mealPlan._id}/meals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2026-01-15',
          mealType: 'breakfast',
          recipeId: recipe2._id,
        });

      expect(res.status).toBe(200);
      expect(res.body.meals.length).toBe(1);
      expect(res.body.meals[0].recipes.length).toBe(2);
    });
  });

  describe('DELETE /api/meal-plans/:id/meals/:mealId', () => {
    let mealPlan;

    beforeEach(async () => {
      mealPlan = await MealPlan.create({
        name: 'Test Plan',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-21'),
        owner: userId,
        meals: [
          {
            date: new Date('2026-01-15'),
            mealType: 'breakfast',
            recipes: [{ recipe: testRecipe._id }],
          },
        ],
      });
    });

    it('should remove a meal from the plan', async () => {
      const mealId = mealPlan.meals[0]._id;

      const res = await request(app)
        .delete(`/api/meal-plans/${mealPlan._id}/meals/${mealId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meals.length).toBe(0);
    });

    it('should return 404 for non-existent meal', async () => {
      const fakeMealId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/meal-plans/${mealPlan._id}/meals/${fakeMealId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/meal-plans/:id/shopping-list', () => {
    it('should generate shopping list from meal plan', async () => {
      const mealPlan = await MealPlan.create({
        name: 'Test Plan',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-21'),
        owner: userId,
        meals: [
          {
            date: new Date('20 26-01-15'),
            mealType: 'breakfast',
            recipes: [{ recipe: testRecipe._id, servings: 8 }], // Double servings
          },
        ],
      });

      const res = await request(app)
        .get(`/api/meal-plans/${mealPlan._id}/shopping-list`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.mealPlanId).toBe(mealPlan._id.toString());
      expect(res.body.ingredients).toBeDefined();
      expect(res.body.ingredients.Baking).toBeDefined();
      
      // Check quantities are doubled (4 servings -> 8 servings = 2x)
      const flour = res.body.ingredients.Baking.find(i => i.item === 'Flour');
      expect(flour.quantity).toBe(4); // 2 cups * 2
    });
  });

  describe('POST /api/meal-plans/:id/duplicate', () => {
    let mealPlan;

    beforeEach(async () => {
      mealPlan = await MealPlan.create({
        name: 'Original Plan',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-21'),
        owner: userId,
        meals: [
          {
            date: new Date('2026-01-15'),
            mealType: 'breakfast',
            recipes: [{ recipe: testRecipe._id }],
          },
        ],
      });
    });

    it('should duplicate as template', async () => {
      const res = await request(app)
        .post(`/api/meal-plans/${mealPlan._id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ asTemplate: true });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Original Plan (Template)');
      expect(res.body.isTemplate).toBe(true);
      expect(res.body.meals.length).toBe(1);
    });

    it('should duplicate to new dates', async () => {
      const res = await request(app)
        .post(`/api/meal-plans/${mealPlan._id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ startDate: '2026-01-22' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Original Plan (Copy)');
      expect(res.body.isTemplate).toBe(false);
      expect(new Date(res.body.startDate).toISOString().split('T')[0]).toBe('2026-01-22');
    });

    it('should reject duplicate if dates overlap', async () => {
      const res = await request(app)
        .post(`/api/meal-plans/${mealPlan._id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ startDate: '2026-01-17' }); // Overlaps with original

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/overlap/i);
    });
  });

  describe('DELETE /api/meal-plans/:id', () => {
    it('should delete a meal plan', async () => {
      const mealPlan = await MealPlan.create({
        name: 'To Delete',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-21'),
        owner: userId,
      });

      const res = await request(app)
        .delete(`/api/meal-plans/${mealPlan._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted successfully/i);

      // Verify it's gone
      const check = await MealPlan.findById(mealPlan._id);
      expect(check).toBeNull();
    });

    it('should not allow deleting other users meal plans', async () => {
      const otherUser = await User.create({
        email: 'other@test.com',
        password: 'Password123',
        displayName: 'Other User',
      });

      const otherPlan = await MealPlan.create({
        name: 'Other Plan',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-21'),
        owner: otherUser._id,
      });

      const res = await request(app)
        .delete(`/api/meal-plans/${otherPlan._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/meal-plans/:id', () => {
    it('should update meal plan details', async () => {
      const mealPlan = await MealPlan.create({
        name: 'Original Name',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-21'),
        owner: userId,
      });

      const res = await request(app)
        .put(`/api/meal-plans/${mealPlan._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });

    it('should detect overlaps when updating dates', async () => {
      const plan1 = await MealPlan.create({
        name: 'Plan 1',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-21'),
        owner: userId,
      });

      const plan2 = await MealPlan.create({
        name: 'Plan 2',
        startDate: new Date('2026-01-22'),
        endDate: new Date('2026-01-28'),
        owner: userId,
      });

      const res = await request(app)
        .put(`/api/meal-plans/${plan2._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ startDate: '2026-01-18' }); // Would overlap with plan1

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/overlap/i);
    });
  });
});