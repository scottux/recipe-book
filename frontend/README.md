# Recipe Book - Frontend

React-based web application for the Recipe Book platform.

**Version:** 2.1.4

## Overview

A modern, responsive web application built with React 18, Tailwind CSS, and Vite. Provides an intuitive interface for recipe management, meal planning, shopping lists, and more.

## Features

### User Interface
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Vintage Cookbook Theme** - Warm browns, aged paper aesthetics
- **Intuitive Navigation** - Clear routing with React Router
- **Real-time Updates** - Optimistic UI updates
- **Loading States** - Smooth loading indicators
- **Error Handling** - User-friendly error messages

### Core Pages
- **Recipe List** - Grid/list view with search and filters
- **Recipe Detail** - Full recipe view with serving adjustment
- **Add/Edit Recipe** - Manual entry or URL import
- **Collections** - Organize recipes into cookbooks
- **Meal Planning** - Weekly calendar interface
- **Shopping Lists** - Interactive shopping list management
- **Account Settings** - Password change, account deletion

### Authentication
- **Login/Register** - Secure user authentication
- **Password Reset** - Email-based password recovery
- **Protected Routes** - Auth-only pages
- **Auto Token Refresh** - Seamless session management
- **Logout** - Clear session and redirect

## Tech Stack

- **Framework:** React 18.2
- **Build Tool:** Vite 5.0
- **Routing:** React Router v6.20
- **Styling:** Tailwind CSS 3.3
- **HTTP Client:** Axios 1.13
- **Testing:** Vitest 4.0 + React Testing Library
- **State Management:** React Context API

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend API running (see [backend/README.md](../backend/README.md))

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Environment Configuration

The frontend connects to the backend API. By default, it uses:
- **Development:** `http://localhost:5000`
- **Production:** Configure via environment variables

To customize the API URL, create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

## Project Structure

```
frontend/
├── src/
│   ├── components/           # React components
│   │   ├── auth/             # Authentication components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   ├── AccountSettingsPage.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── AddRecipePage.jsx
│   │   ├── RecipeList.jsx
│   │   ├── RecipeDetail.jsx
│   │   ├── RecipeForm.jsx
│   │   ├── RecipeSearch.jsx
│   │   ├── ScraperInput.jsx
│   │   ├── CollectionsPage.jsx
│   │   ├── CollectionDetail.jsx
│   │   ├── MealPlanningPage.jsx
│   │   ├── ShoppingListsPage.jsx
│   │   ├── ShoppingListDetail.jsx
│   │   ├── ImportPage.jsx
│   │   ├── PasswordStrengthIndicator.jsx
│   │   └── __tests__/        # Component tests
│   ├── context/              # React Context
│   │   └── AuthContext.jsx   # Authentication state
│   ├── services/             # API client
│   │   └── api.js            # Axios configuration & API calls
│   ├── test/                 # Test utilities
│   │   └── setup.js
│   ├── App.jsx               # Root component with routing
│   ├── main.jsx              # Application entry point
│   └── index.css             # Global styles & Tailwind
├── public/                   # Static assets
├── index.html                # HTML template
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── vite.config.js            # Vite configuration
├── vitest.config.js          # Vitest test configuration
├── package.json
└── README.md                 # This file
```

## Component Overview

### Authentication Components

#### `LoginPage.jsx`
- User login form
- Email and password validation
- "Forgot password?" link
- Success message display
- Redirect after login

#### `RegisterPage.jsx`
- User registration form
- Username, email, password fields
- Password strength indicator
- Form validation
- Auto-login after registration

#### `ForgotPasswordPage.jsx`
- Email input for password reset request
- Rate-limited submission
- Success/error messaging
- Link back to login

#### `ResetPasswordPage.jsx`
- Token validation on load
- Password reset form
- Password confirmation
- Password strength indicator
- Redirect to login after reset

#### `AccountSettingsPage.jsx`
- Change password form with validation
- Delete account functionality
- Confirmation modal for destructive action
- Account information display

#### `ProtectedRoute.jsx`
- HOC for authenticated routes
- Redirect to login if not authenticated
- Preserve intended destination

### Recipe Components

#### `RecipeList.jsx`
- Grid/list view toggle
- Pagination controls
- Recipe cards with ratings
- Empty state messaging
- Loading states

#### `RecipeDetail.jsx`
- Full recipe display
- Serving size adjustment
- Ingredient scaling
- Print-friendly layout
- Edit/delete actions
- Export options (PDF/JSON/Markdown)
- Lock/unlock toggle

#### `RecipeForm.jsx`
- Add/edit recipe form
- Dynamic ingredient/instruction fields
- Form validation
- URL import integration
- Auto-save draft (future)

#### `RecipeSearch.jsx`
- Text search input
- Cuisine filter dropdown
- Dish type filter dropdown
- Rating filter
- Sort options
- Clear filters button

