# Test Helpers Documentation

This directory contains reusable test helper utilities to make integration tests more maintainable and consistent.

## Overview

The test helpers are organized into specialized modules:

1. **authHelpers.js** - Authentication and user creation utilities
2. **emailMocks.js** - Email service mocking utilities
3. **rateLimiterHelpers.js** - Rate limiter management utilities
4. **testDataFactories.js** - Factory functions for test data
5. **requestHelpers.js** - HTTP request wrappers for testing
6. **index.js** - Central export point

## Quick Start

```javascript
import {
  createAuthenticatedUser,
  mockEmailService,
  createRecipeData,
  authenticatedPost,
  expectSuccess
} from '../helpers/index.js';

describe('My Feature Tests', () => {
  let emailMocks;

  beforeAll(async () => {
    // Mock email service to prevent actual emails
    emailMocks = mockEmailService();
  });

  afterAll(() => {
    restoreEmailService();
  });

  test('should create recipe', async () => {
    // Create authenticated user
    const { user, accessToken } = await createAuthenticatedUser();
    
    // Create test data
    const recipeData = createRecipeData({ title: 'My Recipe' });
    
    // Make authenticated request
    const response = await authenticatedPost(
      app,
      '/api/recipes',
      accessToken,
      recipeData
    );
    
    // Assert success
    expectSuccess(response, 201);
  });
});
```

## Authentication Helpers

### createAuthenticatedUser(userData)

Creates a test user with authentication tokens.

```javascript
const { user, accessToken, refreshToken } = await createAuthenticatedUser({
  email: 'custom@example.com',
  displayName: 'Custom User'
});
```

### createMultipleUsers(count)

Creates multiple test users for testing multi-user scenarios.

```javascript
const [user1, user2, user3] = await createMultipleUsers(3);
```

### createUserWith2FA(userData)

Creates a user with 2FA enabled.

```javascript
const { user, accessToken, twoFactorSecret } = await createUserWith2FA();
const token = generate2FAToken(twoFactorSecret);
```

### createUserWithResetToken(userData)

Creates a user with a password reset token.

```javascript
const { user, resetToken } = await createUserWithResetToken();
```

### createUserWithVerificationToken(userData)

Creates a user with an email verification token.

```javascript
const { user, verificationToken } = await createUserWithVerificationToken();
```

### authHeader(token)

Returns authorization headers for authenticated requests.

```javascript
const headers = authHeader(accessToken);
// { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
```

## Email Mocking

### mockEmailService()

Mocks all email service functions. Returns mock functions that can be inspected.

```javascript
const emailMocks = mockEmailService();

// Later in test
expect(emailMocks.sendVerificationEmail).toHaveBeenCalledWith({
  to: 'user@example.com',
  username: 'Test User',
  verificationUrl: expect.any(String)
});
```

### restoreEmailService()

Restores all email service mocks.

```javascript
afterAll(() => {
  restoreEmailService();
});
```

### expectEmailSent(mockFn, expectedParams)

Verifies an email was sent with specific parameters.

```javascript
expectEmailSent(emailMocks.sendVerificationEmail, {
  to: 'user@example.com'
});
```

### makeEmailServiceFail(functionName, error)

Makes an email service function throw an error (for testing error handling).

```javascript
makeEmailServiceFail('sendVerificationEmail', new Error('SMTP unavailable'));
```

## Rate Limiter Helpers

### clearRateLimiters()

Clears in-memory rate limiter stores to prevent interference between tests.

```javascript
afterEach(() => {
  clearRateLimiters();
});
```

### waitForRateLimitReset(ms)

Waits for rate limit window to expire.

```javascript
await waitForRateLimitReset(100);
```

### clearRedisRateLimits(redisClient)

Clears Redis-based rate limiters (if using Redis).

```javascript
await clearRedisRateLimits(redisClient);
```

## Test Data Factories

### createRecipeData(overrides)

Creates valid recipe data for testing.

