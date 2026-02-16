# REQ-022: Google Drive Cloud Backup Integration

**Version**: 1.0  
**Status**: In Progress  
**Created**: February 16, 2026  
**Last Updated**: February 16, 2026  
**Part of**: V2.2.0 Cloud Backup Integration (Week 5)

---

## Overview

This requirement specifies the integration of Google Drive as a second cloud backup provider alongside Dropbox. Users will be able to connect their Google Drive account and configure automatic backups to Google Drive, providing an alternative cloud storage option.

---

## User Stories

### As a user, I want to...

**US-022.1**: Connect my Google Drive account
- So that I can store Recipe Book backups in Google Drive
- Acceptance: OAuth flow completes successfully and account is connected

**US-022.2**: Upload manual backups to Google Drive
- So that I can create on-demand backups to my Drive storage
- Acceptance: Backup file is created and uploaded to Google Drive

**US-022.3**: Configure automatic backups to Google Drive
- So that my data is backed up regularly without manual intervention
- Acceptance: Scheduled backups run and upload to Google Drive successfully

**US-022.4**: List my backups stored in Google Drive
- So that I can see backup history and select one to restore
- Acceptance: All backup files in Drive folder are displayed with metadata

**US-022.5**: Restore my data from a Google Drive backup
- So that I can recover my recipes, collections, meal plans, and shopping lists
- Acceptance: Selected backup is downloaded and data is restored correctly

**US-022.6**: Delete old backups from Google Drive
- So that I can manage storage space and remove outdated backups
- Acceptance: Selected backup is permanently deleted from Google Drive

---

## Functional Requirements

### FR-022.1: Google OAuth 2.0 Authentication

**Description**: Implement OAuth 2.0 flow for Google Drive API access

**Requirements**:
- Use Google's standard OAuth 2.0 flow
- Request `https://www.googleapis.com/auth/drive.file` scope (access to app-created files only)
- Store access token and refresh token encrypted in database
- Handle token refresh automatically when expired
- Store account information (email, name, ID) for display

**OAuth Flow**:
```
1. User clicks "Connect Google Drive"
2. Backend generates OAuth URL with state token
3. User redirected to Google consent screen
4. User authorizes application
5. Google redirects to callback URL with code
6. Backend exchanges code for tokens
7. Backend retrieves account info
8. Backend encrypts and stores tokens
9. User redirected to success page
```

**Security**:
- CSRF protection via state token (10-minute expiry in Redis)
- Tokens encrypted with AES-256-CBC before storage
- Tokens excluded from default queries (+select required)
- HTTPS required for OAuth redirects (production)

---

### FR-022.2: Google Drive File Upload

**Description**: Upload backup ZIP files to Google Drive

**Requirements**:
- Create backup file (reuse existing `generateBackupFile()`)
- Create "Recipe Book Backups" folder in Google Drive (if not exists)
- Upload file to backup folder
- Use streaming upload for large files
- Return file metadata (id, name, size, timestamp)
- Clean up local temp file after upload

**File Naming Convention**:
```
Manual: recipe-book-backup-YYYY-MM-DD-HHMMSS.zip
Auto:   recipe-book-backup-auto-YYYY-MM-DD-HHMMSS.zip
```

**Error Handling**:
- Handle quota exceeded errors (HTTP 403)
- Handle network errors with retry (3 attempts)
- Handle authentication errors (re-auth required)
- Log all errors for debugging

---

### FR-022.3: Google Drive File Listing

**Description**: List backup files from Google Drive

**Requirements**:
- Query files in "Recipe Book Backups" folder
- Sort by creation date (newest first)
- Support pagination (limit parameter)
- Return file metadata:
  - File ID (for download/delete operations)
  - Filename
  - File size (bytes)
  - Creation timestamp
  - Backup type (manual/automatic - inferred from filename)

**Response Format**:
```json
{
  "success": true,
  "backups": [
    {
      "id": "1a2b3c4d5e6f",
      "filename": "recipe-book-backup-2026-02-16-140500.zip",
      "size": 1048576,
      "timestamp": "2026-02-16T14:05:00Z",
      "type": "manual"
    }
  ],
  "total": 1
}
```

---

### FR-022.4: Google Drive File Download

**Description**: Download backup file from Google Drive for restore

**Requirements**:
- Download file by ID
- Stream to temporary local file
- Return path to downloaded file
- Support large files (>100MB)
- Clean up temp file after restore

**Process**:
```
1. Validate user owns the backup (via file permissions)
2. Stream file from Google Drive API
3. Write to temp directory
4. Return temp file path
5. Import system processes file (REQ-016 logic)
6. Delete temp file
```

---

### FR-022.5: Google Drive File Deletion

