import User from '../models/User.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../middleware/auth.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService.js';
import { validatePassword, randomDelay } from '../utils/passwordValidator.js';

// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate input
    if (!email || !password || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email, password, and display name.'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.message
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists.'
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      displayName
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Send verification email (async, don't wait)
    try {
      const verificationToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;
      
      await sendVerificationEmail({
        to: user.email,
        username: user.displayName,
        verificationUrl
      });
      
      console.log(`Verification email sent to: ${user.email}`);
    } catch (emailError) {
      // Log error but don't fail registration
      console.error('Failed to send verification email:', emailError);
    }

    res.status(201).json({
      success: true,
      data: {
        user: user.toPublicProfile(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password, twoFactorToken } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password.'
      });
    }

    // Find user (include 2FA secret for verification)
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+twoFactorSecret');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // 2FA is enabled, require token
      if (!twoFactorToken) {
        return res.status(200).json({
          success: false,
          requiresTwoFactor: true,
          message: 'Two-factor authentication required.'
        });
      }

      // Verify 2FA token or backup code
      let verified = false;

      // Try TOTP token first
      if (twoFactorToken.length === 6) {
        const speakeasy = (await import('speakeasy')).default;
        verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: twoFactorToken,
          window: 2
        });
      }
      
      // Try backup code if TOTP failed
      if (!verified && twoFactorToken.length === 8) {
        const backupResult = user.verifyBackupCode(twoFactorToken);
        verified = backupResult.valid;
        
        if (verified) {
          await user.save(); // Save the used backup code
          console.log(`Backup code used for login: ${user.email}, remaining: ${backupResult.remaining}`);
        }
      }

      if (!verified) {
        return res.status(401).json({
          success: false,
          error: 'Invalid two-factor authentication code.'
        });
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token and update last login
    user.refreshTokens.push({ token: refreshToken });
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      data: {
        user: user.toPublicProfile(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
};

// Refresh access token
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required.'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token.'
      });
    }

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found.'
      });
    }

    const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token.'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user._id);

    res.json({
      success: true,
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed. Please try again.'
    });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required.'
      });
    }

    // Remove refresh token from user
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(
        rt => rt.token !== refreshToken
      );
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed. Please try again.'
    });
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.toPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information.'
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { displayName, avatar, preferences } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Update allowed fields
    if (displayName) user.displayName = displayName;
    if (avatar !== undefined) user.avatar = avatar;
    if (preferences) {
      if (preferences.defaultServings) {
        user.preferences.defaultServings = preferences.defaultServings;
      }
      if (preferences.measurementSystem) {
        user.preferences.measurementSystem = preferences.measurementSystem;
      }
      if (preferences.theme) {
        user.preferences.theme = preferences.theme;
      }
    }

    await user.save();

    res.json({
      success: true,
      data: {
        user: user.toPublicProfile()
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile.'
    });
  }
};

// Update password (authenticated user, keeps session active)
const passwordChangeAttempts = new Map(); // In-memory rate limiting storage

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new password.'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.message
      });
    }

    // Rate limiting: 5 attempts per hour per user
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const userId = req.user._id.toString();
    
    let attempts = passwordChangeAttempts.get(userId) || [];
    attempts = attempts.filter(time => time > hourAgo);
    
    if (attempts.length >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Too many password change attempts. Please try again later.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      // Add to rate limit on failed attempt
      attempts.push(now);
      passwordChangeAttempts.set(userId, attempts);
      
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect.'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password.'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    
    // Keep session active - do NOT invalidate refresh tokens
    // User can continue using the application without re-login
    
    await user.save();

    // Clear rate limiting on success
    passwordChangeAttempts.delete(userId);

    res.json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update password.'
    });
  }
};

