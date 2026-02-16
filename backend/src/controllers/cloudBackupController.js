/**
 * Cloud Backup Controller
 * 
 * Handles OAuth flows, backup operations, and cloud provider management
 * for Dropbox and Google Drive integrations.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import User from '../models/User.js';
import dropboxService from '../services/cloudProviders/dropboxService.js';
import googleDriveService from '../services/cloudProviders/googleDrive.js';
import logger from '../config/logger.js';
import { encryptToken } from '../utils/encryption.js';
import { getRedisClient } from '../config/redis.js';
import { generateBackupFile, cleanupBackupFile } from '../services/backupGenerator.js';
import { parseBackup, getBackupPreview } from '../services/backupParser.js';
import { restoreFromBackup } from '../services/backupRestorer.js';

const redisClient = getRedisClient();

/**
 * Initiate Dropbox OAuth flow
 * POST /api/cloud/dropbox/auth
 */
export const initiateDropboxAuth = async (req, res) => {
  try {
    // Generate CSRF state token
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state in Redis with user ID (10 minute expiry)
    if (redisClient && redisClient.isOpen) {
      await redisClient.setEx(`oauth:state:${state}`, 600, req.user._id.toString());
    } else {
      // Fallback: store in memory (development only)
      global.oauthStates = global.oauthStates || new Map();
      global.oauthStates.set(state, {
        userId: req.user._id.toString(),
        expires: Date.now() + 600000
      });
    }
    
    // Build Dropbox OAuth URL
    const authUrl = dropboxService.getAuthUrl(state);
    
    logger.info(`Dropbox OAuth initiated for user ${req.user._id}`);
    
    res.json({
      success: true,
      authUrl,
      state
    });
    
  } catch (error) {
    logger.error('Failed to initiate Dropbox OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate authorization. Please try again.'
    });
  }
};

/**
 * Handle Dropbox OAuth callback
 * GET /api/cloud/dropbox/callback
 */
export const handleDropboxCallback = async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    // Check for OAuth errors
    if (oauthError) {
      logger.warn(`Dropbox OAuth error: ${oauthError}`);
      return res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=oauth_denied`);
    }
    
    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=missing_params`);
    }
    
    // Validate state token
    let userId;
    if (redisClient && redisClient.isOpen) {
      userId = await redisClient.get(`oauth:state:${state}`);
      if (userId) {
        await redisClient.del(`oauth:state:${state}`); // Use once
      }
    } else {
      // Fallback: memory
      const stateData = global.oauthStates?.get(state);
      if (stateData && stateData.expires > Date.now()) {
        userId = stateData.userId;
        global.oauthStates.delete(state);
      }
    }
    
    if (!userId) {
      logger.warn('Invalid or expired OAuth state token');
      return res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=invalid_state`);
    }
    
    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn } = await dropboxService.exchangeCodeForTokens(code);
    
    // Get account info
    const accountInfo = await dropboxService.getAccountInfo(accessToken);
    
    // Update user record
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=user_not_found`);
    }
    
    user.cloudBackup = {
      provider: 'dropbox',
      accessToken: encryptToken(accessToken),
      refreshToken: encryptToken(refreshToken),
      tokenExpiry: new Date(Date.now() + expiresIn * 1000),
      accountEmail: accountInfo.email,
      accountName: accountInfo.name,
      accountId: accountInfo.accountId,
      schedule: {
        enabled: false,
        frequency: 'weekly',
        time: '02:00',
        timezone: 'UTC'
      },
      retention: {
        maxBackups: 10,
        autoCleanup: true
      },
      stats: {
        totalBackups: 0,
        manualBackups: 0,
        autoBackups: 0
      }
    };
    
    await user.save();
    
    logger.info(`Dropbox connected successfully for user ${userId}`);
    
    // Redirect to success page
    res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?success=true&provider=dropbox`);
    
  } catch (error) {
    logger.error('Dropbox OAuth callback failed:', error);
    res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=oauth_failed`);
  }
};

