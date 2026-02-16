# Recipe Book - Backend API

Node.js/Express REST API server for the Recipe Book application.

**Version:** 2.1.5

## Overview

The backend provides a comprehensive REST API for recipe management, user authentication, meal planning, shopping lists, and data export/import functionality. Built with Node.js, Express, MongoDB, and enterprise-grade infrastructure including Redis caching, structured logging, and advanced rate limiting.

## Features

### Core API Features
- **Recipe CRUD** - Create, read, update, delete recipes
- **URL Scraping** - Extract recipes from 20+ popular cooking websites
- **Search & Filter** - Advanced search with pagination and sorting
- **User Authentication** - JWT-based auth with refresh tokens
- **Collections** - Organize recipes into themed cookbooks
- **Meal Planning** - Calendar-based meal scheduling
- **Shopping Lists** - Auto-generated from recipes and meal plans
- **Export System** - PDF, JSON, Markdown exports
- **Import System** - Restore from JSON backups

### Security Features
- JWT authentication with access and refresh tokens
- Password hashing with bcrypt (10 rounds)
- Rate limiting (DoS protection)
- Input validation and sanitization
- XSS prevention with DOMPurify
- Owner-based resource isolation
- CORS configuration

### Performance & Infrastructure Features
- **Redis Caching** - Distributed caching for improved scalability
- **Response Compression** - Automatic gzip compression (6x reduction)
- **Database Connection Pooling** - 10-50 concurrent connections
- **Database Indexing** - Optimized queries on common fields
- **Pagination** - Efficient handling of large datasets
- **Health Checks** - Kubernetes-compatible liveness/readiness/startup probes
- **Graceful Shutdown** - Clean server shutdown for zero-downtime deployments
- **Request Tracing** - Unique request IDs for debugging

### Logging & Monitoring Features
- **Structured Logging** - Winston-based JSON logging with daily rotation
- **Request Logging** - Automatic HTTP request/response logging
- **Error Tracking** - Centralized error logging with context
- **Sensitive Data Redaction** - Automatic password/token redaction
- **Log Aggregation Ready** - Compatible with ELK, CloudWatch, etc.

## Tech Stack

- **Runtime:** Node.js 18+ (ESM modules)
- **Framework:** Express.js 4.18
- **Database:** MongoDB 5.0+ with Mongoose 8.0
- **Caching:** Redis 6+ (optional, graceful degradation)
- **Logging:** Winston 3.11 with daily log rotation
- **Authentication:** JWT (jsonwebtoken 9.0 + bcryptjs 3.0)
- **Email:** Nodemailer 6.10 (multi-provider support)
- **PDF Generation:** PDFKit 0.17
- **Web Scraping:** Cheerio 1.0
- **Validation:** express-validator 7.3
- **File Upload:** Multer 1.4
- **Compression:** gzip response compression
- **Request Tracking:** UUID-based request IDs
- **Testing:** Jest 30.2 + Supertest 7.2 + MongoDB Memory Server

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 5.0+ (local or Docker)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# (See Environment Variables section below)

# Start development server
npm run dev
```

The API will be available at `http://localhost:5000`

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/recipe-book

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Email Configuration (for password reset)
EMAIL_PROVIDER=console  # Options: console, ethereal, sendgrid, ses
EMAIL_FROM=noreply@recipebook.com

# SendGrid (if using EMAIL_PROVIDER=sendgrid)
# SENDGRID_API_KEY=your-sendgrid-api-key

# AWS SES (if using EMAIL_PROVIDER=ses)
# AWS_SES_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-aws-access-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

See `.env.example` for full configuration options.

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login and get tokens
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout (invalidate refresh token)
- `POST /forgot-password` - Request password reset
- `GET /validate-reset-token` - Validate reset token
- `POST /reset-password` - Reset password with token
- `PATCH /password` - Update password (authenticated)
- `DELETE /account` - Delete account and all data

### Recipes (`/api/recipes`)
- `GET /` - List recipes (paginated, filterable, searchable)
- `GET /:id` - Get single recipe
- `POST /` - Create recipe
- `PUT /:id` - Update recipe
- `DELETE /:id` - Delete recipe
- `PATCH /:id/lock` - Toggle recipe lock status
- `POST /scrape` - Scrape recipe from URL
- `GET /search/sites` - Get supported scraper sites
- `GET /export/:id` - Export single recipe (PDF/JSON/MD)
- `POST /export/bulk` - Export multiple recipes as ZIP

### Collections (`/api/collections`)
- `GET /` - List collections
- `GET /:id` - Get collection details
- `POST /` - Create collection
- `PUT /:id` - Update collection
- `DELETE /:id` - Delete collection
- `POST /:id/recipes` - Add recipe to collection
- `DELETE /:id/recipes/:recipeId` - Remove recipe from collection
- `PUT /:id/reorder` - Reorder recipes in collection
- `GET /:id/export` - Export collection as PDF cookbook

