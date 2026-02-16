/**
 * Token Encryption Utilities
 * 
 * Provides AES-256-CBC encryption for sensitive tokens (OAuth access/refresh tokens)
 * stored in the database. Uses environment variable for encryption key.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

/**
 * Get encryption key from environment
 * Must be 32 bytes (64 hex characters)
 */
function getEncryptionKey() {
  const key = process.env.CLOUD_TOKEN_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('CLOUD_TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  
  // Convert hex string to buffer
  const keyBuffer = Buffer.from(key, 'hex');
  
  if (keyBuffer.length !== 32) {
    throw new Error(
      'CLOUD_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters). ' +
      'Generate with: openssl rand -hex 32'
    );
  }
  
  return keyBuffer;
}

/**
 * Encrypt a token before storing in database
 * 
 * @param {string} token - The plaintext token to encrypt
 * @returns {string} Encrypted token in format "IV:ENCRYPTED_DATA" (hex)
 * 
 * @example
 * const encrypted = encryptToken('my-access-token');
 * // Returns: "a1b2c3d4...f1:e2f3g4h5..."
 */
function encryptToken(token) {
  if (!token) {
    throw new Error('Token is required for encryption');
  }
  
  try {
    const key = getEncryptionKey();
    
    // Generate random IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with key and IV
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the token
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data (both as hex)
    // Format: "IV:ENCRYPTED_DATA"
    return iv.toString('hex') + ':' + encrypted;
    
  } catch (error) {
    throw new Error(`Token encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a token from database
 * 
 * @param {string} encryptedToken - The encrypted token in format "IV:ENCRYPTED_DATA"
 * @returns {string} Decrypted plaintext token
 * 
 * @example
 * const decrypted = decryptToken('a1b2c3d4...f1:e2f3g4h5...');
 * // Returns: "my-access-token"
 */
function decryptToken(encryptedToken) {
  if (!encryptedToken) {
    throw new Error('Encrypted token is required for decryption');
  }
  
  try {
    const key = getEncryptionKey();
    
    // Split IV and encrypted data
    const parts = encryptedToken.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted token format. Expected "IV:ENCRYPTED_DATA"');
    }
    
    const [ivHex, encrypted] = parts;
    
    // Convert hex to buffers
    const iv = Buffer.from(ivHex, 'hex');
    
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length. Expected ${IV_LENGTH} bytes, got ${iv.length}`);
    }
    
    // Create decipher with key and IV
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Decrypt the token
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    throw new Error(`Token decryption failed: ${error.message}`);
  }
}

/**
 * Generate a random encryption key (for setup/development)
 * 
 * @returns {string} 64-character hex string (32 bytes)
 * 
 * @example
 * const key = generateEncryptionKey();
 * console.log(key); // "a1b2c3d4...f1e2" (64 chars)
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate encryption key format
 * 
 * @param {string} key - The key to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidEncryptionKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Must be 64 hex characters (32 bytes)
  if (key.length !== 64) {
    return false;
  }
  
  // Must be valid hex
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    return false;
  }
  
  return true;
}

export {
  encryptToken,
  decryptToken,
  generateEncryptionKey,
  isValidEncryptionKey
};