```javascript
const recipeData = createRecipeData({
  title: 'Custom Recipe',
  servings: 6
});
```

### createCollectionData(overrides)

Creates valid collection data.

```javascript
const collectionData = createCollectionData({
  name: 'My Collection',
  recipeIds: [recipe1._id, recipe2._id]
});
```

### createMealPlanData(overrides)

Creates valid meal plan data.

```javascript
const mealPlanData = createMealPlanData({
  name: 'Week 1 Plan'
});
```

### createShoppingListData(overrides)

Creates valid shopping list data.

```javascript
const listData = createShoppingListData({
  name: 'Grocery List'
});
```

### createUserData(overrides)

Creates valid user registration data.

```javascript
const userData = createUserData({
  email: 'newuser@example.com'
});
```

### createMealData(recipeId, overrides)

Creates meal data for meal plans.

```javascript
const mealData = createMealData(recipe._id, {
  mealType: 'breakfast',
  servings: 2
});
```

### createDateRange(daysFromNow)

Creates date range for testing.

```javascript
const { startDate, endDate } = createDateRange(7); // 7 days from now
const { startDate, endDate } = createDateRange(-7); // 7 days ago
```

### createObjectId()

Creates a valid MongoDB ObjectId string.

```javascript
const fakeId = createObjectId();
```

### createInvalidObjectId()

Creates an invalid ObjectId for error testing.

```javascript
const invalidId = createInvalidObjectId();
```

## Request Helpers

### authenticatedGet(app, url, token)

Makes an authenticated GET request.

```javascript
const response = await authenticatedGet(app, '/api/recipes', accessToken);
```

### authenticatedPost(app, url, token, data)

Makes an authenticated POST request.

```javascript
const response = await authenticatedPost(
  app,
  '/api/recipes',
  accessToken,
  recipeData
);
```

### authenticatedPut(app, url, token, data)

Makes an authenticated PUT request.

```javascript
const response = await authenticatedPut(
  app,
  `/api/recipes/${recipeId}`,
  accessToken,
  updatedData
);
```

### authenticatedDelete(app, url, token)

Makes an authenticated DELETE request.

```javascript
const response = await authenticatedDelete(
  app,
  `/api/recipes/${recipeId}`,
  accessToken
);
```

### authenticatedPatch(app, url, token, data)

Makes an authenticated PATCH request.

```javascript
const response = await authenticatedPatch(
  app,
  `/api/recipes/${recipeId}`,
  accessToken,
  patchData
);
```

## Response Assertion Helpers

### expectSuccess(response, status)

Asserts successful response.

```javascript
expectSuccess(response, 201);
// Checks: response.status === 201 && response.body.success === true
```

### expectError(response, status, errorMessage)

Asserts error response with optional error message check.

```javascript
expectError(response, 400, 'Invalid email');
```

### expectValidationError(response, field)

Asserts validation error response.

```javascript
expectValidationError(response, 'email');
```

### expectUnauthorized(response)

Asserts 401 unauthorized response.

```javascript
expectUnauthorized(response);
```

### expectForbidden(response)

Asserts 403 forbidden response.

```javascript
expectForbidden(response);
```

### expectNotFound(response)

Asserts 404 not found response.

```javascript
expectNotFound(response);
```

### expectRateLimited(response)

Asserts 429 rate limited response.

```javascript
expectRateLimited(response);
```

## Best Practices

### 1. Always Mock Email Service

```javascript
beforeAll(async () => {
  mockEmailService();
});

afterAll(() => {
  restoreEmailService();
});
```

### 2. Clear Rate Limiters Between Tests

```javascript
afterEach(() => {
  clearRateLimiters();
});
```

### 3. Use Factories for Test Data

```javascript
// ❌ Bad: Inline data creation
const recipe = await Recipe.create({
  title: 'Test',
  ingredients: [{ name: 'flour' }],
  instructions: ['mix'],
  // ... many more fields
});

// ✅ Good: Use factory
const recipeData = createRecipeData({ title: 'Test' });
const recipe = await Recipe.create(recipeData);
```