### Meal Plans (`/api/meal-plans`)
- `GET /` - List meal plans
- `GET /:id` - Get meal plan details
- `POST /` - Create meal plan
- `PUT /:id` - Update meal plan
- `DELETE /:id` - Delete meal plan
- `POST /:id/meals` - Add meal to plan
- `DELETE /:id/meals/:mealId/recipes/:recipeId` - Remove recipe from meal
- `GET /:id/export` - Export meal plan as PDF

### Shopping Lists (`/api/shopping-lists`)
- `GET /` - List shopping lists
- `GET /:id` - Get shopping list details
- `POST /` - Create shopping list
- `POST /from-recipes` - Generate from recipes
- `POST /from-meal-plan` - Generate from meal plan
- `PUT /:id` - Update shopping list
- `DELETE /:id` - Delete shopping list
- `POST /:id/items` - Add item to list
- `PATCH /:id/items/:itemId` - Update item (check/uncheck)
- `DELETE /:id/items/:itemId` - Remove item
- `PATCH /:id/complete` - Mark list as complete
- `PATCH /:id/activate` - Set as active list
- `GET /:id/export` - Export as PDF

### Export (`/api/export`)
- `GET /backup` - Full data backup (JSON)

### Import (`/api/import`)
- `POST /backup` - Import from backup file

## Project Structure

```
backend/
├── src/
│   ├── controllers/        # Request handlers
│   │   ├── authController.js
│   │   ├── recipeController.js
│   │   ├── collectionController.js
│   │   ├── mealPlanController.js
│   │   ├── shoppingListController.js
│   │   ├── exportController.js
│   │   └── importController.js
│   ├── models/             # Mongoose schemas
│   │   ├── User.js
│   │   ├── Recipe.js
│   │   ├── Collection.js
│   │   ├── MealPlan.js
│   │   └── ShoppingList.js
│   ├── routes/             # Express routes
│   │   ├── auth.js
│   │   ├── recipes.js
│   │   ├── collections.js
│   │   ├── mealPlans.js
│   │   ├── shoppingLists.js
│   │   ├── export.js
│   │   └── import.js
│   ├── middleware/         # Express middleware
│   │   ├── auth.js         # JWT authentication
│   │   ├── validation.js   # Input validation & sanitization
│   │   ├── rateLimiter.js  # Rate limiting
│   │   ├── uploadLimiter.js # File upload limiting
│   │   └── cache.js        # Response caching
│   ├── services/           # Business logic
│   │   ├── scraper.js      # Recipe URL scraping
│   │   ├── recipeSearch.js # Search & filtering
│   │   ├── emailService.js # Email sending
│   │   ├── importProcessor.js # Import processing
│   │   └── importValidator.js # Import validation
│   ├── utils/              # Helper functions
│   │   ├── passwordValidator.js
│   │   └── importErrors.js
│   ├── config/             # Configuration
│   │   └── favoriteSites.js
│   ├── templates/          # Email templates
│   │   └── email/
│   │       ├── password-reset.html
│   │       └── password-reset.txt
│   ├── __tests__/          # Tests
│   │   └── integration/    # Integration tests
│   └── index.js            # Server entry point
├── migrations/             # Database migrations
│   └── v2.0-migration.js
├── .env.example            # Environment template
├── jest.config.js          # Jest configuration
├── package.json
├── TESTING.md              # Testing documentation
└── README.md               # This file
```

## Database Models

