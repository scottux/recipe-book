# API Reference

Complete REST API documentation for the Recipe Book backend.

## Base URL

```
http://localhost:5000/api
```

## Authentication

The API uses **JWT (JSON Web Token)** authentication for protected endpoints.

### Public Endpoints (No Authentication Required)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `GET /api/auth/validate-reset-token` - Validate reset token
- `POST /api/auth/reset-password` - Reset password with token

### Protected Endpoints (Authentication Required)
All other endpoints require authentication via JWT Bearer token.

**Authentication Header:**
```
Authorization: Bearer <access_token>
```

**Token Lifecycle:**
- **Access Token**: Valid for 15 minutes
- **Refresh Token**: Valid for 7 days
- Tokens are automatically refreshed by the frontend

**Example Authenticated Request:**
```bash
GET /api/recipes
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Unauthorized Response (401):**
```json
{
  "success": false,
  "error": "No token provided" 
}
```

**Expired Token Response (401):**
```json
{
  "success": false,
  "error": "Token has expired"
}
```

## Rate Limiting

All API endpoints are rate-limited to **100 requests per 15 minutes** per IP address. 

**Rate Limit Headers:**
- `RateLimit-Limit`: Maximum number of requests allowed
- `RateLimit-Remaining`: Number of requests remaining
- `RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

**Rate Limit Response (429 Too Many Requests):**
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later."
}
```

## Caching

GET requests are cached to improve performance:
- Recipe list: 5 minutes
- Individual recipes: 5 minutes
- Filter options: 10 minutes
- Favorite sites: 1 hour
- Web search results: 5 minutes

Cache is automatically cleared when recipes are created, updated, or deleted.

## Input Validation & Sanitization

All user inputs are validated and sanitized to prevent XSS attacks and injection vulnerabilities. HTML tags are stripped from text fields.

---

## Recipes Endpoint

### GET /recipes

Get all recipes with optional filtering and sorting.

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Text search in title/description | `?search=chicken` |
| `ingredient` | string | Filter by ingredient name | `?ingredient=tomatoes` |
| `dishType` | string | Filter by dish type | `?dishType=Main%20Course` |
| `cuisine` | string | Filter by cuisine | `?cuisine=Italian` |
| `rating` | number | Minimum rating (1-5) | `?rating=4` |
| `sortBy` | string | Sort field | `?sortBy=prepTime` |
| `order` | string | Sort order (asc/desc) | `?order=asc` |
| `page` | number | Page number (default: 1) | `?page=2` |
| `limit` | number | Items per page (default: 50) | `?limit=20` |

**Sort Fields:**
- `title` - Alphabetical by title
- `rating` - By star rating
- `prepTime` - By preparation time
- `cookTime` - By cooking time
- `createdAt` - By creation date

**Example Requests:**

```bash
# Get all recipes
GET /api/recipes

# Search for pasta recipes
GET /api/recipes?search=pasta

# Italian main courses with 4+ stars
GET /api/recipes?cuisine=Italian&dishType=Main%20Course&rating=4

# Recipes with chicken, sorted by prep time
GET /api/recipes?ingredient=chicken&sortBy=prepTime&order=asc
```

**Response:**

```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Spaghetti Carbonara",
      "description": "Classic Italian pasta dish",
      "ingredients": [
        {
          "name": "spaghetti",
          "amount": "1",
          "unit": "pound"
        }
      ],
      "instructions": [
        "Boil pasta according to package directions",
        "Whisk eggs in a bowl"
      ],
      "prepTime": 10,
      "cookTime": 15,
      "servings": 4,
      "dishType": "Main Course",
      "cuisine": "Italian",
      "tags": ["pasta", "quick"],
      "rating": 5,
      "sourceUrl": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "isLocked": false
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalRecipes": 50,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### GET /recipes/:id

Get a single recipe by ID.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId |

**Example Request:**

```bash
GET /api/recipes/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Spaghetti Carbonara",
    ...
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Recipe not found"
}
```

---

### POST /recipes

Create a new recipe.

**Request Body:**

