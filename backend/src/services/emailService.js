/**
 * Email Service
 * 
 * Handles all email functionality including password reset emails.
 * Uses nodemailer for SMTP email delivery.
 */

import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email transporter configuration
let transporter = null;

/**
 * Initialize email service with SMTP configuration
 * 
 * @returns {Object} Nodemailer transporter instance
 */
export const initializeEmailService = () => {
  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  };
  
  transporter = nodemailer.createTransport(config);
  
  // Verify connection configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email service configuration error:', error.message);
      console.warn('⚠️  Email service not available - password reset emails will fail');
    } else {
      console.log('✓ Email service ready');
    }
  });
  
  return transporter;
};

/**
 * Load email template from file
 * 
 * @param {string} templateName - Name of template file (without extension)
 * @returns {Promise<string>} Template content
 */
const loadTemplate = async (templateName) => {
  try {
    const templatePath = path.join(
      __dirname,
      '../templates/email',
      `${templateName}.html`
    );
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load email template: ${templateName}`, error);
    throw new Error(`Email template not found: ${templateName}`);
  }
};

/**
 * Load text email template from file
 * 
 * @param {string} templateName - Name of template file (without extension)
 * @returns {Promise<string>} Template content
 */
const loadTextTemplate = async (templateName) => {
  try {
    const templatePath = path.join(
      __dirname,
      '../templates/email',
      `${templateName}.txt`
    );
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load text template: ${templateName}`, error);
    // Return a basic text version if template not found
    return null;
  }
};

/**
 * Replace template variables with actual values
 * 
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} variables - Key-value pairs for replacement
 * @returns {string} Template with variables replaced
 */
const replaceVariables = (template, variables) => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
};

/**
 * Send password reset email to user
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.username - User's display name
 * @param {string} options.resetUrl - Password reset URL with token
 * @param {number} options.expiryMinutes - Token expiry time in minutes
 * @returns {Promise<Object>} Send result from nodemailer
 */
export const sendPasswordResetEmail = async ({
  to,
  username,
  resetUrl,
  expiryMinutes = 15
}) => {
  if (!transporter) {
    throw new Error('Email service not initialized. Call initializeEmailService() first.');
  }
  
  try {
    // Load templates
    const htmlTemplate = await loadTemplate('password-reset');
    const textTemplate = await loadTextTemplate('password-reset');
    
    // Prepare variables
    const variables = {
      username,
      resetUrl,
      expiryMinutes,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@recipebook.com',
      appName: process.env.APP_NAME || 'Recipe Book'
    };
    
    // Replace variables in templates
    const html = replaceVariables(htmlTemplate, variables);
    const text = textTemplate 
      ? replaceVariables(textTemplate, variables)
      : `Password Reset Request\n\nHello ${username},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in ${expiryMinutes} minutes.\n\nIf you didn't request this, please ignore this email.`;
    
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
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
};

/**
 * Send email verification email to user
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.username - User's display name
 * @param {string} options.verificationUrl - Email verification URL with token
 * @returns {Promise<Object>} Send result from nodemailer
 */
export const sendVerificationEmail = async ({
  to,
  username,
  verificationUrl
}) => {
  if (!transporter) {
    throw new Error('Email service not initialized. Call initializeEmailService() first.');
  }
  
  try {
    // Load templates
    const htmlTemplate = await loadTemplate('email-verification');
    const textTemplate = await loadTextTemplate('email-verification');
    
    // Prepare variables
    const variables = {
      username,
      verificationUrl,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@recipebook.com',
      appName: process.env.APP_NAME || 'Recipe Book'
    };
    
    // Replace variables in templates
    const html = replaceVariables(htmlTemplate, variables);
    const text = textTemplate 
      ? replaceVariables(textTemplate, variables)
      : `Welcome to Recipe Book!\n\nHello ${username},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account with Recipe Book, you can safely ignore this email.`;
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Recipe Book" <noreply@recipebook.com>',
      to,
      subject: 'Verify your email - Recipe Book',
      text,
      html
    });
    
    console.log('Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
};

/**
 * Test email service configuration
 * 
 * @returns {Promise<boolean>} True if test successful
 */
export const testEmailService = async () => {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }
  
  try {
    await transporter.verify();
    console.log('✓ Email service test: SUCCESS');
    return true;
  } catch (error) {
    console.error('✗ Email service test: FAILED', error.message);
    return false;
  }
};

/**
 * Send backup failure notification email
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.username - User's display name
 * @param {string} options.provider - Cloud provider name ('dropbox' or 'google_drive')
 * @param {Date} options.lastAttempt - Last backup attempt timestamp
 * @param {number} options.failureCount - Number of consecutive failures
 * @returns {Promise<Object>} Send result from nodemailer
 */
export const sendBackupFailureEmail = async ({
  to,
  username,
  provider,
  lastAttempt,
  failureCount
}) => {
  if (!transporter) {
    console.warn('Email service not initialized, skipping backup failure email');
    return null;
  }
  
  try {
    // Load templates
    const htmlTemplate = await loadTemplate('backup-failure');
    const textTemplate = await loadTextTemplate('backup-failure');
    
    // Format provider name
    const providerName = provider === 'dropbox' ? 'Dropbox' : 'Google Drive';
    
    // Format last attempt timestamp
    const lastAttemptFormatted = new Date(lastAttempt).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    
    // Prepare variables
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const variables = {
      username,
      provider: providerName,
      lastAttempt: lastAttemptFormatted,
      failureCount,
      settingsUrl: `${frontendUrl}/account/cloud-backup`,
      supportUrl: `${frontendUrl}/support`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@recipebook.com',
      appName: process.env.APP_NAME || 'Recipe Book'
    };
    
    // Replace variables in templates
    const html = replaceVariables(htmlTemplate, variables);
    const text = textTemplate 
      ? replaceVariables(textTemplate, variables)
      : `Automatic Backups Disabled\n\nHello ${username},\n\nAutomatic cloud backups have been disabled for your Recipe Book account after ${failureCount} consecutive failures.\n\nProvider: ${providerName}\nLast Attempt: ${lastAttemptFormatted}\n\nPlease visit ${variables.settingsUrl} to reconnect your account and re-enable automatic backups.`;
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Recipe Book" <noreply@recipebook.com>',
      to,
      subject: '⚠️ Automatic Backups Disabled - Recipe Book',
      text,
      html
    });
    
    console.log('Backup failure email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send backup failure email:', error);
    // Don't throw - we don't want email failures to break the backup process
    return null;
  }
};

/**
 * Send a test email (for development/debugging)
 * 
 * @param {string} to - Recipient email
 * @returns {Promise<Object>} Send result
 */
export const sendTestEmail = async (to) => {
  if (!transporter) {
    throw new Error('Email service not initialized');
  }
  
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Recipe Book" <noreply@recipebook.com>',
    to,
    subject: 'Test Email from Recipe Book',
    text: 'This is a test email from Recipe Book application.',
    html: '<p>This is a test email from <strong>Recipe Book</strong> application.</p>'
  });
  
  console.log('Test email sent:', info.messageId);
  return info;
};
