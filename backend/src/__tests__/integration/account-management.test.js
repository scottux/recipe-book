import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../index.js';
import User from '../../models/User.js';
import Recipe from '../../models/Recipe.js';
import Collection from '../../models/Collection.js';
import MealPlan from '../../models/MealPlan.js';
import ShoppingList from '../../models/ShoppingList.js';

let mongoServer;
let testUser;
let accessToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  await User.deleteMany({});
  await Recipe.deleteMany({});
  await Collection.deleteMany({});
  await MealPlan.deleteMany({});
  await ShoppingList.deleteMany({});

  // Create test user and login
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'test@example.com',
      password: 'Password123',
      displayName: 'Test User'
    });

  testUser = registerRes.body.data.user;
  accessToken = registerRes.body.data.accessToken;
});

describe('Account Management - Update Password', () => {
  test('should update password successfully', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'NewPassword123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Password updated successfully.');

    // Verify can login with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'NewPassword123'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
  });

  test('should verify old password no longer works after update', async () => {
    // Update password
    await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'NewPassword123'
      });

    // Try to login with old password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123'
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
  });

  test('should reject incorrect current password', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Current password is incorrect.');
  });

  test('should reject weak new password', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'short'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('at least 8 characters');
  });

  test('should reject new password same as current', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'Password123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('New password must be different from current password.');
  });

  test('should reject request without authentication', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .send({
        currentPassword: 'Password123',
        newPassword: 'NewPassword123'
      });

    expect(res.status).toBe(401);
  });

  test('should reject missing fields', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'Password123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should keep session active after password change', async () => {
    // Update password
    await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'NewPassword123'
      });

    // Verify same token still works
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
  });
});

describe('Account Management - Delete Account', () => {
  test('should delete account successfully', async () => {
    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        password: 'Password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Account deleted successfully.');

    // Verify user no longer exists
    const user = await User.findById(testUser.id);
    expect(user).toBeNull();
  });

  test('should prevent login after account deletion', async () => {
    // Delete account
    await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        password: 'Password123'
      });

    // Try to login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123'
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
  });

  test('should delete all user recipes on account deletion', async () => {
    // Create test recipes
    const user = await User.findById(testUser.id);
    await Recipe.create([
      {
        owner: user._id,
        title: 'Recipe 1',
        ingredients: [{ name: 'Ingredient 1' }],
        instructions: ['Step 1']
      },
      {
        owner: user._id,
        title: 'Recipe 2',
        ingredients: [{ name: 'Ingredient 2' }],
        instructions: ['Step 2']
      }
    ]);

    // Verify recipes exist
    let recipes = await Recipe.find({ owner: user._id });
    expect(recipes).toHaveLength(2);

    // Delete account
    await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        password: 'Password123'
      });

    // Verify recipes are deleted
    recipes = await Recipe.find({ owner: user._id });
    expect(recipes).toHaveLength(0);
  });

  test('should delete all user collections on account deletion', async () => {
    // Create test collection
    const user = await User.findById(testUser.id);
    await Collection.create({
      owner: user._id,
      name: 'Test Collection',
      description: 'Test',
      recipes: []
    });

    // Verify collection exists
    let collections = await Collection.find({ owner: user._id });
    expect(collections).toHaveLength(1);

    // Delete account
    await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        password: 'Password123'
      });

    // Verify collection is deleted
    collections = await Collection.find({ owner: user._id });
    expect(collections).toHaveLength(0);
  });

  test('should delete all user meal plans on account deletion', async () => {
    // Create test meal plan
    const user = await User.findById(testUser.id);
    await MealPlan.create({
      owner: user._id,
      name: 'Test Plan',
      startDate: new Date(),
      endDate: new Date(),
      meals: []
    });

    // Verify meal plan exists
    let mealPlans = await MealPlan.find({ owner: user._id });
    expect(mealPlans).toHaveLength(1);

    // Delete account
    await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        password: 'Password123'
      });

    // Verify meal plan is deleted
    mealPlans = await MealPlan.find({ owner: user._id });
    expect(mealPlans).toHaveLength(0);
  });

  test('should delete all user shopping lists on account deletion', async () => {
    // Create test shopping list
    const user = await User.findById(testUser.id);
    await ShoppingList.create({
      owner: user._id,
      name: 'Test List',
      items: []
    });

    // Verify shopping list exists
    let shoppingLists = await ShoppingList.find({ owner: user._id });
    expect(shoppingLists).toHaveLength(1);

    // Delete account
    await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        password: 'Password123'
      });

    // Verify shopping list is deleted
    shoppingLists = await ShoppingList.find({ owner: user._id });
    expect(shoppingLists).toHaveLength(0);
  });

  test('should reject incorrect password for account deletion', async () => {
    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        password: 'WrongPassword'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Password is incorrect.');

    // Verify account still exists
    const user = await User.findById(testUser.id);
    expect(user).not.toBeNull();
  });

  test('should reject request without authentication', async () => {
    const res = await request(app)
      .delete('/api/auth/account')
      .send({
        password: 'Password123'
      });

    expect(res.status).toBe(401);
  });

  test('should reject missing password', async () => {
    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Account Management - Complete Flow', () => {
  test('should complete full account lifecycle', async () => {
    // 1. Create some data
    const user = await User.findById(testUser.id);
    
    const recipe = await Recipe.create({
      owner: user._id,
      title: 'Test Recipe',
      ingredients: [{ name: 'Test Ingredient' }],
      instructions: ['Test Step']
    });

    await Collection.create({
      owner: user._id,
      name: 'Test Collection',
      recipes: [recipe._id]
    });

    // 2. Update password
    const passwordRes = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'NewPassword123'
      });

    expect(passwordRes.status).toBe(200);

    // 3. Verify can still access account with same token
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);

    // 4. Delete account
    const deleteRes = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        password: 'NewPassword123' // Use new password
      });

    expect(deleteRes.status).toBe(200);

    // 5. Verify everything is deleted
    const deletedUser = await User.findById(user._id);
    const deletedRecipes = await Recipe.find({ owner: user._id });
    const deletedCollections = await Collection.find({ owner: user._id });

    expect(deletedUser).toBeNull();
    expect(deletedRecipes).toHaveLength(0);
    expect(deletedCollections).toHaveLength(0);
  });
});