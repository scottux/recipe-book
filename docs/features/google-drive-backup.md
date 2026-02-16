# Google Drive Cloud Backup Integration

**Version**: V2.2.0  
**Status**: ✅ Implemented (Week 5)  
**Related Requirements**: REQ-022

---

## Overview

Google Drive integration provides users with an alternative cloud storage option alongside Dropbox for automated recipe backups. This feature uses OAuth 2.0 for secure authentication and leverages the Google Drive API v3 for file operations.

---

## Features

### Authentication
- **OAuth 2.0 Flow**: Secure authorization using Google's OAuth system
- **Offline Access**: Refresh tokens enable automatic backups without user re-authentication
- **Account Details**: Displays connected Google account email and name

### Backup Operations
- **Manual Backups**: On-demand backup creation and upload
- **Scheduled Backups**: Automatic backups (daily, weekly, monthly)
- **Backup Listing**: View all backups stored in Google Drive
- **Backup Deletion**: Remove old backups to manage storage
- **Backup Preview**: View backup contents before restoring
- **Backup Restore**: Restore recipes from any backup (merge or replace mode)

### Retention Management
- **Auto-Cleanup**: Automatically delete old backups beyond retention limit
- **Configurable Limit**: Set maximum number of backups to keep (default: 10)

---

## Technical Implementation

### Architecture

```
Frontend (React)
    ↓
API Route (/api/cloud/google/*)
    ↓
CloudBackupController
    ↓
GoogleDriveService
    ↓
Google Drive API v3
```

### Key Components

#### 1. GoogleDriveService (`backend/src/services/cloudProviders/googleDrive.js`)

**Core Responsibilities**:
- OAuth URL generation and token management
- File upload/download operations
- Backup listing and deletion
- Token refresh and re-authentication

**Key Methods**:
- `generateAuthUrl(state)` - Creates OAuth authorization URL
- `getTokensFromCode(code)` - Exchanges authorization code for tokens
- `uploadBackup(user, filePath)` - Uploads backup file to Google Drive
- `listBackups(user, limit)` - Lists backups in chronological order
- `downloadBackup(user, fileId)` - Downloads backup to temp location
- `deleteBackup(user, fileId)` - Deletes specific backup file
- `refreshAccessToken(user)` - Refreshes expired access token

**Token Management**:
```javascript
// Automatic token refresh
if (tokenExpired) {
  await refreshAccessToken(user);
  // Retry operation with new token
}
```

#### 2. Cloud Backup Controller

**New Endpoints**:
- `GET /api/cloud/google/auth` - Initiate OAuth flow
- `GET /api/cloud/google/callback` - Handle OAuth callback

**Enhanced Operations** (support both Dropbox and Google Drive):
- Manual backup creation
- Backup listing
- Backup deletion
- Backup preview
- Backup restoration

#### 3. Backup Scheduler

**Enhanced Features**:
- Supports automatic backups for both providers
- Provider-specific upload logic
- Provider-specific cleanup operations

---

## OAuth Flow

### Step-by-Step Process

1. **User Clicks "Connect Google Drive"**
   ```
   Frontend → POST /api/cloud/google/auth
   ```

2. **Backend Generates OAuth URL**
   ```javascript
   // State token for CSRF protection
   const state = crypto.randomBytes(16).toString('hex');
   
   // OAuth URL with required scopes
   const authUrl = oauth2Client.generateAuthUrl({
     access_type: 'offline',
     scope: ['https://www.googleapis.com/auth/drive.file'],
     state: state
   });
   ```

3. **User Authorizes in Google**
   - Redirected to Google OAuth consent screen
   - Grants permissions to the app

4. **Google Redirects to Callback**
   ```
   GET /api/cloud/google/callback?code=xxx&state=yyy
   ```

5. **Backend Exchanges Code for Tokens**
   ```javascript
   const { tokens } = await oauth2Client.getToken(code);
   // tokens.access_token
   // tokens.refresh_token
   // tokens.expiry_date
   ```

6. **Backend Stores Encrypted Tokens**
   ```javascript
   user.cloudBackup = {
     provider: 'google_drive',
     accessToken: encryptToken(tokens.access_token),
     refreshToken: encryptToken(tokens.refresh_token),
     tokenExpiry: new Date(tokens.expiry_date),
     // ... other fields
   };
   ```