### User
```javascript
{
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed, required),
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Recipe
```javascript
{
  title: String (required),
  description: String,
  cuisine: String,
  dishType: String,
  difficulty: String,
  prepTime: Number,
  cookTime: Number,
  servings: Number (required),
  ingredients: [{
    item: String,
    quantity: Number,
    unit: String,
    category: String
  }],
  instructions: [String],
  notes: String,
  source: String,
  rating: Number (1-5),
  tags: [String],
  isLocked: Boolean,
  owner: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### Collection
```javascript
{
  name: String (required),
  description: String,
  icon: String,
  color: String,
  isPublic: Boolean,
  recipes: [{ recipe: ObjectId, order: Number }],
  owner: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### MealPlan
```javascript
{
  name: String (required),
  startDate: Date (required),
  endDate: Date (required),
  meals: [{
    date: Date,
    mealType: String (breakfast|lunch|dinner|snack),
    recipes: [{ recipe: ObjectId, servings: Number }],
    notes: String
  }],
  owner: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### ShoppingList
```javascript
{
  name: String (required),
  items: [{
    ingredient: String,
    quantity: Number,
    unit: String,
    category: String,
    checked: Boolean
  }],
  isActive: Boolean,
  isCompleted: Boolean,
  owner: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Suites
- **Unit Tests** - Model validation, utility functions
- **Integration Tests** - API endpoints, workflows
- **Service Tests** - Scraper, email, validation

### Test Coverage
- Overall: ~77%
- Models: ~90%
- Controllers: ~75%
- Services: ~70%
- Routes: ~80%

See [TESTING.md](TESTING.md) for detailed testing documentation.

## Development

### Available Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Code Quality
- **Linting:** ESLint with Prettier integration
- **Formatting:** Prettier
- **Pre-commit:** Linting enforced (if configured)

### Database Indexes

Key indexes for performance:
- User: `username`, `email`, `resetPasswordToken`
- Recipe: `owner`, `title`, `cuisine`, `dishType`, `tags`
- Collection: `owner`
- MealPlan: `owner`, `startDate`, `endDate`
- ShoppingList: `owner`, `isActive`

## Security Best Practices

### Authentication
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with short expiration (24h access, 7d refresh)
- Refresh tokens stored securely
- Refresh token rotation on use

### Authorization
- All resources owned by users
- Middleware validates ownership on CRUD operations
- No cross-user data access

### Rate Limiting
- Auth endpoints: 5 requests/15 min per email
- Password reset: 3 requests/hour per email
- Import: 10 uploads/15 min per user
- General API: 100 requests/15 min per IP

### Input Validation
- XSS prevention with DOMPurify
- SQL injection prevention (NoSQL with Mongoose)
- File upload size limits
- Request body size limits

## Performance Optimization

### Caching
- Recipe search results: 5 min TTL
- Single recipe reads: 5 min TTL
- User profile: 10 min TTL
- Cache invalidation on updates

### Database
- Selective field population
- Lean queries for lists
- Pagination for large datasets
- Compound indexes on common queries

### Response Time Targets
- Recipe CRUD: < 100ms
- Search queries: < 200ms
- PDF generation: < 2s
- URL scraping: < 5s

## Email Providers

### Console (Development)
```env
EMAIL_PROVIDER=console
```
Logs emails to console.

### Ethereal (Testing)
```env
EMAIL_PROVIDER=ethereal
```
Creates test inbox at ethereal.email.

### SendGrid (Production)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-key
EMAIL_FROM=noreply@yourdomain.com
```

### AWS SES (Production)
```env
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
EMAIL_FROM=noreply@yourdomain.com
```

## Deployment

### Production Checklist
- [ ] Set strong JWT secrets
- [ ] Configure production MongoDB
- [ ] Set up email provider (SendGrid/SES)
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set NODE_ENV=production
- [ ] Review rate limit settings
- [ ] Set up monitoring (PM2, New Relic, etc.)
- [ ] Configure logging
- [ ] Set up automated backups
- [ ] Enable compression middleware
- [ ] Configure Helmet.js for security headers

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/recipe-book
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
EMAIL_PROVIDER=sendgrid|ses
# ... additional provider-specific vars
```

### Docker Deployment
```bash
# Build image
docker build -t recipe-book-backend .

# Run container
docker run -d \
  -p 5000:5000 \
  --env-file .env \
  recipe-book-backend
```

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Verify MongoDB is running: `docker-compose ps`
- Check MONGODB_URI in .env
- Ensure MongoDB is accessible on the network

**JWT Authentication Errors**
- Verify JWT_SECRET is set in .env
- Check token expiration settings
- Clear browser localStorage and re-login

**Email Not Sending**
- Check EMAIL_PROVIDER configuration
- Verify API keys for SendGrid/SES
- Check email service logs
- Test with `EMAIL_PROVIDER=console` first

**Rate Limit Errors**
- Rate limits reset after time window
- Adjust limits in middleware/rateLimiter.js
- Consider Redis for distributed rate limiting

**Import Failures**
- Check file size (max 10MB)
- Verify JSON format matches backup structure
- Check for validation errors in response
- Review importValidator.js for requirements

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [...] // validation errors if applicable
}
```

## Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### Backend-Specific Guidelines
- Follow RESTful conventions
- Add tests for new features
- Update API documentation
- Maintain backwards compatibility
- Use async/await (no callbacks)
- Handle errors with try/catch
- Validate all inputs
- Follow existing code patterns

## License

MIT - see [LICENSE](../LICENSE)

## Support

- **Documentation:** [docs/](../docs/)
- **API Reference:** [docs/api/api-reference.md](../docs/api/api-reference.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/recipe-book/issues)

---

**Version:** 2.1.5  
**Last Updated:** February 2026  
**Status:** ✅ Production Ready - Enterprise Infrastructure
