/**
 * Google Drive Cloud Backup Service
 * Handles file upload, download, listing, and deletion for Google Drive backups
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { encryptToken, decryptToken } from '../../utils/encryption.js';
import logger from '../../config/logger.js';

class GoogleDriveService {
  /**
   * Get OAuth2 client instance
   */
  getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI
    );
  }

  /**
   * Ensure valid access token (refresh if expired)
   * @param {Object} user - User document with cloud backup config
   * @returns {Promise<string>} Valid access token
   */
  async ensureValidToken(user) {
    // Check if token is still valid (with 5-minute buffer)
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = new Date();
    const tokenExpiry = new Date(user.cloudBackup.tokenExpiry);

    if (tokenExpiry > new Date(now.getTime() + expiryBuffer)) {
      // Token is still valid
      return decryptToken(user.cloudBackup.accessToken);
    }

    // Token expired or expiring soon - refresh it
    logger.info(`Refreshing Google Drive token for user ${user._id}`);

    try {
      const oauth2Client = this.getOAuth2Client();
      const refreshToken = decryptToken(user.cloudBackup.refreshToken);

      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      // Refresh the access token
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update user document with new token
      user.cloudBackup.accessToken = encryptToken(credentials.access_token);
      user.cloudBackup.tokenExpiry = new Date(credentials.expiry_date);
      await user.save();

      logger.info(`Token refreshed successfully for user ${user._id}`);

      return credentials.access_token;
    } catch (error) {
      logger.error(`Token refresh failed for user ${user._id}:`, error);
      throw new Error('Failed to refresh Google Drive token. Please reconnect your account.');
    }
  }

  /**
   * Get authenticated Google Drive client
   * @param {Object} user - User document
   * @returns {Promise<Object>} Google Drive API client
   */
  async getDriveClient(user) {
    const oauth2Client = this.getOAuth2Client();
    const accessToken = await this.ensureValidToken(user);

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: decryptToken(user.cloudBackup.refreshToken)
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Get or create "Recipe Book Backups" folder in Google Drive
   * @param {Object} drive - Google Drive API client
   * @returns {Promise<string>} Folder ID
   */
  async getBackupFolderId(drive) {
    try {
      // Check if folder exists
      const response = await drive.files.list({
        q: "name='Recipe Book Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Create folder if it doesn't exist
      logger.info('Creating "Recipe Book Backups" folder in Google Drive');

      const folderMetadata = {
        name: 'Recipe Book Backups',
        mimeType: 'application/vnd.google-apps.folder'
      };

      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id'
      });

      return folder.data.id;
    } catch (error) {
      logger.error('Failed to get/create backup folder:', error);
      throw new Error('Failed to access Google Drive backup folder');
    }
  }

  /**
   * Upload backup file to Google Drive
   * @param {Object} user - User document
   * @param {string} localFilePath - Path to local backup file
   * @returns {Promise<Object>} Upload result with file metadata
   */
  async uploadBackup(user, localFilePath) {
    try {
      const drive = await this.getDriveClient(user);
      const folderId = await this.getBackupFolderId(drive);

      const fileMetadata = {
        name: path.basename(localFilePath),
        parents: [folderId]
      };

      const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream(localFilePath)
      };

      logger.info(`Uploading backup to Google Drive for user ${user._id}: ${path.basename(localFilePath)}`);

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, size, createdTime'
      });

      logger.info(`Backup uploaded successfully: ${response.data.id}`);

      return {
        id: response.data.id,
        name: response.data.name,
        size: parseInt(response.data.size),
        timestamp: response.data.createdTime
      };
    } catch (error) {
      logger.error('Google Drive upload failed:', error);

      // Handle specific error cases
      if (error.code === 403) {
        throw new Error('Google Drive storage quota exceeded. Please free up space.');
      }

      if (error.code === 401) {
        throw new Error('Google Drive authentication failed. Please reconnect your account.');
      }

      throw new Error('Failed to upload backup to Google Drive');
    }
  }

  /**
   * List backup files from Google Drive
   * @param {Object} user - User document
   * @param {number} limit - Maximum number of backups to return
   * @returns {Promise<Array>} Array of backup metadata objects
   */
  async listBackups(user, limit = 10) {
    try {
      const drive = await this.getDriveClient(user);
      const folderId = await this.getBackupFolderId(drive);

      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false and mimeType='application/zip'`,
        orderBy: 'createdTime desc',
        pageSize: limit,
        fields: 'files(id, name, size, createdTime)'
      });

      const backups = (response.data.files || []).map(file => ({
        id: file.id,
        filename: file.name,
        size: parseInt(file.size),
        timestamp: file.createdTime,
        type: file.name.includes('auto') ? 'automatic' : 'manual'
      }));

      logger.info(`Listed ${backups.length} backups from Google Drive for user ${user._id}`);

      return backups;
    } catch (error) {
      logger.error('Failed to list Google Drive backups:', error);

      if (error.code === 401) {
        throw new Error('Google Drive authentication failed. Please reconnect your account.');
      }

      throw new Error('Failed to list backups from Google Drive');
    }
  }

  /**
   * Download backup file from Google Drive
   * @param {Object} user - User document
   * @param {string} fileId - Google Drive file ID
   * @returns {Promise<string>} Path to downloaded file
   */
  async downloadBackup(user, fileId) {
    try {
      const drive = await this.getDriveClient(user);

      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, '../../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempPath = path.join(tempDir, `download-${Date.now()}.zip`);

      logger.info(`Downloading backup from Google Drive: ${fileId}`);

      // Create write stream
      const dest = fs.createWriteStream(tempPath);

      // Download file
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return new Promise((resolve, reject) => {
        response.data
          .on('end', () => {
            logger.info(`Backup downloaded successfully: ${tempPath}`);
            resolve(tempPath);
          })
          .on('error', err => {
            logger.error('Download stream error:', err);
            // Clean up partial file
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
            reject(new Error('Failed to download backup from Google Drive'));
          })
          .pipe(dest);
      });
    } catch (error) {
      logger.error('Google Drive download failed:', error);

      if (error.code === 404) {
        throw new Error('Backup file not found in Google Drive');
      }

      if (error.code === 401) {
        throw new Error('Google Drive authentication failed. Please reconnect your account.');
      }

      throw new Error('Failed to download backup from Google Drive');
    }
  }

  /**
   * Delete backup file from Google Drive
   * @param {Object} user - User document
   * @param {string} fileId - Google Drive file ID
   * @returns {Promise<void>}
   */
  async deleteBackup(user, fileId) {
    try {
      const drive = await this.getDriveClient(user);

      logger.info(`Deleting backup from Google Drive: ${fileId}`);

      await drive.files.delete({ fileId });

      logger.info(`Backup deleted successfully: ${fileId}`);
    } catch (error) {
      logger.error('Google Drive delete failed:', error);

      if (error.code === 404) {
        // File already deleted - not an error
        logger.warn(`Backup file not found (may have been already deleted): ${fileId}`);
        return;
      }

      if (error.code === 401) {
        throw new Error('Google Drive authentication failed. Please reconnect your account.');
      }

      throw new Error('Failed to delete backup from Google Drive');
    }
  }

  /**
   * Get Google account information
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo(accessToken) {
    try {
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({ access_token: accessToken });

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const response = await oauth2.userinfo.get();

      return {
        email: response.data.email,
        name: response.data.name,
        id: response.data.id
      };
    } catch (error) {
      logger.error('Failed to get Google account info:', error);
      throw new Error('Failed to retrieve Google account information');
    }
  }

  /**
   * Generate OAuth authorization URL
   * @param {string} state - CSRF state token
   * @returns {string} Authorization URL
   */
  generateAuthUrl(state) {
    const oauth2Client = this.getOAuth2Client();

    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: ['https://www.googleapis.com/auth/drive.file'], // Minimal scope
      state: state,
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} Token data
   */
  async getTokensFromCode(code) {
    try {
      const oauth2Client = this.getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      };
    } catch (error) {
      logger.error('Failed to exchange code for tokens:', error);
      throw new Error('Failed to complete Google Drive authorization');
    }
  }
}

export default new GoogleDriveService();
