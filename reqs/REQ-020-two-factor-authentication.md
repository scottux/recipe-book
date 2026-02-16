# REQ-020: Two-Factor Authentication (2FA)

**Version**: 2.1.7  
**Status**: Draft  
**Created**: February 15, 2026  
**Author**: Development Team  
**Priority**: HIGH

---

## Table of Contents

1. [Overview](#overview)
2. [Business Requirements](#business-requirements)
3. [User Stories](#user-stories)
4. [Functional Requirements](#functional-requirements)
5. [Technical Requirements](#technical-requirements)
6. [Security Requirements](#security-requirements)
7. [UI/UX Requirements](#ui-ux-requirements)
8. [API Specifications](#api-specifications)
9. [Data Models](#data-models)
10. [Testing Requirements](#testing-requirements)
11. [Acceptance Criteria](#acceptance-criteria)
12. [Dependencies](#dependencies)
13. [Risks & Mitigations](#risks--mitigations)

---

## Overview

### Purpose

Implement Time-based One-Time Password (TOTP) two-factor authentication to enhance account security. This optional security feature provides an additional layer of protection beyond username and password.

### Scope

- TOTP-based 2FA using authenticator apps (Google Authenticator, Authy, etc.)
- QR code generation for easy setup
- Backup recovery codes (10 single-use codes)
- Optional 2FA (users can enable/disable)
- 2FA verification during login
- Recovery code usage tracking
- Account recovery process

### Out of Scope (Future Versions)

- SMS-based 2FA (security concerns, cost)
- Email-based 2FA codes
- Hardware security keys (FIDO2/WebAuthn)
- Biometric authentication
- Push notification-based 2FA

---

## Business Requirements

### Goals

1. **Enhanced Security**: Protect user accounts from password-based attacks
2. **User Trust**: Demonstrate commitment to account security
3. **Industry Standard**: Meet modern security expectations
4. **Compliance Ready**: Prepare for potential compliance requirements
5. **Optional Adoption**: Allow users to choose their security level

### Success Metrics

- **Adoption Rate**: 25%+ of users enable 2FA within 3 months
- **Security Incidents**: Reduce account compromise by 95%
- **Support Tickets**: < 5% 2FA-related support requests
- **Recovery Success**: 98%+ recovery code usage success rate
- **User Satisfaction**: 4.5+ stars for 2FA feature

---

## User Stories

### US-020-001: Enable 2FA

**As a** security-conscious user  
**I want to** enable two-factor authentication on my account  
**So that** my recipes and data are protected even if my password is compromised

**Acceptance Criteria**:
- User can navigate to 2FA settings from account page
- System generates unique TOTP secret for user
- QR code is displayed for easy scanning
- Manual entry code is provided as alternative
- System verifies first TOTP code before enabling
- 10 backup recovery codes are generated and displayed
- User must acknowledge saving recovery codes
- 2FA status is clearly indicated in account settings

### US-020-002: Login with 2FA

**As a** user with 2FA enabled  
**I want to** enter my authenticator code during login  
**So that** my account remains secure

**Acceptance Criteria**:
- After password verification, 2FA prompt appears
- User has 2 minutes to enter 6-digit code
- System validates TOTP code
- System provides clear error messages for invalid codes
- User can request to use recovery code instead
- Successful 2FA logs user in immediately
- Failed attempts are rate-limited (5 attempts per 15 minutes)

### US-020-003: Use Recovery Code

**As a** user who lost access to authenticator app  
**I want to** use a recovery code to access my account  
**So that** I don't lose access to my recipes

**Acceptance Criteria**:
- Recovery code option is visible on 2FA login screen
- User can enter one of their 10 recovery codes
- System validates recovery code
- Used recovery code is marked as consumed
- Remaining recovery code count is shown
- Warning displayed when < 3 codes remain
- Option to regenerate codes after successful recovery login

### US-020-004: Disable 2FA

**As a** user who no longer wants 2FA  
**I want to** disable two-factor authentication  
**So that** I can login with just my password

**Acceptance Criteria**:
- Disable option is available in account settings
- System requires current password to disable
- If enabled, requires 2FA code or recovery code to disable
- Confirmation modal warns about security implications
- All 2FA data is removed from account (secret, recovery codes)
- User receives email notification of 2FA being disabled
- Cannot re-enable 2FA for 1 hour (prevent accidental toggling)

### US-020-005: Regenerate Recovery Codes

**As a** user with 2FA enabled  
**I want to** generate new recovery codes  
**So that** I always have backup access methods

**Acceptance Criteria**:
- Regenerate option available in 2FA settings
- Requires current password verification
- Requires current 2FA code verification
- Old recovery codes are invalidated
- 10 new recovery codes are generated
- Codes are displayed only once with download option
- User must acknowledge understanding before completion
- Email notification sent about code regeneration

### US-020-006: 2FA Status Visibility

**As a** user  
**I want to** clearly see my 2FA status  
**So that** I know if my account has additional protection

**Acceptance Criteria**:
- 2FA status badge shown in account settings
- Status indicates "Enabled" or "Not Enabled"
- If enabled, shows date enabled
- Recovery codes remaining count displayed
- Quick actions: Disable, Regenerate codes, View QR
- Security best practice recommendations shown

---

## Functional Requirements

### FR-020-001: TOTP Implementation

**Priority**: HIGH

The system shall implement TOTP (Time-based One-Time Password) as defined in RFC 6238.

**Details**:
- Use SHA-1 algorithm (industry standard for TOTP)
- 30-second time step
- 6-digit codes
- Time tolerance of ±1 window (90 seconds total validity)
- Cryptographically secure secret generation (32 bytes)
- Base32 encoding for secrets

**Standards**:
- RFC 6238: TOTP
- RFC 4226: HOTP (base for TOTP)

### FR-020-002: QR Code Generation

**Priority**: HIGH

The system shall generate QR codes for easy authenticator app setup.

**Details**:
- QR code contains otpauth:// URI
- URI format: `otpauth://totp/RecipeBook:user@example.com?secret=SECRET&issuer=RecipeBook`
- QR code size: 200x200 pixels
- Error correction level: M (15%)
- PNG format for display

**Libraries**:
- `qrcode` npm package for QR generation

### FR-020-003: Recovery Codes

**Priority**: HIGH

The system shall generate backup recovery codes for account recovery.

**Details**:
- 10 recovery codes per set
- Each code: 8 characters (4-4 format with dash)
- Alphanumeric (excluding ambiguous characters: 0, O, I, l)
- Cryptographically secure random generation
- Hashed storage (bcrypt)
- Single-use codes
- Track usage timestamp

**Format Example**:
```
ABCD-1234
EFGH-5678
IJKL-9012
```

### FR-020-004: 2FA Setup Flow

**Priority**: HIGH

The system shall provide a user-friendly 2FA setup process.

**Steps**:
1. User initiates 2FA setup from account settings
2. System requires password confirmation
3. System generates TOTP secret
4. System displays QR code and manual entry code
5. User scans QR or enters code in authenticator app
6. User enters first TOTP code to verify setup
7. System validates code
8. System generates and displays 10 recovery codes
9. User acknowledges saving codes
10. 2FA is enabled

### FR-020-005: 2FA Login Flow

**Priority**: HIGH

The system shall authenticate users with 2FA during login.

**Flow**:
1. User enters email and password
2. System validates credentials
3. If 2FA enabled, redirect to 2FA verification page
4. User enters 6-digit TOTP code
5. System validates code (±1 time window)
6. On success, create session and login
7. On failure, show error and allow retry

**Rate Limiting**:
- Max 5 2FA attempts per 15 minutes per user
- Exponential backoff on repeated failures

### FR-020-006: Recovery Code Usage

**Priority**: HIGH

The system shall allow recovery code usage as 2FA alternative.

**Flow**:
1. User clicks "Use recovery code" on 2FA screen
2. User enters one recovery code
3. System validates code
4. If valid, mark code as used
5. Create session and login
6. Show warning if < 3 codes remaining
7. Offer to regenerate codes

### FR-020-007: 2FA Management

**Priority**: MEDIUM

The system shall provide 2FA management options.

**Features**:
- View 2FA status
- Disable 2FA (requires password + 2FA code)
- Regenerate recovery codes (requires password + 2FA code)
- View QR code again (requires password + 2FA code)
- Download recovery codes as text file

### FR-020-008: Security Notifications

**Priority**: MEDIUM

The system shall send email notifications for 2FA events.

**Events**:
- 2FA enabled on account
- 2FA disabled on account
- Recovery codes regenerated
- Recovery code used (with remaining count)
- Multiple failed 2FA attempts (security alert)

---

## Technical Requirements

### TR-020-001: Backend Dependencies

**Libraries**:
```json
{
  "speakeasy": "^2.0.0",      // TOTP implementation
  "qrcode": "^1.5.3",         // QR code generation
  "crypto": "built-in"        // Cryptographic operations
}
```

### TR-020-002: Database Schema

**User Model Updates**:
```javascript
{
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false  // Exclude from queries by default
  },
  twoFactorBackupCodes: [{
    code: {
      type: String,
      required: true
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],
  twoFactorEnabledAt: Date,
  twoFactorLastDisabledAt: Date
}
```

**Indexes**:
```javascript
userSchema.index({ 'twoFactorBackupCodes.code': 1 });
```

### TR-020-003: API Endpoints

#### POST /api/auth/2fa/setup
**Purpose**: Initialize 2FA setup

**Request**:
```json
{
  "password": "currentPassword123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "secret": "BASE32ENCODEDSECRET",
    "qrCode": "data:image/png;base64,...",
    "manualEntryCode": "XXXX XXXX XXXX XXXX"
  }
}
```

**Rate Limit**: 3 requests per hour per user

#### POST /api/auth/2fa/verify-setup
**Purpose**: Complete 2FA setup with verification

**Request**:
```json
{
  "token": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recoveryCodes": [
      "ABCD-1234",
      "EFGH-5678",
      ...
    ]
  }
}
```

**Errors**:
- 400: Invalid token
- 409: 2FA already enabled

#### POST /api/auth/2fa/verify
**Purpose**: Verify 2FA code during login

**Request**:
```json
{
  "email": "user@example.com",
  "token": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "token": "JWT_TOKEN",
  "user": {
    "id": "userId",
    "email": "user@example.com",
    "twoFactorEnabled": true
  }
}
```

**Rate Limit**: 5 requests per 15 minutes per user

#### POST /api/auth/2fa/verify-recovery
**Purpose**: Verify recovery code during login

**Request**:
```json
{
  "email": "user@example.com",
  "recoveryCode": "ABCD-1234"
}
```

**Response**:
```json
{
  "success": true,
  "token": "JWT_TOKEN",
  "user": {...},
  "remainingCodes": 7,
  "warning": "You have 7 recovery codes remaining"
}
```

#### POST /api/auth/2fa/disable
**Purpose**: Disable 2FA

**Request**:
```json
{
  "password": "currentPassword",
  "token": "123456"  // Or recoveryCode
}
```

**Response**:
```json
{
  "success": true,
  "message": "Two-factor authentication disabled"
}
```

**Rate Limit**: 3 requests per hour

#### POST /api/auth/2fa/regenerate-codes
**Purpose**: Generate new recovery codes

**Request**:
```json
{
  "password": "currentPassword",
  "token": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recoveryCodes": [...]
  }
}
```

**Rate Limit**: 3 requests per day

#### GET /api/auth/2fa/status
**Purpose**: Get current 2FA status

**Response**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "enabledAt": "2026-02-15T10:00:00Z",
    "remainingRecoveryCodes": 8,
    "canRegenerate": true,
    "lastRegeneratedAt": null
  }
}
```

### TR-020-004: Authentication Flow Changes

**Current Flow**:
```
1. POST /api/auth/login
2. Validate credentials
3. Create session
4. Return JWT
```

**New Flow with 2FA**:
```
1. POST /api/auth/login
2. Validate credentials
3. If 2FA enabled:
   a. Return { requiresTwoFactor: true, tempToken: "..." }
   b. Frontend redirects to 2FA page
   c. POST /api/auth/2fa/verify
   d. Validate TOTP code
   e. Create session
   f. Return JWT
4. Else:
   a. Create session
   b. Return JWT
```

### TR-020-005: Session Management

**Temporary Session**:
- Created after password authentication but before 2FA
- Expires in 5 minutes
- Cannot access protected routes
- Only valid for 2FA verification endpoints

**Full Session**:
- Created after successful 2FA verification
- Standard JWT with full access

### TR-020-006: Security Measures

**Secret Storage**:
- Encrypted at rest (if database encryption available)
- Never sent to client after setup
- Excluded from API responses by default

**Recovery Code Storage**:
- Hashed with bcrypt (cost factor 10)
- Never sent in plain text after initial generation
- Marked as used after single use

**Rate Limiting**:
- Setup endpoint: 3 per hour
- Verification endpoint: 5 per 15 minutes
- Disable endpoint: 3 per hour
- Regenerate codes: 3 per day

**Audit Logging**:
- 2FA enabled event
- 2FA disabled event
- Failed 2FA attempts
- Recovery code usage
- Recovery codes regenerated

---

## Security Requirements

### SEC-020-001: TOTP Security

- Use cryptographically secure random number generation for secrets
- Secrets must be at least 160 bits (20 bytes)
- Use SHA-1 algorithm (RFC 6238 standard)
- Time window: 30 seconds
- Clock drift tolerance: ±1 window (90 seconds total)

### SEC-020-002: Recovery Code Security

- Generate using crypto.randomBytes()
- Hash with bcrypt before storage (cost factor 10)
- Single-use only
- Track usage timestamps
- Warn when < 3 codes remaining

### SEC-020-003: Rate Limiting

- 2FA verification: 5 attempts per 15 minutes per user
- 2FA setup: 3 attempts per hour per user
- Recovery code regeneration: 3 per day per user
- Exponential backoff on repeated failures

### SEC-020-004: Account Lockout

- After 10 failed 2FA attempts in 1 hour: temporary lock (15 minutes)
- Email notification sent on lockout
- Lockout applies to both TOTP and recovery codes

### SEC-020-005: Password Requirements for 2FA Actions

All 2FA management actions require:
- Current password verification
- If 2FA enabled: TOTP code or recovery code
- No 2FA bypass even for account owner

### SEC-020-006: Email Notifications

Security events that trigger emails:
- 2FA enabled
- 2FA disabled
- Recovery codes regenerated
- Recovery code used (with remaining count)
- Multiple failed 2FA attempts (> 3)
- Account lockout due to failed 2FA attempts

### SEC-020-007: Secure Code Display

- Recovery codes shown only once during generation
- QR code regeneration requires full authentication
- No recovery codes in logs
- No secrets in error messages

---

## UI/UX Requirements

### UX-020-001: Account Settings - 2FA Section

**Location**: Account Settings page → Security section

**Visual Design**:
- Clear "Two-Factor Authentication" heading
- Status badge: "Enabled" (green) or "Not Enabled" (gray)
- Cookbook brown theme consistency
- Icon: 🔐 or shield icon

**When 2FA NOT Enabled**:
```
┌─────────────────────────────────────────────┐
│ 🔐 Two-Factor Authentication                │
│                                              │
│ Status: Not Enabled                          │
│                                              │
│ Add an extra layer of security to your      │
│ account. You'll need to enter a code from   │
│ your authenticator app when you log in.     │
│                                              │
│ [Enable Two-Factor Authentication]          │
└─────────────────────────────────────────────┘
```

**When 2FA Enabled**:
```
┌─────────────────────────────────────────────┐
│ 🔐 Two-Factor Authentication                │
│                                              │
│ Status: ✓ Enabled                           │
│ Enabled on: February 15, 2026               │
│                                              │
│ Recovery Codes: 8 remaining                 │
│                                              │
│ [View QR Code] [Regenerate Codes]           │
│ [Disable 2FA]                               │
└─────────────────────────────────────────────┘
```

### UX-020-002: Enable 2FA Flow

**Step 1: Password Confirmation**
```
┌─────────────────────────────────────────────┐
│ Enable Two-Factor Authentication             │
│                                              │
│ For your security, please confirm your      │
│ password to continue.                        │
│                                              │
│ Password: [........................]         │
│                                              │
│ [Cancel] [Continue]                          │
└─────────────────────────────────────────────┘
```

**Step 2: Scan QR Code**
```
┌─────────────────────────────────────────────┐
│ Set Up Your Authenticator App                │
│                                              │
│ 1. Open your authenticator app              │
│    (Google Authenticator, Authy, etc.)      │
│                                              │
│ 2. Scan this QR code:                        │
│                                              │
│    ┌─────────────────┐                      │
│    │                 │                      │
│    │   [QR CODE]     │                      │
│    │                 │                      │
│    └─────────────────┘                      │
│                                              │
│ Can't scan? Enter this code manually:       │
│ XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX     │
│                                              │
│ [Back] [Continue]                            │
└─────────────────────────────────────────────┘
```

**Step 3: Verify Code**
```
┌─────────────────────────────────────────────┐
│ Verify Your Authenticator                    │
│                                              │
│ Enter the 6-digit code from your            │
│ authenticator app to verify setup:          │
│                                              │
│ Code: [___-___]                              │
│       (e.g., 123-456)                        │
│                                              │
│ [Back] [Verify]                              │
└─────────────────────────────────────────────┘
```

**Step 4: Save Recovery Codes**
```
┌─────────────────────────────────────────────┐
│ Save Your Recovery Codes                     │
│                                              │
│ Store these codes in a safe place. You can  │
│ use them to access your account if you lose │
│ access to your authenticator app.           │
│                                              │
│ ⚠️  Each code can only be used once.        │
│                                              │
│ ABCD-1234    EFGH-5678                      │
│ IJKL-9012    MNOP-3456                      │
│ QRST-7890    UVWX-1234                      │
│ YZAB-5678    CDEF-9012                      │
│ GHIJ-3456    KLMN-7890                      │
│                                              │
│ [📋 Copy] [⬇️  Download]                     │
│                                              │
│ ☐ I have saved these codes in a safe place  │
│                                              │
│ [Finish Setup]                               │
└─────────────────────────────────────────────┘
```

### UX-020-003: Login with 2FA

**2FA Verification Screen**:
```
┌─────────────────────────────────────────────┐
│ Two-Factor Authentication                    │
│                                              │
│ Open your authenticator app and enter the   │
│ 6-digit code:                                │
│                                              │
│ Code: [___-___]                              │
│                                              │
│ Verification Code                            │
│ 2 minutes remaining                          │
│                                              │
│ [Verify]                                     │
│                                              │
│ Lost access to your authenticator?          │
│ [Use a recovery code instead]               │
└─────────────────────────────────────────────┘
```

**Recovery Code Entry**:
```
┌─────────────────────────────────────────────┐
│ Use Recovery Code                            │
│                                              │
│ Enter one of your backup recovery codes:    │
│                                              │
│ Recovery Code: [____-____]                   │
│                                              │
│ [Back to authenticator] [Verify]             │
└─────────────────────────────────────────────┘
```

**Success State**:
```
┌─────────────────────────────────────────────┐
│ ✓ Verification Successful                   │
│                                              │
│ Logging you in...                            │
└─────────────────────────────────────────────┘
```

**Error States**:
```
❌ Invalid code. Please try again. (4 attempts remaining)
❌ This recovery code has already been used.
❌ Too many failed attempts. Please try again in 15 minutes.
```

### UX-020-004: Disable 2FA Flow

**Confirmation Modal**:
```
┌─────────────────────────────────────────────┐
│ ⚠️  Disable Two-Factor Authentication?      │
│                                              │
│ This will make your account less secure.    │
│ You'll only need your password to log in.   │
│                                              │
│ Current Password:                            │
│ [........................]                   │
│                                              │
│ 2FA Code:                                    │
│ [___-___]                                    │
│                                              │
│ [Cancel] [Disable 2FA]                       │
└─────────────────────────────────────────────┘
```

### UX-020-005: Regenerate Recovery Codes

**Confirmation Modal**:
```
┌─────────────────────────────────────────────┐
│ Regenerate Recovery Codes?                   │
│                                              │
│ Your current recovery codes will stop       │
│ working. You'll need to save the new codes. │
│                                              │
│ Current Password:                            │
│ [........................]                   │
│                                              │
│ 2FA Code:                                    │
│ [___-___]                                    │
│                                              │
│ [Cancel] [Regenerate]                        │
└─────────────────────────────────────────────┘
```

### UX-020-006: Cookbook Theme Compliance

**Color Scheme**:
- Primary buttons: `bg-cookbook-accent hover:bg-cookbook-darkbrown`
- Status badges: Green for enabled, gray for disabled
- Borders: `border-cookbook-aged`
- Background: `bg-cookbook-paper`
- Text: `text-cookbook-darkbrown`

**Typography**:
- Headings: `font-display font-bold`
- Body text: `font-body`
- Code display: `font-mono`

**Components**:
- Cards: `bg-cookbook-paper border-2 border-cookbook-aged shadow-card`
- Buttons: Standard button styles from design system
- Inputs: Standard input styles with cookbook borders
- Modals: Standard modal template with cookbook theme

### UX-020-007: Accessibility

- **Keyboard Navigation**: Full tab flow through all elements
- **Screen Reader**: ARIA labels for all interactive elements
- **Focus States**: Visible focus rings on all inputs and buttons
- **Color Contrast**: WCAG 2.1 AA compliant
- **Error Messages**: Clear, descriptive error text
- **Success Messages**: Announced to screen readers

### UX-020-008: Mobile Responsiveness

- QR code scales appropriately on small screens
- Recovery codes wrap on mobile (1 per line)
- Input fields are touch-friendly (44x44px minimum)
- Modals are scrollable on small screens
- Code input auto-focuses on mobile

---

## API Specifications

### API Rate Limits

| Endpoint | Limit | Window | HTTP Status on Exceed |
|----------|-------|--------|----------------------|
| POST /api/auth/2fa/setup | 3 requests | 1 hour | 429 |
| POST /api/auth/2fa/verify-setup | 5 requests | 15 minutes | 429 |
| POST /api/auth/2fa/verify | 5 requests | 15 minutes | 429 |
| POST /api/auth/2fa/verify-recovery | 5 requests | 15 minutes | 429 |
| POST /api/auth/2fa/disable | 3 requests | 1 hour | 429 |
| POST /api/auth/2fa/regenerate-codes | 3 requests | 24 hours | 429 |

### Error Codes

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| 2FA_001 | Two-factor authentication not enabled | 400 | User attempting 2FA action without 2FA enabled |
| 2FA_002 | Two-factor authentication already enabled | 409 | User attempting to enable 2FA when already enabled |
| 2FA_003 | Invalid verification code | 400 | TOTP code is incorrect |
| 2FA_004 | Verification code expired | 400 | Code is outside time window |
| 2FA_005 | Invalid recovery code | 400 | Recovery code not found or invalid |
| 2FA_006 | Recovery code already used | 400 | Recovery code has been used before |
| 2FA_007 | Too many failed attempts | 429 | Rate limit exceeded |
| 2FA_008 | Account temporarily locked | 423 | Too many failed 2FA verifications |
| 2FA_009 | Invalid password | 401 | Password verification failed |
| 2FA_010 | Cannot disable 2FA yet | 429 | Cooldown period active (1 hour) |
| 2FA_011 | No recovery codes remaining | 400 | All recovery codes used |
| 2FA_012 | QR code generation failed | 500 | Server error generating QR |

### Response Envelopes

**Success Response**:
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "2FA_003",
    "message": "Invalid verification code",
    "details": "The code you entered is incorrect. Please try again."
  }
}
```

---

## Data Models

### User Schema Updates

```javascript
const userSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // Two-Factor Authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false,
    index: true  // For efficient queries
  },
  
  twoFactorSecret: {
    type: String,
    select: false  // Never include in default queries
  },
  
  twoFactorBackupCodes: [{
    code: {
      type: String,
      required: true
    },
    used: {
      type: Boolean,
      default: false,
      index: true  // For finding unused codes
    },
    usedAt: {
      type: Date,
      default: null
    }
  }],
  
  twoFactorEnabledAt: {
    type: Date,
    default: null
  },
  
  twoFactorLastDisabledAt: {
    type: Date,
    default: null
  },
  
  twoFactorRecoveryCodesGeneratedAt: {
    type: Date,
    default: null
  },
  
  // Failed 2FA attempts tracking
  twoFactorFailedAttempts: {
    type: Number,
    default: 0
  },
  
  twoFactorLastFailedAttempt: {
    type: Date,
    default: null
  },
  
  twoFactorLockedUntil: {
    type: Date,
    default: null
  }
});

// Compound index for recovery code lookups
userSchema.index({ 
  'twoFactorBackupCodes.code': 1, 
  'twoFactorBackupCodes.used': 1 
});

// Methods
userSchema.methods.generateTwoFactorSecret = function() {
  const speakeasy = require('speakeasy');
  const secret = speakeasy.generateSecret({
    name: `RecipeBook (${this.email})`,
    issuer: 'RecipeBook',
    length: 32
  });
  return secret;
};

userSchema.methods.verifyTwoFactorToken = function(token) {
  const speakeasy = require('speakeasy');
  return speakeasy.totp.verify({
    secret: this.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 1  // ±30 seconds
  });
};

userSchema.methods.generateRecoveryCodes = async function() {
  const crypto = require('crypto');
  const bcrypt = require('bcryptjs');
  const codes = [];
  
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .replace(/0/g, 'A')
      .replace(/O/g, 'B')
      .replace(/I/g, 'C')
      .replace(/L/g, 'D');
    
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    const hashed = await bcrypt.hash(formatted, 10);
    
    codes.push({
      plain: formatted,
      hashed: hashed
    });
  }
  
  return codes;
};

userSchema.methods.verifyRecoveryCode = async function(code) {
  const bcrypt = require('bcryptjs');
  
  for (let recoveryCode of this.twoFactorBackupCodes) {
    if (!recoveryCode.used) {
      const isMatch = await bcrypt.compare(code, recoveryCode.code);
      if (isMatch) {
        return recoveryCode;
      }
    }
  }
  
  return null;
};

userSchema.methods.incrementFailedTwoFactorAttempts = function() {
  this.twoFactorFailedAttempts += 1;
  this.twoFactorLastFailedAttempt = new Date();
  
  // Lock account after 10 failed attempts
  if (this.twoFactorFailedAttempts >= 10) {
    this.twoFactorLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
};

userSchema.methods.resetFailedTwoFactorAttempts = function() {
  this.twoFactorFailedAttempts = 0;
  this.twoFactorLastFailedAttempt = null;
  this.twoFactorLockedUntil = null;
};

userSchema.methods.isTwoFactorLocked = function() {
  if (!this.twoFactorLockedUntil) return false;
  return new Date() < this.twoFactorLockedUntil;
};
```

### Migration Script

```javascript
// migrations/add-2fa-fields.js
const mongoose = require('mongoose');
const User = require('../models/User');

async function migrate() {
  const users = await User.find({});
  
  for (let user of users) {
    if (user.twoFactorEnabled === undefined) {
      user.twoFactorEnabled = false;
      user.twoFactorBackupCodes = [];
      user.twoFactorFailedAttempts = 0;
      await user.save();
    }
  }
  
  console.log(`Migrated ${users.length} users to include 2FA fields`);
}

migrate().then(() => process.exit(0));
```

---

## Testing Requirements

### Unit Tests

#### User Model Tests
- ✅ Generate 2FA secret
- ✅ Verify valid TOTP token
- ✅ Reject invalid TOTP token
- ✅ Reject expired TOTP token
- ✅ Generate 10 recovery codes
- ✅ Recovery codes are unique
- ✅ Verify valid recovery code
- ✅ Reject invalid recovery code
- ✅ Mark recovery code as used
- ✅ Reject used recovery code
- ✅ Increment failed attempts
- ✅ Reset failed attempts
- ✅ Lock account after 10 failures
- ✅ Check if account is locked

#### QR Code Generation Tests
- ✅ Generate valid QR code
- ✅ QR code contains correct otpauth URI
- ✅ QR code includes email and issuer
- ✅ Handle QR generation errors

### Integration Tests

#### 2FA Setup Flow
- ✅ Setup requires authentication
- ✅ Setup requires password verification
- ✅ Generate secret and QR code
- ✅ Verify setup with valid TOTP code
- ✅ Reject setup with invalid code
- ✅ Generate and return recovery codes
- ✅ Enable 2FA on successful verification
- ✅ Reject if 2FA already enabled
- ✅ Rate limit setup attempts

#### 2FA Login Flow
- ✅ Login flow redirects to 2FA when enabled
- ✅ Verify login with valid TOTP code
- ✅ Reject login with invalid TOTP code
- ✅ Verify login with recovery code
- ✅ Mark recovery code as used
- ✅ Warn when < 3 codes remaining
- ✅ Rate limit verification attempts
- ✅ Lock account after repeated failures
- ✅ Send email on account lock

#### 2FA Management
- ✅ Disable 2FA with password + TOTP
- ✅ Disable 2FA with password + recovery code
- ✅ Clear all 2FA data on disable
- ✅ Send email notification on disable
- ✅ Prevent re-enable within 1 hour
- ✅ Regenerate recovery codes
- ✅ Invalidate old codes on regeneration
- ✅ Require authentication for regeneration
- ✅ Rate limit regeneration

#### Error Handling
- ✅ Handle QR generation errors
- ✅ Handle bcrypt errors
- ✅ Handle database errors
- ✅ Return appropriate error messages
- ✅ Log security events

### E2E Tests (Playwright)

#### Complete 2FA Setup Flow
```javascript
test('complete 2FA setup flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  // Navigate to account settings
  await page.goto('/account');
  
  // Click enable 2FA
  await page.click('text=Enable Two-Factor Authentication');
  
  // Enter password
  await page.fill('[name="password"]', 'Password123!');
  await page.click('text=Continue');
  
  // Verify QR code displayed
  await expect(page.locator('img[alt="QR Code"]')).toBeVisible();
  
  // Note: Can't actually scan QR in E2E test
  // Would need to mock TOTP or extract secret from page
  
  // Simulate entering valid code
  await page.fill('[name="token"]', '123456');  // Mock code
  await page.click('text=Verify');
  
  // Verify recovery codes displayed
  await expect(page.locator('text=Save Your Recovery Codes')).toBeVisible();
  
  // Download recovery codes
  await page.click('text=Download');
  
  // Acknowledge
  await page.check('text=I have saved these codes');
  await page.click('text=Finish Setup');
  
  // Verify 2FA enabled
  await expect(page.locator('text=✓ Enabled')).toBeVisible();
});
```

#### Login with 2FA
```javascript
test('login with 2FA', async ({ page }) => {
  // Assume user has 2FA enabled
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  // Should redirect to 2FA page
  await expect(page).toHaveURL(/\/login\/2fa/);
  await expect(page.locator('text=Two-Factor Authentication')).toBeVisible();
  
  // Enter TOTP code (would need to generate valid code in test)
  await page.fill('[name="token"]', '123456');
  await page.click('text=Verify');
  
  // Should be logged in
  await expect(page).toHaveURL('/');
});
```

#### Use Recovery Code
```javascript
test('use recovery code for login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  // Click use recovery code
  await page.click('text=Use a recovery code instead');
  
  // Enter recovery code
  await page.fill('[name="recoveryCode"]', 'ABCD-1234');
  await page.click('text=Verify');
  
  // Should be logged in
  await expect(page).toHaveURL('/');
  
  // Should show warning about remaining codes
  await expect(page.locator('text=recovery codes remaining')).toBeVisible();
});
```

### Test Coverage Target

- **Overall**: 85%+
- **Critical paths**: 100% (setup, login, recovery)
- **User model methods**: 100%
- **API endpoints**: 90%+

---

## Acceptance Criteria

### AC-020-001: 2FA Setup

- [ ] User can enable 2FA from account settings
- [ ] Password confirmation required
- [ ] QR code generated and displayed
- [ ] Manual entry code provided
- [ ] User must verify first TOTP code
- [ ] 10 recovery codes generated
- [ ] Codes displayed only once
- [ ] Download option provided
- [ ] Acknowledgment required
- [ ] 2FA status updated to "Enabled"
- [ ] Email notification sent

### AC-020-002: 2FA Login

- [ ] Login flow detects if 2FA enabled
- [ ] User redirected to 2FA verification page
- [ ] 6-digit code input provided
- [ ] Code validated within ±1 time window
- [ ] Success logs user in
- [ ] Failure shows clear error
- [ ] Rate limiting active (5 per 15 min)
- [ ] Recovery code option available
- [ ] Account locks after 10 failures

### AC-020-003: Recovery Codes

- [ ] 10 codes generated per set
- [ ] Each code is 8 characters (XXXX-XXXX format)
- [ ] Codes are cryptographically random
- [ ] Codes stored as bcrypt hashes
- [ ] Single-use validation
- [ ] Usage timestamp tracked
- [ ] Remaining count displayed
- [ ] Warning when < 3 codes
- [ ] Can regenerate codes

### AC-020-004: 2FA Management

- [ ] Status visible in account settings
- [ ] Disable option requires password + 2FA code
- [ ] Disable clears all 2FA data
- [ ] Disable sends email notification
- [ ] Cannot re-enable for 1 hour after disable
- [ ] Regenerate codes requires password + 2FA
- [ ] Regenerate invalidates old codes
- [ ] Rate limits enforced

### AC-020-005: Security

- [ ] Secrets stored securely (excluded from queries)
- [ ] Recovery codes hashed with bcrypt
- [ ] Rate limiting on all endpoints
- [ ] Account lockout after failures
- [ ] Email notifications on security events
- [ ] Audit logging active
- [ ] No sensitive data in errors
- [ ] TOTP follows RFC 6238

### AC-020-006: UX

- [ ] Clear visual status indicators
- [ ] Step-by-step setup flow
- [ ] Cookbook theme compliance
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Clear error messages
- [ ] Success confirmations
- [ ] Loading states

---

## Dependencies

### External Libraries

- **speakeasy** (v2.0.0+): TOTP implementation
- **qrcode** (v1.5.3+): QR code generation
- **bcryptjs** (existing): Recovery code hashing

### Internal Dependencies

- User authentication system (V2.0)
- Email service (V2.1.0)
- Rate limiting middleware (V1.1)
- Account settings page (V2.1.1)

### Browser Support

- Modern browsers with crypto API support
- Mobile browsers (iOS Safari, Android Chrome)
- Authenticator app compatibility:
  - Google Authenticator
  - Authy
  - Microsoft Authenticator
  - 1Password
  - LastPass Authenticator

---

## Risks & Mitigations

### Risk 1: User Lockout

**Risk**: Users lose access to authenticator and recovery codes

**Likelihood**: Medium  
**Impact**: High

**Mitigation**:
- Provide 10 recovery codes (industry standard)
- Warn when < 3 codes remaining
- Allow code regeneration
- Clear instructions to save codes
- Email support for account recovery
- Admin override capability (future)

### Risk 2: Clock Skew Issues

**Risk**: Server/client time differences cause valid codes to fail

**Likelihood**: Low  
**Impact**: Medium

**Mitigation**:
- Use ±1 time window (90 seconds total)
- NTP on servers
- Clear error messages
- Retry with slight delay option

### Risk 3: Low Adoption

**Risk**: Users don't enable 2FA

**Likelihood**: Medium  
**Impact**: Low

**Mitigation**:
- Make setup easy (QR code)
- Clear security benefits messaging
- Optional feature (don't force)
- Prompts on login page
- Success stories/testimonials

### Risk 4: Support Burden

**Risk**: High volume of 2FA-related support tickets

**Likelihood**: Medium  
**Impact**: Medium

**Mitigation**:
- Comprehensive FAQ
- Clear in-app help text
- Video tutorials
- Self-service recovery codes
- Monitor common issues

### Risk 5: Security Vulnerabilities

**Risk**: Implementation flaws compromise security

**Likelihood**: Low  
**Impact**: Critical

**Mitigation**:
- Use battle-tested libraries (speakeasy)
- Follow RFC 6238 strictly
- Security code review
- Penetration testing
- Regular dependency updates
- Bug bounty program (future)

---

## Implementation Plan

### Phase 1: Backend (Week 1)

- [ ] Install dependencies (speakeasy, qrcode)
- [ ] Update User model with 2FA fields
- [ ] Implement TOTP methods
- [ ] Implement recovery code methods
- [ ] Create migration script
- [ ] Write unit tests for User model

### Phase 2: API Endpoints (Week 1-2)

- [ ] POST /api/auth/2fa/setup
- [ ] POST /api/auth/2fa/verify-setup
- [ ] POST /api/auth/2fa/verify
- [ ] POST /api/auth/2fa/verify-recovery
- [ ] POST /api/auth/2fa/disable
- [ ] POST /api/auth/2fa/regenerate-codes
- [ ] GET /api/auth/2fa/status
- [ ] Write integration tests

### Phase 3: Login Flow Updates (Week 2)

- [ ] Modify login endpoint to detect 2FA
- [ ] Create temporary session logic
- [ ] Update JWT generation
- [ ] Add rate limiting
- [ ] Add account lockout logic
- [ ] Write integration tests

### Phase 4: Frontend - Setup Flow (Week 2-3)

- [ ] Create 2FA section in AccountSettings
- [ ] Create Enable2FAModal component
- [ ] Create QRCodeDisplay component
- [ ] Create RecoveryCodesModal component
- [ ] Add API service methods
- [ ] Style with cookbook theme
- [ ] Write component tests

### Phase 5: Frontend - Login Flow (Week 3)

- [ ] Create TwoFactorLoginPage component
- [ ] Create RecoveryCodeInput component
- [ ] Update login flow logic
- [ ] Add error handling
- [ ] Add loading states
- [ ] Write component tests

### Phase 6: Frontend - Management (Week 3)

- [ ] Create Disable2FAModal component
- [ ] Create RegenerateCodesModal component
- [ ] Add status indicators
- [ ] Add warning notifications
- [ ] Write component tests

### Phase 7: Email Notifications (Week 4)

- [ ] Create email templates (2FA enabled, disabled, etc.)
- [ ] Add email service calls
- [ ] Test email delivery
- [ ] Write integration tests

### Phase 8: Testing & Documentation (Week 4)

- [ ] E2E tests with Playwright
- [ ] Security testing
- [ ] Performance testing
- [ ] Update documentation
- [ ] Create user guide
- [ ] Record video tutorial

### Phase 9: Code Review & Release (Week 4)

- [ ] Code review
- [ ] UX review
- [ ] Security review
- [ ] Update CHANGELOG
- [ ] Update ROADMAP
- [ ] Create release tag
- [ ] Deploy to production

---

## Future Enhancements

### V2.2+

- **Trusted Devices**: Skip 2FA for trusted devices for 30 days
- **Location-based Security**: Require 2FA for logins from new locations
- **SMS Backup**: Optional SMS as 2FA backup (if requested by users)
- **Biometric Support**: Touch ID/Face ID on mobile app

### V3.0+

- **Hardware Keys**: FIDO2/WebAuthn support (YubiKey, etc.)
- **Push Notifications**: Push-based 2FA like Duo
- **Risk-based Auth**: Require 2FA only for high-risk actions
- **Admin 2FA Enforcement**: Org-level 2FA requirement

---

## Documentation Deliverables

- [ ] REQ-020-two-factor-authentication.md (this document)
- [ ] API documentation updates
- [ ] User guide: "How to Enable 2FA"
- [ ] FAQ: 2FA troubleshooting
- [ ] Code review document
- [ ] Integration test documentation
- [ ] Migration guide (if needed)

---

## Success Criteria

### Technical Success

- ✅ All integration tests passing
- ✅ 85%+ test coverage
- ✅ Zero security vulnerabilities
- ✅ < 200ms API response times
- ✅ WCAG 2.1 AA compliance
- ✅ Works in all supported browsers

### User Success

- ✅ 25%+ 2FA adoption in 3 months
- ✅ < 5% support tickets related to 2FA
- ✅ 98%+ recovery code success rate
- ✅ 4.5+ user satisfaction rating
- ✅ Zero account lockout complaints after recovery code use

### Business Success

- ✅ 95% reduction in account compromise incidents
- ✅ Positive user feedback on security
- ✅ Feature used without major issues
- ✅ Ready for compliance requirements

---

## Appendix

### TOTP Algorithm (RFC 6238)

```
TOTP = HOTP(K, T)

Where:
  K = Secret key (shared between server and client)
  T = (Current Unix time - T0) / X
  T0 = 0 (Unix epoch)
  X = 30 (time step in seconds)
  
TOTP generates a 6-digit code that changes every 30 seconds.
```

### Example otpauth:// URI

```
otpauth://totp/RecipeBook:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=RecipeBook
```

### Recovery Code Generation Algorithm

```javascript
function generateRecoveryCode() {
  const bytes = crypto.randomBytes(4);
  const hex = bytes.toString('hex').toUpperCase();
  
  // Remove ambiguous characters
  const cleaned = hex
    .replace(/0/g, 'A')
    .replace(/O/g, 'B')
    .replace(/I/g, 'C')
    .replace(/L/g, 'D');
  
  // Format as XXXX-XXXX
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}
```

### Recommended Authenticator Apps

1. **Google Authenticator** (iOS, Android)
   - Free, simple, widely used
   - No cloud sync (device-only)

2. **Authy** (iOS, Android, Desktop)
   - Free, feature-rich
   - Cloud sync with encryption
   - Multi-device support

3. **Microsoft Authenticator** (iOS, Android)
   - Free, enterprise-focused
   - Cloud backup
   - Push notifications

4. **1Password** (iOS, Android, Desktop)
   - Paid, premium experience
   - Password manager integration
   - Cloud sync

5. **LastPass Authenticator** (iOS, Android)
   - Free, 1-tap verification
   - Backup & restore
   - Multi-device

---

**Document Version**: 1.0  
**Last Updated**: February 15, 2026  
**Next Review**: After implementation  
**Approved By**: [Pending]  
**Status**: Ready for Development