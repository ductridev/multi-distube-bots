/**
 * Temporary Announcement Service
 * Manages temporary recurring announcements that automatically expire
 */

import { EmbedBuilder, type TextChannel, type ColorResolvable } from 'discord.js';
import type { TemporaryAnnouncement } from '@prisma/client';
import Logger from '../structures/Logger';
import { activeBots } from '../index';
import { Player } from 'lavalink-client';
import {
  getActiveTemporaryAnnouncements,
  markAnnouncementSent,
  markExpiredAnnouncementsInactive,
  cleanupExpiredAnnouncements as dbCleanupExpiredAnnouncements,
} from '../utils/database/migration-new-dashboard';
import { RateLimitTracker } from './RateLimitTracker.js';

const logger = new Logger('TempAnnouncement');

/**
 * Interval for checking and sending temporary announcements (30 seconds)
 */
const CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds

/**
 * Global interval reference
 */
let announcementCheckInterval: NodeJS.Timeout | null = null;

export class TemporaryAnnouncementService {
  /**
   * Rate limiter instance for Discord API throttling
   */
  private static rateLimiter: RateLimitTracker = RateLimitTracker.getInstance();

  /**
   * Start the periodic announcement checking job
   * Should be called once when the bot starts
   */
  public static startIntervalCheck(): void {
    if (announcementCheckInterval) {
      logger.info('Temporary announcement service already running, skipping...');
      return;
    }

    logger.info('Starting temporary announcement service...');

    announcementCheckInterval = setInterval(async () => {
      try {
        await this.processAnnouncements();
      } catch (error) {
        logger.error('Error processing announcements:', error);
      }
    }, CHECK_INTERVAL_MS);

    logger.success('Temporary announcement service started');
  }

  /**
   * Stop the periodic check job
   */
  public static stopIntervalCheck(): void {
    if (announcementCheckInterval) {
      clearInterval(announcementCheckInterval);
      announcementCheckInterval = null;
      logger.info('Temporary announcement service stopped');
    }
  }

  /**
   * Check if the service is running
   */
  public static isRunning(): boolean {
    return announcementCheckInterval !== null;
  }

  /**
   * Process all active announcements
   * This is called periodically to check if any announcements need to be sent
   */
  private static async processAnnouncements(): Promise<void> {
    const now = new Date();

    // First, mark any expired announcements as inactive
    const markedInactive = await markExpiredAnnouncementsInactive();
    if (markedInactive > 0) {
      logger.info(`Marked ${markedInactive} expired announcement(s) as inactive`);
    }

    // Get all active announcements
    const announcements = await getActiveTemporaryAnnouncements();

    if (announcements.length === 0) {
      return; // No active announcements
    }

    logger.debug(`Processing ${announcements.length} active announcement(s)`);

    for (const announcement of announcements) {
      try {
        // Double-check expiration (in case of race conditions)
        if (announcement.expiresAt <= now) {
          continue;
        }

        // Check if it's time to send
        const lastSent = announcement.lastSentAt || announcement.createdAt;
        const timeSinceLastSend = now.getTime() - lastSent.getTime();

        if (timeSinceLastSend >= announcement.intervalMs) {
          const sentCount = await this.sendAnnouncement(announcement);

          // Update lastSentAt and increment sendCount
          await markAnnouncementSent(announcement.id);

          logger.info(
            `Sent announcement "${announcement.title}" to ${sentCount} channel(s) (total sends: ${announcement.sendCount + 1})`
          );
        }
      } catch (error) {
        logger.error(`Failed to process announcement ${announcement.id}:`, error);
      }
    }
  }

  /**
   * Send an announcement to all active player text channels
   * @returns Number of channels the announcement was sent to
   */
  private static async sendAnnouncement(announcement: TemporaryAnnouncement): Promise<number> {
    // Track sent channel IDs to prevent duplicates
    const sentChannelIds = new Set<string>();
    let sentCount = 0;

    // Build the embed
    const embed = new EmbedBuilder()
      .setColor((announcement.color || '5865F2') as ColorResolvable)
      .setTitle(announcement.title)
      .setDescription(announcement.description)
      .setFooter({
        text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
        iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
      })
      .setTimestamp();

    // Send to all active bots' players
    for (const bot of activeBots) {
      try {
        const players = Array.from(bot.manager.players.values());

        for (const player of players) {
          const textChannelId = (player as Player).textChannelId;

          if (!textChannelId) {
            continue;
          }

          // Skip if already sent to this channel
          if (sentChannelIds.has(textChannelId)) {
            continue;
          }

          try {
            const channel = bot.channels.cache.get(textChannelId);

            if (
              channel &&
              channel.isTextBased() &&
              (channel as TextChannel).viewable &&
              (channel as TextChannel).permissionsFor(bot.user!)?.has(['SendMessages', 'EmbedLinks'])
            ) {
              try {
                await this.rateLimiter.throttled(async () => {
                  await (channel as TextChannel).send({ embeds: [embed] });
                });
                sentChannelIds.add(textChannelId);
                sentCount++;
              } catch (rateLimitError: any) {
                if (rateLimitError.code === 429 || rateLimitError.status === 429) {
                  const info = this.rateLimiter.handleRateLimitError(rateLimitError);
                  logger.warn(
                    `[ANNOUNCEMENT] Rate limited sending to channel ${textChannelId}. ` +
                    `Scope: ${info.scope}, Retry after: ${info.retryAfterMs}ms`
                  );
                } else {
                  throw rateLimitError;
                }
              }
            }
          } catch (sendError) {
            logger.warn(`Failed to send announcement to channel ${textChannelId}:`, sendError);
          }
        }
      } catch (botError) {
        logger.warn(`Error processing bot for announcement:`, botError);
      }
    }

    return sentCount;
  }

  /**
   * Manually trigger an announcement by ID
   * @returns Number of channels the announcement was sent to
   */
  public static async triggerAnnouncement(id: string): Promise<{ success: boolean; sentCount: number; error?: string }> {
    try {
      const { getTemporaryAnnouncement } = await import('../utils/database/migration-new-dashboard');
      const announcement = await getTemporaryAnnouncement(id);

      if (!announcement) {
        return { success: false, sentCount: 0, error: 'Announcement not found' };
      }

      if (!announcement.isActive) {
        return { success: false, sentCount: 0, error: 'Announcement is inactive' };
      }

      if (announcement.expiresAt <= new Date()) {
        return { success: false, sentCount: 0, error: 'Announcement has expired' };
      }

      const sentCount = await this.sendAnnouncement(announcement);
      await markAnnouncementSent(id);

      return { success: true, sentCount };
    } catch (error) {
      logger.error(`Failed to trigger announcement ${id}:`, error);
      return { success: false, sentCount: 0, error: String(error) };
    }
  }

  /**
   * Cleanup expired announcements from the database
   * @returns Number of deleted announcements
   */
  public static async cleanupExpired(): Promise<number> {
    try {
      const deleted = await dbCleanupExpiredAnnouncements();
      logger.info(`Cleaned up ${deleted} expired announcement(s)`);
      return deleted;
    } catch (error) {
      logger.error('Failed to cleanup expired announcements:', error);
      throw error;
    }
  }

  /**
   * Get service status for debugging
   */
  public static getStatus(): {
    isRunning: boolean;
    checkIntervalMs: number;
  } {
    return {
      isRunning: this.isRunning(),
      checkIntervalMs: CHECK_INTERVAL_MS,
    };
  }
}

export default TemporaryAnnouncementService;