// Delete account (authenticated user, cascades all data)
const accountDeletionAttempts = new Map(); // In-memory rate limiting storage

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to delete your account.'
      });
    }

    // Rate limiting: 3 attempts per hour per user
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const userId = req.user._id.toString();
    
    let attempts = accountDeletionAttempts.get(userId) || [];
    attempts = attempts.filter(time => time > hourAgo);
    
    if (attempts.length >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Too many account deletion attempts. Please try again later.'
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
      // Add to rate limit on failed attempt
      attempts.push(now);
      accountDeletionAttempts.set(userId, attempts);
      
      return res.status(400).json({
        success: false,
        error: 'Password is incorrect.'
      });
    }

    // Import models for cascade deletion
    const Recipe = (await import('../models/Recipe.js')).default;
    const Collection = (await import('../models/Collection.js')).default;
    const MealPlan = (await import('../models/MealPlan.js')).default;
    const ShoppingList = (await import('../models/ShoppingList.js')).default;

    // Cascade delete all user-owned data
    await Promise.all([
      Recipe.deleteMany({ owner: user._id }),
      Collection.deleteMany({ owner: user._id }),
      MealPlan.deleteMany({ owner: user._id }),
      ShoppingList.deleteMany({ owner: user._id })
    ]);

    // Delete the user account
    await User.findByIdAndDelete(user._id);

    // Clear rate limiting
    accountDeletionAttempts.delete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully.'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account.'
    });
  }
};

