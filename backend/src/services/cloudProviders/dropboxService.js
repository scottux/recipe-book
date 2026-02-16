/**
 * Dropbox Cloud Provider Service
 * 
 * Handles OAuth authentication, file uploads, downloads, and management
 * for Dropbox cloud storage integration.
 */

import { Dropbox } from 'dropbox';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import logger from '../../config/logger.js';
import { encryptToken, decryptToken } from '../../utils/encryption.js';

class DropboxService {
  /**
   * Build OAuth authorization URL
   * 
   * @param {string} state - CSRF state token
   * @returns {string} Authorization URL
   */
  getAuthUrl(state) {
    const clientId = process.env.DROPBOX_CLIENT_ID;
    const redirectUri = process.env.DROPBOX_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      throw new Error('Dropbox credentials not configured');
    }
    
    const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${encodeURIComponent(state)}&` +
      `token_access_type=offline`;  // Request refresh token
    
    return authUrl;
  }
  
  /**
   * Exchange authorization code for access/refresh tokens
   * 
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Object} Token response with access_token, refresh_token, expires_in
   */
  async exchangeCodeForTokens(code) {
    try {
      const clientId = process.env.DROPBOX_CLIENT_ID;
      const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
      const redirectUri = process.env.DROPBOX_REDIRECT_URI;
      
      const response = await axios.post(
        'https://api.dropboxapi.com/oauth2/token',
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };
      
    } catch (error) {
      logger.error('Dropbox token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }
  
  /**
   * Refresh access token using refresh token
   * 
   * @param {string} refreshToken - Encrypted refresh token
   * @returns {Object} New access token and expiry
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decryptedRefreshToken = decryptToken(refreshToken);
      const clientId = process.env.DROPBOX_CLIENT_ID;
      const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
      
      const response = await axios.post(
        'https://api.dropboxapi.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: decryptedRefreshToken,
          client_id: clientId,
          client_secret: clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
      
    } catch (error) {
      logger.error('Dropbox token refresh failed:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }
  
  /**
   * Get Dropbox account information
   * 
   * @param {string} accessToken - Access token
   * @returns {Object} Account info (email, name, account_id)
   */
  async getAccountInfo(accessToken) {
    try {
      const dbx = new Dropbox({ accessToken });
      const response = await dbx.usersGetCurrentAccount();
      
      return {
        email: response.result.email,
        name: response.result.name.display_name,
        accountId: response.result.account_id
      };
      
    } catch (error) {
      logger.error('Failed to get Dropbox account info:', error);
      throw new Error('Failed to retrieve account information');
    }
  }
  
  /**
   * Ensure access token is valid, refresh if needed
   * 
   * @param {Object} user - User document with cloudBackup config
   * @returns {string} Valid access token
   */
  async ensureValidToken(user) {
    // Check if token is expired
    if (user.cloudBackup.tokenExpiry && user.cloudBackup.tokenExpiry > new Date()) {
      return decryptToken(user.cloudBackup.accessToken);
    }
    
    // Refresh token
    logger.info(`Refreshing Dropbox token for user ${user._id}`);
    const { accessToken, expiresIn } = await this.refreshAccessToken(
      user.cloudBackup.refreshToken
    );
    
    // Update user record
    user.cloudBackup.accessToken = encryptToken(accessToken);
    user.cloudBackup.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    await user.save();
    
    return accessToken;
  }
  
  /**
   * Upload backup file to Dropbox
   * 
   * @param {Object} user - User document
   * @param {string} localFilePath - Path to local backup file
   * @param {string} type - Backup type ('manual' or 'automatic')
   * @returns {Object} Upload result with id, name, size, path
   */
  async uploadBackup(user, localFilePath, type = 'manual') {
    try {
      const accessToken = await this.ensureValidToken(user);
      const dbx = new Dropbox({ accessToken });
      
      // Read file
      const fileContent = fs.readFileSync(localFilePath);
      const stats = fs.statSync(localFilePath);
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const typePrefix = type === 'automatic' ? 'auto' : 'manual';
      const filename = `recipe-book-${typePrefix}-backup-${timestamp}.zip`;
      const dropboxPath = `/Apps/Recipe Book/${filename}`;
      
      // Upload file
      logger.info(`Uploading backup to Dropbox: ${filename} (${stats.size} bytes)`);
      
      const response = await dbx.filesUpload({
        path: dropboxPath,
        contents: fileContent,
        mode: 'add',
        autorename: true
      });
      
      logger.info(`Backup uploaded successfully: ${response.result.name}`);
      
      return {
        id: response.result.id,
        name: response.result.name,
        size: response.result.size,
        path: response.result.path_display
      };
      
    } catch (error) {
      logger.error('Dropbox upload failed:', error);
      throw new Error(`Backup upload failed: ${error.message}`);
    }
  }
  
  /**
   * List available backups from Dropbox
   * 
   * @param {Object} user - User document
   * @param {number} limit - Maximum number of backups to return
   * @returns {Array} List of backup objects
   */
  async listBackups(user, limit = 10) {
    try {
      const accessToken = await this.ensureValidToken(user);
      const dbx = new Dropbox({ accessToken });
      
      // List files in Recipe Book folder
      const response = await dbx.filesListFolder({
        path: '/Apps/Recipe Book',
        limit: Math.min(limit, 100)
      });
      
      // Filter and format backups
      const backups = response.result.entries
        .filter(entry => 
          entry['.tag'] === 'file' && 
          entry.name.endsWith('.zip') &&
          entry.name.startsWith('recipe-book-')
        )
        .sort((a, b) => new Date(b.client_modified) - new Date(a.client_modified))
        .slice(0, limit)
        .map(entry => ({
          id: entry.id,
          filename: entry.name,
          size: entry.size,
          timestamp: entry.client_modified,
          type: entry.name.includes('-auto-') ? 'automatic' : 'manual'
        }));
      
      return backups;
      
    } catch (error) {
      // If folder doesn't exist, return empty array
      if (error.status === 409) {
        logger.info('Dropbox backup folder does not exist yet');
        return [];
      }
      
      logger.error('Failed to list Dropbox backups:', error);
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }
  
  /**
   * Download backup from Dropbox
   * 
   * @param {Object} user - User document
   * @param {string} fileId - Dropbox file ID or path
   * @returns {string} Path to downloaded temp file
   */
  async downloadBackup(user, fileId) {
    try {
      const accessToken = await this.ensureValidToken(user);
      const dbx = new Dropbox({ accessToken });
      
      // Download file
      logger.info(`Downloading backup from Dropbox: ${fileId}`);
      const response = await dbx.filesDownload({ path: fileId });
      
      // Save to temp file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempPath = path.join(tempDir, `download-${Date.now()}.zip`);
      const fileBuffer = response.result.fileBinary;
      
      fs.writeFileSync(tempPath, fileBuffer);
      
      logger.info(`Backup downloaded to: ${tempPath} (${response.result.size} bytes)`);
      
      return tempPath;
      
    } catch (error) {
      logger.error('Dropbox download failed:', error);
      throw new Error(`Backup download failed: ${error.message}`);
    }
  }
  
  /**
   * Delete backup from Dropbox
   * 
   * @param {Object} user - User document
   * @param {string} fileId - Dropbox file ID or path
   */
  async deleteBackup(user, fileId) {
    try {
      const accessToken = await this.ensureValidToken(user);
      const dbx = new Dropbox({ accessToken });
      
      logger.info(`Deleting backup from Dropbox: ${fileId}`);
      await dbx.filesDeleteV2({ path: fileId });
      
      logger.info('Backup deleted successfully');
      
    } catch (error) {
      logger.error('Dropbox delete failed:', error);
      throw new Error(`Backup deletion failed: ${error.message}`);
    }
  }
  
  /**
   * Get storage usage information
   * 
   * @param {Object} user - User document
   * @returns {Object} Storage info (used, allocated)
   */
  async getStorageInfo(user) {
    try {
      const accessToken = await this.ensureValidToken(user);
      const dbx = new Dropbox({ accessToken });
      
      const response = await dbx.usersGetSpaceUsage();
      
      return {
        used: response.result.used,
        allocated: response.result.allocation.allocated
      };
      
    } catch (error) {
      logger.error('Failed to get Dropbox storage info:', error);
      return { used: 0, allocated: 0 };
    }
  }
}

export default new DropboxService();