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

const logger = new Logger('DatabaseCleanup');

/**
 * Schedule cleanup tasks
 */
export function startCleanupScheduler() {
  logger.info('🧹 Starting database cleanup scheduler...');

  // Daily cleanup of expired sessions (runs at midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running daily session cleanup...');
      const deleted = await cleanupExpiredSessions();
      logger.success(`Cleaned up ${deleted} expired session(s)`);
    } catch (error) {
      logger.error('Failed to cleanup sessions:', error);
    }
  });

  // Weekly cleanup of old stats (runs every Sunday at 1 AM)
  cron.schedule('0 1 * * 0', async () => {
    try {
      logger.info('Running weekly stats cleanup (keeping last 30 days)...');
      const deleted = await cleanupOldStats(30);
      logger.success(`Cleaned up ${deleted} old stat record(s)`);
    } catch (error) {
      logger.error('Failed to cleanup stats:', error);
    }
  });

  // Monthly cleanup of old player history (runs on 1st of each month at 2 AM)
  cron.schedule('0 2 1 * *', async () => {
    try {
      logger.info('Running monthly player history cleanup (keeping last 90 days)...');
      const deleted = await cleanupOldHistory(90);
      logger.success(`Cleaned up ${deleted} old history record(s)`);
    } catch (error) {
      logger.error('Failed to cleanup player history:', error);
    }
  });

  logger.success('✅ Database cleanup scheduler started');
}

/**
 * Run all cleanup tasks immediately (for manual execution)
 */
export async function runManualCleanup() {
  logger.info('🧹 Running manual database cleanup...');

  try {
    const [sessions, stats, history] = await Promise.all([
      cleanupExpiredSessions(),
      cleanupOldStats(30),
      cleanupOldHistory(90)
    ]);

    logger.success(`Manual cleanup complete:
      - Expired sessions: ${sessions}
      - Old stats: ${stats}
      - Old history: ${history}`);

    return { sessions, stats, history };
  } catch (error) {
    logger.error('Manual cleanup failed:', error);
    throw error;
  }
}
