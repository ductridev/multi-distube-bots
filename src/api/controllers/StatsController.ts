import { PrismaClient } from '@prisma/client';
import { activeBots } from '../../index';
import Logger from '../../structures/Logger';

const prisma = new PrismaClient();
const logger = new Logger('StatsController');

export class StatsController {
	// Get overview statistics
	static async getOverview() {
		try {
			const totalBots = activeBots.length;
			const totalGuilds = activeBots.reduce((acc, bot) => acc + bot.guilds.cache.size, 0);
			const totalUsers = activeBots.reduce(
				(acc, bot) => acc + bot.guilds.cache.reduce((sum, guild) => sum + guild.memberCount, 0),
				0,
			);
			const totalPlayers = activeBots.reduce(
				(acc, bot) => acc + (bot.manager?.players.size || 0),
				0,
			);

			// Get total plays from database
			const playerHistory = await prisma.playerHistory.count();

			// Calculate average memory and CPU
			const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
			const cpuUsage = process.cpuUsage();

			return {
				success: true,
				data: {
					totalBots,
					totalGuilds,
					totalUsers,
					totalPlayers,
					totalPlays: playerHistory,
					uptime: process.uptime(),
					memory: memoryUsage,
					cpu: cpuUsage,
				},
			};
		} catch (error) {
			logger.error('Failed to get overview stats:', error);
			return { success: false, error: 'Failed to fetch statistics' };
		}
	}

	// Get per-bot metrics
	static async getBotMetrics() {
		try {
			const metrics = activeBots.map(bot => ({
				clientId: bot.childEnv.clientId,
				name: bot.childEnv.name || bot.user?.username || 'Unknown Bot',
				guildCount: bot.guilds.cache.size,
				userCount: bot.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
				playerCount: bot.manager?.players.size || 0,
				ping: bot.ws.ping,
				uptime: process.uptime(),
			}));

			return { success: true, data: metrics };
		} catch (error) {
			logger.error('Failed to get bot metrics:', error);
			return { success: false, error: 'Failed to fetch bot metrics' };
		}
	}

	// Get historical statistics
	static async getHistory(clientId?: string, days: number = 7) {
		try {
			const since = new Date();
			since.setDate(since.getDate() - days);

			const query: any = {
				timestamp: { gte: since },
			};

			if (clientId) {
				query.clientId = clientId;
			}

			const stats = await prisma.botStats.findMany({
				where: query,
				orderBy: { timestamp: 'asc' },
			});

			return { success: true, data: stats };
		} catch (error) {
			logger.error('Failed to get historical stats:', error);
			return { success: false, error: 'Failed to fetch historical statistics' };
		}
	}

	// Record current stats
	static async recordStats() {
		try {
			const records = activeBots.map(bot => ({
				clientId: bot.childEnv.clientId,
				guildCount: bot.guilds.cache.size,
				playerCount: bot.manager?.players.size || 0,
				totalPlays: 0, // Will be updated separately
				uptime: Math.floor(process.uptime()),
				memory: process.memoryUsage().heapUsed / 1024 / 1024,
				cpu: 0, // Calculate if needed
				latency: bot.ws.ping,
			}));

			if (records.length === 0) {
				logger.warn('No bots available to record stats');
				return { success: true, message: 'No bots to record' };
			}

			await prisma.botStats.createMany({
				data: records,
			});

			logger.info(`Recorded stats for ${records.length} bots`);
			return { success: true };
		} catch (error) {
			logger.error('Failed to record stats:', error);
			return { success: false, error: 'Failed to record statistics' };
		}
	}

	// Get top guilds
	static async getTopGuilds(limit: number = 10) {
		try {
			const topGuilds = await prisma.playerHistory.groupBy({
				by: ['guildId'],
				_count: { guildId: true },
				orderBy: { _count: { guildId: 'desc' } },
				take: limit,
			});

			// Enhance with guild info
			const enhancedGuilds = [];
			for (const item of topGuilds) {
				// Find which bot has this guild
				for (const bot of activeBots) {
					const guild = bot.guilds.cache.get(item.guildId);
					if (guild) {
						enhancedGuilds.push({
							guildId: item.guildId,
							guildName: guild.name,
							memberCount: guild.memberCount,
							playCount: item._count.guildId,
						});
						break;
					}
				}
			}

			return { success: true, data: enhancedGuilds };
		} catch (error) {
			logger.error('Failed to get top guilds:', error);
			return { success: false, error: 'Failed to fetch top guilds' };
		}
	}

	// Get top tracks
	static async getTopTracks(limit: number = 10) {
		try {
			const topTracks = await prisma.playerHistory.groupBy({
				by: ['trackTitle', 'trackUrl'],
				_count: { trackTitle: true },
				orderBy: { _count: { trackTitle: 'desc' } },
				take: limit,
			});

			return {
				success: true,
				data: topTracks.map(item => ({
					title: item.trackTitle,
					url: item.trackUrl,
					playCount: item._count.trackTitle,
				})),
			};
		} catch (error) {
			logger.error('Failed to get top tracks:', error);
			return { success: false, error: 'Failed to fetch top tracks' };
		}
	}
}
