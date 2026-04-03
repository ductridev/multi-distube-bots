/**
 * Database Utilities
 * Helper functions for working with the new dashboard database models
 */

import { PrismaClient } from '@prisma/client';
import type {
  DashboardUser,
  DashboardSession,
  AuditLog,
  BotStats,
  PlayerHistory
} from '@prisma/client';

const prisma = new PrismaClient();

// ==================== DashboardUser Utilities ====================

/**
 * Create or update a dashboard user from Discord OAuth data
 */
export async function upsertDashboardUser(discordData: {
  id: string;
  username: string;
  avatar?: string;
}): Promise<DashboardUser> {
  return await prisma.dashboardUser.upsert({
    where: { discordId: discordData.id },
    update: {
      username: discordData.username,
      avatar: discordData.avatar,
      lastLogin: new Date()
    },
    create: {
      discordId: discordData.id,
      username: discordData.username,
      avatar: discordData.avatar,
      role: 'user'
    }
  });
}

/**
 * Check if user has permission to manage a specific bot
 */
export async function canManageBot(userId: string, clientId: string): Promise<boolean> {
  const user = await prisma.dashboardUser.findUnique({
    where: { id: userId }
  });

  if (!user) return false;
  if (user.role === 'owner') return true;
  return user.managedBots.includes(clientId);
}

/**
 * Grant bot management permission to a user
 */
export async function grantBotAccess(userId: string, clientId: string): Promise<void> {
  const user = await prisma.dashboardUser.findUnique({
    where: { id: userId }
  });

  if (!user) throw new Error('User not found');

  if (!user.managedBots.includes(clientId)) {
    await prisma.dashboardUser.update({
      where: { id: userId },
      data: {
        managedBots: [...user.managedBots, clientId]
      }
    });
  }
}

// ==================== DashboardSession Utilities ====================

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  token: string,
  expiresInDays: number = 7,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<DashboardSession> {
  return await prisma.dashboardSession.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent
    }
  });
}

/**
 * Validate a session token
 */
export async function validateSession(token: string): Promise<DashboardUser | null> {
  const session = await prisma.dashboardSession.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Session expired, delete it
    await prisma.dashboardSession.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateSession(token: string): Promise<void> {
  await prisma.dashboardSession.deleteMany({ where: { token } });
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.dashboardSession.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  });
  return result.count;
}

// ==================== AuditLog Utilities ====================

/**
 * Log a user action
 */
export async function logAction(
  userId: string,
  action: string,
  target: string,
  metadata?: Record<string, any>
): Promise<AuditLog> {
  return await prisma.auditLog.create({
    data: {
      userId,
      action,
      target,
      metadata: metadata || {}
    }
  });
}

/**
 * Get recent audit logs for a user
 */
export async function getUserAuditLogs(userId: string, limit: number = 50): Promise<AuditLog[]> {
  return await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: { user: true }
  });
}

/**
 * Get audit logs for a specific target (e.g., bot, guild)
 */
export async function getTargetAuditLogs(target: string, limit: number = 50): Promise<AuditLog[]> {
  return await prisma.auditLog.findMany({
    where: { target },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: { user: true }
  });
}

// ==================== BotStats Utilities ====================

/**
 * Record bot statistics
 */
export async function recordBotStats(stats: {
  clientId: string;
  guildCount: number;
  playerCount: number;
  totalPlays: number;
  uptime: number;
  memory: number;
  cpu: number;
  latency: number;
}): Promise<BotStats> {
  return await prisma.botStats.create({
    data: stats
  });
}

/**
 * Get bot statistics for a time range
 */