#### `ScraperInput.jsx`
- URL input with validation
- Supported sites dropdown
- Loading state during scrape
- Error handling

#### `AddRecipePage.jsx`
- Two-tab interface (Manual/Import)
- RecipeForm integration
- ScraperInput integration
- Navigation after save

### Collection Components

#### `CollectionsPage.jsx`
- Collection grid display
- Create new collection
- Edit collection
- Delete collection
- Collection statistics

#### `CollectionDetail.jsx`
- Recipe list in collection
- Drag-and-drop reordering
- Add recipes modal
- Remove recipes
- Export as PDF cookbook

### Meal Planning Components

#### `MealPlanningPage.jsx`
- 7-day calendar grid
- Multiple meals per day (breakfast, lunch, dinner, snack)
- Add recipes to meals
- Remove recipes from meals
- Meal notes
- Serving adjustments per meal
- Create meal plan form
- Export meal plan as PDF

### Shopping List Components

#### `ShoppingListsPage.jsx`
- List of shopping lists
- Create new list
- Generate from recipes
- Generate from meal plan
- Active list indicator
- Completion status

#### `ShoppingListDetail.jsx`
- Interactive item list
- Check/uncheck items
- Add new items
- Delete items
- Progress bar
- Category organization
- Export as PDF
- Mark as complete

### Other Components

#### `ImportPage.jsx`
- Drag-and-drop file upload
- JSON backup import
- Progress indicators
- Import statistics
- Error handling

#### `PasswordStrengthIndicator.jsx`
- Visual password strength meter
- Color-coded strength levels
- Requirement checklist
- Real-time validation

## Styling

### Tailwind Configuration

Custom cookbook theme colors in `tailwind.config.js`:

```javascript
colors: {
  cookbook: {
    darkbrown: '#3e2723',
    brown: '#5d4037',
    accent: '#8d6e63',
    lightbrown: '#a1887f',
    paper: '#faf8f3',
    cream: '#f5f2ed',
    aged: '#e0d5c7',
  }
}
```

### Typography
- **Headings:** `font-display` (serif)
- **Body:** `font-body` (sans-serif)
- **Font Sizes:** Consistent hierarchy (4xl → 3xl → 2xl → xl → lg → base)

### Component Patterns
- **Cards:** `bg-cookbook-paper border-2 border-cookbook-aged shadow-card`
- **Buttons Primary:** `bg-cookbook-accent text-white hover:bg-cookbook-darkbrown`
- **Buttons Secondary:** `border-2 border-cookbook-aged hover:bg-cookbook-cream`
- **Inputs:** `border-2 border-cookbook-aged focus:ring-2 focus:ring-cookbook-accent`

## API Integration

### API Service (`services/api.js`)

All API calls are centralized in `api.js`:

```javascript
// Recipe operations
recipeAPI.getRecipes(params)
recipeAPI.getRecipe(id)
recipeAPI.createRecipe(data)
recipeAPI.updateRecipe(id, data)
recipeAPI.deleteRecipe(id)

// Authentication
authAPI.login(credentials)
authAPI.register(userData)
authAPI.logout()
authAPI.refreshToken()

// Collections
collectionAPI.getCollections()
collectionAPI.createCollection(data)
// ... etc
```

### Authentication Flow

1. User logs in → JWT tokens stored in localStorage
2. Axios interceptor adds token to all requests
3. 401 response → attempt token refresh
4. Refresh fails → redirect to login
5. Successful refresh → retry original request

### Error Handling

- Network errors: User-friendly messages
- Validation errors: Display field-specific errors
- Auth errors: Redirect to login
- Rate limiting: Display retry information

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Coverage
- **Overall:** ~77%
- **Components:** ~80%
- **Services:** ~70%
- **Context:** ~85%

### Test Types

**Component Tests** (Vitest + React Testing Library)
- Rendering tests
- User interaction tests
- Form validation tests
- API integration tests (mocked)

**Example Test Files:**
- `RecipeList.test.jsx` - List rendering, filtering, pagination
- `RecipeDetail.test.jsx` - Recipe display, serving adjustment
- `RecipeForm.test.jsx` - Form validation, submission
- `MealPlanningPage.test.jsx` - Calendar, meal management
- `PasswordStrengthIndicator.test.jsx` - Password validation

## Development

### Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run test:ui` - Run tests with interactive UI
- `npm run test:coverage` - Generate coverage report

### Development Workflow

1. **Start Backend:** `cd backend && npm run dev`
2. **Start Frontend:** `cd frontend && npm run dev`
3. **Make Changes:** Edit components in `src/`
4. **Test Changes:** Write/run tests
5. **Build:** `npm run build` before deploying

### Code Quality

- **Linting:** ESLint with React and Prettier rules
- **Formatting:** Prettier with consistent config
- **Type Safety:** PropTypes (or migrate to TypeScript)

