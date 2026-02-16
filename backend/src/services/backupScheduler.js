/**
 * Backup Scheduler Service
 * 
 * Manages automatic scheduled backups using node-cron.
 * Checks for due backups every hour and executes them in the background.
 */

import cron from 'node-cron';
import User from '../models/User.js';
import { generateBackupFile, cleanupBackupFile } from './backupGenerator.js';
import dropboxService from './cloudProviders/dropboxService.js';
import { sendBackupFailureEmail } from './emailService.js';
import logger from '../config/logger.js';

class BackupScheduler {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
  }

  /**
   * Start the backup scheduler
   * Runs every hour at minute 5 (e.g., 1:05, 2:05, 3:05, etc.)
   */
  start() {
    if (this.cronJob) {
      logger.warn('Backup scheduler already running');
      return;
    }

    // Schedule: At minute 5 of every hour
    this.cronJob = cron.schedule('5 * * * *', async () => {
      await this.checkAndExecuteBackups();
    });

    this.isRunning = true;
    logger.info('🕒 Backup scheduler started (runs hourly at :05)');
  }

  /**
   * Stop the backup scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      logger.info('Backup scheduler stopped');
    }
  }

  /**
   * Check for due backups and execute them
   */
  async checkAndExecuteBackups() {
    if (!this.isRunning) {
      return;
    }

    try {
      const now = new Date();
      
      // Find users with enabled schedules and due backups
      const users = await User.find({
        'cloudBackup.schedule.enabled': true,
        'cloudBackup.schedule.nextBackup': { $lte: now },
        'cloudBackup.provider': { $ne: null }
      }).select('+cloudBackup.accessToken +cloudBackup.refreshToken');

      if (users.length === 0) {
        logger.debug('No due backups found');
        return;
      }

      logger.info(`📦 Found ${users.length} due backup(s)`);

      // Execute backups with concurrency control (max 5 at a time)
      const batchSize = 5;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(user => this.executeScheduledBackup(user))
        );

        // Log batch results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        logger.info(`Batch ${Math.floor(i / batchSize) + 1}: ${successful} successful, ${failed} failed`);
      }

      logger.info('✅ Scheduled backup check completed');

    } catch (error) {
      logger.error('Backup scheduler error:', error);
    }
  }

  /**
   * Execute a scheduled backup for a specific user
   * 
   * @param {Object} user - User document with cloudBackup populated
   */
  async executeScheduledBackup(user) {
    let backupFilePath = null;

    try {
      logger.info(`Starting scheduled backup for user ${user._id}`);

      // Update status to in_progress
      user.cloudBackup.schedule.lastBackupStatus = 'in_progress';
      await user.save();

      // Generate backup file
      const backupInfo = await generateBackupFile(user._id, 'automatic');
      backupFilePath = backupInfo.path;

      // Upload to cloud provider
      let uploadResult;
      if (user.cloudBackup.provider === 'dropbox') {
        uploadResult = await dropboxService.uploadBackup(user, backupFilePath, 'automatic');
      } else if (user.cloudBackup.provider === 'google_drive') {
        // Google Drive - coming in Week 5
        throw new Error('Google Drive not yet implemented');
      } else {
        throw new Error('Unknown provider');
      }

      // Clean up old backups if retention policy enabled
      if (user.cloudBackup.retention.autoCleanup) {
        await this.cleanupOldBackups(user);
      }

      // Update user record with success
      user.cloudBackup.schedule.lastBackup = new Date();
      user.cloudBackup.schedule.lastBackupStatus = 'success';
      user.cloudBackup.schedule.failureCount = 0;
      user.cloudBackup.schedule.nextBackup = this.calculateNextBackupTime(
        user.cloudBackup.schedule.frequency,
        user.cloudBackup.schedule.time
      );
      user.cloudBackup.stats.totalBackups++;
      user.cloudBackup.stats.autoBackups++;
      user.cloudBackup.stats.totalStorageUsed += backupInfo.size;
      await user.save();

      // Clean up local file
      cleanupBackupFile(backupFilePath);

      logger.info(`✅ Scheduled backup successful for user ${user._id}: ${uploadResult.name}`);

    } catch (error) {
      logger.error(`❌ Scheduled backup failed for user ${user._id}:`, error);

      // Clean up local file if it exists
      if (backupFilePath) {
        cleanupBackupFile(backupFilePath);
      }

      // Update failure status
      try {
        user.cloudBackup.schedule.lastBackupStatus = 'failed';
        user.cloudBackup.schedule.failureCount = (user.cloudBackup.schedule.failureCount || 0) + 1;

        // Retry logic: Retry in 1 hour if failures < 3
        if (user.cloudBackup.schedule.failureCount < 3) {
          user.cloudBackup.schedule.nextBackup = new Date(Date.now() + 60 * 60 * 1000);
          logger.info(`Scheduled retry for user ${user._id} in 1 hour (failure #${user.cloudBackup.schedule.failureCount})`);
        } else {
          // Disable after 3 consecutive failures
          user.cloudBackup.schedule.enabled = false;
          logger.warn(`Disabled automatic backups for user ${user._id} after 3 failures`);
          
          // Send email notification
          try {
            await sendBackupFailureEmail({
              to: user.email,
              username: user.username,
              provider: user.cloudBackup.provider,
              lastAttempt: user.cloudBackup.schedule.lastBackup || new Date(),
              failureCount: user.cloudBackup.schedule.failureCount
            });
            logger.info(`Backup failure notification sent to ${user.email}`);
          } catch (emailError) {
            logger.error('Failed to send backup failure email:', emailError);
            // Don't fail the process if email fails
          }
        }

        await user.save();

      } catch (updateError) {
        logger.error(`Failed to update failure status for user ${user._id}:`, updateError);
      }

      throw error; // Re-throw for Promise.allSettled
    }
  }

  /**
   * Calculate next backup time based on frequency and time
   * 
   * @param {string} frequency - 'daily', 'weekly', or 'monthly'
   * @param {string} time - HH:mm format (e.g., '02:00')
   * @returns {Date} Next backup time
   */
  calculateNextBackupTime(frequency, time) {
    const [hours, minutes] = time.split(':').map(Number);

    let next = new Date();
    next.setHours(hours, minutes, 0, 0);

    // If time has passed today, move to next occurrence
    if (next <= new Date()) {
      if (frequency === 'daily') {
        next.setDate(next.getDate() + 1);
      } else if (frequency === 'weekly') {
        next.setDate(next.getDate() + 7);
      } else if (frequency === 'monthly') {
        next.setMonth(next.getMonth() + 1);
      }
    }

    return next;
  }

  /**
   * Clean up old backups based on retention policy
   * 
   * @param {Object} user - User document
   */
  async cleanupOldBackups(user) {
    try {
      const maxBackups = user.cloudBackup.retention.maxBackups || 10;

      // List all backups
      let backups = [];
      if (user.cloudBackup.provider === 'dropbox') {
        backups = await dropboxService.listBackups(user, 100);
      } else if (user.cloudBackup.provider === 'google_drive') {
        // Google Drive - coming in Week 5
        return;
      }

      // If we have more than max, delete oldest
      if (backups.length > maxBackups) {
        const toDelete = backups.slice(maxBackups);
        
        logger.info(`Cleaning up ${toDelete.length} old backup(s) for user ${user._id}`);
        
        await Promise.all(
          toDelete.map(backup => {
            if (user.cloudBackup.provider === 'dropbox') {
              return dropboxService.deleteBackup(user, backup.id);
            }
            return Promise.resolve();
          })
        );

        logger.info(`✅ Cleaned up ${toDelete.length} old backup(s) for user ${user._id}`);
      }

    } catch (error) {
      // Don't fail the backup if cleanup fails
      logger.error(`Failed to cleanup old backups for user ${user._id}:`, error);
    }
  }

  /**
   * Manually trigger backup check (useful for testing)
   */
  async triggerCheck() {
    logger.info('Manual backup check triggered');
    await this.checkAndExecuteBackups();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cronExpression: '5 * * * *',
      description: 'Runs every hour at minute 5'
    };
  }
}

// Export singleton instance
const backupScheduler = new BackupScheduler();
export default backupScheduler;