// Request password reset
// Note: Rate limiting is handled by middleware on the route
export const forgotPassword = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !email.match(/^\S+@\S+\.\S+$/)) {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required.'
      });
    }

    const emailLower = email.toLowerCase();
    
    // Always return success message (security: prevent user enumeration)
    const successMessage =
      'If an account exists with this email, a password reset link has been sent.';

    // Find user by email
    const user = await User.findOne({ email: emailLower });

    if (!user) {
      // Add random delay to prevent timing attacks (200-400ms)
      await randomDelay(200, 400);
      
      return res.json({
        success: true,
        message: successMessage
      });
    }

    // Generate and save reset token using User model method
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email with reset link
    try {
      await sendPasswordResetEmail({
        to: user.email,
        username: user.displayName,
        resetUrl,
        expiryMinutes: 15
      });
      
      console.log(`Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      // If email fails, clear the token and log error
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save({ validateBeforeSave: false });
      
      console.error('Failed to send password reset email:', emailError);
      
      // Still return success to prevent user enumeration
      // But log the error for admin investigation
    }

    // Add delay to normalize response time (prevent timing attacks)
    const elapsed = Date.now() - startTime;
    if (elapsed < 300) {
      await randomDelay(0, 300 - elapsed);
    }

    res.json({
      success: true,
      message: successMessage
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Add delay even on error
    const elapsed = Date.now() - startTime;
    if (elapsed < 300) {
      await randomDelay(0, 300 - elapsed);
    }
    
    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request.'
    });
  }
};

// Validate reset token
export const validateResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'Token is required.'
      });
    }

    // Use static method to find user by token
    const user = await User.findByResetToken(token);

    if (!user) {
      return res.status(400).json({
        valid: false,
        error: 'Token is invalid or has expired.'
      });
    }

    // Validate token using instance method
    const validation = user.validateResetToken(token);
    
    if (!validation.valid) {
      let errorMessage = 'Token is invalid or has expired.';
      if (validation.reason === 'expired') {
        errorMessage = 'Reset link has expired. Please request a new one.';
      } else if (validation.reason === 'used') {
        errorMessage = 'This reset link has already been used.';
      }
      
      return res.status(400).json({
        valid: false,
        error: errorMessage
      });
    }

    res.json({
      valid: true,
      email: user.email // Return email for display on reset form
    });
  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({
      valid: false,
      error: 'An error occurred while validating the token.'
    });
  }
};

// Send verification email
const verificationEmailAttempts = new Map(); // In-memory rate limiting storage

export const sendVerification = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Rate limiting: 3 emails per hour per user
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    
    let attempts = verificationEmailAttempts.get(userId) || [];
    attempts = attempts.filter(time => time > hourAgo);
    
    if (attempts.length >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Too many verification email requests. Please try again later.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'Email already verified.'
      });
    }

    // Generate and save verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Build verification URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;

    // Send email
    try {
      await sendVerificationEmail({
        to: user.email,
        username: user.displayName,
        verificationUrl
      });
      
      console.log(`Verification email sent to: ${user.email}`);
      
      // Add to rate limit attempts
      attempts.push(now);
      verificationEmailAttempts.set(userId, attempts);
      
      res.json({
        success: true,
        message: `Verification email sent to ${user.email}`
      });
    } catch (emailError) {
      // Clear the token if email fails
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      await user.save({ validateBeforeSave: false });
      
      console.error('Failed to send verification email:', emailError);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while sending verification email.'
    });
  }
};

// Verify email with token
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required.'
      });
    }

    // Find user by verification token using static method
    const user = await User.findByVerificationToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token.'
      });
    }

    // Validate token using instance method
    const validation = user.validateVerificationToken(token);
    
    if (!validation.valid) {
      let errorMessage = 'Invalid or expired verification token.';
      if (validation.reason === 'already_verified') {
        return res.json({
          success: true,
          message: 'Email already verified.'
        });
      } else if (validation.reason === 'expired') {
        errorMessage = 'Verification link has expired. Please request a new one.';
      }
      
      return res.status(400).json({
        success: false,
        error: errorMessage
      });
    }

    // Mark email as verified
    user.markEmailVerified();
    await user.save();

    console.log(`Email verified for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Email verified successfully.'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while verifying your email.'
    });
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token and password are required.'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.message
      });
    }

    // Find user by token using static method
    const user = await User.findByResetToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token is invalid or has expired.'
      });
    }

    // Validate token using instance method
    const validation = user.validateResetToken(token);
    
    if (!validation.valid) {
      let errorMessage = 'Token is invalid or has expired.';
      if (validation.reason === 'expired') {
        errorMessage = 'Reset link has expired. Please request a new one.';
      } else if (validation.reason === 'used') {
        errorMessage = 'This reset link has already been used.';
      }
      
      return res.status(400).json({
        success: false,
        error: errorMessage
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password;
    
    // Mark token as used and clear reset fields
    user.markResetTokenUsed();
    
    // Invalidate all refresh tokens for security
    user.refreshTokens = [];
    
    await user.save();

    console.log(`Password reset successful for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while resetting your password.'
    });
  }
};

// Two-Factor Authentication Controllers

// Setup 2FA - Generate QR code and secret
export const setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const speakeasy = (await import('speakeasy')).default;
    const QRCode = (await import('qrcode')).default;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Recipe Book (${user.email})`,
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      qrCode,
      secret: secret.base32,
      manualEntryCode: secret.base32,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
};

// Verify 2FA setup and enable it
export const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the secret from the setup request (stored temporarily)
    // In a real app, you'd store this temporarily in session or cache
    // For now, we'll use the token to verify against a new secret
    const speakeasy = (await import('speakeasy')).default;
    
    // We need to get the secret from somewhere - let's assume it was passed in body
    const { secret } = req.body;
    if (!secret) {
      return res.status(400).json({ error: 'Secret is required for verification' });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }

    // Generate backup codes
    const backupCodes = user.generateBackupCodes();

    // Save 2FA settings
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      message: '2FA enabled successfully',
      backupCodes,
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
};

// Disable 2FA
export const disable2FA = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({ message: '2FA has been disabled' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// Verify 2FA during login
export const verify2FALogin = async (req, res) => {
  try {
    const { email, password, token } = req.body;

    if (!email || !password || !token) {
      return res.status(400).json({ error: 'Email, password, and token are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+twoFactorSecret');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify 2FA token or backup code
    let verified = false;

    // Try TOTP token
    if (token.length === 6) {
      const speakeasy = (await import('speakeasy')).default;
      verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2,
      });
    }

    // Try backup code
    if (!verified && token.length === 8) {
      const backupResult = user.verifyBackupCode(token);
      verified = backupResult.valid;
      
      if (verified) {
        await user.save(); // Save to remove used backup code
      }
    }

    if (!verified) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    user.lastLogin = new Date();
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: user.toPublicProfile(),
    });
  } catch (error) {
    console.error('2FA login verify error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA login' });
  }
};

// Get 2FA status
export const get2FAStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      enabled: user.twoFactorEnabled || false,
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
};
