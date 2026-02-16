# REQ-021: Cloud Backup Integration

**Version**: 1.0  
**Status**: Draft  
**Priority**: HIGH  
**Target Release**: V2.2.0  
**Created**: February 16, 2026  
**Last Updated**: February 16, 2026

---

## Overview

Implement automatic and manual cloud backup functionality, allowing users to store their Recipe Book data in Dropbox or Google Drive. This provides an additional layer of data protection and enables access to backups across devices.

---

## User Stories

### As a Recipe Book user
1. **I want to** connect my Dropbox account **so that** my recipes are automatically backed up to the cloud
2. **I want to** connect my Google Drive account **so that** my data is safely stored in my existing cloud storage
3. **I want to** schedule automatic backups **so that** I don't have to remember to back up manually
4. **I want to** manually trigger a backup **so that** I can save my data before making major changes
5. **I want to** view my backup history **so that** I know when my data was last backed up
6. **I want to** restore from a cloud backup **so that** I can recover my data if needed
7. **I want to** disconnect cloud storage **so that** I can remove access if I no longer want cloud backups
8. **I want to** choose between Dropbox and Google Drive **so that** I can use my preferred cloud provider

---

## Functional Requirements

### FR-1: Cloud Provider Integration

#### FR-1.1: Dropbox Integration
- Support OAuth 2.0 authentication with Dropbox
- Request necessary permissions (file read/write to app folder)
- Store access tokens securely (encrypted)
- Handle token refresh automatically
- Support token revocation

#### FR-1.2: Google Drive Integration
- Support OAuth 2.0 authentication with Google Drive
- Request necessary permissions (drive.file scope)
- Store access tokens securely (encrypted)
- Handle token refresh automatically
- Support token revocation

#### FR-1.3: Provider Selection
- User can choose Dropbox OR Google Drive (one active at a time)
- Clear indication of which provider is connected
- Easy switching between providers
- Automatic disconnect of previous provider when switching

### FR-2: Backup Functionality

#### FR-2.1: Manual Backup
- "Backup Now" button in account settings
- Immediate backup trigger
- Progress indication during backup
- Success/failure notification
- Error handling with user-friendly messages

#### FR-2.2: Automatic Backup
- Scheduled backup configuration (daily, weekly, monthly)
- Default: Weekly on Sundays at 2 AM
- Configurable backup frequency
- Automatic retry on failure (max 3 attempts)
- Email notification on backup failure (optional)

#### FR-2.3: Backup Content
- Complete JSON backup (same format as REQ-016)
- All recipes, collections, meal plans, shopping lists
- User profile information
- Backup metadata (timestamp, version, user)
- Compressed format (.zip) for efficiency

#### FR-2.4: Backup Naming
- Format: `recipe-book-backup-YYYY-MM-DD-HHmmss.zip`
- Stored in `/Apps/Recipe Book/` folder (Dropbox)
- Stored in `/Recipe Book Backups/` folder (Google Drive)
- Chronological ordering by filename

### FR-3: Restore Functionality

#### FR-3.1: Backup List
- Display available cloud backups
- Show backup date, time, size
- Sort by date (newest first)
- Indicate backup source (manual/automatic)
- Maximum 10 backups displayed

#### FR-3.2: Restore Process
- Select backup from list
- Preview backup contents (recipe count, collection count, etc.)
- Confirm restore action (modal with warning)
- Download backup file
- Validate backup integrity
- Restore process (same as REQ-016 import)
- Success/failure notification

#### FR-3.3: Restore Options
- **Replace All**: Clear current data and restore from backup
- **Merge**: Add backup items to existing data (skip duplicates)
- **Preview Only**: View backup contents without importing

### FR-4: Backup Management

#### FR-4.1: Backup History
- List of recent backups (last 30 days)
- Backup timestamp, size, status
- Success/failure indicator
- Manual vs. automatic indicator
- Delete old backups option

#### FR-4.2: Storage Management
- Display total cloud storage used
- Automatic cleanup of old backups (keep last 10)
- Manual delete individual backups
- "Delete All Backups" option

#### FR-4.3: Backup Retention Policy
- Default: Keep last 10 backups
- Configurable retention (5, 10, 20, 50, unlimited)
- Automatic deletion of oldest backups
- Warning before auto-deletion

### FR-5: Account Settings Integration

