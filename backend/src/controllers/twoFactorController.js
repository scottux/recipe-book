import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/User.js';
import crypto from 'crypto';

/**
 * Generate 2FA setup (secret and QR code)
 * POST /api/2fa/setup
 */
export const setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is already enabled. Disable it first to set up a new secret.'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `RecipeBook (${user.email})`,
      issuer: 'RecipeBook',
      length: 32
    });

    // Store encrypted secret (not yet enabled)
    user.twoFactorSecret = secret.base32;
    user.twoFactorVerified = false;
    await user.save();

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode,
        otpauthUrl: secret.otpauth_url
      }
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set up 2FA.'
    });
  }
};

/**
 * Verify and enable 2FA
 * POST /api/2fa/verify
 */
export const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification code is required.'
      });
    }

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        error: 'Please set up 2FA first.'
      });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is already enabled.'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 1 period before/after for clock skew
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code.'
      });
    }

    // Generate backup codes
    const plainBackupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      plainBackupCodes.push(code);
    }

    // Hash and store backup codes
    user.twoFactorBackupCodes = plainBackupCodes.map(code => ({
      code: crypto.createHash('sha256').update(code).digest('hex'),
      usedAt: null
    }));

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorVerified = true;
    await user.save();

    console.log(`2FA enabled for user: ${user.email}`);

    res.json({
      success: true,
      message: '2FA enabled successfully.',
      data: {
        backupCodes: plainBackupCodes
      }
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify 2FA code.'
    });
  }
};

/**
 * Disable 2FA
 * POST /api/2fa/disable
 */
export const disable2FA = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to disable 2FA.'
      });
    }

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Password is incorrect.'
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is not enabled.'
      });
    }

    // Disable 2FA and clear data
    user.twoFactorEnabled = false;
    user.twoFactorVerified = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = [];
    await user.save();

    console.log(`2FA disabled for user: ${user.email}`);

    res.json({
      success: true,
      message: '2FA disabled successfully.'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable 2FA.'
    });
  }
};

/**
 * Get 2FA status
 * GET /api/2fa/status
 */
export const get2FAStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    const remainingBackupCodes = user.twoFactorBackupCodes.filter(
      bc => !bc.usedAt
    ).length;

    res.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled,
        verified: user.twoFactorVerified,
        remainingBackupCodes
      }
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get 2FA status.'
    });
  }
};

/**
 * Regenerate backup codes
 * POST /api/2fa/backup-codes/regenerate
 */
export const regenerateBackupCodes = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to regenerate backup codes.'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Password is incorrect.'
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is not enabled.'
      });
    }

    // Generate new backup codes
    const plainBackupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      plainBackupCodes.push(code);
    }

    // Hash and store backup codes
    user.twoFactorBackupCodes = plainBackupCodes.map(code => ({
      code: crypto.createHash('sha256').update(code).digest('hex'),
      usedAt: null
    }));

    await user.save();

    console.log(`Backup codes regenerated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Backup codes regenerated successfully.',
      data: {
        backupCodes: plainBackupCodes
      }
    });
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate backup codes.'
    });
  }
};