```json
{
  "title": "Spaghetti Carbonara",
  "description": "Classic Italian pasta dish",
  "ingredients": [
    {
      "name": "spaghetti",
      "amount": "1",
      "unit": "pound"
    },
    {
      "name": "eggs",
      "amount": "4",
      "unit": ""
    },
    {
      "name": "parmesan cheese",
      "amount": "1",
      "unit": "cup"
    }
  ],
  "instructions": [
    "Boil pasta according to package directions",
    "Whisk eggs in a bowl",
    "Combine hot pasta with egg mixture",
    "Add cheese and serve"
  ],
  "prepTime": 10,
  "cookTime": 15,
  "servings": 4,
  "dishType": "Main Course",
  "cuisine": "Italian",
  "tags": ["pasta", "quick", "easy"],
  "rating": 5
}
```

**Required Fields:**
- `title` (string)
- `ingredients` (array, at least one)
- `instructions` (array, at least one)

**Response:**

```json
{
  "success": true,
  "message": "Recipe created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    ...
  }
}
```

---

### PUT /recipes/:id

Update an existing recipe.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId |

**Request Body:**

Same as POST. Partial updates are supported - only include fields you want to change.

**Example Request:**

```bash
PUT /api/recipes/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "rating": 4,
  "tags": ["pasta", "quick", "easy", "favorite"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Recipe updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    ...
  }
}
```

---

### PUT /recipes/:id/lock

Toggle the lock status of a recipe. Locked recipes cannot be deleted.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId |

**Example Request:**

```bash
PUT /api/recipes/507f1f77bcf86cd799439011/lock
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Spaghetti Carbonara",
    "isLocked": true,
    ...
  }
}
```

**Notes:**
- Toggles between locked (`true`) and unlocked (`false`)
- Locked recipes display a 🔒 icon in the UI
- Attempting to delete a locked recipe returns a 403 error

---

### DELETE /recipes/:id

Delete a recipe.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId |

**Example Request:**

```bash
DELETE /api/recipes/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "success": true,
  "message": "Recipe deleted successfully"
}
```

**Error Response (Locked Recipe):**

```json
{
  "success": false,
  "error": "Cannot delete a locked recipe. Unlock it first."
}
```

**Notes:**
- Locked recipes cannot be deleted
- Unlock the recipe first using `PUT /recipes/:id/lock`

---

## Scraper Endpoint

### POST /recipes/scrape

Extract recipe data from a URL.

**Request Body:**

```json
{
  "url": "https://www.example.com/recipe/pasta-carbonara"
}
```

**Example Request:**

```bash
POST /api/recipes/scrape
Content-Type: application/json

{
  "url": "https://cafedelites.com/garlic-butter-shrimp-scampi/"
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "title": "Garlic Butter Shrimp Scampi",
    "description": "Succulent shrimp in garlic butter sauce",
    "ingredients": [
      {
        "name": "1/4 cup dry white wine or broth",
        "amount": "",
        "unit": ""
      }
    ],
    "instructions": [
      "Heat oil in a large skillet",
      "Cook shrimp until pink"
    ],
    "prepTime": 10,
    "cookTime": 10,
    "servings": 4,
    "cuisine": "Italian",
    "rating": 5
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Failed to scrape recipe: Invalid URL"
}
```

**Supported Sites:**
- AllRecipes
- Food Network
- Serious Eats
- Bon Appétit
- Cafe Delites
- Most sites using schema.org/Recipe markup

---

## Filter Options Endpoint

### GET /recipes/filter-options

Get available filter values.

**Example Request:**

```bash
GET /api/recipes/filter-options
```

**Response:**

```json
{
  "success": true,
  "data": {
    "dishTypes": [
      "Appetizer",
      "Main Course",
      "Side Dish",
      "Dessert",
      "Beverage",
      "Snack",
      "Breakfast",
      "Lunch",
      "Dinner",
      "Other"
    ],
    "cuisines": [
      "Italian",
      "Mexican",
      "Chinese",
      "French",
      "Indian",
      "Thai"
    ]
  }
}
```

---

## Web Recipe Search Endpoint

### POST /recipes/search-web

Search for recipes across popular recipe websites.

**Request Body:**

