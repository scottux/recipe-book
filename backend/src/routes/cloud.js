/**
 * Cloud Backup Routes
 * 
 * OAuth flows, backup operations, and provider management endpoints
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import {
  initiateDropboxAuth,
  handleDropboxCallback,
  getCloudStatus,
  disconnectProvider,
  createManualBackup,
  listBackups,
  deleteBackup,
  previewBackup,
  restoreBackup,
  getSchedule,
  updateSchedule
} from '../controllers/cloudBackupController.js';

const router = express.Router();

// Rate limiters for cloud backup operations
const cloudBackupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 backup operations per hour
  message: 'Too many backup operations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const oauthLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 OAuth attempts per hour
  message: 'Too many authorization attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// =============================================================================
// DROPBOX OAUTH ENDPOINTS
// =============================================================================

/**
 * @route   GET /api/cloud/dropbox/auth
 * @desc    Initiate Dropbox OAuth flow
 * @access  Private (requires authentication)
 */
router.get('/dropbox/auth', authenticate, oauthLimiter, initiateDropboxAuth);

/**
 * @route   GET /api/cloud/dropbox/callback
 * @desc    Handle Dropbox OAuth callback
 * @access  Public (state token validates user)
 */
router.get('/dropbox/callback', handleDropboxCallback);

// =============================================================================
// GOOGLE DRIVE OAUTH ENDPOINTS (Coming in Week 5)
// =============================================================================

/**
 * @route   GET /api/cloud/google/auth
 * @desc    Initiate Google Drive OAuth flow
 * @access  Private (requires authentication)
 */
router.get('/google/auth', authenticate, oauthLimiter, (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Google Drive integration coming in Week 5!'
  });
});

/**
 * @route   GET /api/cloud/google/callback
 * @desc    Handle Google Drive OAuth callback
 * @access  Public (state token validates user)
 */
router.get('/google/callback', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/account/cloud-backup?error=not_implemented`);
});

// =============================================================================
// PROVIDER MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * @route   GET /api/cloud/status
 * @desc    Get cloud backup connection status
 * @access  Private
 */
router.get('/status', authenticate, getCloudStatus);

/**
 * @route   POST /api/cloud/disconnect
 * @desc    Disconnect cloud provider
 * @access  Private
 */
router.post('/disconnect', authenticate, disconnectProvider);

// =============================================================================
// BACKUP OPERATIONS ENDPOINTS
// =============================================================================

/**
 * @route   POST /api/cloud/backup
 * @desc    Create manual backup
 * @access  Private
 */
router.post('/backup', authenticate, cloudBackupLimiter, createManualBackup);

/**
 * @route   GET /api/cloud/backups
 * @desc    List available backups
 * @access  Private
 * @query   limit - Maximum number of backups to return (default: 10, max: 100)
 */
router.get('/backups', authenticate, listBackups);

/**
 * @route   DELETE /api/cloud/backups/:id
 * @desc    Delete specific backup
 * @access  Private
 */
router.delete('/backups/:id', authenticate, cloudBackupLimiter, deleteBackup);

/**
 * @route   GET /api/cloud/backups/:backupId/preview
 * @desc    Preview backup contents (metadata and statistics)
 * @access  Private
 */
router.get('/backups/:backupId/preview', authenticate, previewBackup);

// =============================================================================
// RESTORE OPERATIONS ENDPOINTS
// =============================================================================

/**
 * @route   POST /api/cloud/restore
 * @desc    Restore from backup
 * @access  Private
 * @body    backupId - ID of backup to restore
 * @body    mode - 'merge' or 'replace'
 * @body    password - User password for verification
 */
router.post('/restore', authenticate, cloudBackupLimiter, restoreBackup);

// =============================================================================
// SCHEDULE MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * @route   PUT /api/cloud/schedule
 * @desc    Update backup schedule
 * @access  Private
 * @body    enabled - Boolean to enable/disable schedule
 * @body    frequency - 'daily', 'weekly', or 'monthly'
 * @body    time - HH:mm format (e.g., '02:00')
 * @body    timezone - Timezone string (default: 'UTC')
 */
router.put('/schedule', authenticate, updateSchedule);

/**
 * @route   GET /api/cloud/schedule
 * @desc    Get current backup schedule
 * @access  Private
 */
router.get('/schedule', authenticate, getSchedule);

export default router;