#### FR-5.1: Cloud Backup Section
- New "Cloud Backup" section in Account Settings
- Provider connection status (Connected/Not Connected)
- Connect/Disconnect buttons
- Backup frequency configuration
- Last backup timestamp
- "Backup Now" button
- "Restore from Backup" button
- Backup history link

#### FR-5.2: Provider Management
- Display connected provider (Dropbox or Google Drive)
- Provider account info (email, name)
- Disconnect button with confirmation
- Switch provider option
- Reauthorize if token expired

---

## Technical Requirements

### TR-1: Backend Implementation

#### TR-1.1: OAuth Flow
```javascript
// Dropbox OAuth
router.get('/api/cloud/dropbox/auth', authenticate, startDropboxAuth);
router.get('/api/cloud/dropbox/callback', dropboxCallback);

// Google Drive OAuth
router.get('/api/cloud/google/auth', authenticate, startGoogleAuth);
router.get('/api/cloud/google/callback', googleCallback);
```

#### TR-1.2: Backup Endpoints
```javascript
// Manual backup
POST /api/cloud/backup
  - Triggers immediate backup to connected provider
  - Returns: { success, backupId, url, timestamp }

// Automatic backup configuration
PUT /api/cloud/backup/schedule
  - Body: { frequency: 'daily'|'weekly'|'monthly', time: '02:00' }
  - Returns: { success, schedule }

// List backups
GET /api/cloud/backups
  - Query: { limit: 10, offset: 0 }
  - Returns: { success, backups: [...], total }

// Restore from backup
POST /api/cloud/restore
  - Body: { backupId, mode: 'replace'|'merge' }
  - Returns: { success, statistics }

// Delete backup
DELETE /api/cloud/backups/:backupId
  - Returns: { success }

// Disconnect provider
POST /api/cloud/disconnect
  - Returns: { success }
```

#### TR-1.3: User Model Updates
```javascript
{
  cloudBackup: {
    provider: String,           // 'dropbox' | 'google_drive' | null
    accessToken: String,        // Encrypted
    refreshToken: String,       // Encrypted
    tokenExpiry: Date,
    accountEmail: String,
    accountName: String,
    schedule: {
      enabled: Boolean,
      frequency: String,        // 'daily' | 'weekly' | 'monthly'
      time: String,            // '02:00'
      lastBackup: Date,
      nextBackup: Date
    },
    retention: {
      maxBackups: Number,      // Default: 10
      autoCleanup: Boolean     // Default: true
    }
  }
}
```

#### TR-1.4: Background Job Scheduler
- Use node-cron for scheduled backups
- Check for due backups every hour
- Execute backup for eligible users
- Handle failures and retries
- Log backup activity

### TR-2: Frontend Implementation

#### TR-2.1: Cloud Backup Page Component
```jsx
// /account/cloud-backup route
<CloudBackupPage>
  - Provider connection status
  - Connect/disconnect buttons
  - Backup schedule configuration
  - Manual backup button
  - Backup history table
  - Restore interface
</CloudBackupPage>
```

#### TR-2.2: OAuth Popup Flow
- Open OAuth in popup window
- Handle callback redirect
- Close popup on success
- Update parent window state
- Error handling

#### TR-2.3: Backup Progress Indicator
- Real-time backup progress
- File upload status
- Completion notification
- Error messages

### TR-3: Security Requirements

#### TR-3.1: Token Storage
- Encrypt access/refresh tokens before database storage
- Use environment variable encryption key
- Never expose tokens in API responses
- Automatic token rotation

#### TR-3.2: OAuth Scopes
**Dropbox**:
- `files.content.write` - Upload backups
- `files.content.read` - Download backups
- `files.metadata.read` - List backups

**Google Drive**:
- `https://www.googleapis.com/auth/drive.file` - App-created files only
- `https://www.googleapis.com/auth/userinfo.email` - User email

#### TR-3.3: API Security
- All cloud endpoints require authentication
- Rate limiting: 10 backup operations per hour
- File size validation (max 50MB)
- Virus scanning (optional, future enhancement)

### TR-4: Error Handling

#### TR-4.1: OAuth Errors
- Handle cancelled authorization
- Handle expired tokens (auto-refresh)
- Handle revoked access (require re-auth)
- Handle network errors
- User-friendly error messages

#### TR-4.2: Backup Errors
- Handle quota exceeded (cloud storage full)
- Handle network timeouts
- Handle file upload failures
- Retry logic (exponential backoff)
- Fallback to local download

