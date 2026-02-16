# Password Reset Flow

Secure password reset functionality for Recipe Book users who have forgotten their password.

## Overview

The password reset feature provides a secure, email-based flow for users to reset their passwords when they've forgotten them. It implements security best practices including:

- Cryptographically secure tokens
- Token hashing and expiration
- Rate limiting
- User enumeration prevention
- Single-use tokens

## User Flow

### 1. Request Password Reset

Users who have forgotten their password can request a reset:

1. Navigate to the Login page
2. Click "Forgot password?" link
3. Enter their email address
4. Submit the request

### 2. Receive Reset Email

If the email exists in the system:

1. User receives an email with a password reset link
2. Link is valid for 1 hour
3. Link contains a secure, single-use token

**Example Email (Development Mode):**
```
Subject: Password Reset Request

You requested a password reset for your Recipe Book account.

Click the link below to reset your password:
http://localhost:5173/reset-password/abc123...xyz789

This link will expire in 1 hour.

If you didn't request this, please ignore this email.
```

### 3. Reset Password

1. User clicks the link in their email
2. Token is validated automatically
3. If valid, user sees password reset form
4. User enters and confirms new password
5. Password is reset successfully
6. User is redirected to login page

### 4. Log In

After successful reset:

1. All existing sessions are terminated
2. User must log in with new password
3. Access token and refresh token are cleared

## Security Features

### Cryptographically Secure Tokens

```javascript
// 32 bytes = 256 bits of entropy
const resetToken = crypto.randomBytes(32).toString('hex');
```

- Uses Node.js `crypto.randomBytes()` for true randomness
- 64-character hexadecimal string
- Statistically impossible to guess or brute force

### Token Hashing

Tokens are hashed before storage:

```javascript
const hashedToken = crypto
  .createHash('sha256')
  .update(resetToken)
  .digest('hex');
```

- Only hashed version stored in database
- Plain token sent via email
- Even if database is compromised, tokens cannot be used

### Token Expiration

- Tokens expire after **1 hour**
- Expiration checked at validation and reset
- Expired tokens are automatically rejected

### Rate Limiting

- **3 requests per email per hour**
- Prevents abuse and spam
- Returns 429 (Too Many Requests) when exceeded

### User Enumeration Prevention

```javascript
// Always returns success, even if email doesn't exist
return res.status(200).json({
  success: true,
  message: 'If an account with that email exists, a password reset link has been sent.'
});
```

- Same response for existing and non-existing emails
- Prevents attackers from discovering valid emails
- Database query still performed for timing attack prevention

### Single-Use Tokens

- Tokens are cleared immediately after successful use
- Cannot be reused even within expiration window
- Failed reset attempts don't clear the token

### Session Invalidation

```javascript
// Clear all refresh tokens
user.refreshTokens = [];
await user.save();
```

- All existing sessions are terminated
- User must log in again after password reset
- Prevents unauthorized access from old sessions

## API Endpoints

### POST /api/auth/forgot-password

Request a password reset.

**Request:**
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

**Rate Limiting:**
- 3 requests per email per hour
- 429 status code when exceeded

### GET /api/auth/validate-reset-token

Validate a reset token before showing the form.

**Request:**
```
GET /api/auth/validate-reset-token?token=abc123...
```

**Success Response:**
```json
{
  "success": true,
  "valid": true
}
```

**Invalid/Expired Response:**
```json
{
  "success": false,
  "valid": false,
  "error": "Password reset token is invalid or has expired"
}
```

### POST /api/auth/reset-password

Reset password with a valid token.

**Request:**
```json
{
  "token": "abc123...",
  "password": "newSecurePassword456"
}
```

**Success Response:**
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

## Frontend Components

### ForgotPasswordPage

Clean email input form for requesting password reset.

**Features:**
- Email validation
- Loading states
- Success/error message display
- Link back to login
- Link to registration

**Location:** `frontend/src/components/auth/ForgotPasswordPage.jsx`

### ResetPasswordPage

Secure password reset form with token validation.

**Features:**
- Automatic token validation on mount
- Password confirmation field
- Real-time validation
- Client-side password strength requirements
- Loading states
- Success redirect to login
- Handles invalid/expired tokens gracefully

**Location:** `frontend/src/components/auth/ResetPasswordPage.jsx`

### LoginPage Updates

Added "Forgot password?" link and success message display.

**Features:**
- "Forgot password?" link next to password field
- Displays success message after password reset
- Maintains existing login functionality

**Location:** `frontend/src/components/auth/LoginPage.jsx`

## Email Service

Flexible email service supporting multiple providers.

### Supported Providers

