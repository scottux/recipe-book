# Account Management

**Version:** 2.1.1  
**Feature Type:** User Account Security & Management  
**Status:** ✅ Production Ready

---

## Overview

The Account Management feature provides users with comprehensive control over their account security and data. Users can update their passwords while staying logged in, and permanently delete their accounts with full cascade cleanup of all associated data.

---

## Features

### 1. Update Password

**Description:** Allows authenticated users to change their account password without logging out.

**Key Benefits:**
- ✅ Maintain active session (no forced logout)
- ✅ Enhanced security with current password verification
- ✅ Prevents password reuse
- ✅ Built-in rate limiting

**User Flow:**
1. Navigate to Account Settings (Settings link in navigation)
2. Enter current password
3. Enter new password (min. 8 characters)
4. Confirm new password
5. Click "Update Password"
6. Receive success confirmation
7. Continue using app without re-login

**Security Features:**
- Current password verification required
- Minimum 8-character password length
- Prevents reusing current password
- Rate Limited (5 attempts per hour)
- Clear error messaging
- Session persistence after change

### 2. Delete Account

**Description:** Permanently removes user account and all associated data with cascade cleanup.

**Key Features:**
- ✅ Complete data removal
- ✅ Password confirmation required
- ✅ Clear warning UI
- ✅ Cascade deletion of all user content
- ✅ Irreversible with proper safeguards

**What Gets Deleted:**
- User account
- All recipes created by the user
- All collections created by the user
- All meal plans created by the user
- All shopping lists created by the user

**User Flow:**
1. Navigate to Account Settings
2. Scroll to "Danger Zone"
3. Click "Delete Account" button
4. Read confirmation modal warnings
5. Enter password to confirm
6. Click "Delete Permanently"
7. Account and all data permanently removed
8. Redirected to home page

**Security Features:**
- Password verification required
- Confirmation modal with clear warnings
- Lists all data that will be deleted
- Rate limited (3 attempts per hour)
- Atomic cascade deletion
- Irreversible action

---

## API Endpoints

### Update Password
```
PATCH /api/auth/password
Authorization: Bearer <access_token>

Request Body:
{
  "currentPassword": "string",
  "newPassword": "string"
}

Success Response (200):
{
  "success": true,
  "message": "Password updated successfully."
}

Error Responses:
400 - Invalid input (weak password, same password, incorrect current password)
401 - Not authenticated
429 - Too many attempts
500 - Server error
```

### Delete Account
```
DELETE /api/auth/account
Authorization: Bearer <access_token>

Request Body:
{
  "password": "string"
}

Success Response (200):
{
  "success": true,
  "message": "Account deleted successfully."
}

Error Responses:
400 - Incorrect password
401 - Not authenticated
429 - Too many attempts
500 - Server error
```

---

## UI/UX Design

### Account Settings Page

**Route:** `/account`

**Layout:**
1. **Account Information Section**
   - Username display
   - Email display
   - Member since date

2. **Change Password Section**
   - Current password input
   - New password input (with hint: min. 8 characters)
   - Confirm password input
   - Update button
   - Success/error messaging

3. **Danger Zone Section**
   - Red-themed warning area
   - Clear warning about irreversible action
   - Delete Account button

**Confirmation Modal** (Delete Account):
- Warning icon (⚠️)
- Bold headline emphasizing permanence
- List of data that will be deleted
- Password input field
- Cancel and Delete Permanently buttons
- Error messaging for incorrect password

### Navigation

**Desktop:**
- "Settings" link in main navigation (between Shopping and Logout)

**Mobile:**
- "Settings" option in hamburger menu

### Visual Theme

- Matches cookbook theme with cookbook-paper backgrounds
- cookbook-aged borders
- cookbook-accent colors for actions
- Red theme for danger zone (red-50 background, red-600 buttons)
- Responsive design for all screen sizes

---

## Validation Rules

### Password Update
- `currentPassword`: Required, must match user's current password
- `newPassword`: Required, minimum 8 characters, must be different from current

### Account Deletion
- `password`: Required, must match user's current password

---

## Rate Limiting

### Password Change
- **Limit:** 5 attempts per hour per user
- **Storage:** In-memory Map (suitable for current scale)
- **Resets:** On successful change

### Account Deletion
- **Limit:** 3 attempts per hour per user
- **Storage:** In-memory Map (suitable for current scale)
- **Resets:** On successful deletion

---

## Security Considerations

### Best Practices Implemented
1. ✅ Password verification before sensitive operations
2. ✅ Rate limiting prevents brute force attacks
3. ✅ Session management (appropriate for each operation)
4. ✅ Clear user warnings for destructive actions
5. ✅ Atomic cascade deletion (all-or-nothing)
6. ✅ No information leakage in error messages
7. ✅ Client-side + server-side validation

### Session Handling
- **Password Change:** Session maintained (user-friendly, no re-login needed)
- **Account Deletion:** Session ended, user logged out

### Data Integrity
- Cascade deletion ensures no orphaned records
- Uses MongoDB's `deleteMany` with owner filtering
- Atomic operations using `Promise.all()`

---

## Testing

### Test Coverage
- ✅ 19 integration tests
- ✅ Full flow testing
- ✅ Edge case coverage
- ✅ Security testing (rate limiting, authorization)
- ✅ Cascade deletion verification

### Test Categories
1. Password Update (8 tests)
2. Account Deletion (10 tests)
3. Complete Lifecycle (1 test)

---

## Error Handling

### Common Errors

**Password Too Short:**
```
Error: "New password must be at least 8 characters long."
```

**Passwords Don't Match:**
```
Error: "New passwords do not match."
```

**Same Password:**
```
Error: "New password must be different from current password."
```

**Incorrect Password:**
```
Error: "Current password is incorrect." (password change)
Error: "Password is incorrect." (account deletion)
```

**Rate Limit Exceeded:**
```
Error: "Too many password change attempts. Please try again later."
Error: "Too many account deletion attempts. Please try again later."
```

---

## Future Enhancements

### Planned for V2.1.2+
1. Email notification on password change
2. Email notification before account deletion
3. Grace period for account deletion (soft delete)
4. Export data option before deletion
5. Redis-based rate limiting for production scale
6. Audit logging for security events

---

## Browser Support

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Related Documentation

- [API Reference](../api/api-reference.md)
- [Password Reset Feature](./password-reset.md)
- [Authentication](./authentication.md)
- [Requirements (REQ-015)](../../reqs/REQ-015-account-management.md)

---

## Support

For issues or questions:
1. Check error messages in the UI
2. Review this documentation
3. Check browser console for technical errors
4. Contact support with error details

---

**Last Updated:** February 15, 2026  
**Version:** 2.1.1