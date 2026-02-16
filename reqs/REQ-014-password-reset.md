# REQ-014: Password Reset System

**Feature**: Password Reset Flow  
**Version**: 2.1.3  
**Priority**: HIGH  
**Status**: In Development  
**Created**: February 15, 2026  
**Owner**: Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [User Stories](#user-stories)
3. [Functional Requirements](#functional-requirements)
4. [Technical Requirements](#technical-requirements)
5. [Security Requirements](#security-requirements)
6. [API Specifications](#api-specifications)
7. [Database Schema](#database-schema)
8. [Email Templates](#email-templates)
9. [UI/UX Requirements](#uiux-requirements)
10. [Error Handling](#error-handling)
11. [Testing Requirements](#testing-requirements)
12. [Acceptance Criteria](#acceptance-criteria)
13. [Dependencies](#dependencies)
14. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose

Implement a secure password reset system that allows users to reset their passwords via email when they forget their credentials. The system must be secure, user-friendly, and protect against common attack vectors.

### Scope

**In Scope**:
- Email-based password reset workflow
- Secure token generation and validation
- Password reset request page (frontend)
- Password reset confirmation page (frontend)
- Email notification system
- Rate limiting and abuse prevention
- Token expiration mechanism

**Out of Scope**:
- SMS-based password reset
- Security questions
- Multi-factor authentication (future version)
- Account recovery via support ticket
- Biometric authentication

### Business Value

- **User Retention**: Users can recover accounts without support intervention
- **Support Cost Reduction**: Automated password reset reduces support tickets
- **Security**: Secure implementation prevents unauthorized access
- **User Experience**: Self-service password recovery improves satisfaction

---

## User Stories

### Primary User Stories

**US-014.1: Request Password Reset**
```
As a user who has forgotten my password
I want to request a password reset via email
So that I can regain access to my account
```

**Acceptance Criteria**:
- User can navigate to "Forgot Password" from login page
- User enters their registered email address
- System sends password reset email to registered address
- User receives confirmation message
- Process completes within 30 seconds

---

**US-014.2: Reset Password via Email Link**
```
As a user who has requested a password reset
I want to click the link in my email and set a new password
So that I can access my account again
```

**Acceptance Criteria**:
- Email contains secure, time-limited reset link
- Link opens password reset page
- User can enter and confirm new password
- Password meets security requirements
- Old password is successfully replaced
- User can log in with new password

---

**US-014.3: Handle Expired Reset Tokens**
```
As a user with an expired reset link
I want to be informed that the link has expired
So that I know to request a new one
```

**Acceptance Criteria**:
- System detects expired tokens (> 15 minutes old)
- User receives clear error message
- User is provided link to request new reset
- Expired tokens cannot be used

---

**US-014.4: Prevent Abuse**
```
As a system administrator
I want the password reset system to prevent abuse
So that users cannot be harassed or system resources wasted
```

**Acceptance Criteria**:
- Rate limiting prevents excessive reset requests
- Generic responses don't reveal user existence
- Failed attempts are logged
- Suspicious activity is detected

---

### Edge Cases

**US-014.5: Non-Existent Email**
```
As a potential attacker
I should not be able to determine if an email exists in the system
So that user privacy is protected
```

**Acceptance Criteria**:
- Generic success message regardless of email existence
- Response time is constant (no timing attacks)
- No information leakage

---

**US-014.6: Multiple Reset Requests**
```
As a user who requests multiple password resets
I want only the latest token to work
So that old links are automatically invalidated
```

**Acceptance Criteria**:
- Only most recent token is valid
- Previous tokens are invalidated
- System prevents token flooding

---

## Functional Requirements

### FR-014.1: Password Reset Request

**Requirement**: System shall provide a password reset request mechanism

**Details**:
1. User navigates to "Forgot Password" page
2. User enters email address
3. System validates email format
4. System checks email against database
5. If email exists:
   - Generate secure reset token
   - Store token with expiration (15 minutes)
   - Send password reset email
6. Display generic success message (regardless of email existence)
7. Return user to login page

**Validation Rules**:
- Email must be valid format
- Email must not exceed 255 characters
- Rate limiting: Max 3 requests per email per hour
- Rate limiting: Max 10 requests per IP per hour

---

### FR-014.2: Token Generation

**Requirement**: System shall generate cryptographically secure reset tokens

**Details**:
1. Generate 32-byte random token using crypto.randomBytes()
2. Create SHA-256 hash of token for storage
3. Store hashed token in database
4. Set expiration timestamp (current time + 15 minutes)
5. Invalidate any previous reset tokens for this user
6. Return plain token for email (not stored)

**Token Properties**:
- 64 characters (32 bytes hex encoded)
- Cryptographically random
- Single-use (invalidated on use or expiration)
- Short-lived (15 minutes)

---

### FR-014.3: Email Notification

**Requirement**: System shall send password reset email with secure link

**Details**:
1. Use configured email service (SMTP/API)
2. Send HTML and plain text versions
3. Include reset link with token as query parameter
4. Include expiration time in email
5. Include security notice (didn't request? ignore)
6. Use professional branding and formatting

**Email Content**:
- Subject: "Password Reset Request - Recipe Book"
- Reset link: `https://app.recipebook.com/reset-password?token=TOKEN`
- Clear instructions
- Expiration time displayed
- Security warnings
- Support contact information

---

### FR-014.4: Password Reset Confirmation

**Requirement**: System shall validate token and allow password reset

**Details**:
1. User clicks link in email
2. Frontend extracts token from URL
3. Frontend displays password reset form
4. User enters new password (twice for confirmation)
5. Frontend sends token + new password to API
6. Backend validates:
   - Token exists in database
   - Token has not expired
   - Token has not been used
   - Passwords match
   - Password meets security requirements
7. Hash new password
8. Update user password
9. Invalidate reset token
10. Display success message
11. Redirect to login page

---

### FR-014.5: Token Validation

**Requirement**: System shall strictly validate reset tokens

**Validation Steps**:
1. Hash received token (SHA-256)
2. Query database for matching hash
3. Check token has not expired (< 15 minutes old)
4. Check token has not been used (usedAt field is null)
5. Reject if any validation fails

**Failure Conditions**:
- Token not found in database → "Invalid or expired token"
- Token expired → "Reset link has expired"
- Token already used → "Reset link has already been used"
- All responses include link to request new reset

---

### FR-014.6: Rate Limiting

**Requirement**: System shall prevent abuse via rate limiting

**Rate Limits**:

**Per Email**:
- 3 requests per hour
- 5 requests per day
- 429 status code when exceeded
- Clear error message with retry time

**Per IP Address**:
- 10 requests per hour
- 20 requests per day
- Prevents anonymous abuse

**Implementation**:
- Use express-rate-limit middleware
- Store counters in memory (simple) or Redis (production)
- Return Retry-After header
- Log excessive attempts

---

## Technical Requirements

### TR-014.1: Backend Implementation

**Stack**:
- Node.js with Express
- MongoDB for token storage
- crypto module for token generation
- nodemailer for email sending

**New/Modified Files**:
```
backend/src/
├── models/
│   └── User.js (MODIFY - add reset fields)
├── controllers/
│   └── authController.js (MODIFY - add reset methods)
├── services/
│   ├── emailService.js (NEW)
│   └── tokenService.js (NEW)
├── middleware/
│   └── rateLimiter.js (NEW)
├── routes/
│   └── auth.js (MODIFY - add reset routes)
└── templates/
    └── email/
        ├── password-reset.html (NEW)
        └── password-reset.txt (NEW)
```

---

### TR-014.2: Frontend Implementation

**Stack**:
- React with React Router
- Tailwind CSS for styling
- Form validation

**New/Modified Files**:
```
frontend/src/
├── components/
│   └── auth/
│       ├── ForgotPasswordPage.jsx (NEW)
│       ├── ResetPasswordPage.jsx (NEW)
│       └── LoginPage.jsx (MODIFY - add forgot link)
├── services/
│   └── api.js (MODIFY - add reset methods)
└── App.jsx (MODIFY - add routes)
```

---

### TR-014.3: Email Service Configuration

**Environment Variables**:
```bash
# Email Service
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreply@recipebook.com
EMAIL_PASSWORD=app_specific_password
EMAIL_FROM="Recipe Book <noreply@recipebook.com>"

# Application
APP_URL=http://localhost:5173
APP_NAME="Recipe Book"

# Token
RESET_TOKEN_EXPIRY=900000  # 15 minutes in milliseconds
```

**Supported Email Services**:
- Gmail SMTP (development)
- SendGrid (production)
- AWS SES (enterprise)
- Mailgun (alternative)

---

### TR-014.4: Dependencies

**Backend**:
```json
{
  "nodemailer": "^6.9.7",
  "express-rate-limit": "^7.1.5"
}
```

**Frontend**:
```json
{
  "react-router-dom": "^6.21.1" (already installed)
}
```

---

## Security Requirements

### SR-014.1: Token Security

**Requirements**:
1. **Generation**:
   - Use `crypto.randomBytes(32)` for token generation
   - Never use timestamps, sequential IDs, or predictable values
   - Hex encode for URL safety

2. **Storage**:
   - Store only SHA-256 hash of token (not plain token)
   - Never log plain tokens
   - Include salt in hash (user ID + token)

3. **Transmission**:
   - Send plain token only in email (HTTPS encrypted)
   - Never in response bodies or logs
   - Include in URL query parameter only

4. **Expiration**:
   - 15-minute maximum lifetime
   - Check expiration on every validation
   - Auto-cleanup expired tokens (daily job)

---

### SR-014.2: Information Disclosure Prevention

**Requirements**:
1. **Generic Responses**:
   - Same message whether email exists or not
   - "If an account exists with that email, a reset link has been sent"
   - Never reveal user existence

2. **Timing Attack Prevention**:
   - Add random delay (50-200ms) to responses
   - Constant-time comparisons for token validation
   - Prevent timing-based enumeration

3. **Error Messages**:
   - Generic: "Invalid or expired reset token"
   - Never reveal specific failure reason
   - Log detailed errors server-side only

---

### SR-014.3: Rate Limiting

**Requirements**:
1. **Request Limits**:
   - 3 reset requests per email per hour
   - 10 reset requests per IP per hour
   - 5 password changes per user per day

2. **Response to Limit Exceeded**:
   - HTTP 429 (Too Many Requests)
   - Retry-After header with seconds
   - Clear error message
   - Log excessive attempts

3. **Bypass Prevention**:
   - Track by both email and IP
   - Clean counters hourly
   - No rate limit bypass endpoints

---

### SR-014.4: Password Requirements

**Requirements**:
1. **Complexity**:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - Optional: At least one special character

2. **Additional Checks**:
   - Not same as current password
   - Not within last 3 passwords (future)
   - Not common/breached passwords (future)

3. **Validation**:
   - Frontend validation for UX
   - Backend validation for security
   - Clear error messages for failed validation

---

### SR-014.5: Logging and Monitoring

**Requirements**:
1. **Log Events**:
   - Password reset requested (email hash only)
   - Reset email sent successfully/failed
   - Token validated successfully/failed
   - Password changed successfully
   - Rate limit exceeded
   - Suspicious patterns detected

2. **Do NOT Log**:
   - Plain reset tokens
   - Email addresses in plain text
   - New passwords (even hashed)
   - User IP addresses (GDPR compliance)

3. **Monitoring Alerts**:
   - Email delivery failure rate > 5%
   - Token validation failure rate > 50%
   - Rate limit exceeded > 10 times/hour
   - Same email multiple failed resets

---

## API Specifications

### API-014.1: Request Password Reset

**Endpoint**: `POST /api/auth/request-reset`

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Validation**:
- `email` (required): Valid email format, max 255 chars

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "If an account exists with that email, a password reset link has been sent."
}
```

**Note**: Same response whether email exists or not (security)

**Error Responses**:

*400 Bad Request* (Invalid email format):
```json
{
  "success": false,
  "message": "Please provide a valid email address"
}
```

*429 Too Many Requests* (Rate limit exceeded):
```json
{
  "success": false,
  "message": "Too many reset requests. Please try again in 45 minutes.",
  "retryAfter": 2700
}
```

*500 Internal Server Error*:
```json
{
  "success": false,
  "message": "Password reset request failed. Please try again later."
}
```

---

### API-014.2: Reset Password

**Endpoint**: `POST /api/auth/reset-password`

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "token": "a1b2c3d4e5f6...",
  "password": "NewSecurePassword123",
  "confirmPassword": "NewSecurePassword123"
}
```

**Validation**:
- `token` (required): 64-character hex string
- `password` (required): Meet password requirements
- `confirmPassword` (required): Must match password

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

**Error Responses**:

*400 Bad Request* (Validation errors):
```json
{
  "success": false,
  "message": "Password must be at least 8 characters and contain uppercase, lowercase, and numbers"
}
```

```json
{
  "success": false,
  "message": "Passwords do not match"
}
```

*400 Bad Request* (Invalid/expired token):
```json
{
  "success": false,
  "message": "Invalid or expired reset token. Please request a new password reset.",
  "requestResetUrl": "/forgot-password"
}
```

*429 Too Many Requests*:
```json
{
  "success": false,
  "message": "Too many password reset attempts. Please try again later."
}
```

*500 Internal Server Error*:
```json
{
  "success": false,
  "message": "Password reset failed. Please try again later."
}
```

---

## Database Schema

### Schema Updates: User Model

**File**: `backend/src/models/User.js`

**New Fields**:
```javascript
{
  // Existing fields...
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // NEW: Password Reset Fields
  resetPasswordToken: {
    type: String,
    default: null,
    select: false  // Don't include in queries by default
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
    select: false
  },
  resetPasswordUsedAt: {
    type: Date,
    default: null,
    select: false
  },
  
  // Existing fields...
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

**Indexes**:
```javascript
// Add index for token lookups
UserSchema.index({ resetPasswordToken: 1 });

// Add TTL index to auto-delete expired tokens
UserSchema.index(
  { resetPasswordExpires: 1 },
  { 
    expireAfterSeconds: 86400,  // 24 hours
    partialFilterExpression: { 
      resetPasswordExpires: { $exists: true, $ne: null }
    }
  }
);
```

**Methods**:
```javascript
// Generate password reset token
UserSchema.methods.createPasswordResetToken = function() {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash and set to database
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  // Set expiration (15 minutes)
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  
  // Clear previous usage
  this.resetPasswordUsedAt = null;
  
  // Return plain token (only time it's available)
  return resetToken;
};

// Validate password reset token
UserSchema.methods.validateResetToken = function(token) {
  // Hash provided token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Check if matches
  if (this.resetPasswordToken !== hashedToken) {
    return { valid: false, reason: 'invalid' };
  }
  
  // Check if expired
  if (Date.now() > this.resetPasswordExpires) {
    return { valid: false, reason: 'expired' };
  }
  
  // Check if already used
  if (this.resetPasswordUsedAt) {
    return { valid: false, reason: 'used' };
  }
  
  return { valid: true };
};

// Mark token as used
UserSchema.methods.markResetTokenUsed = function() {
  this.resetPasswordUsedAt = Date.now();
  this.resetPasswordToken = null;
  this.resetPasswordExpires = null;
};
```

---

## Email Templates

### Template-014.1: Password Reset Email (HTML)

**File**: `backend/src/templates/email/password-reset.html`

**Template Variables**:
- `{{username}}` - User's username
- `{{resetUrl}}` - Password reset URL with token
- `{{expiryMinutes}}` - Token expiry time (15)
- `{{supportEmail}}` - Support contact email

**Content**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - Recipe Book</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #4F46E5;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .warning {
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 12px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #6B7280;
      font-size: 12px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Recipe Book</h1>
  </div>
  
  <div class="content">
    <h2>Password Reset Request</h2>
    
    <p>Hi {{username}},</p>
    
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>
    
    <center>
      <a href="{{resetUrl}}" class="button">Reset Password</a>
    </center>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #4F46E5;">{{resetUrl}}</p>
    
    <p><strong>This link will expire in {{expiryMinutes}} minutes.</strong></p>
    
    <div class="warning">
      <strong>⚠️ Security Notice</strong><br>
      If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
    </div>
    
    <p>For security reasons:</p>
    <ul>
      <li>Never share this link with anyone</li>
      <li>We will never ask for your password via email</li>
      <li>This link can only be used once</li>
    </ul>
  </div>
  
  <div class="footer">
    <p>Recipe Book - Your Personal Recipe Manager</p>
    <p>Questions? Contact us at {{supportEmail}}</p>
  </div>
</body>
</html>
```

---

### Template-014.2: Password Reset Email (Plain Text)

**File**: `backend/src/templates/email/password-reset.txt`

**Content**:
```text
Recipe Book - Password Reset Request

Hi {{username}},

We received a request to reset your password. Click the link below to choose a new password:

{{resetUrl}}

This link will expire in {{expiryMinutes}} minutes.

SECURITY NOTICE:
If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

For security reasons:
- Never share this link with anyone
- We will never ask for your password via email
- This link can only be used once

Questions? Contact us at {{supportEmail}}

---
Recipe Book - Your Personal Recipe Manager
```

---

## UI/UX Requirements

### UX-014.1: Forgot Password Page

**Route**: `/forgot-password`

**Layout**:
```
┌─────────────────────────────────────────┐
│        [Recipe Book Logo]               │
│                                         │
│    Password Reset                       │
│                                         │
│    Enter your email address and we'll  │
│    send you a link to reset your       │
│    password.                            │
│                                         │
│    ┌─────────────────────────────┐    │
│    │ Email Address               │    │
│    └─────────────────────────────┘    │
│                                         │
│    [Send Reset Link]                    │
│                                         │
│    ← Back to Login                      │
│                                         │
└─────────────────────────────────────────┘
```

**Features**:
- Clean, focused interface
- Email input with validation
- Loading state during submission
- Success/error messages
- Link back to login page

**Validation**:
- Real-time email format validation
- Disabled button until valid email entered
- Clear error messages

---

### UX-014.2: Reset Link Sent Page

**Display After Request**:
```
┌─────────────────────────────────────────┐
│        [Recipe Book Logo]               │
│                                         │
│    ✅ Check Your Email                  │
│                                         │
│    If an account exists with that      │
│    email address, we've sent password  │
│    reset instructions.                  │
│                                         │
│    Didn't receive the email?           │
│    • Check your spam folder            │
│    • Verify the email address          │
│    • [Request another reset]           │
│                                         │
│    ← Back to Login                      │
│                                         │
└─────────────────────────────────────────┘
```

---

### UX-014.3: Reset Password Page

**Route**: `/reset-password?token=TOKEN`

**Layout**:
```
┌─────────────────────────────────────────┐
│        [Recipe Book Logo]               │
│                                         │
│    Choose New Password                  │
│                                         │
│    ┌─────────────────────────────┐    │
│    │ New Password                │    │
│    └─────────────────────────────┘    │
│                                         │
│    ┌─────────────────────────────┐    │
│    │ Confirm New Password        │    │
│    └─────────────────────────────┘    │
│                                         │
│    Password must:                       │
│    ✓ Be at least 8 characters          │
│    ✓ Include uppercase letter          │
│    ✓ Include lowercase letter          │
│    ✓ Include number                    │
│                                         │
│    [Reset Password]                     │
│                                         │
└─────────────────────────────────────────┘
```

**Features**:
- Password visibility toggle
- Real-time password strength indicator
- Password requirements checklist
- Match validation for confirm field
- Loading state during submission

---

### UX-014.4: Success/Error States

**Success (Password Reset)**:
```
┌─────────────────────────────────────────┐
│        [Recipe Book Logo]               │
│                                         │
│    ✅ Password Reset Successful        │
│                                         │
│    Your password has been changed.     │
│    You can now log in with your new    │
│    password.                            │
│                                         │
│    [Go to Login]                        │
│                                         │
└─────────────────────────────────────────┘
```

**Error (Expired Token)**:
```
┌─────────────────────────────────────────┐
│        [Recipe Book Logo]               │
│                                         │
│    ⚠️ Reset Link Expired               │
│                                         │
│    This password reset link has        │
│    expired or has already been used.   │
│                                         │
│    [Request New Reset Link]            │
│                                         │
│    ← Back to Login                      │
│                                         │
└─────────────────────────────────────────┘
```

---

### UX-014.5: Login Page Update

**Add to Login Page**:
```
┌─────────────────────────────────────────┐
│    Login                                │
│                                         │
│    ┌─────────────────────────────┐    │
│    │ Username                    │    │
│    └─────────────────────────────┘    │
│                                         │
│    ┌─────────────────────────────┐    │
│    │ Password                    │    │
│    └─────────────────────────────┘    │
│                                         │
│    Forgot password? →                   │  <-- NEW
│                                         │
│    [Login]                              │
│                                         │
└─────────────────────────────────────────┘
```

**Link Properties**:
- Text: "Forgot password?"
- Route: `/forgot-password`
- Styling: Secondary color, smaller text
- Position: Below password field, right-aligned

---

## Error Handling

### EH-014.1: User-Facing Errors

**Email Service Failure**:
- Message: "Unable to send reset email. Please try again later."
- Action: Log error, alert admin, display generic message
- HTTP Status: 500

**Invalid Email Format**:
- Message: "Please enter a valid email address."
- Action: Frontend validation, prevent submission
- HTTP Status: 400

**Rate Limit Exceeded**:
- Message: "Too many reset requests. Please try again in X minutes."
- Action: Return Retry-After header
- HTTP Status: 429

**Invalid/Expired Token**:
- Message: "This reset link is invalid or has expired. Please request a new one."
- Action: Provide link to request new reset
- HTTP Status: 400

**Password Validation Failed**:
- Message: Specific requirement not met (e.g., "Password must be at least 8 characters")
- Action: Highlight failed requirement
- HTTP Status: 400

**Passwords Don't Match**:
- Message: "Passwords do not match. Please try again."
- Action: Highlight confirm password field
- HTTP Status: 400

---

### EH-014.2: System Errors

**Database Connection Failure**:
- Log: "Database connection failed during password reset"
- User Message: "Service temporarily unavailable. Please try again later."
- Action: Alert monitoring system, retry logic

**Email Service Down**:
- Log: "Email service unavailable: [error details]"
- User Message: Generic success (don't reveal failure)
- Action: Queue email for retry, alert admin

**Token Generation Failure**:
- Log: "Failed to generate secure token: [error]"
- User Message: "Unable to process request. Please try again."
- Action: Alert admin, investigate crypto module

---

### EH-014.3: Security Events

**Multiple Failed Attempts**:
- Log: "Multiple password reset failures for email: [hashed]"
- Action: Increase rate limiting, flag for review
- Alert: Security team notification

**Token Validation Failures**:
- Log: "High token validation failure rate: X%"
- Action: Investigate potential attack
- Alert: Monitor for patterns

**Suspicious Activity**:
- Log: "Potential abuse detected: [details]"
- Action: Temporarily increase rate limits
- Alert: Security review required

---

## Testing Requirements

### Test-014.1: Unit Tests

**Backend Unit Tests** (`authController.test.js`):

```javascript
describe('Password Reset - Unit Tests', () => {
  describe('Token Generation', () => {
    it('should generate 64-character hex token', () => {});
    it('should store SHA-256 hash, not plain token', () => {});
    it('should set 15-minute expiration', () => {});
    it('should invalidate previous tokens', () => {});
  });
  
  describe('Token Validation', () => {
    it('should validate correct token', () => {});
    it('should reject expired token', () => {});
    it('should reject used token', () => {});
    it('should reject invalid token format', () => {});
  });
  
  describe('Password Requirements', () => {
    it('should accept valid password', () => {});
    it('should reject password < 8 chars', () => {});
    it('should reject password without uppercase', () => {});
    it('should reject password without lowercase', () => {});
    it('should reject password without number', () => {});
  });
});
```

**Frontend Unit Tests** (`ForgotPasswordPage.test.jsx`):

```javascript
describe('Forgot Password Page', () => {
  it('should render email input', () => {});
  it('should validate email format', () => {});
  it('should disable button until valid email', () => {});
  it('should show loading state on submit', () => {});
  it('should display success message', () => {});
  it('should display error message', () => {});
});

describe('Reset Password Page', () => {
  it('should extract token from URL', () => {});
  it('should render password inputs', () => {});
  it('should validate password requirements', () => {});
  it('should check password match', () => {});
  it('should show password strength indicator', () => {});
  it('should handle expired token error', () => {});
});
```

**Target Coverage**: 95%+

---

### Test-014.2: Integration Tests

**Integration Test Suite** (`password-reset.test.js`):

```javascript
describe('Password Reset - Integration Tests', () => {
  describe('Request Password Reset', () => {
    it('should send reset email for existing user', async () => {
      // 1. Create test user
      // 2. Request password reset
      // 3. Verify 200 response
      // 4. Verify token stored in database
      // 5. Verify email sent (mock)
    });
    
    it('should return generic message for non-existent email', async () => {
      // 1. Request reset for fake email
      // 2. Verify generic success response
      // 3. Verify no token created
      // 4. Verify no email sent
    });
    
    it('should enforce rate limiting per email', async () => {
      // 1. Make 4 requests for same email
      // 2. Verify first 3 succeed
      // 3. Verify 4th returns 429
    });
    
    it('should enforce rate limiting per IP', async () => {
      // 1. Make 11 requests from same IP
      // 2. Verify first 10 succeed
      // 3. Verify 11th returns 429
    });
  });
  
  describe('Reset Password', () => {
    it('should reset password with valid token', async () => {
      // 1. Create user and token
      // 2. Submit new password with token
      // 3. Verify 200 response
      // 4. Verify password updated
      // 5. Verify token invalidated
      // 6. Verify can login with new password
    });
    
    it('should reject expired token', async () => {
      // 1. Create user and expired token
      // 2. Attempt password reset
      // 3. Verify 400 response
      // 4. Verify password unchanged
    });
    
    it('should reject already-used token', async () => {
      // 1. Create user and token
      // 2. Use token to reset password
      // 3. Attempt to use same token again
      // 4. Verify 400 response
    });
    
    it('should reject invalid token format', async () => {
      // 1. Submit reset with malformed token
      // 2. Verify 400 response
    });
    
    it('should reject weak password', async () => {
      // 1. Create user and token
      // 2. Submit weak password (e.g., "pass")
      // 3. Verify 400 response with validation error
    });
    
    it('should reject non-matching passwords', async () => {
      // 1. Create user and token
      // 2. Submit different password and confirmPassword
      // 3. Verify 400 response
    });
  });
  
  describe('Email Functionality', () => {
    it('should send email with correct reset link', async () => {
      // 1. Request password reset
      // 2. Capture email content
      // 3. Verify reset URL contains valid token
      // 4. Verify email template rendered
    });
    
    it('should handle email service failure gracefully', async () => {
      // 1. Mock email service failure
      // 2. Request password reset
      // 3. Verify generic success response (don't leak error)
      // 4. Verify error logged
    });
  });
  
  describe('Security', () => {
    it('should invalidate old tokens when new one requested', async () => {
      // 1. Create user
      // 2. Request reset (token1)
      // 3. Request reset again (token2)
      // 4. Verify token1 no longer works
      // 5. Verify token2 works
    });
    
    it('should use constant-time token comparison', async () => {
      // Verify timing attack resistance
    });
  });
});
```

**Target**: 30+ integration tests, 100% coverage of reset flow

---

### Test-014.3: E2E Tests

**E2E Test Suite** (`password-reset.spec.js`):

```javascript
test.describe('Password Reset Flow', () => {
  test('should complete full password reset journey', async ({ page }) => {
    // 1. Register new user
    await page.goto('/register');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'OldPassword123');
    await page.click('button[type="submit"]');
    
    // 2. Log out
    await page.click('text=Logout');
    
    // 3. Go to forgot password ​
    await page.goto('/login');
    await page.click('text=Forgot password?');
    
    // 4. Request password reset
    await expect(page).toHaveURL('/forgot-password');
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button:has-text("Send Reset Link")');
    
    // 5. Verify success message
    await expect(page.locator('text=Check Your Email')).toBeVisible();
    
    // 6. Get reset token from database (test helper)
    const token = await getResetTokenFromDB('test@example.com');
    
    // 7. Navigate to reset page with token
    await page.goto(`/reset-password?token=${token}`);
    
    // 8. Enter new password
    await page.fill('[name="password"]', 'NewPassword123');
    await page.fill('[name="confirmPassword"]', 'NewPassword123');
    await page.click('button:has-text("Reset Password")');
    
    // 9. Verify success
    await expect(page.locator('text=Password Reset Successful')).toBeVisible();
    
    // 10. Login with new password
    await page.click('text=Go to Login');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'NewPassword123');
    await page.click('button:has-text("Login")');
    
    // 11. Verify logged in
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=testuser')).toBeVisible();
  });
  
  test('should show error for expired token', async ({ page }) => {
    // 1. Create expired token
    // 2. Navigate to reset page
    // 3. Verify error message
    // 4. Verify "Request New Reset" link
  });
  
  test('should validate password requirements in real-time', async ({ page }) => {
    // 1. Navigate to reset page with valid token
    // 2. Type various invalid passwords
    // 3. Verify requirement checklist updates
    // 4. Verify submit button disabled until valid
  });
});
```

**Target**: 5+ complete user journeys

---

### Test-014.4: Security Tests

**Security Test Suite**:

```javascript
describe('Password Reset - Security Tests', () => {
  test('should not leak user existence', async () => {
    // Request reset for valid and invalid emails
    // Verify identical responses and timing
  });
  
  test('should enforce rate limits', async () => {
    // Attempt to exceed rate limits
    // Verify 429 responses
  });
  
  test('should reject token tampering', async () => {
    // Modify valid token
    // Verify rejection
  });
  
  test('should use secure random tokens', async () => {
    // Generate many tokens
    // Verify randomness, no patterns
  });
  
  test('should prevent CSRF attacks', async () => {
    // Attempt reset without proper origin
    // Verify rejection
  });
});
```

---

## Acceptance Criteria

### AC-014.1: Functional Acceptance

- [ ] User can navigate to "Forgot Password" from login page
- [ ] User can request password reset by entering email
- [ ] System generates secure 64-character token
- [ ] Token is hashed before storage (SHA-256)
- [ ] Token expires after 15 minutes
- [ ] Password reset email is sent within 30 seconds
- [ ] Email contains working reset link
- [ ] Reset link opens password reset page
- [ ] User can enter and confirm new password
- [ ] Password meets all security requirements
- [ ] Password is successfully updated in database
- [ ] Old password no longer works
- [ ] New password works for login
- [ ] Token is invalidated after use
- [ ] Previous tokens are invalidated when new one requested

---

### AC-014.2: Security Acceptance

- [ ] Generic responses don't reveal user existence
- [ ] Response times are consistent (no timing attacks)
- [ ] Tokens are cryptographically random
- [ ] Only hashed tokens stored in database
- [ ] Plain tokens never logged
- [ ] Rate limiting prevents abuse (3 req/hour per email)
- [ ] Rate limiting prevents IP flooding (10 req/hour per IP)
- [ ] Expired tokens are rejected
- [ ] Used tokens are rejected
- [ ] Invalid tokens are rejected
- [ ] Password validation enforced on backend
- [ ] XSS protection in email templates
- [ ] CSRF protection on endpoints

---

### AC-014.3: UX Acceptance

- [ ] "Forgot Password" link is visible on login page
- [ ] Forgot password page is clean and focused
- [ ] Email input has format validation
- [ ] Success message is clear and helpful
- [ ] Reset password page validates in real-time
- [ ] Password requirements are clearly displayed
- [ ] Password visibility toggle works
- [ ] Loading states are shown during API calls
- [ ] Error messages are clear and actionable
- [ ] Success states redirect appropriately
- [ ] Mobile responsive design

---

### AC-014.4: Testing Acceptance

- [ ] Unit test coverage ≥ 95%
- [ ] All integration tests passing
- [ ] E2E tests cover complete user journey
- [ ] Security tests verify protection measures
- [ ] Performance tests show acceptable response times
- [ ] Email delivery tested (staging environment)

---

### AC-014.5: Documentation Acceptance

- [ ] API endpoints documented
- [ ] Email templates created
- [ ] User guide updated
- [ ] Error handling documented
- [ ] Security considerations documented
- [ ] Code comments added
- [ ] README updated with setup instructions

---

## Dependencies

### External Dependencies

**Required**:
- Email service (Gmail SMTP, SendGrid, AWS SES, or Mailgun)
- SMTP credentials or API keys
- Verified sender email address

**Optional**:
- Redis (for distributed rate limiting in production)
- Email template service (e.g., Handlebars, EJS)

---

### Internal Dependencies

**Backend**:
- Existing authentication system (REQ-009)
- User model
- JWT middleware
- Express error handling

**Frontend**:
- React Router
- Existing auth context
- API service layer
- Form validation utilities

**Infrastructure**:
- Environment variable configuration
- Email service setup
- Database indexes

---

## Future Enhancements

### Post-V2.1.3 Improvements

**V2.2 - Email Verification Integration**:
- Require email verification before password reset
- Prevent reset for unverified accounts
- Send verification reminder in reset flow

**V2.3 - Enhanced Security**:
- Two-factor authentication support
- Security questions (optional)
- Account recovery codes
- Login notification emails

**V2.4 - Advanced Features**:
- Password history (prevent reuse of last N passwords)
- Breached password checking (haveibeenpwned API)
- Suspicious activity detection
- Passwordless authentication options

**V2.5 - Analytics**:
- Reset request metrics
- Success/failure rates
- Email delivery statistics
- User behavior insights

**V3.0 - Mobile Support**:
- Deep linking for mobile apps
- SMS-based password reset
- Biometric authentication
- Push notification alternatives

---

## Notes

### Development Notes

1. **Email Service Choice**:
   - Start with Gmail SMTP for development
   - Plan migration to SendGrid for production
   - Configure SMTP settings in `.env`
   - Test email delivery before launch

2. **Token Security**:
   - Never log plain tokens
   - Always hash before comparison
   - Use crypto.timingSafeEqual() for comparison
   - Implement token cleanup job

3. **Rate Limiting**:
   - Use in-memory limits for development
   - Switch to Redis for production
   - Configure limits based on user feedback
   - Monitor for abuse patterns

4. **Testing Strategy**:
   - Mock email service in tests
   - Use real MongoDB for integration tests
   - Test with various email providers
   - Verify mobile email rendering

### Implementation Order

1. ✅ Requirements documentation (this document)
2. Backend: Database schema updates
3. Backend: Token service
4. Backend: Email service
5. Backend: Auth controller updates
6. Backend: Rate limiting middleware
7. Backend: Unit tests
8. Frontend: Forgot password page
9. Frontend: Reset password page
10. Frontend: Login page updates
11. Frontend: Component tests
12. Integration testing
13. E2E testing
14. Security testing
15. Documentation updates

---

**Document Status**: COMPLETE  
**Reviewed By**: Development Team  
**Approved**: Pending Implementation  
**Next Review**: After Phase 3 (Design)

---

**Change Log**:
- **V1.0** (Feb 15, 2026): Initial requirements document created