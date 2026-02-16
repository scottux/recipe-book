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

// Method to get public profile (exclude sensitive data)
userSchema.methods.toPublicProfile = function() {
  return {
    id: this._id,
    email: this.email,
    displayName: this.displayName,
    avatar: this.avatar,
    preferences: this.preferences,
    isVerified: this.isVerified,
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

// Static method: Cleanup expired tokens (for maintenance/cron)
userSchema.statics.cleanupExpiredTokens = async function() {
  const result = await this.updateMany(
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
  
  return result.modifiedCount;
};

const User = mongoose.model('User', userSchema);

export default User;