7. **User Redirected to Success Page**
   ```
   Redirect → /account/cloud-backup?success=true&provider=google_drive
   ```

---

## File Operations

### Upload Backup

```javascript
// 1. Create file metadata
const fileMetadata = {
  name: `recipe-backup-${timestamp}.json`,
  parents: ['root'] // Store in root directory
};

// 2. Upload file
const response = await drive.files.create({
  requestBody: fileMetadata,
  media: {
    mimeType: 'application/json',
    body: fs.createReadStream(filePath)
  },
  fields: 'id, name, size, createdTime'
});
```

### List Backups

```javascript
// Query: All JSON files owned by user, sorted by creation date
const response = await drive.files.list({
  q: "mimeType='application/json' and trashed=false",
  fields: 'files(id, name, size, createdTime)',
  orderBy: 'createdTime desc',
  pageSize: limit
});
```

### Download Backup

```javascript
// 1. Get file content
const response = await drive.files.get({
  fileId: fileId,
  alt: 'media'
}, { responseType: 'stream' });

// 2. Write to temp file
const tempPath = `/tmp/backup-${Date.now()}.json`;
const dest = fs.createWriteStream(tempPath);
response.data.pipe(dest);
```

### Delete Backup

```javascript
// Permanently delete file
await drive.files.delete({
  fileId: fileId
});
```

---

## Token Management

### Access Token Lifecycle

```
┌─────────────────────────────────────┐
│ Access Token Valid (1 hour)         │
├─────────────────────────────────────┤
│ ✓ Use for API calls                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Access Token Expired                │
├─────────────────────────────────────┤
│ 1. Use refresh token                │
│ 2. Get new access token             │
│ 3. Save new token & expiry          │
│ 4. Retry original request           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Refresh Token Invalid               │
├─────────────────────────────────────┤
│ → User must re-authorize            │
└─────────────────────────────────────┘
```

### Automatic Token Refresh

```javascript
// Before each operation
if (new Date() >= new Date(user.cloudBackup.tokenExpiry)) {
  // Token expired - refresh it
  await refreshAccessToken(user);
}

// Refresh implementation
async function refreshAccessToken(user) {
  const refreshToken = decryptToken(user.cloudBackup.refreshToken);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  // Update user record
  user.cloudBackup.accessToken = encryptToken(credentials.access_token);
  user.cloudBackup.tokenExpiry = new Date(credentials.expiry_date);
  await user.save();
}
```

---

## Security Features

### 1. Token Encryption
- All access and refresh tokens encrypted at rest
- Uses AES-256-CBC algorithm
- Encryption key stored in environment variable

### 2. CSRF Protection
- State token generated for each OAuth flow
- Stored in Redis with 10-minute expiry
- Validated on callback

### 3. Scope Limitation
- Requests minimal permissions: `drive.file`
- Can only access files created by the app
- Cannot see other user files

### 4. Secure Token Storage
- Tokens excluded from API responses (`select: false`)
- Only retrieved when needed for operations
- Never logged or exposed

---

## Configuration

### Required Environment Variables

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/cloud/google/callback

# Token Encryption
CLOUD_TOKEN_ENCRYPTION_KEY=<64-character-hex-string>
```

### Google Cloud Console Setup

1. **Create Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project: "Recipe Book App"

2. **Enable Google Drive API**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

3. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Add authorized redirect URI:
     - Development: `http://localhost:5000/api/cloud/google/callback`
     - Production: `https://your-domain.com/api/cloud/google/callback`

4. **Configure OAuth Consent Screen**
   - User type: "External" (for public apps)
   - App name: "Recipe Book"
   - Scopes: Add `../auth/drive.file`
   - Test users: Add your email for testing

5. **Copy Credentials**
   - Copy Client ID and Client Secret
   - Add to `.env` file

---

## API Endpoints

### Authentication

#### Initiate OAuth Flow
```
GET /api/cloud/google/auth
Authorization: Bearer <jwt-token>

Response: {
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "abc123..."
}
```

#### OAuth Callback
```
GET /api/cloud/google/callback?code=xxx&state=yyy

Response: Redirect to frontend with success/error
```

### Status & Management

#### Get Connection Status
```
GET /api/cloud/status
Authorization: Bearer <jwt-token>

Response: {
  "success": true,
  "connected": true,
  "provider": "google_drive",
  "accountEmail": "user@gmail.com",
  "accountName": "John Doe",
  "schedule": { ... },
  "stats": { ... }
}
```