**Description**: Delete backup file from Google Drive

**Requirements**:
- Delete file by ID
- Move file to trash (soft delete)
- Validate user owns the file
- Update user stats after deletion
- Support batch deletion (retention policy)

**Permissions**:
- User can only delete files created by the app
- Using `drive.file` scope ensures this restriction

---

### FR-022.6: Automatic Backup Scheduler Integration

**Description**: Extend existing scheduler to support Google Drive users

**Requirements**:
- Scheduler checks both Dropbox and Google Drive users
- Uses provider-specific service based on user configuration
- Same retry logic as Dropbox (3 attempts, 1-hour intervals)
- Same email notifications on failure
- Same retention policy enforcement

**No Changes Required To**:
- Scheduler cron job (already provider-agnostic)
- Retry logic (already provider-agnostic)
- Email notification system (already provider-agnostic)

---

### FR-022.7: Token Refresh Automation

**Description**: Automatically refresh Google OAuth tokens when expired

**Requirements**:
- Check token expiry before each API call
- Refresh token if expired or within 5 minutes of expiry
- Update stored access token and expiry
- Handle refresh token errors (re-auth required)
- Log refresh operations

**Refresh Process**:
```javascript
1. Check user.cloudBackup.tokenExpiry
2. If expired or expiring soon:
   a. Use refresh token to get new access token
   b. Encrypt and update user.cloudBackup.accessToken
   c. Update user.cloudBackup.tokenExpiry
   d. Save user document
3. Return valid access token
```

---

## Technical Requirements

### TR-022.1: Google Drive API Configuration

**Google Cloud Console Setup**:
- Project Name: "Recipe Book Cloud Backup"
- Enable Google Drive API
- OAuth 2.0 Credentials (Web application type)
- Authorized redirect URI: `http://localhost:5000/api/cloud/google/callback`
- OAuth scope: `https://www.googleapis.com/auth/drive.file`

**Environment Variables**:
```bash
GOOGLE_DRIVE_CLIENT_ID=your_client_id_here
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret_here
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:5000/api/cloud/google/callback
```

---

### TR-022.2: Dependencies

**New Dependency**:
```json
{
  "googleapis": "^144.0.0"
}
```

**Already Installed**: ✅ (checked in backend/package.json)

---

### TR-022.3: Database Schema

**User Model Extension** (already in place from Week 3):
```javascript
cloudBackup: {
  provider: {
    type: String,
    enum: ['dropbox', 'google_drive', null],  // ✅ Already supports google_drive
    default: null
  },
  // ... rest of schema unchanged
}
```

**No Database Changes Required**: ✅

---

### TR-022.4: API Endpoints

**New Endpoints**:
```
GET    /api/cloud/google/auth       - Initiate Google OAuth
GET    /api/cloud/google/callback   - Handle OAuth callback
```

**Modified Endpoints** (provider routing):
```
POST   /api/cloud/backup           - Support Google Drive upload
GET    /api/cloud/backups          - Support Google Drive listing
POST   /api/cloud/restore          - Support Google Drive download
DELETE /api/cloud/backups/:id      - Support Google Drive deletion
```

**Existing Endpoints** (no changes):
```
GET    /api/cloud/status           - Shows connected provider
POST   /api/cloud/disconnect       - Disconnects any provider
PUT    /api/cloud/schedule         - Works with any provider
```

---

### TR-022.5: Service Architecture

**New File**:
```
backend/src/services/cloudProviders/googleDrive.js
```

**Service Methods**:
- `uploadBackup(user, localFilePath)` - Upload to Drive
- `listBackups(user, limit)` - List from Drive
- `downloadBackup(user, fileId)` - Download from Drive
- `deleteBackup(user, fileId)` - Delete from Drive
- `getAccountInfo(accessToken)` - Get user info
- `getBackupFolderId(drive)` - Get/create backup folder

**Integration**:
- Controller uses `getProviderService(user.cloudBackup.provider)`
- Scheduler uses `getProviderService(user.cloudBackup.provider)`
- No changes to calling code (polymorphic interface)

---

### TR-022.6: Error Codes

**Google-Specific Errors**:
```javascript
GOOGLE_OAUTH_FAILED       - OAuth authorization failed
GOOGLE_TOKEN_EXPIRED      - Token refresh failed
GOOGLE_QUOTA_EXCEEDED     - Drive storage quota exceeded (403)
GOOGLE_FILE_NOT_FOUND     - Backup file not found (404)
GOOGLE_PERMISSION_DENIED  - User doesn't own file (403)
GOOGLE_NETWORK_ERROR      - API connection failed
```

**Mapped to Standard Errors**:
- All mapped to existing CloudBackupError types
- Consistent error responses across providers

---

