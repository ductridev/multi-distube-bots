/**
 * Database Cleanup Service
 * Scheduled tasks to clean up expired/old data from Phase 5 models
 */

import cron from 'node-cron';
import Logger from '../structures/Logger';
import {
  cleanupExpiredSessions,
  cleanupOldStats,
  cleanupOldHistory
} from '../utils/database';
import {
  cleanupExpiredAnnouncements,
  cleanupOldPeriodicMessageTrackers
} from '../utils/database/migration-new-dashboard';

const logger = new Logger('DatabaseCleanup');

const scheduledJobs: { stop: () => void }[] = [];

/**
 * Stop all scheduled cleanup jobs (used for hot reload)
 */
export function stopCleanupScheduler() {
  for (const job of scheduledJobs) {
    job.stop();
  }
  scheduledJobs.length = 0;
  logger.info('Database cleanup scheduler stopped');
}

/**
 * Schedule cleanup tasks
 */
export function startCleanupScheduler() {
  // Stop existing jobs to prevent duplicates on reload
  stopCleanupScheduler();

  logger.info('🧹 Starting database cleanup scheduler...');

  // Daily cleanup of expired sessions (runs at midnight)
  scheduledJobs.push(cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running daily session cleanup...');
      const deleted = await cleanupExpiredSessions();
      logger.success(`Cleaned up ${deleted} expired session(s)`);
    } catch (error) {
      logger.error('Failed to cleanup sessions:', error);
    }
  }));

  // Weekly cleanup of old stats (runs every Sunday at 1 AM)
  scheduledJobs.push(cron.schedule('0 1 * * 0', async () => {
    try {
      logger.info('Running weekly stats cleanup (keeping last 30 days)...');
      const deleted = await cleanupOldStats(30);
      logger.success(`Cleaned up ${deleted} old stat record(s)`);
    } catch (error) {
      logger.error('Failed to cleanup stats:', error);
    }
  }));

  // Monthly cleanup of old player history (runs on 1st of each month at 2 AM)
  scheduledJobs.push(cron.schedule('0 2 1 * *', async () => {
    try {
      logger.info('Running monthly player history cleanup (keeping last 90 days)...');
      const deleted = await cleanupOldHistory(90);
      logger.success(`Cleaned up ${deleted} old history record(s)`);
    } catch (error) {
      logger.error('Failed to cleanup player history:', error);
    }
  }));

  // Daily cleanup of expired temporary announcements (runs at 3 AM)
  scheduledJobs.push(cron.schedule('0 3 * * *', async () => {
    try {
      logger.info('Running daily expired announcement cleanup...');
      const deleted = await cleanupExpiredAnnouncements();
      logger.success(`Cleaned up ${deleted} expired announcement(s)`);
    } catch (error) {
      logger.error('Failed to cleanup expired announcements:', error);
    }
  }));

  // Daily cleanup of old periodic message trackers (runs at 4 AM)
  scheduledJobs.push(cron.schedule('0 4 * * *', async () => {
    try {
      logger.info('Running daily periodic message tracker cleanup (keeping last 7 days)...');
      const deleted = await cleanupOldPeriodicMessageTrackers(7);
      logger.success(`Cleaned up ${deleted} old periodic message tracker(s)`);
    } catch (error) {
      logger.error('Failed to cleanup periodic message trackers:', error);
    }
  }));

  logger.success('✅ Database cleanup scheduler started');
}

/**
 * Run all cleanup tasks immediately (for manual execution)
 */
export async function runManualCleanup() {
  logger.info('🧹 Running manual database cleanup...');

  try {
    const [sessions, stats, history, announcements, periodicTrackers] = await Promise.all([
      cleanupExpiredSessions(),
      cleanupOldStats(30),
      cleanupOldHistory(90),
      cleanupExpiredAnnouncements(),
      cleanupOldPeriodicMessageTrackers(7)
    ]);

    logger.success(`Manual cleanup complete:
      - Expired sessions: ${sessions}
      - Old stats: ${stats}
      - Old history: ${history}
      - Expired announcements: ${announcements}
      - Old periodic message trackers: ${periodicTrackers}`);

    return { sessions, stats, history, announcements, periodicTrackers };
  } catch (error) {
    logger.error('Manual cleanup failed:', error);
    throw error;
  }
}