export async function getBotStats(
  clientId: string,
  startDate: Date,
  endDate: Date = new Date()
): Promise<BotStats[]> {
  return await prisma.botStats.findMany({
    where: {
      clientId,
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { timestamp: 'asc' }
  });
}

/**
 * Get latest bot statistics
 */
export async function getLatestBotStats(clientId: string): Promise<BotStats | null> {
  return await prisma.botStats.findFirst({
    where: { clientId },
    orderBy: { timestamp: 'desc' }
  });
}

/**
 * Get average statistics for a bot
 */
export async function getAverageBotStats(
  clientId: string,
  startDate: Date,
  endDate: Date = new Date()
) {
  return await prisma.botStats.aggregate({
    where: {
      clientId,
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    },
    _avg: {
      guildCount: true,
      playerCount: true,
      memory: true,
      cpu: true,
      latency: true
    },
    _max: {
      totalPlays: true,
      uptime: true
    }
  });
}

/**
 * Clean up old bot statistics (keep last N days)
 */
export async function cleanupOldStats(daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  const result = await prisma.botStats.deleteMany({
    where: { timestamp: { lt: cutoffDate } }
  });
  return result.count;
}

// ==================== PlayerHistory Utilities ====================

/**
 * Record a played track
 */
export async function recordPlayedTrack(data: {
  guildId: string;
  clientId: string;
  trackUrl: string;
  trackTitle: string;
  author: string;
  authorId: string;
  duration: number;
}): Promise<PlayerHistory> {
  return await prisma.playerHistory.create({
    data
  });
}

/**
 * Get play history for a guild
 */
export async function getGuildPlayHistory(
  guildId: string,
  limit: number = 50
): Promise<PlayerHistory[]> {
  return await prisma.playerHistory.findMany({
    where: { guildId },
    orderBy: { playedAt: 'desc' },
    take: limit
  });
}

/**
 * Get play history for a user
 */
export async function getUserPlayHistory(
  author: string,
  limit: number = 50
): Promise<PlayerHistory[]> {
  return await prisma.playerHistory.findMany({
    where: { author },
    orderBy: { playedAt: 'desc' },
    take: limit
  });
}

/**
 * Get most played tracks
 */
export async function getTopTracks(limit: number = 10) {
  return await prisma.playerHistory.groupBy({
    by: ['trackTitle', 'trackUrl'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit
  });
}

/**
 * Get most active guilds
 */
export async function getTopGuilds(limit: number = 10) {
  return await prisma.playerHistory.groupBy({
    by: ['guildId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit
  });
}

/**
 * Get bot play statistics
 */
export async function getBotPlayStats(clientId: string) {
  return await prisma.playerHistory.aggregate({
    where: { clientId },
    _count: { id: true },
    _sum: { duration: true }
  });
}

/**
 * Clean up old player history (keep last N days)
 */
export async function cleanupOldHistory(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  const result = await prisma.playerHistory.deleteMany({
    where: { playedAt: { lt: cutoffDate } }
  });
  return result.count;
}

// ==================== Dashboard Analytics ====================

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardOverview() {
  const [totalUsers, totalSessions, recentLogs, activeBots] = await Promise.all([
    prisma.dashboardUser.count(),
    prisma.dashboardSession.count({ where: { expiresAt: { gte: new Date() } } }),
    prisma.auditLog.count({
      where: { timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    }),
    prisma.botStats.groupBy({
      by: ['clientId'],
      _max: { timestamp: true }
    })
  ]);

  return {
    totalUsers,
    activeSessions: totalSessions,
    actionsLast24h: recentLogs,
    totalBots: activeBots.length
  };
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(userId: string) {
  const [user, sessions, logs, playCount] = await Promise.all([
    prisma.dashboardUser.findUnique({ where: { id: userId } }),
    prisma.dashboardSession.count({
      where: { userId, expiresAt: { gte: new Date() } }
    }),
    prisma.auditLog.count({ where: { userId } }),
    prisma.playerHistory.count({
      where: {
        author: (await prisma.dashboardUser.findUnique({ where: { id: userId } }))?.discordId || ''
      }
    })
  ]);

  return {
    user,
    activeSessions: sessions,
    totalActions: logs,
    totalPlays: playCount
  };
}

// ==================== TemporaryAnnouncement Utilities ====================

import type { TemporaryAnnouncement } from '@prisma/client';

/**
 * Input type for creating a temporary announcement
 */
export interface CreateTemporaryAnnouncementData {
  title: string;
  description: string;
  color?: string;
  intervalMs?: number;
  expiresAt: Date;
  createdBy: string;
  createdByName?: string;
}

/**
 * Input type for updating a temporary announcement
 */
export interface UpdateTemporaryAnnouncementData {
  title?: string;
  description?: string;
  color?: string;
  intervalMs?: number;
  expiresAt?: Date;
  isActive?: boolean;
}

/**
 * Create a new temporary announcement
 */
export async function createTemporaryAnnouncement(
  data: CreateTemporaryAnnouncementData
): Promise<TemporaryAnnouncement> {
  return await prisma.temporaryAnnouncement.create({
    data: {
      title: data.title,
      description: data.description,
      color: data.color ?? '5865F2',
      intervalMs: data.intervalMs ?? 1800000, // Default: 30 minutes
      expiresAt: data.expiresAt,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
    },
  });
}

/**
 * Get all active temporary announcements (not expired, not disabled)
 */
export async function getActiveTemporaryAnnouncements(): Promise<TemporaryAnnouncement[]> {
  const now = new Date();
  return await prisma.temporaryAnnouncement.findMany({
    where: {
      isActive: true,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all temporary announcements (for listing)
 */
export async function getAllTemporaryAnnouncements(): Promise<TemporaryAnnouncement[]> {
  return await prisma.temporaryAnnouncement.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get temporary announcements by filter
 */
export async function getTemporaryAnnouncementsByFilter(
  filter: 'all' | 'active' | 'expired'
): Promise<TemporaryAnnouncement[]> {
  const now = new Date();

  switch (filter) {
    case 'active':
      return await prisma.temporaryAnnouncement.findMany({
        where: {
          isActive: true,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      });
    case 'expired':
      return await prisma.temporaryAnnouncement.findMany({
        where: {
          OR: [
            { isActive: false },
            { expiresAt: { lte: now } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    default:
      return await getAllTemporaryAnnouncements();
  }
}

/**
 * Get a single temporary announcement by ID
 */
export async function getTemporaryAnnouncement(id: string): Promise<TemporaryAnnouncement | null> {
  return await prisma.temporaryAnnouncement.findUnique({
    where: { id },
  });
}

/**
 * Update a temporary announcement
 */
export async function updateTemporaryAnnouncement(
  id: string,
  data: UpdateTemporaryAnnouncementData
): Promise<TemporaryAnnouncement> {
  return await prisma.temporaryAnnouncement.update({
    where: { id },
    data,
  });
}

/**
 * Delete a temporary announcement
 */
export async function deleteTemporaryAnnouncement(id: string): Promise<void> {
  await prisma.temporaryAnnouncement.delete({
    where: { id },
  });
}

/**
 * Update lastSentAt and increment sendCount
 * @param id Announcement ID
 * @param messageIds Optional map of channelId -> messageId for tracking sent messages
 */
export async function markAnnouncementSent(
  id: string,
  messageIds?: Record<string, string>
): Promise<void> {
  await prisma.temporaryAnnouncement.update({
    where: { id },
    data: {
      lastSentAt: new Date(),
      sendCount: { increment: 1 },
      ...(messageIds && { lastMessageIds: messageIds }),
    },
  });
}

/**
 * Mark expired announcements as inactive
 */
export async function markExpiredAnnouncementsInactive(): Promise<number> {
  const now = new Date();
  const result = await prisma.temporaryAnnouncement.updateMany({
    where: {
      isActive: true,
      expiresAt: { lte: now },
    },
    data: { isActive: false },
  });
  return result.count;
}

/**
 * Cleanup expired announcements (delete from database)
 */
export async function cleanupExpiredAnnouncements(): Promise<number> {
  const now = new Date();
  const result = await prisma.temporaryAnnouncement.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { isActive: false },
      ],
    },
  });
  return result.count;
}

/**
 * Get temporary announcement statistics
 */
export async function getTemporaryAnnouncementStats() {
  const now = new Date();
  const [total, active, expired, totalSends] = await Promise.all([
    prisma.temporaryAnnouncement.count(),
    prisma.temporaryAnnouncement.count({
      where: { isActive: true, expiresAt: { gt: now } },
    }),
    prisma.temporaryAnnouncement.count({
      where: {
        OR: [
          { isActive: false },
          { expiresAt: { lte: now } },
        ],
      },
    }),
    prisma.temporaryAnnouncement.aggregate({
      _sum: { sendCount: true },
    }),
  ]);

  return {
    total,
    active,
    expired,
    totalSends: totalSends._sum.sendCount ?? 0,
  };
}

// ==================== PeriodicMessageTracker Utilities ====================

import type { PeriodicMessageTracker } from '@prisma/client';

/**
 * Get periodic message tracker for a guild/bot combination
 */
export async function getPeriodicMessageTracker(
  guildId: string,
  botClientId: string
): Promise<PeriodicMessageTracker | null> {
  return await prisma.periodicMessageTracker.findUnique({
    where: {
      guildId_botClientId: { guildId, botClientId }
    }
  });
}

/**
 * Upsert periodic message tracker with new message ID
 */
export async function upsertPeriodicMessageTracker(
  guildId: string,
  botClientId: string,
  channelId: string,
  messageId: string
): Promise<void> {
  await prisma.periodicMessageTracker.upsert({
    where: {
      guildId_botClientId: { guildId, botClientId }
    },
    update: {
      channelId,
      messageId,
      sentAt: new Date()
    },
    create: {
      guildId,
      botClientId,
      channelId,
      messageId
    }
  });
}

/**
 * Delete periodic message tracker when session ends
 */
export async function deletePeriodicMessageTracker(
  guildId: string,
  botClientId: string
): Promise<void> {
  try {
    await prisma.periodicMessageTracker.delete({
      where: {
        guildId_botClientId: { guildId, botClientId }
      }
    });
  } catch {
    // Ignore if not found
  }
}

/**
 * Cleanup old periodic message trackers
 * Removes trackers older than specified days
 * @param daysOld - Delete trackers older than this many days
 * @returns Number of deleted records
 */
export async function cleanupOldPeriodicMessageTrackers(daysOld: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.periodicMessageTracker.deleteMany({
    where: {
      updatedAt: {
        lt: cutoffDate
      }
    }
  });

  return result.count;
}

export { prisma };
