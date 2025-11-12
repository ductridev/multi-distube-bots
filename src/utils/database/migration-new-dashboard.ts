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

export { prisma };