```json
{
  "query": "chocolate cake",
  "siteIds": ["allrecipes", "seriouseats"]
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term for recipes |
| `siteIds` | array | No | Filter by specific site IDs. If omitted, searches all enabled sites |

**Available Site IDs:**
- `allrecipes` - AllRecipes
- `recipetineats` - RecipeTin Eats
- `seriouseats` - Serious Eats
- `onceuponachef` - Once Upon A Chef
- `cafedelites` - Cafe Delites
- `jocooks` - Jo Cooks
- `foodnetwork` - Food Network
- `bonappetit` - Bon Appétit
- `epicurious` - Epicurious
- `delish` - Delish
- `tasty` - Tasty
- `budgetbytes` - Budget Bytes
- `pinchofyum` - Pinch of Yum
- `skinnytaste` - Skinnytaste
- `minimalistbaker` - Minimalist Baker
- `cookieandkate` - Cookie and Kate
- `damndelicious` - Damn Delicious
- `simplyrecipes` - Simply Recipes

**Example Request:**

```bash
POST /api/recipes/search-web
Content-Type: application/json

{
  "query": "chicken soup",
  "siteIds": ["allrecipes", "seriouseats"]
}
```

**Success Response:**

```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "title": "Classic Chicken Noodle Soup",
      "url": "https://www.allrecipes.com/recipe/...",
      "source": "AllRecipes",
      "sourceIcon": "🍳",
      "sourceRank": 1,
      "rating": 4.5,
      "description": "A comforting bowl of classic chicken soup",
      "cuisine": "American",
      "relevanceScore": 100
    }
  ]
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Search query is required"
}
```

---

## Favorite Sites Endpoint

### GET /recipes/favorite-sites

Get list of supported recipe websites for web search.

**Example Request:**

```bash
GET /api/recipes/favorite-sites
```

**Response:**

```json
{
  "success": true,
  "count": 18,
  "data": [
    {
      "id": "allrecipes",
      "name": "AllRecipes",
      "domain": "allrecipes.com",
      "enabled": true,
      "icon": "🍳"
    },
    {
      "id": "seriouseats",
      "name": "Serious Eats",
      "domain": "seriouseats.com",
      "enabled": true,
      "icon": "🔬"
    }
  ]
}
```

---

## Error Responses

All endpoints follow a consistent error response format:

**Validation Error (400):**

```json
{
  "success": false,
  "message": "Validation error: Title is required"
}
```

**Not Found (404):**

```json
{
  "success": false,
  "message": "Recipe not found"
}
```

**Server Error (500):**

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## CORS

CORS is enabled for all origins in development mode. In production, configure appropriately.

## Request Logging

All requests are logged:
- **Development**: Colorized console output with method, URL, status, and response time
- **Production**: Combined Apache-style format suitable for log aggregation tools

## Data Validation

### Recipe Schema

```javascript
{
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  ingredients: [{
    name: { type: String, required: true },
    amount: String,
    unit: String
  }],
  instructions: [{
    type: String,
    required: true
  }],
  prepTime: {
    type: Number,
    min: 0
  },
  cookTime: {
    type: Number,
    min: 0
  },
  servings: {
    type: Number,
    min: 1
  },
  dishType: {
    type: String,
    enum: ['Appetizer', 'Main Course', 'Side Dish', 
           'Dessert', 'Beverage', 'Snack', 
           'Breakfast', 'Lunch', 'Dinner', 'Other'],
    default: 'Other'
  },
  cuisine: {
    type: String,
    trim: true
  },
  tags: [String],
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  isLocked: {
    type: Boolean,
    default: false
  }
}
```

## Examples

### Complete CRUD Flow

```bash
# 1. Create a recipe
POST /api/recipes
{
  "title": "Test Recipe",
  "ingredients": [{"name": "flour", "amount": "2", "unit": "cups"}],
  "instructions": ["Mix ingredients"]
}

# 2. Get all recipes
GET /api/recipes

# 3. Get specific recipe
GET /api/recipes/507f1f77bcf86cd799439011

# 4. Update recipe
PUT /api/recipes/507f1f77bcf86cd799439011
{
  "rating": 5
}

# 5. Delete recipe
DELETE /api/recipes/507f1f77bcf86cd799439011
```

### Advanced Filtering

```bash
# Italian desserts with 4+ stars, sorted by prep time
GET /api/recipes?cuisine=Italian&dishType=Dessert&rating=4&sortBy=prepTime&order=asc