/**
 * Initiate Google Drive OAuth flow
 * POST /api/cloud/google/auth
 */
export const initiateGoogleAuth = async (req, res) => {
  try {
    // Generate CSRF state token
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state in Redis with user ID (10 minute expiry)
    if (redisClient && redisClient.isOpen) {
      await redisClient.setEx(`oauth:state:${state}`, 600, req.user._id.toString());
    } else {
      // Fallback: store in memory (development only)
      global.oauthStates = global.oauthStates || new Map();
      global.oauthStates.set(state, {
        userId: req.user._id.toString(),
        expires: Date.now() + 600000
      });
    }
    
    // Build Google OAuth URL
    const authUrl = googleDriveService.generateAuthUrl(state);
    
    logger.info(`Google Drive OAuth initiated for user ${req.user._id}`);
    
    res.json({
      success: true,
      authUrl,
      state
    });
    
  } catch (error) {
    logger.error('Failed to initiate Google Drive OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate authorization. Please try again.'
    });
  }
};

/**
 * Handle Google Drive OAuth callback
 * GET /api/cloud/google/callback
 */
export const handleGoogleCallback = async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    // Check for OAuth errors
    if (oauthError) {
      logger.warn(`Google Drive OAuth error: ${oauthError}`);
      return res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=oauth_denied`);
    }
    
    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=missing_params`);
    }
    
    // Validate state token
    let userId;
    if (redisClient && redisClient.isOpen) {
      userId = await redisClient.get(`oauth:state:${state}`);
      if (userId) {
        await redisClient.del(`oauth:state:${state}`); // Use once
      }
    } else {
      // Fallback: memory
      const stateData = global.oauthStates?.get(state);
      if (stateData && stateData.expires > Date.now()) {
        userId = stateData.userId;
        global.oauthStates.delete(state);
      }
    }
    
    if (!userId) {
      logger.warn('Invalid or expired OAuth state token');
      return res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=invalid_state`);
    }
    
    // Exchange code for tokens
    const tokens = await googleDriveService.getTokensFromCode(code);
    
    // Get account info
    const accountInfo = await googleDriveService.getAccountInfo(tokens.access_token);
    
    // Update user record
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=user_not_found`);
    }
    
    user.cloudBackup = {
      provider: 'google_drive',
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiry: new Date(tokens.expiry_date),
      accountEmail: accountInfo.email,
      accountName: accountInfo.name,
      accountId: accountInfo.id,
      schedule: {
        enabled: false,
        frequency: 'weekly',
        time: '02:00',
        timezone: 'UTC'
      },
      retention: {
        maxBackups: 10,
        autoCleanup: true
      },
      stats: {
        totalBackups: 0,
        manualBackups: 0,
        autoBackups: 0
      }
    };
    
    await user.save();
    
    logger.info(`Google Drive connected successfully for user ${userId}`);
    
    // Redirect to success page
    res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?success=true&provider=google_drive`);
    
  } catch (error) {
    logger.error('Google Drive OAuth callback failed:', error);
    res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=oauth_failed`);
  }
};

/**
 * Get cloud backup status
 * GET /api/cloud/status
 */
export const getCloudStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.cloudBackup || !user.cloudBackup.provider) {
      return res.json({
        success: true,
        connected: false,
        provider: null
      });
    }
    
    res.json({
      success: true,
      connected: true,
      provider: user.cloudBackup.provider,
      accountEmail: user.cloudBackup.accountEmail,
      accountName: user.cloudBackup.accountName,
      schedule: user.cloudBackup.schedule,
      retention: user.cloudBackup.retention,
      stats: user.cloudBackup.stats
    });
    
  } catch (error) {
    logger.error('Failed to get cloud status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cloud backup status'
    });
  }
};

/**
 * Disconnect cloud provider
 * POST /api/cloud/disconnect
 */
