import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../index.js';
import User from '../../models/User.js';

describe('Password Reset Integration Tests', () => {
  let testUser;
  const testEmail = 'passwordreset@test.com';
  const testPassword = 'OldPassword123!';
  const newPassword = 'NewPassword456!';

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/recipe-book-test');
  });

  beforeEach(async () => {
    // Clear users collection
    await User.deleteMany({});
    
    // Create test user
    testUser = await User.create({
      email: testEmail,
      password: testPassword,
      displayName: 'Password Reset User'
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should successfully request a password reset for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset');

      // Verify token was saved in database
      const updatedUser = await User.findById(testUser._id)
        .select('+resetPasswordToken +resetPasswordExpires');
      expect(updatedUser.resetPasswordToken).toBeDefined();
      expect(updatedUser.resetPasswordExpires).toBeDefined();
      expect(updatedUser.resetPasswordExpires.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not reveal if email does not exist (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      // Should still return success to not reveal user existence
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/auth/forgot-password')
            .send({ email: testEmail })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/auth/validate-reset-token', () => {
    let validToken;

    beforeEach(async () => {
      // Generate valid reset token
      validToken = jwt.sign(
        { userId: testUser._id.toString(), email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Save token to user
      testUser.resetPasswordToken = validToken;
      testUser.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
      await testUser.save();
    });

    it('should validate a valid reset token', async () => {
      const response = await request(app)
        .get(`/api/auth/validate-reset-token?token=${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.email).toBe(testEmail);
    });

    it('should reject invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/validate-reset-token?token=invalid-token');

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
    });

    it('should reject expired token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: testUser._id.toString(), email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );

      const response = await request(app)
        .get(`/api/auth/validate-reset-token?token=${expiredToken}`);

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
    });

    it('should reject token not in database', async () => {
      // Generate token but don't save it
      const unsavedToken = jwt.sign(
        { userId: testUser._id.toString(), email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const response = await request(app)
        .get(`/api/auth/validate-reset-token?token=${unsavedToken}`);

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/api/auth/validate-reset-token');

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let validToken;

    beforeEach(async () => {
      // Generate valid reset token
      validToken = jwt.sign(
        { userId: testUser._id.toString(), email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Save token to user
      testUser.resetPasswordToken = validToken;
      testUser.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
      await testUser.save();
    });

    it('should successfully reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: newPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify password was changed
      const updatedUser = await User.findById(testUser._id)
        .select('+resetPasswordToken +resetPasswordExpires');
      const isPasswordChanged = await updatedUser.comparePassword(newPassword);
      expect(isPasswordChanged).toBe(true);

      // Verify token was cleared
      expect(updatedUser.resetPasswordToken).toBeNull();
      expect(updatedUser.resetPasswordExpires).toBeNull();
    });

    it('should be able to login with new password', async () => {
      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: newPassword
        });

      // Try to login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
    });

    it('should not be able to use old password after reset', async () => {
      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: newPassword
        });

      // Try to login with old password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(loginResponse.status).toBe(401);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should reject password without uppercase', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: 'password123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject password without number', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: 'PasswordOnly'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject expired token', async () => {
      // Manually expire the token
      testUser.resetPasswordExpires = new Date(Date.now() - 1000);
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject reusing the same token twice', async () => {
      // First reset
      const firstResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: newPassword
        });

      expect(firstResponse.status).toBe(200);

      // Try to use same token again
      const secondResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: 'AnotherPassword123!'
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.success).toBe(false);
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          password: newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Complete Password Reset Flow', () => {
    it('should complete entire password reset flow successfully', async () => {
      // Step 1: Request password reset
      const forgotResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(forgotResponse.status).toBe(200);

      // Get the token from database (in real scenario, user gets it from email)
      const userWithToken = await User.findById(testUser._id)
        .select('+resetPasswordToken');
      const resetToken = userWithToken.resetPasswordToken;

      // Step 2: Validate token
      const validateResponse = await request(app)
        .get(`/api/auth/validate-reset-token?token=${resetToken}`);

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.valid).toBe(true);

      // Step 3: Reset password
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword
        });

      expect(resetResponse.status).toBe(200);

      // Step 4: Login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
    });
  });
});