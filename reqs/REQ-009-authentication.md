# REQ-009: User Authentication & Authorization

**Status:** ✅ Complete  
**Priority:** Critical  
**Version:** 2.0  
**Dependencies:** None (foundation for all user features)

## Overview
Secure user authentication system with JWT tokens, allowing users to have private recipe collections and personalized experiences.

## User Stories

### US-009-1: User Registration
**As a** new user  
**I want to** create an account  
**So that** I can save and organize my recipes

**Acceptance Criteria:**
- User provides email, password, and display name
- Password minimum 6 characters
- Email must be unique
- Email validation format
- Password confirmation required
- Account created successfully
- User automatically logged in after registration

### US-009-2: User Login
**As a** registered user  
**I want to** log in to my account  
**So that** I can access my recipes

**Acceptance Criteria:**
- User provides email and password
- Credentials validated against database
- JWT tokens generated (access + refresh)
- Tokens stored securely
- User redirected to recipe list
- Error message for invalid credentials

### US-009-3: User Logout
**As a** logged-in user  
**I want to** log out  
**So that** my account is secure

**Acceptance Criteria:**
- Logout button in navigation
- Refresh token invalidated
- Tokens removed from storage
- User redirected to login page
- Protected routes inaccessible after logout

### US-009-4: Session Persistence
**As a** logged-in user  
**I want to** stay logged in  
**So that** I don't have to re-login constantly

**Acceptance Criteria:**
- Access token valid for 15 minutes
- Refresh token valid for 7 days
- Automatic token refresh when access token expires
- Session persists across browser tabs
- Session persists after browser restart

### US-009-5: Profile Management
**As a** logged-in user  
**I want to** update my profile  
**So that** I can keep my information current

**Acceptance Criteria:**
- Can update display name
- Can update email
- Can update preferences (servings, units, theme)
- Can upload/change avatar
- Changes saved immediately
- Validation for all fields

### US-009-6: Password Management
**As a** logged-in user  
**I want to** change my password  
**So that** I can maintain account security

**Acceptance Criteria:**
- Requires current password verification
- New password minimum 6 characters
- Password confirmation required
- User must re-login after change
- Success/error messages shown

### US-009-7: Protected Routes
**As a** system  
**I want to** protect user data  
**So that** only authenticated users access their recipes

**Acceptance Criteria:**
- Unauthenticated users redirected to login
- Users can only view/edit their own recipes
- Authorization checks on all protected endpoints
- Clear error messages for unauthorized access

## Data Model

### User Schema
```javascript
{
  email: String,             // Required, unique, validated
  password: String,          // Hashed with bcrypt
  displayName: String,       // Required
  avatar: String,            // Avatar URL (optional)
  preferences: {
    defaultServings: Number, // Default 4
    measurementSystem: String, // imperial/metric
    theme: String            // light/dark/auto
  },
  refreshTokens: [String],   // Active refresh tokens
  isVerified: Boolean,       // Email verification (future)
  createdAt: Date,
  updatedAt: Date
}
```

### JWT Token Structure
```javascript
Access Token Payload:
{
  userId: String,
  iat: Number,              // Issued at
  exp: Number               // Expires in 15 minutes
}

Refresh Token Payload:
{
  userId: String,
  iat: Number,              // Issued at
  exp: Number               // Expires in 7 days
}
```

## API Endpoints

### Authentication
```
POST   /api/auth/register           - Create new account
POST   /api/auth/login              - Login and get tokens
POST   /api/auth/logout             - Invalidate refresh token
POST   /api/auth/refresh            - Get new access token
```

### Profile Management
```
GET    /api/auth/me                 - Get current user profile
PUT    /api/auth/me                 - Update profile
PUT    /api/auth/password           - Change password
```

## Security Features

### Password Security
- ✅ Bcrypt hashing (10 rounds)
- ✅ Minimum 6 characters
- ✅ Never stored in plain text
- ✅ Never returned in API responses

### Token Security
- ✅ JWT with secret keys
- ✅ Short-lived access tokens (15 min)
- ✅ Long-lived refresh tokens (7 days)
- ✅ Refresh token rotation
- ✅ Stored in httpOnly cookies (backend) or localStorage (frontend)

### Authorization
- ✅ Middleware validates JWT on protected routes
- ✅ User ID extracted from token
- ✅ Owner-only access to resources
- ✅ 401 Unauthorized for invalid/missing tokens
- ✅ 403 Forbidden for insufficient permissions

## Implementation Details

### Backend ✅ Complete
- ✅ User model with Mongoose schema
- ✅ Password hashing with bcryptjs
- ✅ JWT token generation and validation
- ✅ Auth middleware (`authenticate`)
- ✅ Auth controller (register, login, logout, refresh, profile)
- ✅ Auth routes registered
- ✅ Recipe model updated with owner field
- ✅ Recipe authorization checks

### Frontend ✅ Complete
- ✅ AuthContext for global state
- ✅ Login page component
- ✅ Register page component
- ✅ ProtectedRoute component
- ✅ API interceptor for token injection
- ✅ Automatic token refresh
- ✅ Logout functionality
- ✅ User display in header