#### TR-4.3: Restore Errors
- Handle corrupted backup files
- Handle incompatible versions
- Handle duplicate data conflicts
- Transaction rollback on failure
- Clear error messaging

---

## UI/UX Requirements

### UX-1: Cloud Backup Page

#### Layout
```
┌─────────────────────────────────────────────┐
│  Cloud Backup                               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Provider Connection                   │ │
│  │                                       │ │
│  │ Status: Not Connected                 │ │
│  │                                       │ │
│  │ [Connect Dropbox] [Connect Google Drive] │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Backup Schedule                       │ │
│  │                                       │ │
│  │ Frequency: [Weekly ▼]                 │ │
│  │ Time: [02:00]                         │ │
│  │ Last Backup: Never                    │ │
│  │                                       │ │
│  │ [Backup Now]                          │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Backup History                        │ │
│  │                                       │ │
│  │ Date         Size    Type    Actions  │ │
│  │ ─────────────────────────────────────│ │
│  │ (No backups yet)                      │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### Connected State
```
┌─────────────────────────────────────────────┐
│  Provider Connection                        │
│  ✓ Connected to Dropbox                    │
│  Account: user@example.com                  │
│  [Disconnect]                               │
└─────────────────────────────────────────────┘
```

### UX-2: Color Scheme & Theme

**Cookbook Theme Compliance**:
- Primary buttons: `bg-cookbook-accent` (brown)
- Secondary buttons: `border-2 border-cookbook-aged`
- Status badges: Green (connected), Gray (disconnected)
- Background: `bg-cookbook-paper`
- Text: `text-cookbook-darkbrown`
- Borders: `border-cookbook-aged`

### UX-3: User Flow

#### Connect Cloud Provider Flow
1. Click "Connect Dropbox" or "Connect Google Drive"
2. OAuth popup opens
3. User authorizes in popup
4. Popup closes automatically
5. Success message displays
6. Page refreshes to show connected state

#### Manual Backup Flow
1. Click "Backup Now" button
2. Button shows loading spinner
3. Progress indicator appears
4. Upload completes
5. Success message: "Backup created successfully!"
6. Backup appears in history table

#### Restore Flow
1. Click "Restore" on backup in history
2. Modal opens with backup details
3. Choose restore mode (Replace All / Merge)
4. Confirm with password
5. Progress indicator
6. Success message
7. Page refresh with restored data

### UX-4: Accessibility

- All interactive elements keyboard accessible
- ARIA labels on all buttons and inputs
- Focus states visible
- Screen reader announcements for status changes
- Error messages announced
- Progress indicators accessible

---

## API Contracts

### Connect Dropbox
**Request**:
```http
GET /api/cloud/dropbox/auth
Authorization: Bearer <token>
```

**Response** (Redirect to Dropbox OAuth):
```
https://www.dropbox.com/oauth2/authorize?
  client_id=<app_key>&
  response_type=code&
  redirect_uri=<callback>&
  state=<csrf_token>