#### Disconnect Provider
```
POST /api/cloud/disconnect
Authorization: Bearer <jwt-token>

Response: {
  "success": true,
  "message": "google_drive disconnected successfully"
}
```

### Backup Operations

All backup operations (manual backup, list, delete, preview, restore) work identically for both Dropbox and Google Drive. The backend automatically routes to the correct provider based on `user.cloudBackup.provider`.

---

## Error Handling

### Common Error Scenarios

1. **Token Expired**
   ```javascript
   // Automatically refreshed - transparent to user
   if (error.code === 401) {
     await refreshAccessToken(user);
     // Retry operation
   }
   ```

2. **Refresh Token Invalid**
   ```javascript
   // User must re-authorize
   throw new Error('Authorization expired. Please reconnect Google Drive.');
   ```

3. **API Rate Limits**
   ```javascript
   // Retry with exponential backoff
   if (error.code === 429) {
     await delay(retryAfter);
     return retry();
   }
   ```

4. **Network Errors**
   ```javascript
   // Mark backup as failed, schedule retry
   user.cloudBackup.schedule.lastBackupStatus = 'failed';
   user.cloudBackup.schedule.nextBackup = new Date(now + 1 hour);
   ```

---

## Testing

### Manual Testing Checklist

- [ ] OAuth flow completes successfully
- [ ] Account info displays correctly
- [ ] Manual backup uploads to Google Drive
- [ ] Backup appears in Google Drive web interface
- [ ] List backups shows uploaded files
- [ ] Backup preview displays correct statistics
- [ ] Backup restoration works (merge mode)
- [ ] Backup restoration works (replace mode)
- [ ] Backup deletion removes file
- [ ] Schedule configuration saves correctly
- [ ] Automatic backups execute on schedule
- [ ] Token refresh works automatically
- [ ] Disconnect removes credentials
- [ ] Re-authorization works after disconnect

### Integration Tests

```javascript
// Test OAuth flow
describe('Google Drive OAuth', () => {
  it('should generate auth URL with state', async () => {
    const res = await request(app)
      .get('/api/cloud/google/auth')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.body.authUrl).toContain('accounts.google.com');
    expect(res.body.state).toBeDefined();
  });
});

// Test backup operations
describe('Google Drive Backups', () => {
  it('should upload backup to Google Drive', async () => {
    const res = await request(app)
      .post('/api/cloud/backup')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.body.success).toBe(true);
    expect(res.body.backup.filename).toMatch(/recipe-backup-.+\.json/);
  });
});
```

---

## Comparison: Dropbox vs Google Drive

| Feature | Dropbox | Google Drive |
|---------|---------|--------------|
| **Free Storage** | 2 GB | 15 GB (shared) |
| **OAuth Flow** | Standard | Standard |
| **Token Refresh** | Yes | Yes |
| **API Complexity** | Simple | Moderate |
| **File Permissions** | Folder-based | File-based |
| **Rate Limits** | Generous | Moderate |
| **Backup Location** | `/Apps/Recipe Book/` | Root directory |

---

## Troubleshooting

### "Authorization expired" Error
**Cause**: Refresh token invalid or revoked  
**Solution**: Disconnect and reconnect Google Drive

### "Invalid callback" Error
**Cause**: Redirect URI mismatch  
**Solution**: Ensure `GOOGLE_REDIRECT_URI` matches Google Cloud Console

### "Insufficient permissions" Error
**Cause**: Missing `drive.file` scope  
**Solution**: Recreate OAuth consent with correct scope

### Backups Not Appearing
**Cause**: Wrong Google account connected  
**Solution**: Disconnect and reconnect with correct account

---

## Future Enhancements

### V2.2.1+ Potential Features
- [ ] Backup to custom folder (not root)
- [ ] Shared folder support
- [ ] Multiple Google accounts per user
- [ ] Backup encryption at rest
- [ ] Progressive upload for large files
- [ ] Upload progress tracking
- [ ] Automatic backup verification

---

## Resources

- [Google Drive API v3 Documentation](https://developers.google.com/drive/api/v3/reference)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Last Updated**: February 16, 2026  
**Author**: Development Team  
**Version**: V2.2.0