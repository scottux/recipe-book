# REQ-019: Email Verification

**Version**: 2.1.5  
**Status**: IN PROGRESS  
**Priority**: HIGH  
**Created**: February 15, 2026  
**Updated**: February 15, 2026

---

## Overview

Add email verification functionality to ensure users have access to the email addresses they register with. This improves account security and enables reliable communication with users.

---

## Business Requirements

### BR-1: Email Verification on Registration
**Description**: Users should verify their email address after registration  
**Rationale**: Ensures valid email addresses and prevents spam accounts  
**Priority**: HIGH

### BR-2: Non-Blocking Verification
**Description**: Users can use the application without verifying their email  
**Rationale**: Reduces friction in onboarding, encourages trial  
**Priority**: HIGH

### BR-3: Gentle Reminders
**Description**: Unverified users see gentle reminders to verify  
**Rationale**: Encourages verification without being intrusive  
**Priority**: MEDIUM

### BR-4: Resend Capability
**Description**: Users can request new verification emails  
**Rationale**: Handles lost/expired emails gracefully  
**Priority**: HIGH

---

## User Stories

### Story 1: New User Registration
```
As a new user
I want to verify my email address
So that I can confirm my account and receive important notifications
```

**Acceptance Criteria**:
- [ ] Verification email sent immediately after registration
- [ ] Email contains clear instructions and verification link
- [ ] Link works on mobile and desktop
- [ ] User receives confirmation after verification

### Story 2: Resending Verification Email
```
As an unverified user
I want to request a new verification email
So that I can verify my account if I lost or didn't receive the original email
```

**Acceptance Criteria**:
- [ ] Resend button available in account settings
- [ ] Rate limiting prevents abuse (max 3 per hour)
- [ ] Clear feedback on success/failure
- [ ] Previous tokens invalidated when new one sent

### Story 3: Verification Status Awareness
```
As a user
I want to see my verification status
So that I know if my email is verified
```

**Acceptance Criteria**:
- [ ] Verification status visible in account settings
- [ ] Banner shown to unverified users (dismissible per session)
- [ ] Verified badge displayed when appropriate
- [ ] Clear indication of benefits of verification

---

## Functional Requirements

### FR-1: Database Schema

**User Model Updates**:
```javascript
{
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false // Don't include in queries by default
  },
  emailVerificationExpires: {
    type: Date
  }
}
```

**Indexes**:
- `emailVerificationToken` (sparse index)

### FR-2: Token Generation

**Requirements**:
- Use `crypto.randomBytes(32).toString('hex')` for secure random tokens
- Hash tokens before storing (SHA-256)
- 24-hour expiration from generation time
- One-time use (cleared after verification)
- Generate new token invalidates previous tokens

**Token Format**:
```
Original: 64-character hex string
Stored: SHA-256 hash
Example: a3f2c1d4e5b6...
```

### FR-3: API Endpoints

#### POST /api/auth/send-verification
**Purpose**: Send/resend verification email  
**Authentication**: Required  
**Rate Limit**: 3 requests per hour per user

**Request**:
```json
{}
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Verification email sent to user@example.com"
}
```

**Response (Already Verified - 200)**:
```json
{
  "success": true,
  "message": "Email already verified"
}
```

**Response (Rate Limited - 429)**:
```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

#### GET /api/auth/verify-email/:token
**Purpose**: Verify email with token  
**Authentication**: Not required (token serves as authentication)  
**Rate Limit**: None (tokens are single-use)

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Response (Invalid/Expired Token - 400)**:
```json
{
  "success": false,
  "error": "Invalid or expired verification token"
}
```

#### GET /api/auth/me (Modified)
**Purpose**: Get current user info  
**Changes**: Include `emailVerified` field

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "username": "...",
      "email": "...",
      "emailVerified": true,
      "createdAt": "..."
    }
  }
}
```

### FR-4: Email Templates

#### Verification Email (email-verification.html)

**Subject**: "Verify your email - Recipe Book"

