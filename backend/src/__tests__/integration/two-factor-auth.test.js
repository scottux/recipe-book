/**
 * Integration Tests: Two-Factor Authentication (2FA)
 * Tests the complete 2FA workflow including setup, verification, login, and disable
 */

import request from 'supertest';
import mongoose from 'mongoose';
import speakeasy from 'speakeasy';
import app from '../../index.js';
import User from '../../models/User.js';
import { clearDatabase, ensureConnection } from '../setup/mongodb.js';

let testUser;
let accessToken;
let twoFactorSecret;

// Helper function to generate valid TOTP token
const generateToken = (secret) => {
  return speakeasy.totp({
    secret: secret,
    encoding: 'base32',
  });
};

beforeAll(async () => {
  // Ensure connection to shared MongoDB instance
  await ensureConnection();
});

afterAll(async () => {
  // DO NOT disconnect - shared connection managed by global teardown
});

beforeEach(async () => {
  // Clear all collections using shared helper
  await clearDatabase();
  
  // Create a test user
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      displayName: 'Test User 2FA',
      email: 'test2fa@example.com',
      password: 'Test123!@#',
    });

  testUser = registerRes.body.data.user;
  accessToken = registerRes.body.data.accessToken;
});

describe('Two-Factor Authentication Integration Tests', () => {
  describe('POST /api/auth/2fa/setup', () => {
    it('should generate 2FA QR code and secret for authenticated user', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('qrCode');
      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('manualEntryCode');
      
      // QR code should be a data URL
      expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
      
      // Secret should be base32 encoded
      expect(res.body.secret).toMatch(/^[A-Z2-7]+=*$/);
      
      // Manual entry code should match secret
      expect(res.body.manualEntryCode).toBe(res.body.secret);
      
      // Store secret for later tests
      twoFactorSecret = res.body.secret;
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('token');
    });

    it('should generate different secrets for multiple calls', async () => {
      const res1 = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res2 = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Each setup should generate a unique secret
      expect(res1.body.secret).not.toBe(res2.body.secret);
    });
  });

  describe('POST /api/auth/2fa/verify', () => {
    beforeEach(async () => {
      // Setup 2FA first
      const setupRes = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      twoFactorSecret = setupRes.body.secret;
    });

    it('should enable 2FA with valid token and generate backup codes', async () => {
      const token = generateToken(twoFactorSecret);

      const res = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token, secret: twoFactorSecret })
        .expect(200);

      console.log('Response status:', res.status);
      console.log('Response body keys:', Object.keys(res.body));
      console.log('Response has backupCodes:', res.body.backupCodes ? `yes (${res.body.backupCodes.length})` : 'no');

      expect(res.body).toHaveProperty('message', '2FA enabled successfully');
      expect(res.body).toHaveProperty('backupCodes');
      expect(Array.isArray(res.body.backupCodes)).toBe(true);
      expect(res.body.backupCodes).toHaveLength(10);
      
      // Each backup code should be an object with code and usedAt properties
      res.body.backupCodes.forEach(codeObj => {
        expect(codeObj).toHaveProperty('code');
        expect(codeObj).toHaveProperty('usedAt');
        expect(codeObj.code).toBeDefined();
        expect(codeObj.usedAt).toBeNull();
      });

      // Verify user has 2FA enabled in database
      const user = await User.findById(testUser.id).select('+twoFactorSecret').lean();
      expect(user).not.toBeNull();
      expect(user.twoFactorEnabled).toBe(true);
      expect(user.twoFactorSecret).toBe(twoFactorSecret);
      expect(user.twoFactorBackupCodes).toHaveLength(10);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '000000' })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Invalid 2FA code');

      // Verify 2FA was not enabled
      const user = await User.findById(testUser.id).lean();
      expect(user.twoFactorEnabled).toBe(false);
    });

    it('should require authentication', async () => {
      const token = generateToken(twoFactorSecret);

      const res = await request(app)
        .post('/api/auth/2fa/verify')
        .send({ token })
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('token');
    });

    it('should require token parameter', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Token is required');
    });
  });

  describe('GET /api/auth/2fa/status', () => {
    it('should return disabled status when 2FA is not enabled', async () => {
      const res = await request(app)
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('enabled', false);
    });

    it('should return enabled status when 2FA is enabled', async () => {
      // Enable 2FA
      const setupRes = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      const token = generateToken(setupRes.body.secret);
      
      await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token, secret: setupRes.body.secret })
        .expect(200);

      // Check status
      const res = await request(app)
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('enabled', true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/auth/2fa/status')
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('token');
    });
  });

  describe('POST /api/auth/2fa/verify-login', () => {
    beforeEach(async () => {
      // Enable 2FA for user
      const setupRes = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      twoFactorSecret = setupRes.body.secret;
      
      const token = generateToken(twoFactorSecret);
      
      await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token, secret: twoFactorSecret })
        .expect(200);
    });

    it('should complete login with valid 2FA token', async () => {
      const token = generateToken(twoFactorSecret);

      const res = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({
          email: 'test2fa@example.com',
          password: 'Test123!@#',
          token,
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('test2fa@example.com');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should reject invalid 2FA token', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({
          email: 'test2fa@example.com',
          password: 'Test123!@#',
          token: '000000',
        })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Invalid 2FA code');
    });

    it('should reject invalid credentials', async () => {
      const token = generateToken(twoFactorSecret);

      const res = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({
          email: 'test2fa@example.com',
          password: 'WrongPassword123!',
          token,
        })
        .expect(401);

      expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should accept valid backup code', async () => {
      // Get backup codes
      const verifyRes = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: generateToken(twoFactorSecret), secret: twoFactorSecret })
        .expect(200);

      const backupCodeObj = verifyRes.body.backupCodes[0];
      const backupCode = backupCodeObj.code;

      // Use backup code to login
      const res = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({
          email: 'test2fa@example.com',
          password: 'Test123!@#',
          token: backupCode,
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');

      // Verify backup code was marked as used
      const user = await User.findById(testUser.id).lean();
      const usedCode = user.twoFactorBackupCodes.find(c => c.code === backupCode);
      expect(usedCode).toBeDefined();
      expect(usedCode.usedAt).not.toBeNull();
    });

    it('should reject already-used backup code', async () => {
      // Get backup codes
      const verifyRes = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: generateToken(twoFactorSecret), secret: twoFactorSecret })
        .expect(200);

      const backupCodeObj = verifyRes.body.backupCodes[0];
      const backupCode = backupCodeObj.code;

      // Use backup code once
      await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({
          email: 'test2fa@example.com',
          password: 'Test123!@#',
          token: backupCode,
        })
        .expect(200);

      // Try to use the same backup code again
      const res = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({
          email: 'test2fa@example.com',
          password: 'Test123!@#',
          token: backupCode,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Invalid 2FA code');
    });

    it('should require all parameters', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({
          email: 'test2fa@example.com',
          password: 'Test123!@#',
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/2fa/disable', () => {
    beforeEach(async () => {
      // Enable 2FA
      const setupRes = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      const token = generateToken(setupRes.body.secret);
      
      await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token, secret: setupRes.body.secret })
        .expect(200);
    });

    it('should disable 2FA with valid password', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'Test123!@#' })
        .expect(200);

      expect(res.body).toHaveProperty('message', '2FA has been disabled');

      // Verify 2FA is disabled in database
      const user = await User.findById(testUser.id).lean();
      expect(user.twoFactorEnabled).toBe(false);
      expect(user.twoFactorSecret).toBeUndefined();
      expect(user.twoFactorBackupCodes).toEqual([]);
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'WrongPassword123!' })
        .expect(401);

      expect(res.body).toHaveProperty('error', 'Invalid password');

      // Verify 2FA is still enabled
      const user = await User.findById(testUser.id).lean();
      expect(user.twoFactorEnabled).toBe(true);
    });

    it('should require password parameter', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Password is required');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .send({ password: 'Test123!@#' })
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('token');
    });
  });

  describe('Login Flow with 2FA', () => {
    beforeEach(async () => {
      // Enable 2FA for user
      const setupRes = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      twoFactorSecret = setupRes.body.secret;
      
      const token = generateToken(twoFactorSecret);
      
      await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token, secret: twoFactorSecret })
        .expect(200);
    });

    it('should require 2FA verification during login when enabled', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test2fa@example.com',
          password: 'Test123!@#',
        })
        .expect(200);

      expect(res.body).toHaveProperty('requiresTwoFactor', true);
      expect(res.body).toHaveProperty('message', 'Two-factor authentication required.');
      expect(res.body).not.toHaveProperty('data');
    });

    it('should complete full login flow with 2FA', async () => {
      // Step 1: Initial login (should indicate 2FA required)
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test2fa@example.com',
          password: 'Test123!@#',
        })
        .expect(200);

      expect(loginRes.body).toHaveProperty('requiresTwoFactor', true);

      // Step 2: Verify 2FA code
      const token = generateToken(twoFactorSecret);
      
      const verifyRes = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({
          email: 'test2fa@example.com',
          password: 'Test123!@#',
          token,
        })
        .expect(200);

      expect(verifyRes.body).toHaveProperty('accessToken');
      expect(verifyRes.body).toHaveProperty('refreshToken');
      expect(verifyRes.body).toHaveProperty('user');
    });

    it('should allow normal login after disabling 2FA', async () => {
      // Disable 2FA
      await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'Test123!@#' })
        .expect(200);

      // Login should work without 2FA
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test2fa@example.com',
          password: 'Test123!@#',
        })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body).not.toHaveProperty('requiresTwoFactor');
    });
  });
});