### Component Development Guidelines

- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components focused (single responsibility)
- Use meaningful prop names
- Handle loading and error states
- Provide accessibility attributes (ARIA)
- Follow cookbook theme colors
- Mobile-first responsive design

## Routing

### Route Structure

```javascript
// Public routes
/login              - Login page
/register           - Registration page
/forgot-password    - Password reset request
/reset-password/:token - Password reset form

// Protected routes (require authentication)
/                   - Recipe list (home)
/recipes/:id        - Recipe detail
/add                - Add recipe (manual or import)
/collections        - Collections list
/collections/:id    - Collection detail
/meal-planning      - Meal planning calendar
/shopping-lists     - Shopping lists
/shopping-lists/:id - Shopping list detail
/import             - Import from backup
/account            - Account settings
```

### Navigation

- Desktop: Horizontal navigation bar
- Mobile: Hamburger menu
- Active route highlighting
- Authenticated vs. public navigation

## State Management

### Global State (AuthContext)

```javascript
{
  user: { id, username, email } | null,
  token: string | null,
  isAuthenticated: boolean,
  loading: boolean,
  login: (credentials) => Promise,
  register: (userData) => Promise,
  logout: () => void,
  refreshToken: () => Promise
}
```

### Local State

Most components use local state with `useState` for:
- Form inputs
- Loading states
- Error messages
- Modal visibility
- List data

## Accessibility

### WCAG 2.1 AA Compliance

- **Color Contrast:** All text meets 4.5:1 ratio
- **Keyboard Navigation:** Full keyboard support
- **Focus Indicators:** Visible focus rings on all interactive elements
- **Form Labels:** Associated labels for all inputs
- **ARIA Labels:** Icon-only buttons have aria-label
- **Semantic HTML:** Proper heading hierarchy
- **Alt Text:** Images have descriptive alt text

### Best Practices

- Use semantic HTML elements
- Provide skip navigation links
- Ensure forms can be submitted with Enter
- Modal focus trap and Escape to close
- Screen reader announcements for dynamic content

## Performance Optimization

### Current Optimizations

- **Code Splitting:** Route-based lazy loading (future)
- **Image Optimization:** Responsive images (future)
- **Memo/Callback:** Prevent unnecessary re-renders
- **Debounced Search:** Reduce API calls
- **Pagination:** Limit data loaded at once

### Future Improvements

- Implement React.lazy() for route-based code splitting
- Add service worker for offline support
- Implement virtual scrolling for long lists
- Add image lazy loading
- Optimize bundle size

## Deployment

### Production Build

```bash
# Build optimized production bundle
npm run build

# Output directory: dist/
```

### Environment Variables

```env
# Production API URL
VITE_API_URL=https://api.yourdomain.com
```

### Deployment Checklist

- [ ] Set production API URL
- [ ] Build production bundle (`npm run build`)
- [ ] Test production build locally (`npm run preview`)
- [ ] Configure CORS on backend for production domain
- [ ] Set up HTTPS/TLS
- [ ] Configure CDN (optional)
- [ ] Set up monitoring (Sentry, LogRocket, etc.)
- [ ] Enable compression on server
- [ ] Set proper cache headers

### Hosting Options

**Static Hosting:**
- Vercel (recommended for Vite)
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Azure Static Web Apps

**Server Hosting:**
- Run production build with Express
- Nginx as reverse proxy
- Apache with mod_rewrite

## Browser Support

- **Chrome:** Latest 2 versions
- **Firefox:** Latest 2 versions
- **Safari:** Latest 2 versions
- **Edge:** Latest 2 versions
- **Mobile:** iOS Safari 12+, Chrome Android

## Troubleshooting

### Common Issues

**API Connection Failed**
- Verify backend is running on correct port
- Check VITE_API_URL in .env
- Check browser console for CORS errors
- Verify network connectivity

**Authentication Errors**
- Clear localStorage: `localStorage.clear()`
- Check JWT token expiration
- Verify backend JWT_SECRET matches
- Try logging in again

**Build Errors**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Update dependencies: `npm update`

**Styling Issues**
- Verify Tailwind CSS is processing correctly
- Check postcss.config.js configuration
- Rebuild CSS: `npm run build`
- Clear browser cache

## Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### Frontend-Specific Guidelines

- Follow React best practices
- Use functional components with hooks
- Write tests for new components
- Follow cookbook theme design
- Ensure responsive design
- Maintain accessibility standards
- Update component documentation

## License

MIT - see [LICENSE](../LICENSE)

## Support

- **Documentation:** [docs/](../docs/)
- **Component Library:** Check source code in `src/components/`
- **Issues:** [GitHub Issues](https://github.com/yourusername/recipe-book/issues)

---

**Version:** 2.1.4  
**Last Updated:** February 2026  
**Status:** ✅ Production Ready