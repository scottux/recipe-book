/**
 * Password Validation Utility
 * 
 * Validates password strength and provides detailed feedback.
 * Used for registration and password reset flows.
 */

/**
 * Validate password strength
 * 
 * Requirements:
 * - At least 8 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * 
 * @param {string} password - The password to validate
 * @returns {Object} Validation result with valid flag and message
 */
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!password) {
    return {
      valid: false,
      message: 'Password is required'
    };
  }
  
  if (password.length < minLength) {
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

/**
 * Validate email format
 * 
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

/**
 * Add random delay to prevent timing attacks
 * 
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {Promise<void>}
 */
export const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Hash email for privacy in logs
 * 
 * @param {string} email - Email to hash
 * @returns {string} SHA-256 hash of email
 */
export const hashEmail = (email) => {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase())
    .digest('hex')
    .substring(0, 16); // First 16 chars for brevity
};