export const disconnectProvider = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.cloudBackup || !user.cloudBackup.provider) {
      return res.status(400).json({
        success: false,
        message: 'No cloud provider connected'
      });
    }
    
    const provider = user.cloudBackup.provider;
    
    // Clear cloud backup configuration
    user.cloudBackup = {
      provider: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      accountEmail: null,
      accountName: null,
      accountId: null,
      schedule: {
        enabled: false,
        frequency: 'weekly',
        time: '02:00',
        timezone: 'UTC'
      },
      retention: {
        maxBackups: 10,
        autoCleanup: true
      },
      stats: {
        totalBackups: 0,
        manualBackups: 0,
        autoBackups: 0
      }
    };
    
    await user.save();
    
    logger.info(`${provider} disconnected for user ${req.user._id}`);
    
    res.json({
      success: true,
      message: `${provider} disconnected successfully`
    });
    
  } catch (error) {
    logger.error('Failed to disconnect provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect provider. Please try again.'
    });
  }
};

/**
 * Create manual backup
 * POST /api/cloud/backup
 */
export const createManualBackup = async (req, res) => {
  let backupFilePath = null;
  
  try {
    const user = await User.findById(req.user._id)
      .select('+cloudBackup.accessToken +cloudBackup.refreshToken');
    
    if (!user.cloudBackup || !user.cloudBackup.provider) {
      return res.status(400).json({
        success: false,
        message: 'No cloud provider connected. Please connect Dropbox or Google Drive first.'
      });
    }
    
    logger.info(`Manual backup requested for user ${req.user._id}`);
    
    // Generate backup file
    const backupInfo = await generateBackupFile(req.user._id, 'manual');
    backupFilePath = backupInfo.path;
    
    // Upload to cloud provider
    let uploadResult;
    if (user.cloudBackup.provider === 'dropbox') {
      uploadResult = await dropboxService.uploadBackup(user, backupFilePath, 'manual');
    } else if (user.cloudBackup.provider === 'google_drive') {
      uploadResult = await googleDriveService.uploadBackup(user, backupFilePath);
    } else {
      throw new Error('Unknown cloud provider');
    }
    
    // Update user stats
    user.cloudBackup.stats.totalBackups++;
    user.cloudBackup.stats.manualBackups++;
    user.cloudBackup.stats.lastManualBackup = new Date();
    user.cloudBackup.stats.totalStorageUsed += backupInfo.size;
    user.cloudBackup.schedule.lastBackup = new Date();
    user.cloudBackup.schedule.lastBackupStatus = 'success';
    await user.save();
    
    // Clean up local file
    cleanupBackupFile(backupFilePath);
    
    logger.info(`Manual backup successful for user ${req.user._id}: ${uploadResult.name}`);
    
    res.json({
      success: true,
      backup: {
        id: uploadResult.id,
        filename: uploadResult.name,
        size: uploadResult.size,
        path: uploadResult.path,
        timestamp: new Date(),
        type: 'manual'
      },
      message: 'Backup created and uploaded successfully'
    });
    
  } catch (error) {
    logger.error('Manual backup failed:', error);
    
    // Clean up local file if it exists
    if (backupFilePath) {
      cleanupBackupFile(backupFilePath);
    }
    
    // Update failure status
    try {
      const user = await User.findById(req.user._id);
      if (user.cloudBackup) {
        user.cloudBackup.schedule.lastBackupStatus = 'failed';
        await user.save();
      }
    } catch (updateError) {
      logger.error('Failed to update backup status:', updateError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Backup failed. Please try again later.',
      error: error.message
    });
  }
};

/**
 * List available backups
 * GET /api/cloud/backups
 */