```

### Callback Handler
**Request**:
```http
GET /api/cloud/dropbox/callback?code=<auth_code>&state=<csrf_token>
```

**Response**:
```json
{
  "success": true,
  "provider": "dropbox",
  "account": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Manual Backup
**Request**:
```http
POST /api/cloud/backup
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Response**:
```json
{
  "success": true,
  "backup": {
    "id": "backup_123",
    "filename": "recipe-book-backup-2026-02-16-140500.zip",
    "url": "https://dropbox.com/...",
    "size": 1048576,
    "timestamp": "2026-02-16T14:05:00Z",
    "type": "manual"
  }
}
```

### List Backups
**Request**:
```http
GET /api/cloud/backups?limit=10&offset=0
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "backups": [
    {
      "id": "backup_123",
      "filename": "recipe-book-backup-2026-02-16-140500.zip",
      "size": 1048576,
      "timestamp": "2026-02-16T14:05:00Z",
      "type": "manual",
      "status": "success"
    }
  ],
  "total": 1,
  "pagination": {
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

### Restore from Backup
**Request**:
```http
POST /api/cloud/restore
Authorization: Bearer <token>
Content-Type: application/json

{
  "backupId": "backup_123",
  "mode": "merge",
  "password": "user_password"
}
```

**Response**:
```json
{
  "success": true,
  "statistics": {
    "recipes": { "imported": 50, "skipped": 5 },
    "collections": { "imported": 3, "skipped": 0 },
    "mealPlans": { "imported": 2, "skipped": 0 },
    "shoppingLists": { "imported": 1, "skipped": 0 }
  }
}
```

---

## Dependencies

### New npm Packages

**Backend**:
```json
{
  "dropbox": "^10.34.0",          // Dropbox SDK
  "googleapis": "^126.0.1",       // Google Drive SDK
  "node-cron": "^3.0.3",         // Scheduled backups
  "archiver": "^7.0.1"           // Already installed (V2.0)
}
```

**Frontend**:
- No new dependencies required

### Environment Variables

```bash
# Dropbox OAuth
DROPBOX_CLIENT_ID=your_app_key
DROPBOX_CLIENT_SECRET=your_app_secret
DROPBOX_REDIRECT_URI=http://localhost:5000/api/cloud/dropbox/callback

# Google Drive OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/cloud/google/callback

# Encryption
CLOUD_TOKEN_ENCRYPTION_KEY=your_32_byte_key

# Backup Settings
MAX_BACKUP_SIZE_MB=50
BACKUP_RETENTION_DAYS=30
```

---

## Acceptance Criteria

### AC-1: Provider Connection ✅
- [ ] User can connect Dropbox account via OAuth
- [ ] User can connect Google Drive account via OAuth
- [ ] Only one provider can be active at a time
- [ ] User can disconnect provider
- [ ] Connected account information displayed
- [ ] Tokens stored encrypted in database

### AC-2: Manual Backup ✅
- [ ] "Backup Now" button triggers immediate backup
- [ ] Progress indicator shows during upload
- [ ] Success notification on completion
- [ ] Backup appears in history
- [ ] Backup file uploaded to cloud provider
- [ ] Backup file named correctly with timestamp

### AC-3: Automatic Backup ✅
- [ ] User can configure backup schedule (daily/weekly/monthly)
- [ ] User can set backup time
- [ ] Scheduled backups execute automatically
- [ ] Last backup timestamp updates
- [ ] Next backup time calculated and displayed
- [ ] Failed backups retry automatically (max 3 attempts)

### AC-4: Backup History ✅
- [ ] List shows recent backups (last 10)
- [ ] Each row shows date, size, type, status
- [ ] Sorted by date (newest first)
- [ ] Manual vs automatic clearly indicated
- [ ] User can delete individual backups
- [ ] "Delete All" option available

### AC-5: Restore from Backup ✅
- [ ] User can view available cloud backups
- [ ] User can preview backup contents
- [ ] User can restore with "Replace All" mode
- [ ] User can restore with "Merge" mode
- [ ] Password confirmation required
- [ ] Import statistics displayed after restore
- [ ] Duplicate handling works correctly

### AC-6: Error Handling ✅
- [ ] Expired token triggers re-authorization
- [ ] Network errors show user-friendly messages
- [ ] Quota exceeded handled gracefully
- [ ] Corrupted backup files detected
- [ ] All errors logged for debugging

### AC-7: Security ✅
- [ ] All endpoints require authentication
- [ ] Tokens encrypted before storage
- [ ] Tokens never exposed in API responses
- [ ] OAuth state parameter prevents CSRF
- [ ] Rate limiting prevents abuse
- [ ] Password required for restore

### AC-8: UI/UX ✅
- [ ] Cloud backup page matches cookbook theme
- [ ] All buttons use correct colors (brown, not blue)
- [ ] Loading states for all async operations
- [ ] Success/error messages clear and helpful
- [ ] Mobile responsive design
- [ ] WCAG 2.1 AA accessibility compliant

---

## Testing Requirements

### Unit Tests
- OAuth flow mocking
- Token encryption/decryption
- Backup file generation
- Schedule calculation
- Retention policy enforcement

### Integration Tests (Backend)
1. Connect Dropbox account
2. Connect Google Drive account
3. Create manual backup
4. Create scheduled backup
5. List backups from cloud
6. Restore from cloud backup (Replace mode)
7. Restore from cloud backup (Merge mode)
8. Delete backup from cloud
9. Disconnect provider
10. Handle expired token
11. Handle quota exceeded
12. Handle network error
13. Automatic cleanup old backups
14. Switch providers
15. Password verification for restore

### Integration Tests (Frontend)
1. OAuth popup flow
2. Display connected status
3. Configure backup schedule
4. Trigger manual backup
5. Display backup history
6. Restore flow with modal
7. Disconnect provider
8. Error message display

### E2E Tests
1. Complete OAuth flow (Dropbox)
2. Complete OAuth flow (Google Drive)
3. Create and verify backup exists in cloud
4. Restore from cloud backup
5. Schedule automatic backup and verify execution

### Manual Testing
1. Test with real Dropbox account
2. Test with real Google Drive account
3. Verify backups appear in cloud storage
4. Test backup/restore with large datasets
5. Test quota exceeded scenario
6. Test network interruption handling
7. Test UI on mobile devices
8. Test accessibility with screen reader

---

## Performance Requirements

### PR-1: Backup Performance
- Backup creation: < 10 seconds for typical dataset (100 recipes)
- Backup upload: < 30 seconds on average connection
- Backup compression: 70%+ size reduction
- Maximum backup file size: 50MB

### PR-2: Restore Performance
- Backup download: < 30 seconds
- Restore processing: < 20 seconds for 100 recipes
- Transaction handling: All-or-nothing guarantee
- Maximum restore dataset: 10,000 items

### PR-3: API Performance
- OAuth token refresh: < 2 seconds
- List backups: < 1 second
- Delete backup: < 3 seconds

---

## Security Considerations

### Threat Model

**Threats**:
1. Token theft from database
2. Man-in-the-middle during OAuth
3. CSRF attacks on OAuth flow
4. Unauthorized access to backups
5. Backup file tampering

**Mitigations**:
1. Encrypt tokens at rest
2. HTTPS only, state parameter
3. CSRF tokens, state validation
4. Authentication required, provider-managed access
5. Checksum validation (future enhancement)

### Data Privacy

- User data never leaves encrypted channels
- Tokens encrypted in database
- Cloud providers manage file access
- User can revoke access anytime
- Backups deleted on account deletion

---

## Rollout Strategy

### Phase 1: Dropbox Only (Week 1-2)
- Implement OAuth flow
- Implement manual backup
- Implement restore
- Basic UI
- Testing

### Phase 2: Automatic Backups (Week 2-3)
- Schedule configuration
- Background job scheduler
- Retention policy
- Email notifications

### Phase 3: Google Drive (Week 3-4)
- Google OAuth flow
- Google Drive upload/download
- Provider switching
- Additional testing

### Phase 4: Polish & Production (Week 4)
- UI refinement
- Error handling improvements
- Performance optimization
- Documentation
- Production deployment

---

## Success Metrics

### Adoption Metrics
- **Target**: 40% of users connect cloud backup within 1 month
- **Target**: 60% enable automatic backups
- **Target**: Average 2-3 backups per user per month

### Performance Metrics
- **Target**: < 5% backup failure rate
- **Target**: < 3% restore failure rate
- **Target**: 95% of backups complete within 30 seconds

### User Satisfaction
- **Target**: < 1% support tickets related to cloud backup
- **Target**: Positive feedback on feature usefulness
- **Target**: No security incidents

---

## Future Enhancements (Post-V2.2)

### V2.3+
- AWS S3 integration
- Microsoft OneDrive integration
- iCloud Drive integration
- Backup encryption (user-provided key)
- Backup versioning (track changes over time)
- Incremental backups (only changes)
- Backup scheduling by time zone
- Multi-destination backups (redundancy)
- Backup integrity verification (checksums)
- Email digest of backup activity

---

## Open Questions

1. **Q**: Should we support multiple cloud providers simultaneously?
   **A**: No, one provider at a time (V2.2). Multi-provider in V2.3+.

2. **Q**: What happens to backups when user disconnects provider?
   **A**: Backups remain in cloud (user's account). Local backup history cleared.

3. **Q**: Should we allow manual download of cloud backups?
   **A**: Yes, add "Download" button next to "Restore" button.

4. **Q**: Maximum number of backups to retain?
   **A**: Default 10, configurable (5, 10, 20, 50, unlimited).

5. **Q**: Handle version incompatibility in backups?
   **A**: Version field in backup JSON. Warn if restoring from future version.

---

## Related Requirements

- **REQ-013**: Export & Backup System (V2.0)
- **REQ-016**: Import from Backup (V2.1.2)
- **REQ-014**: Password Reset (V2.1.0)
- **REQ-015**: Account Management (V2.1.1)

---

## Approvals

- [ ] Product Owner
- [ ] Technical Lead  
- [ ] UX Designer
- [ ] Security Review
- [ ] Ready for Development

---

**Document Version**: 1.0  
**Author**: Development Team  
**Reviewers**: TBD  
**Next Review**: After Phase 1 Implementation