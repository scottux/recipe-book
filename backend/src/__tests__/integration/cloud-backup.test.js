/**
 * Cloud Backup Integration Tests
 * 
 * Tests for Dropbox OAuth, backup operations, and schedule management
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../index.js';
import User from '../../models/User.js';
import { encryptToken, decryptToken } from '../../utils/encryption.js';
import dropboxService from '../../services/cloudProviders/dropboxService.js';
import Recipe from '../../models/Recipe.js';
import { generateBackupFile } from '../../services/backupGenerator.js';
import fs from 'fs/promises';

let mongoServer;
let testUser;
let authToken;

beforeAll(async () => {
  // Set up test environment variables
  process.env.CLOUD_TOKEN_ENCRYPTION_KEY = '26e27f93e486a80c3313f043787b369f68e941b9d0f3631dbaf4af80107c1485';
  process.env.DROPBOX_APP_KEY = 'test_app_key';
  process.env.DROPBOX_APP_SECRET = 'test_app_secret';
  process.env.DROPBOX_REDIRECT_URI = 'http://localhost:5000/api/cloud/dropbox/callback';
  
  // Mock Dropbox service methods to avoid real API calls
  dropboxService.uploadBackup = async (user, localFilePath, type) => {
    return {
      id: 'id:mock_backup_12345',
      name: `recipe-book-${type}-backup-2026-02-16T15-00-00.zip`,
      size: 1024,
      path: '/Apps/Recipe Book/recipe-book-manual-backup-2026-02-16T15-00-00.zip'
    };
  };
  
  dropboxService.listBackups = async (user, limit) => {
    return [
      {
        id: 'id:backup_1',
        filename: 'recipe-book-manual-backup-2026-02-15T10-00-00.zip',
        size: 2048,
        timestamp: '2026-02-15T10:00:00Z',
        type: 'manual'
      },
      {
        id: 'id:backup_2',
        filename: 'recipe-book-auto-backup-2026-02-14T02-00-00.zip',
        size: 1536,
        timestamp: '2026-02-14T02:00:00Z',
        type: 'automatic'
      }
    ];
  };
  
  dropboxService.downloadBackup = async (user, backupId) => {
    // Create a real backup file for testing
    const backupInfo = await generateBackupFile(user._id, 'manual');
    return backupInfo.path;
  };
  
  dropboxService.deleteBackup = async (user, backupId) => {
    // Mock delete - just return success
    return true;
  };
  
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  // Create test user
  testUser = await User.create({
    email: 'cloudtest@example.com',
    password: 'SecurePassword123!',
    displayName: 'Cloud Test User'
  });
  
  // Get auth token
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'cloudtest@example.com',
      password: 'SecurePassword123!'
    });
  
  authToken = loginRes.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Cloud Backup API - OAuth Flow', () => {
  describe('POST /api/cloud/dropbox/auth', () => {
    it('should initiate Dropbox OAuth and return auth URL', async () => {
      const res = await request(app)
        .get('/api/cloud/dropbox/auth')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.authUrl).toBeDefined();
      expect(res.body.authUrl).toContain('dropbox.com/oauth2/authorize');
      expect(res.body.authUrl).toContain('client_id=');
      expect(res.body.authUrl).toContain('state=');
      expect(res.body.state).toBeDefined();
    });
    
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/cloud/dropbox/auth');
      
      expect(res.status).toBe(401);
    });
  });
  
  describe('GET /api/cloud/status', () => {
    it('should return not connected when no provider configured', async () => {
      const res = await request(app)
        .get('/api/cloud/status')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.connected).toBe(false);
      expect(res.body.provider).toBeNull();
    });
    
    it('should return connected status when provider configured', async () => {
      // Setup cloud backup
      testUser.cloudBackup = {
        provider: 'dropbox',
        accessToken: encryptToken('test_access_token'),
        refreshToken: encryptToken('test_refresh_token'),
        tokenExpiry: new Date(Date.now() + 3600000),
        accountEmail: 'user@dropbox.com',
        accountName: 'Test User',
        accountId: 'dbid:test123',
        schedule: {
          enabled: true,
          frequency: 'weekly',
          time: '02:00',
          timezone: 'UTC'
        },
        retention: {
          maxBackups: 10,
          autoCleanup: true
        },
        stats: {
          totalBackups: 5,
          manualBackups: 3,
          autoBackups: 2
        }
      };
      await testUser.save();
      
      const res = await request(app)
        .get('/api/cloud/status')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.connected).toBe(true);
      expect(res.body.provider).toBe('dropbox');
      expect(res.body.accountEmail).toBe('user@dropbox.com');
      expect(res.body.schedule.enabled).toBe(true);
      expect(res.body.stats.totalBackups).toBe(5);
    });
  });
});

describe('Cloud Backup API - Provider Management', () => {
  beforeEach(async () => {
    // Reset user cloud backup
    testUser.cloudBackup = {
      provider: 'dropbox',
      accessToken: encryptToken('test_access_token'),
      refreshToken: encryptToken('test_refresh_token'),
      tokenExpiry: new Date(Date.now() + 3600000),
      accountEmail: 'user@dropbox.com',
      accountName: 'Test User',
      accountId: 'dbid:test123'
    };
    await testUser.save();
  });
  
  describe('POST /api/cloud/disconnect', () => {
    it('should disconnect cloud provider', async () => {
      const res = await request(app)
        .post('/api/cloud/disconnect')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('disconnected successfully');
      
      // Verify user record updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.cloudBackup.provider).toBe(null);
      expect(updatedUser.cloudBackup.accessToken).toBe(undefined);
    });
    
    it('should fail when no provider connected', async () => {
      // Disconnect first
      await request(app)
        .post('/api/cloud/disconnect')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Try to disconnect again
      const res = await request(app)
        .post('/api/cloud/disconnect')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});

describe('Cloud Backup API - Backup Operations', () => {
  beforeEach(async () => {
    // Setup connected provider
    testUser.cloudBackup = {
      provider: 'dropbox',
      accessToken: encryptToken('test_access_token'),
      refreshToken: encryptToken('test_refresh_token'),
      tokenExpiry: new Date(Date.now() + 3600000),
      accountEmail: 'user@dropbox.com',
      accountName: 'Test User'
    };
    await testUser.save();
  });
  
  describe('POST /api/cloud/backup', () => {
    it('should create and upload manual backup successfully', async () => {
      const res = await request(app)
        .post('/api/cloud/backup')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.backup).toBeDefined();
      expect(res.body.backup.filename).toContain('recipe-book-manual-backup');
      expect(res.body.backup.type).toBe('manual');
      expect(res.body.message).toContain('successfully');
      
      // Verify user stats were updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.cloudBackup.stats.totalBackups).toBe(1);
      expect(updatedUser.cloudBackup.stats.manualBackups).toBe(1);
      expect(updatedUser.cloudBackup.stats.lastManualBackup).toBeDefined();
    });
    
    it('should require cloud provider connection', async () => {
      // Disconnect provider
      await request(app)
        .post('/api/cloud/disconnect')
        .set('Authorization', `Bearer ${authToken}`);
      
      const res = await request(app)
        .post('/api/cloud/backup')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No cloud provider connected');
    });
  });
  
  describe('GET /api/cloud/backups', () => {
    it('should return empty array when no provider connected', async () => {
      // Disconnect provider
      await request(app)
        .post('/api/cloud/disconnect')
        .set('Authorization', `Bearer ${authToken}`);
      
      const res = await request(app)
        .get('/api/cloud/backups')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.backups).toEqual([]);
      expect(res.body.total).toBe(0);
    });
    
    it('should accept limit parameter', async () => {
      const res = await request(app)
        .get('/api/cloud/backups?limit=5')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
  
  describe('GET /api/cloud/backups/:backupId/preview', () => {
    it('should preview backup contents', async () => {
      // Create some test recipes first
      await Recipe.create([
        {
          title: 'Test Recipe 1',
          ingredients: [{ name: 'Ingredient 1', amount: '1 cup' }],
          instructions: ['Step 1'],
          owner: testUser._id
        },
        {
          title: 'Test Recipe 2',
          ingredients: [{ name: 'Ingredient 2', amount: '2 tbsp' }],
          instructions: ['Step 1'],
          owner: testUser._id
        }
      ]);
      
      const res = await request(app)
        .get('/api/cloud/backups/id:backup_1/preview')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preview).toBeDefined();
      expect(res.body.preview.version).toBe('2.2.0');
      expect(res.body.preview.exportDate).toBeDefined();
      expect(res.body.preview.statistics).toBeDefined();
      expect(res.body.preview.statistics.recipeCount).toBe(2);
    });
    
    it('should require cloud provider connection', async () => {
      // Disconnect provider
      await request(app)
        .post('/api/cloud/disconnect')
        .set('Authorization', `Bearer ${authToken}`);
      
      const res = await request(app)
        .get('/api/cloud/backups/id:backup_1/preview')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No cloud provider connected');
    });
  });
  
  describe('POST /api/cloud/restore', () => {
    beforeEach(async () => {
      // Clean up any existing recipes first
      await Recipe.deleteMany({ owner: testUser._id });
      
      // Create some test recipes
      await Recipe.create([
        {
          title: 'Existing Recipe',
          ingredients: [{ name: 'Flour', amount: '2 cups' }],
          instructions: ['Mix'],
          owner: testUser._id
        }
      ]);
    });
    
    afterEach(async () => {
      // Clean up recipes
      await Recipe.deleteMany({ owner: testUser._id });
    });
    
    it('should restore backup in merge mode', async () => {
      const initialCount = await Recipe.countDocuments({ owner: testUser._id });
      expect(initialCount).toBe(1);
      
      const res = await request(app)
        .post('/api/cloud/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          backupId: 'id:backup_1',
          mode: 'merge',
          password: 'SecurePassword123!'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statistics).toBeDefined();
      expect(res.body.message).toContain('Successfully restored');
      
      // Recipes should be merged
      const finalCount = await Recipe.countDocuments({ owner: testUser._id });
      expect(finalCount).toBeGreaterThanOrEqual(initialCount);
    });
    
    it('should restore backup in replace mode', async () => {
      const res = await request(app)
        .post('/api/cloud/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          backupId: 'id:backup_1',
          mode: 'replace',
          password: 'SecurePassword123!'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statistics).toBeDefined();
      
      // Only backup recipes should exist (not the "Existing Recipe")
      const recipes = await Recipe.find({ owner: testUser._id });
      const hasExisting = recipes.some(r => r.title === 'Existing Recipe');
      expect(hasExisting).toBe(false);
    });
    
    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/cloud/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mode: 'merge'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Missing required fields');
    });
    
    it('should validate mode parameter', async () => {
      const res = await request(app)
        .post('/api/cloud/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          backupId: 'id:test123',
          mode: 'invalid',
          password: 'SecurePassword123!'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid mode');
    });
    
    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/cloud/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          backupId: 'id:backup_1',
          mode: 'merge',
          password: 'WrongPassword123!'
        });
      
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid password');
    });
    
    it('should require cloud provider connection', async () => {
      // Disconnect provider
      await request(app)
        .post('/api/cloud/disconnect')
        .set('Authorization', `Bearer ${authToken}`);
      
      const res = await request(app)
        .post('/api/cloud/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          backupId: 'id:backup_1',
          mode: 'merge',
          password: 'SecurePassword123!'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No cloud provider connected');
    });
  });
});

describe('Cloud Backup API - Schedule Management', () => {
  beforeEach(async () => {
    // Setup connected provider
    testUser.cloudBackup = {
      provider: 'dropbox',
      accessToken: encryptToken('test_access_token'),
      refreshToken: encryptToken('test_refresh_token'),
      tokenExpiry: new Date(Date.now() + 3600000),
      accountEmail: 'user@dropbox.com',
      schedule: {
        enabled: false,
        frequency: 'weekly',
        time: '02:00',
        timezone: 'UTC'
      }
    };
    await testUser.save();
  });
  
  describe('PUT /api/cloud/schedule', () => {
    it('should update schedule settings', async () => {
      const res = await request(app)
        .put('/api/cloud/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          frequency: 'daily',
          time: '03:00',
          timezone: 'America/New_York'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.schedule.enabled).toBe(true);
      expect(res.body.schedule.frequency).toBe('daily');
      expect(res.body.schedule.time).toBe('03:00');
      expect(res.body.schedule.nextBackup).toBeDefined();
    });
    
    it('should calculate next backup time when enabled', async () => {
      const res = await request(app)
        .put('/api/cloud/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          frequency: 'weekly'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.schedule.enabled).toBe(true);
      expect(res.body.schedule.nextBackup).toBeDefined();
      
      const nextBackup = new Date(res.body.schedule.nextBackup);
      expect(nextBackup.getTime()).toBeGreaterThan(Date.now());
    });
    
    it('should clear next backup time when disabled', async () => {
      const res = await request(app)
        .put('/api/cloud/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: false
        });
      
      expect(res.status).toBe(200);
      expect(res.body.schedule.enabled).toBe(false);
      expect(res.body.schedule.nextBackup).toBeNull();
    });
    
    it('should validate frequency values', async () => {
      const res = await request(app)
        .put('/api/cloud/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          frequency: 'invalid'
        });
      
      expect(res.status).toBe(200);
      // Invalid frequency should be ignored
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.cloudBackup.schedule.frequency).toBe('weekly'); // unchanged
    });
    
    it('should validate time format', async () => {
      const res = await request(app)
        .put('/api/cloud/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          time: '25:00' // invalid
        });
      
      expect(res.status).toBe(200);
      // Invalid time should be ignored
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.cloudBackup.schedule.time).toBe('02:00'); // unchanged
    });
    
    it('should require cloud provider connection', async () => {
      // Disconnect provider
      await request(app)
        .post('/api/cloud/disconnect')
        .set('Authorization', `Bearer ${authToken}`);
      
      const res = await request(app)
        .put('/api/cloud/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No cloud provider connected');
    });
  });
  
  describe('GET /api/cloud/schedule', () => {
    it('should return current schedule', async () => {
      const res = await request(app)
        .get('/api/cloud/schedule')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.schedule).toBeDefined();
      expect(res.body.schedule.enabled).toBe(false);
      expect(res.body.schedule.frequency).toBe('weekly');
    });
    
    it('should require cloud provider connection', async () => {
      // Disconnect provider
      await request(app)
        .post('/api/cloud/disconnect')
        .set('Authorization', `Bearer ${authToken}`);
      
      const res = await request(app)
        .get('/api/cloud/schedule')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No cloud provider connected');
    });
  });
});

describe('Token Encryption', () => {
  it('should encrypt and decrypt tokens correctly', () => {
    const originalToken = 'test_access_token_12345';
    
    const encrypted = encryptToken(originalToken);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(originalToken);
    expect(encrypted).toContain(':'); // IV:DATA format
    
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });
  
  it('should use different IVs for same token', () => {
    const token = 'same_token_value';
    
    const encrypted1 = encryptToken(token);
    const encrypted2 = encryptToken(token);
    
    // Different IVs mean different encrypted values
    expect(encrypted1).not.toBe(encrypted2);
    
    // But both decrypt to same value
    expect(decryptToken(encrypted1)).toBe(token);
    expect(decryptToken(encrypted2)).toBe(token);
  });
  
  it('should throw error for empty strings', () => {
    expect(() => encryptToken('')).toThrow('Token is required for encryption');
  });
});

describe('Security - Token Protection', () => {
  it('should not expose tokens in JSON response', async () => {
    // Setup user with tokens
    testUser.cloudBackup = {
      provider: 'dropbox',
      accessToken: encryptToken('secret_access_token'),
      refreshToken: encryptToken('secret_refresh_token'),
      accountEmail: 'user@dropbox.com'
    };
    await testUser.save();
    
    const res = await request(app)
      .get('/api/cloud/status')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    
    // Tokens should not be in response
    const responseStr = JSON.stringify(res.body);
    expect(responseStr).not.toContain('secret_access_token');
    expect(responseStr).not.toContain('secret_refresh_token');
    expect(responseStr).not.toContain('accessToken');
    expect(responseStr).not.toContain('refreshToken');
    
    // But account info should be present
    expect(res.body.accountEmail).toBe('user@dropbox.com');
  });
});