export const listBackups = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);
    
    const user = await User.findById(req.user._id)
      .select('+cloudBackup.accessToken +cloudBackup.refreshToken');
    
    if (!user.cloudBackup || !user.cloudBackup.provider) {
      return res.json({
        success: true,
        backups: [],
        total: 0
      });
    }
    
    // List backups from cloud provider
    let backups = [];
    
    try {
      if (user.cloudBackup.provider === 'dropbox') {
        backups = await dropboxService.listBackups(user, parsedLimit);
      } else if (user.cloudBackup.provider === 'google_drive') {
        backups = await googleDriveService.listBackups(user, parsedLimit);
      }
    } catch (error) {
      // In test/dev environments without real credentials, return empty array
      logger.warn('Failed to list backups from provider:', error.message);
      backups = [];
    }
    
    res.json({
      success: true,
      backups,
      total: backups.length,
      provider: user.cloudBackup.provider
    });
    
  } catch (error) {
    logger.error('Failed to list backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups. Please try again.'
    });
  }
};

/**
 * Delete backup
 * DELETE /api/cloud/backups/:id
 */
export const deleteBackup = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(req.user._id)
      .select('+cloudBackup.accessToken +cloudBackup.refreshToken');
    
    if (!user.cloudBackup || !user.cloudBackup.provider) {
      return res.status(400).json({
        success: false,
        message: 'No cloud provider connected'
      });
    }
    
    // Delete from cloud provider
    if (user.cloudBackup.provider === 'dropbox') {
      await dropboxService.deleteBackup(user, id);
    } else if (user.cloudBackup.provider === 'google_drive') {
      await googleDriveService.deleteBackup(user, id);
    } else {
      throw new Error('Unknown cloud provider');
    }
    
    logger.info(`Backup deleted: ${id} for user ${req.user._id}`);
    
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
    
  } catch (error) {
    logger.error('Failed to delete backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup. Please try again.'
    });
  }
};

/**
 * Preview backup contents
 * GET /api/cloud/backups/:backupId/preview
 */
export const previewBackup = async (req, res) => {
  let tempFilePath = null;
  
  try {
    const { backupId } = req.params;
    
    const user = await User.findById(req.user._id)
      .select('+cloudBackup.accessToken +cloudBackup.refreshToken');
    
    if (!user.cloudBackup || !user.cloudBackup.provider) {
      return res.status(400).json({
        success: false,
        message: 'No cloud provider connected'
      });
    }
    
    logger.info(`Preview backup requested for user ${req.user._id}: ${backupId}`);
    
    // Download backup temporarily
    if (user.cloudBackup.provider === 'dropbox') {
      tempFilePath = await dropboxService.downloadBackup(user, backupId);
    } else if (user.cloudBackup.provider === 'google_drive') {
      tempFilePath = await googleDriveService.downloadBackup(user, backupId);
    } else {
      throw new Error('Unknown cloud provider');
    }
    
    // Get preview
    const preview = await getBackupPreview(tempFilePath);
    
    res.json({
      success: true,
      preview
    });
    
  } catch (error) {
    logger.error('Preview backup failed:', error);
    res.status(500).json({
      success: false,
      message: `Failed to preview backup: ${error.message}`
    });
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        logger.error('Failed to cleanup temp file:', cleanupError);
      }
    }
  }
};

/**
 * Restore from backup
 * POST /api/cloud/restore
 */
