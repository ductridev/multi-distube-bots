/**
 * Temporary Announcement Service
 * Manages temporary recurring announcements that automatically expire
 * Supports auto-translation to guild's preferred languages
 */

import { EmbedBuilder, type TextChannel, type ColorResolvable, type Message } from 'discord.js';
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
import { TranslationService } from './TranslationService.js';

const logger = new Logger('TempAnnouncement');

/**
 * Type for message ID map (channelId -> messageId)
 */
type MessageIdMap = Record<string, string>;

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
          // Updated: Capture messageIds from sendAnnouncement
          const { sentCount, messageIds } = await this.sendAnnouncement(announcement);

          // Updated: Pass messageIds to markAnnouncementSent
          await markAnnouncementSent(announcement.id, messageIds);

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
   * Check if bot can send to channel
   */
  private static canSendToChannel(channel: unknown, botUser: { id: string } | null | undefined): channel is TextChannel {
    if (!channel || typeof channel !== 'object') return false;
    const textChannel = channel as TextChannel;
    return (
      textChannel.isTextBased() &&
      textChannel.viewable &&
      textChannel.permissionsFor(botUser?.id ?? '')?.has(['SendMessages', 'EmbedLinks']) === true
    );
  }

  /**
   * Delete old message with error handling
   */
  private static async deleteOldMessage(
    channel: TextChannel,
    messageId: string
  ): Promise<boolean> {
    try {
      const message = await channel.messages.fetch(messageId);
      if (message && message.deletable) {
        await message.delete();
        logger.debug(`Deleted old announcement message ${messageId} in channel ${channel.id}`);
        return true;
      }
    } catch (error: any) {
      // Handle specific error codes
      if (error.code === 10008) {
        // Unknown Message - already deleted
        logger.debug(`Message ${messageId} already deleted`);
      } else if (error.code === 50001 || error.code === 50013) {
        // Missing Access or Missing Permissions
        logger.warn(`Missing permissions to delete message ${messageId}`);
      } else {
        logger.warn(`Failed to delete old message ${messageId}:`, error.message);
      }
    }
    return false;
  }

  /**
   * Send an announcement to all active player text channels with auto-translation
   * @returns Object with sentCount and messageIds map
   */
  private static async sendAnnouncement(
    announcement: TemporaryAnnouncement
  ): Promise<{ sentCount: number; messageIds: MessageIdMap }> {
    // Track sent channel IDs to prevent duplicates
    const sentChannelIds = new Set<string>();
    const messageIds: MessageIdMap = {};
    let sentCount = 0;

    // Parse existing message IDs from previous sends
    const existingMessageIds = (announcement.lastMessageIds as MessageIdMap) || {};

    // Map to store channel info: channelId -> { guildId, language, bot, channel }
    const channelInfoMap = new Map<string, {
      guildId: string;
      language: string;
      bot: typeof activeBots[0];
      channel: TextChannel
    }>();

    // Set to collect all unique languages needed
    const languagesNeeded = new Set<string>();

    // First pass: collect all channels and their guild languages
    for (const bot of activeBots) {
      try {
        const players = Array.from(bot.manager.players.values());

        for (const player of players) {
          const textChannelId = (player as Player).textChannelId;
          const guildId = (player as Player).guildId;

          if (!textChannelId || !guildId) {
            continue;
          }

          // Skip if already processed this channel
          if (channelInfoMap.has(textChannelId)) {
            continue;
          }

          try {
            const channel = bot.channels.cache.get(textChannelId);

            if (this.canSendToChannel(channel, bot.user)) {
              // Get guild's language setting from database
              const guildData = await bot.db.get(guildId);
              const language = guildData?.language || 'EnglishUS';

              channelInfoMap.set(textChannelId, {
                guildId,
                language,
                bot,
                channel: channel as TextChannel
              });
              languagesNeeded.add(language);
            }
          } catch (langError) {
            logger.warn(`Failed to get language for guild ${guildId}:`, langError);
            // Default to EnglishUS if we can't get the language
            const channel = bot.channels.cache.get(textChannelId);
            if (this.canSendToChannel(channel, bot.user)) {
              channelInfoMap.set(textChannelId, {
                guildId,
                language: 'EnglishUS',
                bot,
                channel: channel as TextChannel
              });
              languagesNeeded.add('EnglishUS');
            }
          }
        }
      } catch (botError) {
        logger.warn(`Error processing bot for announcement:`, botError);
      }
    }

    if (channelInfoMap.size === 0) {
      return { sentCount: 0, messageIds: {} };
    }

    // Translate title and description to all needed languages
    const translationService = TranslationService.getInstance();
    const languageArray = Array.from(languagesNeeded);
    
    let titleTranslations: Map<string, string>;
    let descriptionTranslations: Map<string, string>;

    try {
      logger.info(`[TempAnnouncement] Translating "${announcement.title}" to ${languageArray.length} language(s): ${languageArray.join(', ')}`);
      
      // Translate both title and description to all languages
      [titleTranslations, descriptionTranslations] = await Promise.all([
        translationService.translateToMany(announcement.title, languageArray, 'auto'),
        translationService.translateToMany(announcement.description, languageArray, 'auto'),
      ]);
      
      logger.info('[TempAnnouncement] Translation completed successfully');
    } catch (error) {
      logger.error('[TempAnnouncement] Translation failed, using original text:', error);
      // Fall back to original text for all languages
      titleTranslations = new Map(languageArray.map(lang => [lang, announcement.title]));
      descriptionTranslations = new Map(languageArray.map(lang => [lang, announcement.description]));
    }

    // Create embeds for each language
    const embedsByLanguage = new Map<string, EmbedBuilder>();
    
    for (const language of languageArray) {
      const translatedTitle = titleTranslations.get(language) || announcement.title;
      const translatedDescription = descriptionTranslations.get(language) || announcement.description;

      const embed = new EmbedBuilder()
        .setColor((announcement.color || '5865F2') as ColorResolvable)
        .setTitle(translatedTitle)
        .setDescription(translatedDescription)
        .setFooter({
          text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
          iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
        })
        .setTimestamp();

      embedsByLanguage.set(language, embed);
    }

    // Second pass: send translated embeds to each channel
    for (const [channelId, { language, channel }] of channelInfoMap) {
      // Skip if already sent to this channel
      if (sentChannelIds.has(channelId)) {
        continue;
      }

      try {
        // STEP 1: Delete old message if exists
        const oldMessageId = existingMessageIds[channelId];
        if (oldMessageId) {
          await this.deleteOldMessage(channel, oldMessageId);
        }

        // STEP 2: Get the appropriate embed for this channel's language
        const embed = embedsByLanguage.get(language) || embedsByLanguage.get('EnglishUS')!;

        // STEP 3: Send new message and capture ID
        try {
          let sentMessage: Message | undefined;
          await this.rateLimiter.throttled(async () => {
            sentMessage = await channel.send({ embeds: [embed] });
          });

          // STEP 4: Store new message ID
          if (sentMessage) {
            messageIds[channelId] = sentMessage.id;
            sentChannelIds.add(channelId);
            sentCount++;
          }
        } catch (rateLimitError: any) {
          if (rateLimitError.code === 429 || rateLimitError.status === 429) {
            const info = this.rateLimiter.handleRateLimitError(rateLimitError);
            logger.warn(
              `[ANNOUNCEMENT] Rate limited sending to channel ${channelId}. ` +
              `Scope: ${info.scope}, Retry after: ${info.retryAfterMs}ms`
            );
          } else {
            throw rateLimitError;
          }
        }
      } catch (sendError) {
        logger.warn(`Failed to send announcement to channel ${channelId}:`, sendError);
      }
    }

    return { sentCount, messageIds };
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

      const { sentCount, messageIds } = await this.sendAnnouncement(announcement);
      await markAnnouncementSent(id, messageIds);

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
