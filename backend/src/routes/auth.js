import express from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  deleteAccount,
  forgotPassword,
  validateResetToken,
  resetPassword,
  sendVerification,
  verifyEmail,
  setup2FA,
  verify2FA,
  disable2FA,
  verify2FALogin,
  get2FAStatus
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { passwordResetRateLimiter, createRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rate limiter for 2FA verification endpoints
const twoFactorVerifyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many two-factor verification attempts. Please try again later.'
});

// Rate limiter for 2FA management endpoints (setup, disable)
const twoFactorManagementLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 attempts per hour
  message: 'Too many two-factor authentication requests. Please try again later.'
});

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);

// Password reset routes (public)
router.post('/forgot-password', passwordResetRateLimiter(), forgotPassword);
router.get('/validate-reset-token', validateResetToken);
router.post('/reset-password', resetPassword);

// Email verification routes
router.get('/verify-email/:token', verifyEmail); // Public - token auth
router.post('/send-verification', authenticate, sendVerification); // Protected

// 2FA routes
router.post('/2fa/setup', authenticate, twoFactorManagementLimiter, setup2FA); // Protected - generates QR code
router.post('/2fa/verify', authenticate, twoFactorVerifyLimiter, verify2FA); // Protected - enables 2FA
router.post('/2fa/disable', authenticate, twoFactorManagementLimiter, disable2FA); // Protected - disables 2FA
router.post('/2fa/verify-login', twoFactorVerifyLimiter, verify2FALogin); // Public - verifies 2FA during login
router.get('/2fa/status', authenticate, get2FAStatus); // Protected - checks 2FA status

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateProfile);
router.patch('/password', authenticate, updatePassword);
router.delete('/account', authenticate, deleteAccount);

export default router;