# Recently added recipes
GET /api/recipes?sortBy=createdAt&order=desc

# Quick recipes (under 30 min prep)
GET /api/recipes?sortBy=prepTime&order=asc
# (Then filter client-side for prepTime < 30)
```

---

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe"
}
```

**Required Fields:**
- `email` (string) - Valid email address, must be unique
- `password` (string) - Minimum 6 characters
- `displayName` (string) - User's display name

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "displayName": "John Doe"
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Email already registered"
}
```

---

### POST /auth/login

Authenticate a user and receive tokens.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "displayName": "John Doe"
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

### POST /auth/refresh

Refresh an expired access token using a refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST /auth/logout

Invalidate a refresh token (logout).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /auth/me

Get current user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "displayName": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### PUT /auth/me

Update user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "displayName": "Jane Doe"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "displayName": "Jane Doe"
  }
}
```

---

### PATCH /auth/password

Update user password (while authenticated). Session remains active after password change.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Required Fields:**
- `currentPassword` (string) - Must match user's current password
- `newPassword` (string) - Minimum 8 characters, must be different from current password

**Response:**

```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

**Error Responses:**

```json
{
  "success": false,
  "error": "Current password is incorrect."
}
```

```json
{
  "success": false,
  "error": "New password must be at least 8 characters long."
}
```

```json
{
  "success": false,
  "error": "New password must be different from current password."
}
```

**Rate Limiting:**
- 5 attempts per hour per user
- Rate limit counter resets on successful password change

**Notes:**
- Session remains active (user stays logged in)
- Access and refresh tokens remain valid
- Changed from PUT to PATCH in v2.1.1

---

### DELETE /auth/account

Permanently delete user account and all associated data.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "password": "currentPassword123"
}
```

**Required Fields:**
- `password` (string) - User's current password for confirmation

**Response:**

```json
{
  "success": true,
  "message": "Account deleted successfully."
}
```

**Error Responses:**

```json
{
  "success": false,
  "error": "Password is incorrect."
}
```

```json
{
  "success": false,
  "error": "Too many account deletion attempts. Please try again later."
}
```

**Cascade Deletion:**
All user-owned data is permanently deleted:
- User account
- All recipes
- All collections
- All meal plans
- All shopping lists

**Rate Limiting:**
- 3 attempts per hour per user
- Rate limit counter resets on successful deletion

**Notes:**
- ⚠️ **This action is irreversible**
- All data is permanently deleted
- User is logged out after deletion
- All tokens are invalidated

**Security:**
- Password verification required
- Atomic operation (all-or-nothing)
- No orphaned data remains

---

### POST /auth/forgot-password

Request a password reset email.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Notes:**
- Returns success regardless of whether email exists (prevents user enumeration)
- Rate limited to 3 requests per email per hour
- Reset token expires in 1 hour
- Email contains link: `http://frontend-url/reset-password/{token}`

**Rate Limit Response (429):**

```json
{
  "success": false,
  "error": "Too many password reset requests. Please try again in 1 hour."
}
```

---

### GET /auth/validate-reset-token

Validate a password reset token before showing reset form.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | Password reset token from email |

**Example Request:**

```bash
GET /api/auth/validate-reset-token?token=abc123...
```

**Success Response:**

```json
{
  "success": true,
  "valid": true
}
```

**Invalid/Expired Token Response:**

```json
{
  "success": false,
  "valid": false,
  "error": "Password reset token is invalid or has expired"
}
```

---

### POST /auth/reset-password

Reset password using a valid reset token.

**Request Body:**

```json
{
  "token": "abc123...",
  "password": "newSecurePassword456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password reset successfully. You can now log in with your new password."
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Password reset token is invalid or has expired"
}
```

**Notes:**
- Token is single-use (cleared after successful reset)
- All refresh tokens are invalidated (forces re-login)
- Minimum password length: 6 characters

---

## Related

- [Recipe Management](../features/recipe-management.md)
- [Recipe Import](../features/recipe-import.md)
- [Search & Filtering](../features/search-filtering.md)
- [Password Reset Flow](../features/password-reset.md)