**Key Elements**:
- Friendly greeting with username
- Clear explanation of why verification is needed
- Prominent "Verify Email" button
- Plain text link as fallback
- Expiration notice (24 hours)
- Support contact information
- Cookbook-themed design

**Button Link**:
```
{FRONTEND_URL}/verify-email/{token}
```

#### Text Version (email-verification.txt)

**Content**: Plain text version with same information

### FR-5: Frontend Components

#### EmailVerificationPage.jsx
**Route**: `/verify-email/:token`  
**Purpose**: Landing page for verification links

**States**:
1. **Verifying**: Show loading spinner during API call
2. **Success**: Show success message with "Go to Dashboard" button
3. **Error**: Show error message with "Try Again" or "Resend" options

**UI Elements**:
- Cookbook-themed design
- Clear status messaging
- Appropriate icons (✓ for success, ✗ for error)
- Navigation buttons

#### VerificationBanner.jsx
**Location**: Top of app (below header)  
**Visibility**: Only for unverified users

**Features**:
- Non-intrusive banner style
- "Verify Email" call-to-action
- "Resend Email" button
- Close button (dismisses for session)
- Cookbook theme colors

**UI**:
```
┌────────────────────────────────────────────────────┐
│ ⚠️ Please verify your email address               │
│ [Resend Email] [Verify Now]              [Close]  │
└────────────────────────────────────────────────────┘
```

#### RegisterPage.jsx (Modified)
**Changes**:
- Show post-registration success message
- Inform user to check email
- Provide "Resend Email" option

**Post-Registration Message**:
```
Account created successfully!

We've sent a verification email to user@example.com.
Please check your inbox and click the verification link.

[Go to Dashboard] [Resend Email]
```

#### AccountSettingsPage.jsx (Modified)
**Changes**:
- Display email verification status
- Show "Verified" badge if verified
- Show "Resend Verification Email" button if not verified
- Display last sent timestamp

**UI Section**:
```
Email Verification
━━━━━━━━━━━━━━━━
Email: user@example.com
Status: ✓ Verified / ⚠️ Not Verified

[Resend Verification Email]
Last sent: 2 hours ago
```

---

## Non-Functional Requirements

### NFR-1: Security

**Requirements**:
- Tokens must be cryptographically secure (crypto.randomBytes)
- Tokens hashed before storage (SHA-256)
- Generic error messages prevent email enumeration
- Rate limiting prevents abuse
- HTTPS required for verification links
- Tokens expire after 24 hours
- One-time use enforcement

### NFR-2: Performance

