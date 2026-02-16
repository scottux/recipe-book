import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  preferences: {
    defaultServings: {
      type: Number,
      default: 4,
      min: 1
    },
    measurementSystem: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'imperial'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 days in seconds
    }
  }],
  // Password Reset Fields
  resetPasswordToken: {
    type: String,
    default: null,
    select: false  // Don't include by default
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
    select: false
  },
  resetPasswordUsedAt: {
    type: Date,
    default: null,
    select: false
  },
  // Email Verification Fields
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null,
    select: false  // Don't include by default
  },
  emailVerificationExpires: {
    type: Date,
    default: null,
    select: false
  },
  // Two-Factor Authentication Fields
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null,
    select: false  // Never include by default
  },
  twoFactorBackupCodes: [{
    code: {
      type: String,
      required: true
    },
    usedAt: {
      type: Date,
      default: null
    }
  }],
  twoFactorVerified: {
    type: Boolean,
    default: false
  },
  // Cloud Backup Configuration
  cloudBackup: {
    // Provider Configuration
    provider: {
      type: String,
      enum: ['dropbox', 'google_drive', null],
      default: null
    },
    
    // Encrypted Tokens (never include in queries by default)
    accessToken: {
      type: String,
      select: false
    },
    refreshToken: {
      type: String,
      select: false
    },
    tokenExpiry: {
      type: Date,
      default: null
    },
    
    // Provider Account Info (for display)
    accountEmail: {
      type: String,
      default: null
    },
    accountName: {
      type: String,
      default: null
    },
    accountId: {
      type: String,
      default: null
    },
    
    // Backup Schedule Configuration
    schedule: {
      enabled: {
        type: Boolean,
        default: false
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly'
      },
      time: {
        type: String,  // HH:mm format (e.g., '02:00')
        default: '02:00'
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      lastBackup: {
        type: Date,
        default: null
      },
      lastBackupStatus: {
        type: String,
        enum: ['success', 'failed', 'in_progress', null],
        default: null
      },
      nextBackup: {
        type: Date,
        default: null
      },
      failureCount: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    
    // Retention Policy
    retention: {
      maxBackups: {
        type: Number,
        default: 10,
        min: 1,
        max: 100
      },
      autoCleanup: {
        type: Boolean,
        default: true
      }
    },
    
    // Statistics
    stats: {
      totalBackups: {
        type: Number,
        default: 0,
        min: 0
      },
      manualBackups: {
        type: Number,
        default: 0,
        min: 0
      },
      autoBackups: {
        type: Number,
        default: 0,
        min: 0
      },
      lastManualBackup: {
        type: Date,
        default: null
      },
      totalStorageUsed: {
        type: Number,  // in bytes
        default: 0,
        min: 0
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for lookups
userSchema.index({ email: 1 });

// Compound index for efficient token lookup
userSchema.index({ 
  resetPasswordToken: 1, 
  resetPasswordExpires: 1 
});

// Sparse index for email verification token lookup
userSchema.index(
  { emailVerificationToken: 1 },
  { sparse: true }
);

// Index for cloud backup scheduler queries
userSchema.index({ 
  'cloudBackup.schedule.enabled': 1,
  'cloudBackup.schedule.nextBackup': 1 
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  // Generate 32-byte random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash for storage (SHA-256)
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  // Set expiration (15 minutes from now)
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  
  // Clear previous usage flag
  this.resetPasswordUsedAt = null;
  
  // Return plain token (only time it's available)
  return resetToken;
};

// Validate password reset token
userSchema.methods.validateResetToken = function(token) {
  // Hash provided token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Check if matches stored hash
  if (this.resetPasswordToken !== hashedToken) {
    return { valid: false, reason: 'invalid' };
  }
  
  // Check if expired
  if (Date.now() > this.resetPasswordExpires) {
    return { valid: false, reason: 'expired' };
  }
  
  // Check if already used
  if (this.resetPasswordUsedAt) {
    return { valid: false, reason: 'used' };
  }
  
  return { valid: true };
};

// Mark token as used
userSchema.methods.markResetTokenUsed = function() {
  this.resetPasswordUsedAt = Date.now();
  this.resetPasswordToken = null;
  this.resetPasswordExpires = null;
};

// Generate email verification token
userSchema.methods.createEmailVerificationToken = function() {
  // Generate 32-byte random token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Hash for storage (SHA-256)
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  // Set expiration (24 hours from now)
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  
  // Return plain token (only time it's available)
  return verificationToken;
};

// Validate email verification token
userSchema.methods.validateVerificationToken = function(token) {
  // Check if already verified
  if (this.emailVerified) {
    return { valid: false, reason: 'already_verified' };
  }
  
  // Hash provided token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Check if matches stored hash
  if (this.emailVerificationToken !== hashedToken) {
    return { valid: false, reason: 'invalid' };
  }
  
  // Check if expired
  if (Date.now() > this.emailVerificationExpires) {
    return { valid: false, reason: 'expired' };
  }
  
  return { valid: true };
};

// Mark email as verified
userSchema.methods.markEmailVerified = function() {
  this.emailVerified = true;
  this.emailVerificationToken = null;
  this.emailVerificationExpires = null;
};

// Two-Factor Authentication Methods

// Generate 2FA backup codes
userSchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push({
      code: crypto.createHash('sha256').update(code).digest('hex'),
      usedAt: null
    });
  }
  return codes;
};

// Verify backup code
userSchema.methods.verifyBackupCode = function(code) {
  const hashedCode = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
  
  const backupCode = this.twoFactorBackupCodes.find(
    bc => bc.code === hashedCode && !bc.usedAt
  );
  
  if (!backupCode) {
    return { valid: false, remaining: 0 };
  }
  
  // Mark as used
  backupCode.usedAt = new Date();
  
  // Count remaining codes
  const remaining = this.twoFactorBackupCodes.filter(bc => !bc.usedAt).length;
  
  return { valid: true, remaining };
};

// Method to get public profile (exclude sensitive data)
userSchema.methods.toPublicProfile = function() {
  return {
    id: this._id,
    email: this.email,
    displayName: this.displayName,
    avatar: this.avatar,
    preferences: this.preferences,
    isVerified: this.isVerified,
    emailVerified: this.emailVerified,
    twoFactorEnabled: this.twoFactorEnabled,
    createdAt: this.createdAt
  };
};

// Don't return password in JSON responses
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.resetPasswordUsedAt;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.twoFactorSecret;
  delete obj.twoFactorBackupCodes;
  // Never expose cloud backup tokens in JSON
  if (obj.cloudBackup) {
    delete obj.cloudBackup.accessToken;
    delete obj.cloudBackup.refreshToken;
  }
  return obj;
};

// Static method: Find user by reset token
userSchema.statics.findByResetToken = async function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
    resetPasswordUsedAt: null
  }).select('+resetPasswordToken +resetPasswordExpires +resetPasswordUsedAt');
};

// Static method: Find user by verification token
userSchema.statics.findByVerificationToken = async function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
    emailVerified: false
  }).select('+emailVerificationToken +emailVerificationExpires');
};

// Static method: Cleanup expired tokens (for maintenance/cron)
userSchema.statics.cleanupExpiredTokens = async function() {
  // Cleanup password reset tokens
  const passwordResetResult = await this.updateMany(
    {
      resetPasswordExpires: { $lt: Date.now() },
      resetPasswordToken: { $ne: null }
    },
    {
      $set: {
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    }
  );
  
  // Cleanup email verification tokens
  const emailVerificationResult = await this.updateMany(
    {
      emailVerificationExpires: { $lt: Date.now() },
      emailVerificationToken: { $ne: null }
    },
    {
      $set: {
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    }
  );
  
  return {
    passwordResetTokens: passwordResetResult.modifiedCount,
    emailVerificationTokens: emailVerificationResult.modifiedCount
  };
};

const User = mongoose.model('User', userSchema);

export default User;