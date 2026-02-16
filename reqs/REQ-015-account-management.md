# REQ-015: Account Management UI

**Version**: 2.1.1  
**Status**: Draft  
**Created**: February 15, 2026  
**Author**: Development Team  
**Priority**: Medium  
**Type**: Patch Release (User Account Features)

---

## Table of Contents

1. [Overview](#overview)
2. [Business Requirements](#business-requirements)
3. [User Stories](#user-stories)
4. [Functional Requirements](#functional-requirements)
5. [Technical Requirements](#technical-requirements)
6. [UI/UX Requirements](#ui-ux-requirements)
7. [Security Requirements](#security-requirements)
8. [Acceptance Criteria](#acceptance-criteria)
9. [Testing Requirements](#testing-requirements)
10. [Dependencies](#dependencies)
11. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose

Provide authenticated users with a dedicated account management interface to update their password and delete their account. This builds upon the existing authentication system (V2.0) and password reset functionality (V2.1.0).

### Scope

**In Scope**:
- Account settings page accessible to authenticated users
- Change password functionality (while logged in)
- Delete account functionality with confirmation
- User feedback for successful operations
- Proper session handling after account changes

**Out of Scope** (Future Versions):
- Email address changes (V2.1.4+)
- Profile information (username, display name, etc.)
- Account preferences/settings
- Two-factor authentication management (V2.1.5)

### Goals

1. Allow users to change their password without going through password reset flow
2. Provide users with ability to delete their account and all associated data
3. Ensure secure password change requires current password verification
4. Maintain user experience consistency with existing authentication UI

---

## Business Requirements

### BR-1: Password Management

Users must be able to change their password while authenticated to:
- Update to a stronger password
- Change password if compromised
- Meet organizational password rotation policies

**Business Value**: Improves account security and user control

### BR-2: Account Deletion

Users must be able to permanently delete their account to:
- Comply with GDPR and data privacy regulations (right to be forgotten)
- Allow users to exit the platform
- Remove all personal data and associated content

**Business Value**: Legal compliance and user autonomy

---

## User Stories

### US-1: Change Password

**As a** logged-in user  
**I want to** change my password from my account settings  
**So that** I can update my credentials without logging out

**Acceptance Criteria**:
- Must enter current password for verification
- Must enter new password twice (confirmation)
- Password must meet strength requirements
- Success message displayed after change
- Session remains active (no logout required)
- Can immediately use new password

### US-2: Delete Account

**As a** logged-in user  
**I want to** delete my account and all my data  
**So that** I can permanently remove my presence from the platform

**Acceptance Criteria**:
- Must confirm password for security
- Must explicitly confirm deletion with additional modal
- All user data is permanently deleted (recipes, collections, meal plans, shopping lists)
- User is logged out immediately
- Cannot recover account after deletion
- Clear warning about permanent data loss

### US-3: Account Settings Access

**As a** logged-in user  
**I want to** easily access my account settings  
**So that** I can manage my account information

**Acceptance Criteria**:
- Account link in navigation menu
- Direct route to settings page
- Protected route (requires authentication)
- Clean, intuitive interface

---

## Functional Requirements

### FR-1: Change Password Feature

#### FR-1.1: Password Change Form
- Form fields:
  - Current password (password input)
  - New password (password input)
  - Confirm new password (password input)
- Real-time validation feedback
- Submit button
- Cancel/back option

#### FR-1.2: Password Validation
- New password must be at least 8 characters
- New password cannot be the same as current password
- New password must match confirmation
- Current password must be correct

#### FR-1.3: Password Change Process
1. User enters current password
2. User enters and confirms new password
3. Frontend validates input
4. Backend verifies current password
5. Backend validates new password requirements
6. Backend updates password (hashed with bcrypt)
7. User receives success message
8. Form is cleared
9. Session remains active

#### FR-1.4: Error Handling
- Invalid current password: "Current password is incorrect"
- Weak new password: "Password must be at least 8 characters"
- Password mismatch: "Passwords do not match"
- Same as current: "New password must be different from current password"
- Server errors: Generic error message

### FR-2: Delete Account Feature

#### FR-2.1: Account Deletion Interface
- Clearly labeled "Delete Account" section
- Warning text about permanent data loss
- "Delete Account" button (danger styling)

#### FR-2.2: Confirmation Flow
1. User clicks "Delete Account"
2. Modal appears with:
   - Strong warning message
   - List of what will be deleted
   - Password confirmation field
   - "Cancel" and "Delete Permanently" buttons
3. User must enter password
4. User must click "Delete Permanently"

#### FR-2.3: Deletion Process
1. User confirms deletion and enters password
2. Frontend sends deletion request with password
3. Backend verifies password
4. Backend deletes user and all associated data:
   - User account
   - All recipes owned by user
   - All collections owned by user
   - All meal plans owned by user
   - All shopping lists owned by user
5. Backend invalidates all user tokens
6. User is logged out
7. Redirect to home/login page with confirmation message

#### FR-2.4: Data Deletion Cascade
- Delete user recipes (cascades to recipe references in collections/meal plans)
- Delete user collections
- Delete user meal plans
- Delete user shopping lists
- Delete user authentication tokens
- Delete user account record

### FR-3: Account Settings Page

#### FR-3.1: Page Layout
- Clear page title: "Account Settings"
- Organized sections:
  - Account Information (read-only for now)
  - Change Password
  - Danger Zone (Delete Account)
- Responsive design matching existing UI

#### FR-3.2: Navigation Integration
- Add "Account" or "Settings" link to main navigation
- Accessible when authenticated
- Hidden when not authenticated

---

## Technical Requirements

### TR-1: Backend API

#### TR-1.1: Update Password Endpoint

```
PATCH /api/auth/password
```

**Request Headers**:
```json
{
  "Authorization": "Bearer {access_token}"
}
```

**Request Body**:
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 8 chars)"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Password updated successfully"
}
```

**Error Responses**:
- 401 Unauthorized: Invalid/missing token
- 400 Bad Request: Invalid current password
- 400 Bad Request: Weak new password
- 400 Bad Request: Same as current password
- 500 Internal Server Error: Server error

#### TR-1.2: Delete Account Endpoint

```
DELETE /api/auth/account
```

**Request Headers**:
```json
{
  "Authorization": "Bearer {access_token}"
}
```

**Request Body**:
```json
{
  "password": "string (required)"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Account deleted successfully"
}
```

**Error Responses**:
- 401 Unauthorized: Invalid/missing token
- 400 Bad Request: Invalid password
- 500 Internal Server Error: Server error

### TR-2: Frontend Implementation

#### TR-2.1: Account Settings Page Component
- **File**: `frontend/src/components/auth/AccountSettingsPage.jsx`
- **Route**: `/account` (protected)
- **Features**:
  - Change password form
  - Delete account section
  - Loading states
  - Error/success messages

#### TR-2.2: API Service Methods
- **File**: `frontend/src/services/api.js`
- Methods:
  - `authAPI.updatePassword(currentPassword, newPassword)`
  - `authAPI.deleteAccount(password)`

#### TR-2.3: Navigation Updates
- **File**: `frontend/src/App.jsx`
- Add "/account" route
- Update navigation to include settings link

### TR-3: Database Considerations

#### TR-3.1: Cascade Deletion
- Ensure proper cleanup of all user-owned data
- Use MongoDB cascade operations or manual cleanup
- Verify referential integrity after deletion

#### TR-3.2: Soft Delete vs Hard Delete
- **Decision**: Hard delete (permanent removal)
- **Rationale**: GDPR compliance, user expectation
- **Implementation**: Direct document deletion

---

## UI/UX Requirements

### UX-1: Account Settings Page Layout

```
┌─────────────────────────────────────────────────────┐
│ Navigation Bar                     [Settings] [Logout] │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                                                       │
│  Account Settings                                     │
│  ═══════════════                                      │
│                                                       │
│  Account Information                                  │
│  ────────────────────                                │
│  Username: johndoe                                    │
│  Email: john@example.com (if available)               │
│                                                       │
│  Change Password                                      │
│  ────────────────                                    │
│  ┌───────────────────────────────────────┐           │
│  │ Current Password                       │           │
│  │ [........................]             │           │
│  │                                        │           │
│  │ New Password                           │           │
│  │ [........................]             │           │
│  │                                        │           │
│  │ Confirm New Password                   │           │
│  │ [........................]             │           │
│  │                                        │           │
│  │           [Update Password]            │           │
│  └───────────────────────────────────────┘           │
│                                                       │
│  Danger Zone                                          │
│  ────────────────                                    │
│  ⚠️  Delete Account                                   │
│  This action cannot be undone. All your recipes,     │
│  collections, meal plans, and shopping lists will    │
│  be permanently deleted.                              │
│                                                       │
│                    [Delete Account]                   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### UX-2: Delete Account Confirmation Modal

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│  ⚠️  Delete Account - Are You Sure?                  │
│                                                       │
│  This action is PERMANENT and CANNOT be undone.      │
│                                                       │
│  The following will be deleted:                       │
│  • Your user account                                 │
│  • All your recipes                                  │
│  • All your collections                              │
│  • All your meal plans                               │
│  • All your shopping lists                           │
│                                                       │
│  Enter your password to confirm:                      │
│  [................................]                   │
│                                                       │
│         [Cancel]    [Delete Permanently]             │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### UX-3: Design Specifications

#### Colors
- Primary: Blue (existing theme)
- Danger: Red (#dc2626) for delete actions
- Success: Green (#16a34a) for success messages
- Error: Red (#dc2626) for error messages

#### Typography
- Page title: 2xl, bold
- Section headers: lg, semibold
- Labels: sm, medium
- Help text: sm, normal, gray

#### Spacing
- Section spacing: 8 units
- Form field spacing: 4 units
- Button spacing: 2 units

#### Components
- Use existing Tailwind CSS classes
- Match styling of authentication pages
- Consistent button styles
- Form input styles match existing patterns

---

## Security Requirements

### SEC-1: Authentication

- All endpoints require valid JWT token
- Token must not be expired
- User must exist in database

### SEC-2: Password Verification

- Current password must be verified before allowing password change
- Password must be verified before account deletion
- Use bcrypt for password comparison
- Prevent timing attacks

### SEC-3: Input Validation

- Validate all inputs server-side
- Sanitize user inputs
- Enforce password strength requirements
- Prevent XSS attacks

### SEC-4: Rate Limiting

- Limit password change attempts: 5 per hour per user
- Limit account deletion attempts: 3 per hour per user
- Return generic error messages to prevent enumeration

### SEC-5: Session Management

- Invalidate all tokens after account deletion
- Maintain session after password change
- Clear sensitive data from memory

### SEC-6: Data Privacy

- Ensure complete data deletion on account removal
- No backups of deleted user data
- Audit log of account deletions (system level, not user accessible)

---

## Acceptance Criteria

### AC-1: Change Password

✅ **Given** I am logged in to my account  
✅ **When** I navigate to account settings  
✅ **Then** I see a change password form

✅ **Given** I am on the account settings page  
✅ **When** I enter my current password, a new valid password, and confirm it  
✅ **And** I click "Update Password"  
✅ **Then** my password is updated successfully  
✅ **And** I see a success message  
✅ **And** I remain logged in

✅ **Given** I have changed my password  
✅ **When** I log out and log back in with the new password  
✅ **Then** authentication succeeds

✅ **Given** I am changing my password  
✅ **When** I enter an incorrect current password  
✅ **Then** I see an error message "Current password is incorrect"  
✅ **And** the password is not changed

✅ **Given** I am changing my password  
✅ **When** I enter a new password that is too weak  
✅ **Then** I see an error message about password requirements  
✅ **And** the password is not changed

✅ **Given** I am changing my password  
✅ **When** the new password and confirmation don't match  
✅ **Then** I see an error message "Passwords do not match"  
✅ **And** the password is not changed

### AC-2: Delete Account

✅ **Given** I am logged in to my account  
✅ **When** I navigate to account settings  
✅ **Then** I see a "Delete Account" option in the danger zone

✅ **Given** I am on the account settings page  
✅ **When** I click "Delete Account"  
✅ **Then** a confirmation modal appears  
✅ **And** I see a warning about permanent data loss  
✅ **And** I see a password confirmation field

✅ **Given** the delete account modal is open  
✅ **When** I click "Cancel"  
✅ **Then** the modal closes  
✅ **And** my account is not deleted

✅ **Given** the delete account modal is open  
✅ **When** I enter my password and click "Delete Permanently"  
✅ **Then** my account is deleted  
✅ **And** all my data is removed (recipes, collections, meal plans, shopping lists)  
✅ **And** I am logged out  
✅ **And** I am redirected to the home page  
✅ **And** I see a confirmation message

✅ **Given** I have deleted my account  
✅ **When** I try to log in with the old credentials  
✅ **Then** authentication fails  
✅ **And** I see an "Invalid credentials" error

✅ **Given** I am deleting my account  
✅ **When** I enter an incorrect password  
✅ **Then** I see an error message  
✅ **And** my account is not deleted

### AC-3: Navigation & Access

✅ **Given** I am logged in  
✅ **When** I view the navigation menu  
✅ **Then** I see a link to account settings

✅ **Given** I am not logged in  
✅ **When** I try to access /account  
✅ **Then** I am redirected to the login page

✅ **Given** I am on the account settings page  
✅ **When** I log out  
✅ **Then** I am redirected away from the settings page

---

## Testing Requirements

### Unit Tests

#### Backend Tests
- `authController.updatePassword` method
  - Success: Valid current password, strong new password
  - Error: Invalid current password
  - Error: Weak new password
  - Error: Same as current password
  - Error: Missing fields
- `authController.deleteAccount` method
  - Success: Valid password, account deleted
  - Error: Invalid password
  - Error: Missing password
  - Verify: All user data deleted

#### Frontend Tests
- `AccountSettingsPage` component
  - Renders change password form
  - Renders delete account section
  - Shows loading states
  - Shows success messages
  - Shows error messages
  - Form validation works

### Integration Tests

#### Test Suite: Account Management
1. **Change Password Flow**
   - User updates password successfully
   - User can login with new password
   - Old password no longer works

2. **Delete Account Flow**
   - User deletes account
   - All user data is removed
   - User cannot login after deletion
   - Recipes owned by user are deleted
   - Collections owned by user are deleted
   - Meal plans owned by user are deleted
   - Shopping lists owned by user are deleted

3. **Error Handling**
   - Invalid current password rejected
   - Weak new password rejected
   - Invalid deletion password rejected

4. **Security Tests**
   - Cannot change password without authentication
   - Cannot delete account without authentication
   - Cannot change another user's password
   - Cannot delete another user's account

### E2E Tests

1. **Complete Password Change Journey**
   - Login → Navigate to settings → Change password → Verify success

2. **Complete Account Deletion Journey**
   - Login → Create recipe → Navigate to settings → Delete account → Verify deletion

### Manual Testing Checklist

- [ ] Change password with valid inputs
- [ ] Change password with invalid current password
- [ ] Change password with weak new password
- [ ] Change password with mismatched confirmation
- [ ] Delete account with valid password
- [ ] Delete account with invalid password
- [ ] Cancel account deletion
- [ ] Verify all user data deleted after account deletion
- [ ] Verify navigation links work
- [ ] Verify protected route redirects
- [ ] Test responsive design on mobile
- [ ] Test keyboard navigation
- [ ] Test screen reader accessibility

---

## Dependencies

### Existing Features
- ✅ Authentication system (V2.0)
- ✅ User model with bcrypt password hashing
- ✅ JWT middleware
- ✅ Protected routes

### New Dependencies
- None (uses existing stack)

### Database Changes
- None (uses existing User model)

---

## Future Enhancements

These features are explicitly out of scope for V2.1.1 but may be considered for future versions:

### V2.1.4+: Email Management
- Change email address
- Email verification
- Multiple email addresses

### V2.1.5: Enhanced Security
- Two-factor authentication setup/removal
- View active sessions
- Revoke specific sessions
- Security event log

### V2.2.0+: Profile Management
- Update username
- Profile picture
- Display name
- Bio/description

### V3.0.0+: Advanced Features
- Account export (download all data)
- Account suspension (temporary disable)
- Account recovery (grace period before permanent deletion)

---

## Non-Functional Requirements

### Performance
- Password change: < 500ms response time
- Account deletion: < 2s (includes cascade deletion)
- Page load: < 300ms

### Usability
- Clear, intuitive interface
- Helpful error messages
- Confirmation for destructive actions
- Accessible (WCAG 2.1 AA)

### Reliability
- 99.9% uptime for account management endpoints
- Graceful error handling
- Data integrity maintained

### Scalability
- Handle concurrent password changes
- Efficient cascade deletion
- No performance impact on other users

---

## Success Metrics

### Technical Metrics
- Test coverage: > 80%
- API response time: < 500ms (p95)
- Zero data loss incidents
- Zero unauthorized access incidents

### User Metrics
- Password change completion rate: > 95%
- Account deletion confirmation rate: > 90% (fewer accidental clicks)
- Error rate: < 5%

---

## Release Notes Template

```markdown
## [2.1.1] - YYYY-MM-DD

### Added
- Account settings page for authenticated users
- Change password functionality while logged in
- Account deletion with data cascade
- Navigation link to account settings

### Security
- Password verification required for password changes
- Password verification required for account deletion
- Complete data removal on account deletion
- Rate limiting on account management operations
```

---

## Approval

**Requirements Author**: Development Team  
**Date**: February 15, 2026  
**Status**: Ready for Design Phase

**Next Steps**:
1. Design Phase: Plan implementation details
2. Development Phase: Implement backend and frontend
3. Testing Phase: Comprehensive test suite
4. Review Phase: Code review
5. Release Phase: Deploy V2.1.1

---

**Document Control**:
- Version: 1.0
- Last Updated: February 15, 2026
- Next Review: After implementation