### Migration ✅ Complete
- ✅ Migration script created
- ✅ Admin user created (admin@recipebook.local)
- ✅ All existing recipes assigned to admin
- ✅ Database successfully migrated

## Authentication Flow

### Registration Flow
```
1. User submits registration form
2. Backend validates email/password
3. Backend hashes password
4. Backend creates user record
5. Backend generates JWT tokens
6. Tokens returned to frontend
7. Frontend stores tokens
8. User automatically logged in
```

### Login Flow
```
1. User submits login form
2. Backend validates credentials
3. Backend verifies password hash
4. Backend generates JWT tokens
5. Refresh token stored in DB
6. Tokens returned to frontend
7. Frontend stores tokens
8. User redirected to app
```

### Token Refresh Flow
```
1. Access token expires (15 min)
2. API request fails with 401
3. Frontend sends refresh token
4. Backend validates refresh token
5. New access token generated
6. Frontend updates stored token
7. Original request retried
```

## Testing Requirements

### Unit Tests
- ✅ Password hashing and verification
- ✅ JWT token generation
- ✅ Token validation
- ✅ User model validation

### Integration Tests
- [ ] Registration workflow
- [ ] Login workflow
- [ ] Token refresh workflow
- [ ] Logout workflow
- [ ] Profile update workflow

### E2E Tests
- [ ] New user registration
- [ ] User login and logout
- [ ] Session persistence
- [ ] Password change
- [ ] Protected route access

## Business Rules

1. **Account Creation**
   - Email must be unique
   - Password minimum 6 characters
   - Display name required
   - Auto-login after registration

2. **Session Management**
   - Access token: 15 minutes
   - Refresh token: 7 days
   - Multiple devices supported
   - Logout invalidates refresh token

3. **Data Ownership**
   - Users own their recipes
   - Users can only see their own data
   - Deletion cascade (future)

4. **Security**
   - Passwords never returned in responses
   - Tokens use environment secrets
   - Rate limiting on auth endpoints

## Environment Variables

```env
# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Admin User (for migration)
ADMIN_EMAIL=admin@recipebook.local
ADMIN_PASSWORD=admin123
```

## Migration Strategy

### v1.3 to v2.0 Migration
1. ✅ Create admin user account
2. ✅ Add owner field to existing recipes
3. ✅ Assign all recipes to admin user
4. ✅ Users can't access recipes without login
5. ✅ New users start with empty recipe list

## UI Components

### Login Page
- Email input
- Password input
- "Sign In" button
- "Create Account" link
- Demo credentials display
- Error messages

### Register Page
- Display name input
- Email input
- Password input
- Confirm password input
- "Create Account" button
- "Sign In" link
- Validation messages

### Protected Route
- Loading spinner while checking auth
- Auto-redirect to login if unauthenticated
- Seamless access if authenticated

### User Menu (Header)
- Display user's name
- Logout button
- Profile link (future)

## Error Handling

### Common Errors
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing/invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: User/resource not found
- **409 Conflict**: Email already exists
- **500 Server Error**: Internal error

### User-Friendly Messages
- "Invalid email or password"
- "Email already registered"
- "Password must be at least 6 characters"
- "Session expired, please login again"
- "You don't have permission to access this recipe"

## Performance Considerations

1. **Token Validation**
   - Cached JWT verification
   - Minimal database lookups

2. **Password Hashing**
   - Bcrypt with 10 rounds (balance security/speed)
   - Async hashing to avoid blocking

3. **Session Storage**
   - localStorage for persistence
   - Memory for active session
   - Cleanup on logout

## Future Enhancements (v2.1+)

1. **Email Verification**
   - Send verification email
   - Email confirmation required
   - Resend verification option

2. **Password Reset**
   - "Forgot Password" flow
   - Email reset link
   - Token-based reset

3. **OAuth Integration**
   - Google Sign-In
   - Facebook Login
   - GitHub OAuth

4. **Two-Factor Authentication**
   - TOTP support
   - SMS verification
   - Backup codes

5. **Session Management**
   - View active sessions
   - Remote logout
   - Device tracking

## Success Metrics

- ✅ User registration rate
- ✅ Login success rate
- ✅ Session duration
- ✅ Token refresh rate
- ✅ Password change frequency

## Compliance

### Security Best Practices
- ✅ Passwords never in logs
- ✅ HTTPS recommended for production
- ✅ Token secrets in environment variables
- ✅ Rate limiting on auth endpoints
- ✅ Input validation and sanitization

### GDPR Considerations (Future)
- User data export
- Account deletion
- Privacy policy
- Cookie consent

## Dependencies

- **Backend:**
  - bcryptjs (password hashing)
  - jsonwebtoken (JWT tokens)
  - cookie-parser (cookie handling)
  - mongoose (database)

- **Frontend:**
  - axios (HTTP client)
  - react-router-dom (routing)
  - localStorage (token storage)

## Related Requirements

- REQ-001: Recipe CRUD (requires authentication)
- REQ-010: Collections (user-owned)
- REQ-011: Meal Planning (user-owned)
- REQ-012: Shopping Lists (user-owned)