import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../index.js';
import User from '../../models/User.js';
import { jest } from '@jest/globals';

describe('Email Verification Integration Tests', () => {
  let testUser;
  let accessToken;
  
  beforeEach(async () => {
    // Clear users collection
    await User.deleteMany({});
    
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
      emailVerified: false
    });
    
    // Login to get access token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should create user with emailVerified=false by default', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          displayName: 'New User'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.emailVerified).toBe(false);
      
      // Verify user in database
      const user = await User.findOne({ email: 'newuser@example.com' });
      expect(user.emailVerified).toBe(false);
      expect(user.emailVerificationToken).toBeDefined();
      expect(user.emailVerificationExpires).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should include emailVerified status', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('emailVerified');
      expect(res.body.emailVerified).toBe(false);
    });
  });

  describe('POST /api/auth/send-verification', () => {
    it('should send verification email for authenticated user', async () => {
      const res = await request(app)
        .post('/api/auth/send-verification')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verification email sent');
      
      // Verify token was created in database
      const user = await User.findById(testUser._id).select('+emailVerificationToken');
      expect(user.emailVerificationToken).toBeDefined();
      expect(user.emailVerificationExpires).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .post('/api/auth/send-verification');

      expect(res.status).toBe(401);
    });

    it('should fail if email already verified', async () => {
      // Mark email as verified
      testUser.emailVerified = true;
      await testUser.save();

      const res = await request(app)
        .post('/api/auth/send-verification')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already verified');
    });

    it('should enforce rate limiting (3 requests per hour)', async () => {
      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/auth/send-verification')
          .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
      }

      // 4th request should be rate limited
      const res = await request(app)
        .post('/api/auth/send-verification')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many requests');
    });
  });

  describe('GET /api/auth/verify-email/:token', () => {
    let verificationToken;

    beforeEach(async () => {
      // Generate verification token
      const token = await testUser.createEmailVerificationToken();
      await testUser.save();
      verificationToken = token;
    });

    it('should verify email with valid token', async () => {
      const res = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verified successfully');
      
      // Verify in database
      const user = await User.findById(testUser._id);
      expect(user.emailVerified).toBe(true);
      expect(user.emailVerificationToken).toBeUndefined();
      expect(user.emailVerificationExpires).toBeUndefined();
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify-email/invalid-token-123');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid or expired');
    });

    it('should fail with expired token', async () => {
      // Set expiration to past
      testUser.emailVerificationExpires = new Date(Date.now() - 1000);
      await testUser.save();

      const res = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid or expired');
    });

    it('should fail if email already verified', async () => {
      // Verify email first
      await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`);

      // Try to verify again with same token
      const res = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid or expired');
    });

    it('should invalidate token after successful verification', async () => {
      // First verification succeeds
      const res1 = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`);
      expect(res1.status).toBe(200);

      // Second attempt with same token fails
      const res2 = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`);
      expect(res2.status).toBe(400);
    });
  });

  describe('Token Security', () => {
    it('should hash verification tokens in database', async () => {
      const plainToken = await testUser.createEmailVerificationToken();
      await testUser.save();

      const userFromDB = await User.findById(testUser._id).select('+emailVerificationToken');
      
      // Token in DB should be hashed (different from plain token)
      expect(userFromDB.emailVerificationToken).not.toBe(plainToken);
      expect(userFromDB.emailVerificationToken).toHaveLength(64); // SHA-256 hex length
    });

    it('should generate unique tokens for each request', async () => {
      const token1 = await testUser.createEmailVerificationToken();
      await testUser.save();
      
      const token2 = await testUser.createEmailVerificationToken();
      await testUser.save();

      expect(token1).not.toBe(token2);
    });
  });

  describe('Token Expiration', () => {
    it('should set expiration to 24 hours from creation', async () => {
      const beforeCreate = Date.now();
      await testUser.createEmailVerificationToken();
      await testUser.save();
      const afterCreate = Date.now();

      const user = await User.findById(testUser._id);
      const expiresAt = user.emailVerificationExpires.getTime();
      
      // Should expire approximately 24 hours from now
      const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000;
      const tolerance = 5000; // 5 seconds tolerance
      
      expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiry - tolerance);
      expect(expiresAt).toBeLessThanOrEqual(afterCreate + 24 * 60 * 60 * 1000 + tolerance);
    });
  });

  describe('User Model - cleanupExpiredTokens', () => {
    it('should remove expired verification tokens', async () => {
      // Create user with expired token
      const expiredUser = await User.create({
        email: 'expired@example.com',
        password: 'password123',
        displayName: 'Expired User',
        emailVerificationExpires: new Date(Date.now() - 1000)
      });
      
      await expiredUser.createEmailVerificationToken();
      await expiredUser.save();

      // Verify token exists
      let user = await User.findById(expiredUser._id).select('+emailVerificationToken');
      expect(user.emailVerificationToken).toBeDefined();

      // Run cleanup
      await User.cleanupExpiredTokens();

      // Verify token was removed
      user = await User.findById(expiredUser._id).select('+emailVerificationToken');
      expect(user.emailVerificationToken).toBeUndefined();
      expect(user.emailVerificationExpires).toBeUndefined();
    });

    it('should not remove valid tokens', async () => {
      await testUser.createEmailVerificationToken();
      await testUser.save();

      // Run cleanup
      await User.cleanupExpiredTokens();

      // Verify token still exists
      const user = await User.findById(testUser._id).select('+emailVerificationToken');
      expect(user.emailVerificationToken).toBeDefined();
    });
  });

  describe('Security - Timing Attacks', () => {
    it('should take similar time for valid and invalid tokens', async () => {
      const token = await testUser.createEmailVerificationToken();
      await testUser.save();

      // Time valid token verification
      const start1 = Date.now();
      await request(app).get(`/api/auth/verify-email/${token}`);
      const duration1 = Date.now() - start1;

      // Time invalid token verification
      const start2 = Date.now();
      await request(app).get('/api/auth/verify-email/invalid-token-123456789012345678901234567890');
      const duration2 = Date.now() - start2;

      // Durations should be similar (within 100ms)
      expect(Math.abs(duration1 - duration2)).toBeLessThan(100);
    });
  });

  describe('Integration with Registration Flow', () => {
    it('should complete full registration and verification flow', async () => {
      // 1. Register new user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'flow@example.com',
          password: 'password123',
          displayName: 'Flow User'
        });

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.user.emailVerified).toBe(false);
      
      const newAccessToken = registerRes.body.accessToken;

      // 2. Get user info (should show unverified)
      const meRes1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(meRes1.body.emailVerified).toBe(false);

      // 3. Send verification email
      const sendRes = await request(app)
        .post('/api/auth/send-verification')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(sendRes.status).toBe(200);

      // 4. Get verification token from database
      const user = await User.findOne({ email: 'flow@example.com' }).select('+emailVerificationToken');
      const plainToken = await user.createEmailVerificationToken();
      await user.save();

      // 5. Verify email
      const verifyRes = await request(app)
        .get(`/api/auth/verify-email/${plainToken}`);

      expect(verifyRes.status).toBe(200);

      // 6. Get user info again (should show verified)
      const meRes2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(meRes2.body.emailVerified).toBe(true);
    });
  });
});