### 4. Use Request Helpers for Auth

```javascript
// ❌ Bad: Manual auth header
const response = await request(app)
  .get('/api/recipes')
  .set('Authorization', `Bearer ${accessToken}`);

// ✅ Good: Use helper
const response = await authenticatedGet(app, '/api/recipes', accessToken);
```

### 5. Use Assertion Helpers

```javascript
// ❌ Bad: Manual assertions
expect(response.status).toBe(200);
expect(response.body.success).toBe(true);
expect(response.body.data).toBeDefined();

// ✅ Good: Use helper
expectSuccess(response);
expect(response.body.data).toBeDefined();
```

## Example Test File

```javascript
import request from 'supertest';
import { ensureConnection } from '../setup/mongodb.js';
import app from '../../index.js';
import Recipe from '../../models/Recipe.js';
import {
  createAuthenticatedUser,
  createMultipleUsers,
  mockEmailService,
  restoreEmailService,
  createRecipeData,
  authenticatedPost,
  authenticatedGet,
  expectSuccess,
  expectError,
  expectNotFound
} from '../helpers/index.js';

describe('Recipe API Integration Tests', () => {
  let user1, user2;
  let accessToken1, accessToken2;
  let emailMocks;

  beforeAll(async () => {
    await ensureConnection();
    emailMocks = mockEmailService();
  });

  beforeEach(async () => {
    // Create test users
    [{ user: user1, accessToken: accessToken1 }, { user: user2, accessToken: accessToken2 }] = 
      await createMultipleUsers(2);
  });

  afterEach(async () => {
    await Recipe.deleteMany({});
  });

  afterAll(() => {
    restoreEmailService();
  });

  describe('POST /api/recipes', () => {
    test('should create recipe for authenticated user', async () => {
      const recipeData = createRecipeData();
      
      const response = await authenticatedPost(
        app,
        '/api/recipes',
        accessToken1,
        recipeData
      );
      
      expectSuccess(response, 201);
      expect(response.body.data.title).toBe(recipeData.title);
      expect(response.body.data.owner).toBe(user1._id.toString());
    });

    test('should reject recipe from unauthenticated user', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .send(createRecipeData());
      
      expectUnauthorized(response);
    });
  });

  describe('GET /api/recipes/:id', () => {
    test('should get recipe by ID', async () => {
      const recipeData = createRecipeData();
      const recipe = await Recipe.create({ ...recipeData, owner: user1._id });
      
      const response = await authenticatedGet(
        app,
        `/api/recipes/${recipe._id}`,
        accessToken1
      );
      
      expectSuccess(response);
      expect(response.body.data._id).toBe(recipe._id.toString());
    });

    test('should return 404 for non-existent recipe', async () => {
      const fakeId = createObjectId();
      
      const response = await authenticatedGet(
        app,
        `/api/recipes/${fakeId}`,
        accessToken1
      );
      
      expectNotFound(response);
    });
  });
});
```

## Common Issues and Solutions

### Issue: Tests failing due to rate limiting

**Solution**: Clear rate limiters in `afterEach`:

```javascript
afterEach(() => {
  clearRateLimiters();
});
```

### Issue: Tests failing due to email service errors

**Solution**: Mock email service in `beforeAll`:

```javascript
beforeAll(async () => {
  mockEmailService();
});

afterAll(() => {
  restoreEmailService();
});
```

### Issue: Tests interfering with each other

**Solution**: Clean up data in `afterEach`:

```javascript
afterEach(async () => {
  await Recipe.deleteMany({});
  await User.deleteMany({});
  clearRateLimiters();
});
```

### Issue: Authentication tokens not working

**Solution**: Ensure user has refresh token saved:

```javascript
// createAuthenticatedUser() handles this automatically
const { user, accessToken } = await createAuthenticatedUser();
```

---

For more information, see the individual helper files or refer to existing test files for usage examples.