### TR-022.7: Rate Limiting

**Applies to all Google endpoints**:
- Same rate limits as Dropbox endpoints
- 10 requests per hour per user
- Rate limiter middleware: `cloudBackupLimiter`

---

## UI/UX Requirements

### UX-022.1: Provider Selection UI

**CloudBackupPage Component Updates**:

**Before Connection**:
```
┌─────────────────────────────────────┐
│ Provider Connection                 │
├─────────────────────────────────────┤
│ Connect your cloud storage to       │
│ enable automatic backups            │
│                                     │
│ [Connect Dropbox]                   │
│ [Connect Google Drive]  ← NEW       │
└─────────────────────────────────────┘
```

**After Connection** (Google Drive):
```
┌─────────────────────────────────────┐
│ Provider Connection                 │
├─────────────────────────────────────┤
│ ✓ Connected to Google Drive         │
│ Account: user@gmail.com             │
│                                     │
│ [Disconnect]                        │
└─────────────────────────────────────┘
```

---

### UX-022.2: Backup List Display

**No Changes Required**:
- Backup list UI is provider-agnostic
- Displays filename, size, timestamp, type
- Same UI for Dropbox and Google Drive backups

---

### UX-022.3: Loading & Error States

**Loading States**:
- "Connecting to Google Drive..." (during OAuth)
- "Backing up to Google Drive..." (during upload)
- "Restoring from Google Drive..." (during download)

**Error Messages**:
- "Failed to connect to Google Drive. Please try again."
- "Google Drive storage quota exceeded. Please free up space."
- "Failed to upload backup. Please check your connection."

---

## Acceptance Criteria

### AC-022.1: Google OAuth Flow
- [ ] User can click "Connect Google Drive" button
- [ ] OAuth popup opens with Google consent screen
- [ ] User can authorize the application
- [ ] Tokens are stored encrypted in database
- [ ] Account email and name are displayed
- [ ] State token is validated (CSRF protection)
- [ ] Invalid state token is rejected

---

### AC-022.2: Manual Backup to Google Drive
- [ ] User can click "Backup Now" button
- [ ] Backup file is generated successfully
- [ ] File is uploaded to "Recipe Book Backups" folder
- [ ] Backup appears in backup list
- [ ] Stats are updated (totalBackups, manualBackups)
- [ ] Local temp file is cleaned up
- [ ] User sees success message

---

### AC-022.3: Automatic Backup to Google Drive
- [ ] Scheduler identifies Google Drive users with due backups
- [ ] Backup runs at scheduled time
- [ ] File uploads to Google Drive successfully
- [ ] Stats are updated (totalBackups, autoBackups)
- [ ] nextBackup is calculated correctly
- [ ] Retry logic works on failure (3 attempts)
- [ ] Email sent after 3 consecutive failures

---

### AC-022.4: List Backups from Google Drive
- [ ] GET /api/cloud/backups returns Google Drive files
- [ ] Files are sorted by creation date (newest first)
- [ ] Correct metadata is returned (id, name, size, timestamp)
- [ ] Backup type is inferred correctly (manual/automatic)
- [ ] Empty list returned if no backups exist

---

### AC-022.5: Restore from Google Drive
- [ ] User can click "Restore" on a backup
- [ ] Password confirmation is required
- [ ] File downloads from Google Drive
- [ ] Import process runs successfully
- [ ] Statistics are returned (recipes, collections, etc.)
- [ ] Temp file is cleaned up
- [ ] User sees success message with statistics

---

### AC-022.6: Delete Backup from Google Drive
- [ ] User can click "Delete" on a backup
- [ ] Confirmation dialog is shown
- [ ] File is deleted from Google Drive
- [ ] Backup removed from list
- [ ] Stats are updated if applicable

---

### AC-022.7: Token Refresh
- [ ] Expired tokens are refreshed automatically
- [ ] New access token is stored encrypted
- [ ] Token expiry is updated
- [ ] User is not interrupted during operations
- [ ] Refresh failures are logged and handled

---

### AC-022.8: Error Handling
- [ ] Quota exceeded errors show helpful message
- [ ] Network errors trigger retry logic
- [ ] Auth errors prompt re-authentication
- [ ] All errors are logged for debugging
- [ ] User sees appropriate error messages

---

### AC-022.9: Provider Coexistence
- [ ] Dropbox users are not affected by Google Drive code
- [ ] Users can switch providers (disconnect one, connect other)
- [ ] Scheduler handles both provider types
- [ ] All existing Dropbox tests still pass

---

## Non-Functional Requirements

### NFR-022.1: Performance
- **File Upload**: < 30 seconds for 10MB file
- **File Download**: < 30 seconds for 10MB file
- **File Listing**: < 2 seconds for 100 files
- **Token Refresh**: < 1 second