**Requirements**:
- Email sending asynchronous (don't block registration)
- Verification endpoint responds in < 200ms
- Token generation completes in < 50ms
- Database queries optimized with indexes

### NFR-3: Reliability

**Requirements**:
- Email failures logged but don't break registration
- Graceful fallback if email service unavailable
- Retry logic for transient email failures
- Clear error messages for debugging

### NFR-4: Usability

**Requirements**:
- Verification emails arrive within 1 minute
- Clear, concise email copy
- Mobile-friendly verification page
- One-click verification (no forms)
- Helpful error messages

---

## Technical Specifications

### Email Service Integration

**Supported Providers**:
1. **Console** (development): Logs to console
2. **Ethereal** (development): Test email service
3. **SendGrid**: Production email via API
4. **AWS SES**: Production email via AWS

**Configuration** (`.env`):
```env
# Email Service Provider (console | ethereal | sendgrid | ses)
EMAIL_PROVIDER=console

# SendGrid
SENDGRID_API_KEY=your_key_here
SENDGRID_FROM_EMAIL=noreply@recipebook.com

# AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_SES_FROM_EMAIL=noreply@recipebook.com

# Frontend URL for verification links
FRONTEND_URL=http://localhost:5173
```

### Token Workflow

```
1. User registers
   ↓
2. Generate random token (crypto.randomBytes(32))
   ↓
3. Hash token (SHA-256)
   ↓
4. Store hash + expiration in database
   ↓
5. Send email with plain token in URL
   ↓
6. User clicks link
   ↓
7. Frontend extracts token from URL
   ↓
8. API hashes received token
   ↓
9. Compare hashed token to stored hash
   ↓
10. If match + not expired: mark verified
    ↓
11. Clear token from database
```

### Rate Limiting

**Verification Email Sends**:
- Limit: 3 requests per hour per user
- Implementation: Redis-based rate limiter
- Fallback: In-memory if Redis unavailable
- Response: 429 Too Many Requests

**Verification Endpoint**:
- No rate limiting (tokens are single-use)
- Brute force protection via token expiration

---

## UI/UX Requirements

### Email Design

**Visual Style**:
- Cookbook theme colors
- Clean, readable typography
- Mobile-responsive
- Dark mode compatible

**Content Principles**:
- Friendly, welcoming tone
- Clear call-to-action
- Security-conscious messaging
- Accessibility compliant

### Verification Page Design

**Layout**:
```
┌─────────────────────────────────┐
│         [Recipe Book Logo]       │
│                                  │
│    [Status Icon: ✓ or ✗]        │
│                                  │
│     Success/Error Message        │
│                                  │
│    [Action Button]               │
│                                  │
│    Additional Info/Help          │
└─────────────────────────────────┘
```

**Success State**:
- Green checkmark icon
- "Email Verified Successfully!" heading
- Confirmation message
- "Go to Dashboard" button

**Error State**:
- Red X icon
- "Verification Failed" heading
- Explanation of error
- "Resend Email" or "Contact Support" options

### Banner Design

**Style**:
- Background: Light cookbook cream
- Border: 2px cookbook brown
- Text: Dark brown
- Icons: Cookbook accent color
- Height: 60px
- Position: Sticky or fixed at top

**Behavior**:
- Dismissible per session (localStorage)
- Reappears on new session if still unverified
- Slides in smoothly on page load
- No animation on dismiss (instant)

---

## Security Requirements

### SEC-1: Token Security
- 256-bit entropy minimum
- Cryptographically secure random generation
- Hashed storage (SHA-256)
- HTTPS-only transmission

### SEC-2: Privacy Protection
- Don't reveal if email exists
- Generic error messages
- No user enumeration via timing attacks
- Redact emails in logs

### SEC-3: Abuse Prevention
- Rate limiting on resend
- Token expiration (24 hours)
- One-time use enforcement
- IP-based monitoring (future)

### SEC-4: Email Security
- SPF/DKIM/DMARC configuration
- TLS for email transmission
- No sensitive data in plain text
- Unsubscribe compliance (future)

---

## Error Handling

### Email Sending Failures

**Scenarios**:
1. Email service unavailable
2. Invalid email address
3. Rate limit exceeded
4. Network timeout

**Handling**:
- Log error with context
- Don't block user registration
- Show generic success message
- Allow manual resend later

### Verification Failures

**Scenarios**:
1. Invalid token
2. Expired token
3. Already verified
4. Token not found

**Handling**:
- Clear error messages
- Suggest resend for expired tokens
- Don't reveal token existence
- Log for monitoring

---

## Testing Requirements

### Unit Tests

**Token Generation**:
- [ ] Generates unique tokens
- [ ] Tokens are 64 characters hex
- [ ] Tokens are cryptographically random

**Token Hashing**:
- [ ] Hashing is deterministic
- [ ] Same token produces same hash
- [ ] Hash is 64 characters hex (SHA-256)

**Expiration Logic**:
- [ ] Tokens expire after 24 hours
- [ ] Expired tokens rejected
- [ ] Valid tokens accepted

### Integration Tests

**Send Verification Email**:
- [ ] Email sent on registration
- [ ] Email contains valid link
- [ ] Rate limiting works
- [ ] Already verified returns success

**Verify Email**:
- [ ] Valid token verifies email
- [ ] Token marked as used
- [ ] Expired token rejected
- [ ] Invalid token rejected
- [ ] Already verified returns error

**Resend Email**:
- [ ] Generates new token
- [ ] Invalidates old token
- [ ] Rate limit enforced
- [ ] Email sent successfully

### E2E Tests

**Full Verification Flow**:
- [ ] Register account
- [ ] Receive verification email
- [ ] Click verification link
- [ ] See success message
- [ ] Email marked verified
- [ ] Banner disappears

**Resend Flow**:
- [ ] Navigate to account settings
- [ ] Click resend button
- [ ] Receive new email
- [ ] Verify with new token
- [ ] Old token no longer works

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

**Verification Page**:
- [ ] Keyboard navigable
- [ ] Screen reader friendly
- [ ] Color contrast ratios met
- [ ] Focus indicators visible
- [ ] ARIA labels present

**Verification Banner**:
- [ ] Dismissible via keyboard
- [ ] Announced to screen readers
- [ ] High contrast colors
- [ ] No reliance on color alone

**Email Content**:
- [ ] Alt text for images
- [ ] Semantic HTML structure
- [ ] Plain text version available
- [ ] Readable without CSS

---

## Monitoring & Analytics

### Metrics to Track

**Verification Rates**:
- Daily verification rate
- Time to verification (median, P95)
- Abandoned verifications
- Resend request frequency

**Email Deliverability**:
- Send success rate
- Bounce rate
- Spam complaints
- Open rate (if tracking enabled)

**Error Rates**:
- Invalid token attempts
- Expired token attempts
- Email send failures
- API error rate

### Alerts

**Critical**:
- Email send failure rate > 10%
- Verification endpoint error rate > 5%
- Zero verifications for 1 hour

**Warning**:
- Resend rate > 50%
- Expired token rate > 30%
- Email bounce rate > 5%

---

## Migration Plan

### Database Migration

**Steps**:
1. Add new fields to User model
2. Set `emailVerified: false` for existing users
3. Create sparse index on `emailVerificationToken`
4. Verify migration success

**Rollback**:
- Remove new fields
- Drop index
- Restore from backup if needed

### Feature Rollout

**Phase 1** (Day 1):
- Deploy backend changes
- Enable for new registrations only

**Phase 2** (Day 2):
- Deploy frontend changes
- Show banner to existing unverified users

**Phase 3** (Day 3):
- Monitor metrics
- Adjust copy based on feedback

---

## Future Enhancements

### V2.1.6+
- Email change verification
- Phone number verification
- Two-factor authentication prep
- Security alert emails
- Verified user badge

### V2.2+
- Email preferences management
- Notification settings per email type
- Marketing email opt-in/out
- Email digest options

---

## Success Criteria

### Launch Criteria
- [ ] All integration tests passing
- [ ] Email delivery confirmed in test environments
- [ ] Rate limiting verified
- [ ] Security review completed
- [ ] Documentation updated

### Success Metrics (30 Days)
- Email verification rate: > 60%
- Email delivery success: > 95%
- User complaints: < 1%
- Time to verification: < 24 hours (median)
- Resend rate: < 30%

---

## References

### Related Requirements
- REQ-009: Authentication (base system)
- REQ-014: Password Reset (token pattern)
- REQ-015: Account Management (settings page)

### External Documentation
- OWASP Email Verification Guidelines
- SendGrid Best Practices
- RFC 5321 (SMTP)
- WCAG 2.1 AA Guidelines

---

## Appendix

### Email Template Preview

**Subject**: Verify your email - Recipe Book

**Body**:
```
Hi [username],

Welcome to Recipe Book! 📖

Please verify your email address to complete your account setup.

[Verify Email Button]

Or copy and paste this link into your browser:
https://app.recipebook.com/verify-email/abc123...

This link will expire in 24 hours.

If you didn't create an account with Recipe Book, you can safely ignore this email.

Happy cooking!
The Recipe Book Team

---
Questions? Contact us at support@recipebook.com
```

---

**Document Version**: 1.0  
**Author**: Product Team  
**Reviewers**: Engineering, Security, Legal  
**Approved**: Pending Implementation