#### Console (Development)
```env
EMAIL_SERVICE=console
```
- Logs emails to console
- No actual sending
- Perfect for local development

#### Ethereal (Testing)
```env
EMAIL_SERVICE=ethereal
ETHEREAL_USER=your-user@ethereal.email
ETHEREAL_PASS=your-password
```
- Test email service
- Provides web interface to view emails
- Auto-generates credentials if not provided

#### SendGrid (Production)
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-api-key
EMAIL_FROM=noreply@yourdomain.com
```
- Production-ready email service
- Requires SendGrid account
- Reliable delivery

#### AWS SES (Production)
```env
EMAIL_SERVICE=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
EMAIL_FROM=noreply@yourdomain.com
```
- Amazon Simple Email Service
- Cost-effective for high volume
- Requires AWS account

### Email Template

Current plain-text template:

```
Subject: Password Reset Request

You requested a password reset for your Recipe Book account.

Click the link below to reset your password:
{RESET_LINK}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.
```

## Configuration

### Environment Variables

```env
# Email Service Configuration
EMAIL_SERVICE=console          # console, ethereal, sendgrid, ses
EMAIL_FROM=noreply@recipebook.com
FRONTEND_URL=http://localhost:5173

# Ethereal (optional)
ETHEREAL_USER=
ETHEREAL_PASS=

# SendGrid (production)
SENDGRID_API_KEY=

# AWS SES (production)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

### Frontend URL

The `FRONTEND_URL` environment variable determines where reset links point:

- **Development:** `http://localhost:5173`
- **Production:** `https://your-domain.com`

Reset link format: `{FRONTEND_URL}/reset-password/{token}`

## Testing

### Manual Testing

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Flow:**
   - Navigate to `/login`
   - Click "Forgot password?"
   - Enter email: `admin@recipebook.local`
   - Check backend console for email
   - Copy token from reset link
   - Visit `/reset-password/{TOKEN}`
   - Enter new password
   - Login with new password

### Integration Tests

Comprehensive test suite covering:

✅ Valid email request  
✅ Non-existent email (enumeration prevention)  
✅ Invalid email format  
✅ Rate limiting (3/hour)  
✅ Token hashing verification  
✅ Valid token validation  
✅ Expired token rejection  
✅ Password reset success  
✅ Password length validation  
✅ Expired token on reset  
✅ Token reuse prevention  
✅ Complete end-to-end flow  

**Location:** `backend/src/__tests__/integration/password-reset.test.js`

## Security Considerations

### OWASP Guidelines Compliance

✅ **A01 Access Control:** Sessions invalidated on password change  
✅ **A02 Cryptographic Failures:** Secure token generation and hashing  
✅ **A03 Injection:** Input validation and sanitization  
✅ **A05 Security Misconfiguration:** Secure defaults, no sensitive data exposure  
✅ **A07 Authentication Failures:** Rate limiting, secure token system  

### Additional Security Measures

1. **No Sensitive Information in URL:** Token is one-time use and expires
2. **HTTPS Only in Production:** Enforced at deployment level
3. **Token Timing Resistance:** Constant-time comparison where possible
4. **Audit Logging:** (Recommended for production)
5. **Email Verification:** (Planned for future release)

## Known Limitations

### In-Memory Rate Limiting

Current implementation stores rate limit data in memory:

```javascript
const resetAttempts = new Map(); // In-memory storage
```

**Impact:**
- Resets when server restarts
- Not shared across multiple server instances

**Recommendation for Production:**
- Use Redis for persistent, distributed rate limiting
- Maintains limits across server restarts and multiple instances

### Email Templates

Current implementation has hardcoded email content.

**Recommendation for Future:**
- Extract to template files
- Support HTML templates
- Allow customization per deployment

## Future Enhancements

### Planned for V2.2

- Email verification on registration
- Two-factor authentication (2FA)
- Redis-based rate limiting
- HTML email templates
- Password strength meter on reset page
- Audit logging for security events

### Planned for V3.0

- Magic link authentication (passwordless)
- Social login (Google, GitHub)
- Biometric authentication
- Security notifications

## Related Documentation

- [API Reference - Authentication](../api/api-reference.md#authentication-endpoints)
- [Requirements - REQ-014](../../reqs/REQ-014-password-reset.md)
- [Code Review](../../CODE_REVIEW_V2.1-PASSWORD-RESET.md)
- [SDLC Process](../SDLC.md)

## Support

For issues or questions:

1. Check backend console logs
2. Verify environment variables
3. Test with console email service first
4. Review integration tests for examples
5. Check email spam folder

## License

Part of Recipe Book project. See LICENSE file for details.