---

### NFR-022.2: Security
- **Token Encryption**: AES-256-CBC encryption
- **CSRF Protection**: State token with 10-minute expiry
- **OAuth Scope**: Minimal scope (drive.file only)
- **HTTPS Required**: Yes (production)
- **Token Storage**: Excluded from default queries

---

### NFR-022.3: Reliability
- **Retry Logic**: 3 attempts with exponential backoff
- **Token Refresh**: Automatic, transparent to user
- **Error Recovery**: Graceful degradation
- **Monitoring**: All operations logged

---

### NFR-022.4: Compatibility
- **Existing Features**: No breaking changes
- **Database Migration**: None required
- **API Versioning**: Backward compatible
- **Provider Abstraction**: Maintained

---

## Test Requirements

### Unit Tests
- [ ] GoogleDriveService.uploadBackup()
- [ ] GoogleDriveService.listBackups()
- [ ] GoogleDriveService.downloadBackup()
- [ ] GoogleDriveService.deleteBackup()
- [ ] GoogleDriveService.getAccountInfo()
- [ ] Token refresh logic
- [ ] Error handling for each operation

---

### Integration Tests
- [ ] Google OAuth flow (initiate + callback)
- [ ] Manual backup creation and upload
- [ ] Backup listing
- [ ] Backup restoration
- [ ] Backup deletion
- [ ] Automatic backup execution (scheduler)
- [ ] Token refresh on expiry
- [ ] Retry logic on failure
- [ ] Email notification on repeated failure

---

### E2E Tests (Manual)
- [ ] Complete OAuth flow in browser
- [ ] Manual backup from UI
- [ ] View backup list
- [ ] Restore from backup
- [ ] Delete backup
- [ ] Configure automatic backup schedule
- [ ] Verify scheduled backup runs

---

## Dependencies

### Upstream Dependencies
- REQ-009: Authentication system (completed V2.0)
- REQ-013: Export system (completed V2.0)
- REQ-016: Import from backup (completed V2.1.2)
- V2.2.0 Week 3: Dropbox integration (completed)
- V2.2.0 Week 4: Backup scheduler (completed)

---

### Downstream Dependencies
- V2.2.0 Week 6: Testing & refinement
- V2.2.0 Code Review
- Future: Microsoft OneDrive integration

---

## Risks & Mitigations

### Risk 1: Google API Rate Limits
**Impact**: High  
**Probability**: Medium  
**Mitigation**: 
- Implement exponential backoff
- Use batch operations where possible
- Monitor API quota usage
- Implement request caching

---

### Risk 2: OAuth Token Management
**Impact**: Medium  
**Probability**: Medium  
**Mitigation**:
- Automatic token refresh
- Clear error messages for re-auth
- Log all token operations
- Test refresh logic thoroughly

---

### Risk 3: User Confusion (Two Providers)
**Impact**: Low  
**Probability**: Low  
**Mitigation**:
- Clear provider selection UI
- Help text explaining differences
- Allow easy provider switching
- Document both options

---

## Out of Scope

The following are explicitly **not** part of this requirement:

❌ Support for multiple providers simultaneously (user can only connect one)  
❌ Migration of backups between providers  
❌ Backup encryption (files are stored as-is)  
❌ Sharing backups with other users  
❌ Backup versioning/diff viewing  
❌ Microsoft OneDrive integration  
❌ AWS S3 integration  

---

## Success Metrics

### Development Metrics
- **Test Coverage**: 85%+ (maintain existing coverage)
- **Integration Tests**: 30/30 passing (no regressions)
- **Code Review Score**: 5/5 stars

### User Metrics (Post-Launch)
- **Google Drive Adoption**: 20%+ of users connect Google Drive
- **Backup Success Rate**: 95%+ for Google Drive uploads
- **Restore Success Rate**: 98%+ for Google Drive downloads

---

## Future Enhancements (V2.3+)

### Potential Improvements
- Support multiple cloud providers simultaneously
- Backup encryption before upload
- Incremental backups (delta sync)
- Backup compression improvements
- Cross-provider backup migration
- Microsoft OneDrive support
- AWS S3 support

---

## References

### External Documentation
- [Google Drive API v3 Documentation](https://developers.google.com/drive/api/v3/reference)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)

### Internal Documentation
- REQ-013: Export System
- REQ-016: Import from Backup
- V2.2.0-CLOUD-BACKUP-DESIGN.md
- CODE_REVIEW_V2.2.0-BACKUP-SCHEDULER.md

---

**Document Version**: 1.0  
**Author**: Development Team  
**Approved By**: Product Owner  
**Implementation Target**: V2.2.0 Week 5 (February 16-25, 2026)