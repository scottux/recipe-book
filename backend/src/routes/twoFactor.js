import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  setup2FA,
  verify2FA,
  disable2FA,
  get2FAStatus,
  regenerateBackupCodes
} from '../controllers/twoFactorController.js';

const router = express.Router();

/**
 * @route   POST /api/2fa/setup
 * @desc    Generate 2FA secret and QR code
 * @access  Private (requires authentication)
 */
router.post('/setup', authenticate, setup2FA);

/**
 * @route   POST /api/2fa/verify
 * @desc    Verify and enable 2FA
 * @access  Private (requires authentication)
 */
router.post('/verify', authenticate, verify2FA);

/**
 * @route   POST /api/2fa/disable
 * @desc    Disable 2FA
 * @access  Private (requires authentication)
 */
router.post('/disable', authenticate, disable2FA);

/**
 * @route   GET /api/2fa/status
 * @desc    Get 2FA status for current user
 * @access  Private (requires authentication)
 */
router.get('/status', authenticate, get2FAStatus);

/**
 * @route   POST /api/2fa/backup-codes/regenerate
 * @desc    Regenerate backup codes
 * @access  Private (requires authentication)
 */
router.post('/backup-codes/regenerate', authenticate, regenerateBackupCodes);

export default router;