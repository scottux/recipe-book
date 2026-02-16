# Password Reset System - Design & Architecture

**Version**: 2.1.3  
**Created**: February 15, 2026  
**Status**: In Design Phase  
**Reference**: REQ-014-password-reset.md

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Design](#database-design)
3. [API Design](#api-design)
4. [Email Service Design](#email-service-design)
5. [Frontend Design](#frontend-design)
6. [Security Design](#security-design)
7. [Rate Limiting Strategy](#rate-limiting-strategy)
8. [Error Handling Strategy](#error-handling-strategy)
9. [Testing Strategy](#testing-strategy)
10. [Implementation Plan](#implementation-plan)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Login Page   │  │ Forgot Pass  │  │ Reset Password Page  │  │
│  │ + "Forgot?"  │  │ Page         │  │ (with token)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP/HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Express)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Auth Controller                             │  │
│  │  • requestPasswordReset()                                 │  │
│  │  • resetPassword()                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                               │                                  │
│  ┌────────────────┬──────────┴──────────┬─────────────────┐   │
│  │                │                     │                  │   │
│  ▼                ▼                     ▼                  ▼   │
│ ┌──────────┐  ┌──────────┐  ┌────────────────┐  ┌─────────┐  │
│ │  Token   │  │  Email   │  │  Rate Limiter  │  │  User   │  │
│ │ Service  │  │ Service  │  │   Middleware   │  │  Model  │  │
│ └──────────┘  └──────────┘  └────────────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
       │                 │                  │
       │                 │                  │
       ▼                 ▼                  ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│  MongoDB   │    │   Email    │    │  In-Memory │
│  Database  │    │  Provider  │    │   Store    │
│            │    │ (SMTP/API) │    │  (Redis*)  │
└────────────┘    └────────────┘    └────────────┘
```

*Redis optional for production distributed rate limiting

### Data Flow

#### Request Password Reset Flow

```
User → Frontend → POST /api/auth/request-reset
                     ↓
              Rate Limiter Check
                     ↓
              Validate Email Format
                     ↓
              Find User in DB
                     ↓
              Generate Token (crypto.randomBytes)
                     ↓
              Hash Token (SHA-256)
                     ↓
              Save Hashed Token to User Document
                     ↓
              Send Email with Plain Token
                     ↓
              Return Generic Success Message
```

#### Reset Password Flow

```
User Clicks Email Link → Frontend extracts token from URL
                            ↓
                     POST /api/auth/reset-password
                            ↓
                     Rate Limiter Check
                            ↓
                     Validate Password Format
                            ↓
                     Hash Received Token
                            ↓
                     Find User by Token Hash
                            ↓
                     Check Token Not Expired
                            ↓
                     Check Token Not Used
                            ↓
                     Hash New Password
                            ↓
                     Update User Password
                            ↓
                     Mark Token as Used
                            ↓
                     Return Success
```

---

## Database Design

### User Model Extensions

**File**: `backend/src/models/User.js`

#### Current Schema
```javascript
{
  username: String,
  email: String,
  password: String,
  refreshTokens: [String],
  createdAt: Date,
  updatedAt: Date
}
```

#### New Fields
```javascript
{
  // Existing fields...
  
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
}
```

#### Indexes

```javascript
// Compound index for efficient token lookup
UserSchema.index({ 
  resetPasswordToken: 1, 
  resetPasswordExpires: 1 
});

// TTL index to auto-delete expired tokens (24 hours after expiration)
UserSchema.index(
  { resetPasswordExpires: 1 },
  { 
    expireAfterSeconds: 86400,  // 24 hours
    partialFilterExpression: { 
      resetPasswordExpires: { $exists: true, $ne: null }
    }
  }
);
```

#### Instance Methods

```javascript
// Generate password reset token
UserSchema.methods.createPasswordResetToken = function() {
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
UserSchema.methods.validateResetToken = function(token) {
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
UserSchema.methods.markResetTokenUsed = function() {
  this.resetPasswordUsedAt = Date.now();
  this.resetPasswordToken = null;
  this.resetPasswordExpires = null;
};
```

#### Static Methods

```javascript
// Find user by reset token
UserSchema.statics.findByResetToken = async function(token) {
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

// Cleanup expired tokens (cron job)
UserSchema.statics.cleanupExpiredTokens = async function() {
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
```

### Migration Strategy

**No migration needed** - New fields have default values (null), so existing users will work without changes.

**Pre-deployment checklist**:
1. ✅ Add new fields to User model
2. ✅ Add indexes (will be created on first query)
3. ✅ Deploy backend code
4. ⚠️ Monitor index creation (may take time on large collections)

---

## API Design

### Endpoint 1: Request Password Reset

```javascript
POST /api/auth/request-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Controller Implementation

**File**: `backend/src/controllers/authController.js`

```javascript
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email format
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    // Find user (timing-safe, don't reveal existence)
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      // Generate reset token
      const resetToken = user.createPasswordResetToken();
      
      // Save user with token
      await user.save({ validateBeforeSave: false });
      
      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      // Send email
      try {
        await sendPasswordResetEmail({
          to: user.email,
          username: user.username,
          resetUrl,
          expiryMinutes: 15
        });
      } catch (emailError) {
        // Rollback token if email fails
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save({ validateBeforeSave: false });
        
        // Log error but don't reveal to user
        console.error('Email send failed:', emailError);
      }
    }
    
    // Always return success (security: don't reveal user existence)
    // Add small random delay to prevent timing attacks
    await randomDelay(50, 200);
    
    res.status(200).json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.'
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset request failed. Please try again later.'
    });
  }
};
```

#### Rate Limiting Configuration

```javascript
// File: backend/src/middleware/rateLimiter.js

import rateLimit from 'express-rate-limit';

export const passwordResetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per email per hour
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again later.',
    retryAfter: 3600 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key generator: by email
  keyGenerator: (req) => {
    return req.body.email?.toLowerCase() || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  }
});

export const passwordResetIPLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per IP per hour
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

### Endpoint 2: Reset Password

```javascript
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "a1b2c3d4...",
  "password": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

#### Controller Implementation

```javascript
export const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    
    // Validate inputs
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide token and new password'
      });
    }
    
    // Check passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }
    
    // Find user by token
    const user = await User.findByResetToken(token);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.',
        requestResetUrl: '/forgot-password'
      });
    }
    
    // Validate token
    const tokenValidation = user.validateResetToken(token);
    if (!tokenValidation.valid) {
      let message = 'Invalid or expired reset token.';
      if (tokenValidation.reason === 'expired') {
        message = 'This reset link has expired. Please request a new one.';
      } else if (tokenValidation.reason === 'used') {
        message = 'This reset link has already been used.';
      }
      
      return res.status(400).json({
        success: false,
        message,
        requestResetUrl: '/forgot-password'
      });
    }
    
    // Update password (will be hashed by pre-save hook)
    user.password = password;
    user.markResetTokenUsed();
    
    // Invalidate all refresh tokens (force re-login)
    user.refreshTokens = [];
    
    await user.save();
    
    // Log password change (hash email for privacy)
    console.info('Password reset successful for user:', hashEmail(user.email));
    
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed. Please try again later.'
    });
  }
};
```

#### Password Validation

```javascript
// File: backend/src/utils/passwordValidator.js

export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!password || password.length < minLength) {
    return {
      valid: false,
      message: `Password must be at least ${minLength} characters long`
    };
  }
  
  if (!hasUpperCase) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }
  
  if (!hasLowerCase) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }
  
  if (!hasNumber) {
    return {
      valid: false,
      message: 'Password must contain at least one number'
    };
  }
  
  return { valid: true };
};
```

### Route Registration

**File**: `backend/src/routes/auth.js`

```javascript
import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  requestPasswordReset,  // NEW
  resetPassword           // NEW
} from '../controllers/authController.js';
import { 
  passwordResetRequestLimiter,  // NEW
  passwordResetIPLimiter         // NEW
} from '../middleware/rateLimiter.js';

const router = express.Router();

// Existing routes...
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// NEW: Password reset routes
router.post(
  '/request-reset',
  passwordResetIPLimiter,
  passwordResetRequestLimiter,
  requestPasswordReset
);

router.post(
  '/reset-password',
  resetPassword
);

export default router;
```

---

## Email Service Design

### Email Service Architecture

```javascript
// File: backend/src/services/emailService.js

import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email transporter configuration
let transporter = null;

export const initializeEmailService = () => {
  const config = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  };
  
  transporter = nodemailer.createTransport(config);
  
  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email service configuration error:', error);
    } else {
      console.log('✓ Email service ready');
    }
  });
  
  return transporter;
};

// Load email template
const loadTemplate = async (templateName) => {
  const templatePath = path.join(
    __dirname,
    '../templates/email',
    `${templateName}.html`
  );
  return await fs.readFile(templatePath, 'utf-8');
};

// Load text template
const loadTextTemplate = async (templateName) => {
  const templatePath = path.join(
    __dirname,
    '../templates/email',
    `${templateName}.txt`
  );
  return await fs.readFile(templatePath, 'utf-8');
};

// Replace template variables
const replaceVariables = (template, variables) => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
};

// Send password reset email
export const sendPasswordResetEmail = async ({
  to,
  username,
  resetUrl,
  expiryMinutes = 15
}) => {
  if (!transporter) {
    throw new Error('Email service not initialized');
  }
  
  // Load templates
  const htmlTemplate = await loadTemplate('password-reset');
  const textTemplate = await loadTextTemplate('password-reset');
  
  // Prepare variables
  const variables = {
    username,
    resetUrl,
    expiryMinutes,
    supportEmail: process.env.SUPPORT_EMAIL || 'support@recipebook.com'
  };
  
  // Replace variables in templates
  const html = replaceVariables(htmlTemplate, variables);
  const text = replaceVariables(textTemplate, variables);
  
  // Send email
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Recipe Book" <noreply@recipebook.com>',
    to,
    subject: 'Password Reset Request - Recipe Book',
    text,
    html
  });
  
  console.log('Password reset email sent:', info.messageId);
  return info;
};

// Test email configuration
export const testEmailService = async () => {
  try {
    await transporter.verify();
    console.log('Email service test: SUCCESS');
    return true;
  } catch (error) {
    console.error('Email service test: FAILED', error);
    return false;
  }
};
```

### Environment Configuration

```bash
# .env file additions

# Email Service Configuration
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreply@recipebook.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_FROM="Recipe Book <noreply@recipebook.com>"
SUPPORT_EMAIL=support@recipebook.com

# Application URLs
FRONTEND_URL=http://localhost:5173
APP_NAME="Recipe Book"

# Token Configuration
RESET_TOKEN_EXPIRY=900000  # 15 minutes in milliseconds
```

### Email Provider Options

#### Development: Gmail SMTP
```javascript
{
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'app-specific-password'
  }
}
```

#### Production Option 1: SendGrid
```javascript
{
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
}
```

#### Production Option 2: AWS SES
```javascript
import aws from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';

const ses = new aws.SES({
  region: process.env.AWS_REGION
});

const transporter = nodemailer.createTransport({
  SES: { ses, aws }
});
```

---

## Frontend Design

### Component Hierarchy

```
src/components/auth/
├── LoginPage.jsx (MODIFY - add forgot password link)
├── ForgotPasswordPage.jsx (NEW)
├── ResetPasswordPage.jsx (NEW)
└── PasswordStrengthIndicator.jsx (NEW - reusable)
```

### 1. Login Page Modification

**File**: `frontend/src/components/auth/LoginPage.jsx`

Add "Forgot Password?" link:

```jsx
// Add after password field, before login button
<div className="flex items-center justify-between mb-6">
  <Link
    to="/forgot-password"
    className="text-sm text-indigo-600 hover:text-indigo-500"
  >
    Forgot password?
  </Link>
</div>
```

### 2. Forgot Password Page

**File**: `frontend/src/components/auth/ForgotPasswordPage.jsx`

```jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Check Your Email
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              If an account exists with that email address, we've sent password
              reset instructions.
            </p>
            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-500">Didn't receive the email?</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Check your spam folder</li>
                <li>• Verify the email address</li>
                <li>
                  •{' '}
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    Request another reset
                  </button>
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <Link
                to="/login"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                ← Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !email}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              ← Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 3. Reset Password Page

**File**: `frontend/src/components/auth/ResetPasswordPage.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../services/api';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Invalid Reset Link
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            This password reset link is invalid or has expired.
          </p>
          <div className="mt-6">
            <Link
              to="/forgot-password"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Password Reset Successful
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your password has been changed successfully. You can now log in with
            your new password.
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Choose New Password
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <PasswordStrengthIndicator password={formData.password} />

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !formData.password || !formData.confirmPassword}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 4. Password Strength Indicator Component

**File**: `frontend/src/components/auth/PasswordStrengthIndicator.jsx`

```jsx
import React from 'react';

export default function PasswordStrengthIndicator({ password }) {
  const requirements = [
    {
      label: 'At least 8 characters',
      met: password.length >= 8
    },
    {
      label: 'Contains uppercase letter',
      met: /[A-Z]/.test(password)
    },
    {
      label: 'Contains lowercase letter',
      met: /[a-z]/.test(password)
    },
    {
      label: 'Contains number',
      met: /[0-9]/.test(password)
    }
  ];

  const allMet = requirements.every((req) => req.met);

  return (
    <div className="mt-2">
      <div className="text-sm font-medium text-gray-700 mb-2">
        Password must:
      </div>
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-center text-sm">
            {req.met ? (
              <svg
                className="h-4 w-4 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 text-gray-300 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 5. API Service Updates

**File**: `frontend/src/services/api.js`

```javascript
// Add to existing API service

export const requestPasswordReset = async (email) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/request-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Password reset request failed');
  }

  return data;
};

export const resetPassword = async ({ token, password, confirmPassword }) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, password, confirmPassword }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Password reset failed');
  }

  return data;
};
```

### 6. Router Configuration

**File**: `frontend/src/App.jsx`

```jsx
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';

// Add routes
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

---

## Security Design

### 1. Token Security

#### Token Generation
```javascript
// Use cryptographically secure random bytes
const token = crypto.randomBytes(32).toString('hex');
// Result: 64-character hexadecimal string

// Never use:
// - Timestamps
// - UUIDs (predictable)
// - Sequential IDs
// - User data
```

#### Token Storage
```javascript
// Store ONLY the hash, never plain token
const hashedToken = crypto
  .createHash('sha256')
  .update(token)
  .digest('hex');

// Database stores: hashedToken
// Email contains: plain token (one-time transmission)
```

#### Token Validation
```javascript
// Constant-time comparison to prevent timing attacks
const isValid = crypto.timingSafeEqual(
  Buffer.from(storedHash),
  Buffer.from(receivedHash)
);
```

### 2. Information Disclosure Prevention

#### Generic Responses
```javascript
// GOOD: Same response regardless of email existence
return res.json({
  message: 'If an account exists, a reset link has been sent.'
});

// BAD: Reveals user existence
if (!user) {
  return res.json({ message: 'Email not found' });
}
```

#### Timing Attack Prevention
```javascript
// Add random delay to prevent timing-based enumeration
const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Use in controller
await randomDelay(50, 200);
```

### 3. Rate Limiting Strategy

#### Multi-Layer Rate Limiting

**Layer 1: Per Email**
- 3 requests per hour
- Prevents targeted attacks

**Layer 2: Per IP**
- 10 requests per hour
- Prevents anonymous abuse

**Layer 3: Per Password Reset**
- 5 password changes per user per day
- Prevents automated attacks

#### Implementation
```javascript
// File: backend/src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

// Email-based limiting
export const emailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => req.body.email.toLowerCase(),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many reset requests. Please try again in an hour.',
      retryAfter: 3600
    });
  }
});

// IP-based limiting
export const ipRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP.'
    });
  }
});
```

### 4. CSRF Protection

```javascript
// Already implemented via JWT in Authorization header
// Cookies not used, so CSRF risk is minimal

// If implementing cookies in future:
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });
router.post('/reset-password', csrfProtection, resetPassword);
```

### 5. Input Validation & Sanitization

```javascript
// Email validation
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 255;
};

// Password validation
const validatePassword = (password) => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
};

// SQL injection prevention (using Mongoose)
// NoSQL injection prevention
const sanitizeInput = (input) => {
  if (typeof input === 'object') {
    throw new Error('Invalid input type');
  }
  return input.trim();
};
```

---

## Rate Limiting Strategy

### Multi-Tier Rate Limiting

```
┌─────────────────────────────────────────────┐
│          Request from User                   │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │   IP Rate Limiter   │
         │  10 req/hour/IP     │
         └─────────┬───────────┘
                   │
         ┌─────────┴──────────┐
         │ Email Rate Limiter  │
         │  3 req/hour/email   │
         └─────────┬───────────┘
                   │
         ┌─────────┴──────────┐
         │   Process Request   │
         └─────────────────────┘
```

### Storage Options

#### Development: In-Memory
```javascript
// Simple, no dependencies
// Resets on server restart
// Not suitable for multiple servers
const store = new Map();
```

#### Production: Redis
```javascript
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const limiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 3, // Number of requests
  duration: 3600, // Per hour
  blockDuration: 3600 // Block for 1 hour
});
```

---

## Error Handling Strategy

### Error Classification

1. **Client Errors (4xx)**
   - 400: Invalid input
   - 401: Expired/invalid token
   - 429: Rate limit exceeded

2. **Server Errors (5xx)**
   - 500: Email service failure
   - 500: Database failure

### Error Response Format

```javascript
{
  success: false,
  message: "User-friendly error message",
  code: "ERROR_CODE",  // Optional
  retryAfter: 3600     // Optional, for rate limits
}
```

### Logging Strategy

```javascript
// Log all errors server-side
console.error('[Password Reset Error]', {
  timestamp: new Date().toISOString(),
  type: 'request_reset',
  emailHash: hashEmail(email),  // Never log plain email
  error: error.message,
  stack: error.stack
});

// Never log:
// - Plain email addresses
// - Reset tokens (plain or hashed)
// - Passwords
// - User IPs (GDPR)
```

---

## Testing Strategy

### Unit Tests (95%+ coverage)

```javascript
describe('Token Generation', () => {
  test('generates 64-character token');
  test('tokens are unique');
  test('stores hash, not plain token');
  test('sets correct expiration');
});

describe('Token Validation', () => {
  test('accepts valid token');
  test('rejects expired token');
  test('rejects used token');
  test('rejects invalid token');
  test('uses constant-time comparison');
});
```

### Integration Tests

```javascript
describe('Password Reset Flow', () => {
  test('full reset journey works');
  test('enforces rate limiting');
  test('handles email service failure');
  test('invalidates old tokens on new request');
});
```

### E2E Tests

```javascript
describe('User Journey', () => {
  test('user can reset password and login');
  test('shows error for expired token');
  test('validates password requirements');
});
```

---

## Implementation Plan

### Phase 3A: Backend Core (2-3 hours)

**Files to Create/Modify**:
- ✅ `backend/src/models/User.js` - Add reset fields & methods
- ✅ `backend/src/services/emailService.js` - Email service
- ✅ `backend/src/services/tokenService.js` - Token utilities
- ✅ `backend/src/controllers/authController.js` - Add controllers
- ✅ `backend/src/middleware/rateLimiter.js` - Rate limiting
- ✅ `backend/src/routes/auth.js` - Add routes
- ✅ `backend/src/utils/passwordValidator.js` - Password validation
- ✅ `backend/.env` - Add configuration

**Tasks**:
1. Update User model with reset fields
2. Implement token generation/validation methods
3. Create email service with nodemailer
4. Implement auth controller methods
5. Add rate limiting middleware
6. Register new routes

### Phase 3B: Email Templates (30 min)

**Files to Create**:
- ✅ `backend/src/templates/email/password-reset.html`
- ✅ `backend/src/templates/email/password-reset.txt`

**Tasks**:
1. Design HTML email template
2. Create plain text version
3. Test template rendering

### Phase 3C: Frontend (2-3 hours)

**Files to Create/Modify**:
- ✅ `frontend/src/components/auth/ForgotPasswordPage.jsx`
- ✅ `frontend/src/components/auth/ResetPasswordPage.jsx`
- ✅ `frontend/src/components/auth/PasswordStrengthIndicator.jsx`
- ✅ `frontend/src/components/auth/LoginPage.jsx` - Add link
- ✅ `frontend/src/services/api.js` - Add methods
- ✅ `frontend/src/App.jsx` - Add routes

**Tasks**:
1. Create ForgotPasswordPage component
2. Create ResetPasswordPage component
3. Create PasswordStrengthIndicator component
4. Update LoginPage with forgot link
5. Add API service methods
6. Register routes in App.jsx

### Phase 3D: Testing (3-4 hours)

**Files to Create**:
- ✅ `backend/src/__tests__/integration/password-reset.test.js`
- ✅ `backend/src/__tests__/unit/tokenService.test.js`
- ✅ `frontend/src/components/auth/__tests__/ForgotPasswordPage.test.jsx`
- ✅ `frontend/src/components/auth/__tests__/ResetPasswordPage.test.jsx`
- ✅ `e2e/password-reset.spec.js`

**Tasks**:
1. Write backend unit tests
2. Write backend integration tests
3. Write frontend component tests
4. Write E2E tests
5. Achieve 95%+ coverage

### Phase 3E: Documentation (30-45 min)

**Files to Update**:
- ✅ `README.md` - Add password reset section
- ✅ `docs/features/password-reset.md` - Feature documentation
- ✅ `docs/api/api-reference.md` - API documentation
- ✅ `CHANGELOG.md` - Version 2.1.3 entry

---

**Design Document Status**: COMPLETE  
**Next Phase**: Phase 4 - Development  
**Estimated Total Time**: 8-11 hours