export const restoreBackup = async (req, res) => {
  let tempFilePath = null;
  
  try {
    const { backupId, mode, password } = req.body;
    
    // Validate required fields
    if (!backupId || !mode || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: backupId, mode, and password are required'
      });
    }
    
    if (!['merge', 'replace'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mode. Must be "merge" or "replace"'
      });
    }
    
    // Get user with password
    const user = await User.findById(req.user._id)
      .select('+password +cloudBackup.accessToken +cloudBackup.refreshToken');
    
    if (!user.cloudBackup || !user.cloudBackup.provider) {
      return res.status(400).json({
        success: false,
        message: 'No cloud provider connected'
      });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      logger.warn(`Invalid password for restore attempt by user ${req.user._id}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }
    
    logger.info(`Restore requested for user ${req.user._id}: backup=${backupId}, mode=${mode}`);
    
    // Download backup from cloud
    if (user.cloudBackup.provider === 'dropbox') {
      tempFilePath = await dropboxService.downloadBackup(user, backupId);
    } else if (user.cloudBackup.provider === 'google_drive') {
      tempFilePath = await googleDriveService.downloadBackup(user, backupId);
    } else {
      throw new Error('Unknown cloud provider');
    }
    
    // Parse backup
    const backupData = await parseBackup(tempFilePath);
    
    // Restore data (transaction-safe)
    const statistics = await restoreFromBackup(req.user._id, backupData, mode);
    
    logger.info(`Restore successful for user ${req.user._id}`, { statistics });
    
    res.json({
      success: true,
      statistics,
      message: `Successfully restored ${statistics.totalImported} items`
    });
    
  } catch (error) {
    logger.error('Restore failed:', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore from backup'
    });
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        logger.debug(`Cleaned up temp file: ${tempFilePath}`);
      } catch (cleanupError) {
        logger.error('Failed to cleanup temp file:', cleanupError);
      }
    }
  }
};

/**
 * Get current backup schedule
 * GET /api/cloud/schedule
 */
export const getSchedule = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.cloudBackup || !user.cloudBackup.provider) {
      return res.status(400).json({
        success: false,
        message: 'No cloud provider connected'
      });
    }
    
    res.json({
      success: true,
      schedule: user.cloudBackup.schedule
    });
    
  } catch (error) {
    logger.error('Failed to get schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve schedule'
    });
  }
};

/**
 * Update backup schedule
 * PUT /api/cloud/schedule
 */
export const updateSchedule = async (req, res) => {
  try {
    const { enabled, frequency, time, timezone } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user.cloudBackup || !user.cloudBackup.provider) {
      return res.status(400).json({
        success: false,
        message: 'No cloud provider connected'
      });
    }
    
    // Update schedule settings
    if (typeof enabled === 'boolean') {
      user.cloudBackup.schedule.enabled = enabled;
    }
    
    if (frequency && ['daily', 'weekly', 'monthly'].includes(frequency)) {
      user.cloudBackup.schedule.frequency = frequency;
    }
    
    if (time && /^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      user.cloudBackup.schedule.time = time;
    }
    
    if (timezone) {
      user.cloudBackup.schedule.timezone = timezone;
    }
    
    // Calculate next backup time if enabled
    if (user.cloudBackup.schedule.enabled) {
      user.cloudBackup.schedule.nextBackup = calculateNextBackupTime(
        user.cloudBackup.schedule.frequency,
        user.cloudBackup.schedule.time
      );
    } else {
      user.cloudBackup.schedule.nextBackup = null;
    }
    
    await user.save();
    
    logger.info(`Schedule updated for user ${req.user._id}: enabled=${enabled}, frequency=${frequency}`);
    
    res.json({
      success: true,
      schedule: user.cloudBackup.schedule
    });
    
  } catch (error) {
    logger.error('Failed to update schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule. Please try again.'
    });
  }
};

/**
 * Calculate next backup time based on frequency and time
 * 
 * @param {string} frequency - 'daily', 'weekly', or 'monthly'
 * @param {string} time - HH:mm format
 * @returns {Date} Next backup time
 */
function calculateNextBackupTime(frequency, time) {
  const [hours, minutes] = time.split(':').map(Number);
  
  let next = new Date();
  next.setHours(hours, minutes, 0, 0);
  
  // If time has passed today, move to next occurrence
  if (next <= new Date()) {
    if (frequency === 'daily') {
      next.setDate(next.getDate() + 1);
    } else if (frequency === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else if (frequency === 'monthly') {
      next.setMonth(next.getMonth() + 1);
    }
  }
  
  return next;
}