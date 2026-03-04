import { PrismaClient } from '@prisma/client';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { activeBots } from '../../index';
import Logger from '../../structures/Logger';
import type {
	TimePeriod,
	AggregationMethod,
	TrackTypePercentages,
	ActivityData,
	TrackStats,
	TopListener,
	CommandStats,
	ChartDataPoint,
} from '../types/index';

const prisma = new PrismaClient();
const logger = new Logger('StatsController');

// Premium periods require donation >= $1
const PREMIUM_PERIODS: TimePeriod[] = ['last_30_days', 'all_time'];
const MINIMUM_DONATION_AMOUNT = 1.0;

/**
 * Convert period string to date range
 */
function getDateRange(period: TimePeriod): { start: Date; end: Date } {
	const now = new Date();
	const end = new Date(now);
	let start = new Date();

	switch (period) {
		case 'last_4_hours':
			start = new Date(now.getTime() - 4 * 60 * 60 * 1000);
			break;
		case 'today':
			start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			break;
		case 'yesterday':
			start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
			end.setDate(end.getDate() - 1);
			end.setHours(23, 59, 59, 999);
			break;
		case 'last_24_hours':
			start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			break;
		case 'last_7_days':
			start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			break;
		case 'last_30_days':
			start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			break;
		case 'all_time':
			start = new Date(0); // Beginning of time
			break;
		default:
			start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	}

	return { start, end };
}

/**
 * Apply aggregation method to data array
 */
function aggregateData(data: number[], method: AggregationMethod): number {
	if (data.length === 0) return 0;

	switch (method) {
		case 'average':
			return Math.round(data.reduce((a, b) => a + b, 0) / data.length);
		case 'last':
			return data[data.length - 1] ?? 0;
		case 'max':
			return Math.max(...data);
		case 'min':
			return Math.min(...data);
		default:
			return data.reduce((a, b) => a + b, 0) / data.length;
	}
}

/**
 * Check if user has premium status (donated >= $1 USD)
 */
async function checkPremiumStatus(userId: string): Promise<boolean> {
	try {
		const donations = await prisma.userDonation.aggregate({
			where: {
				userId,
				currency: 'USD',
			},
			_sum: {
				amount: true,
			},
		});

		const totalDonated = donations._sum.amount ?? 0;
		return totalDonated >= MINIMUM_DONATION_AMOUNT;
	} catch (error) {
		logger.error('Failed to check premium status:', error);
		return false;
	}
}

/**
 * Get total donation amount for a user
 */
async function getTotalDonated(userId: string): Promise<number> {
	try {
		const donations = await prisma.userDonation.aggregate({
			where: {
				userId,
				currency: 'USD',
			},
			_sum: {
				amount: true,
			},
		});

		return donations._sum.amount ?? 0;
	} catch (error) {
		logger.error('Failed to get total donated:', error);
		return 0;
	}
}

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

			// logger.info(`Recorded stats for ${records.length} bots`);
			return { success: true };
		} catch (error) {
			logger.error('Failed to record stats:', error);
			return { success: false, error: 'Failed to record statistics' };
		}
	}

	// Get top guilds
	static async getTopGuilds(limit: number = 10) {
		try {
			// Limit the query to the last90 days to avoid memory limit issues
			// MongoDB groupBy can exceed memory limit when processing large datasets
			const ninetyDaysAgo = new Date();
			ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

			const topGuilds = await prisma.playerHistory.groupBy({
				by: ['guildId'],
				where: {
					playedAt: { gte: ninetyDaysAgo }, // Only consider recent plays
				},
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
			// Limit the query to the last90 days to avoid memory limit issues
			// MongoDB groupBy can exceed memory limit when processing large datasets
			const ninetyDaysAgo = new Date();
			ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

			const topTracks = await prisma.playerHistory.groupBy({
				by: ['trackTitle', 'trackUrl'],
				where: {
					trackTitle: { not: '' }, // Filter out empty track titles
					playedAt: { gte: ninetyDaysAgo }, // Only consider recent tracks
				},
				_count: { trackTitle: true },
				orderBy: { _count: { trackTitle: 'desc' } },
				take: limit,
			});

			return {
				success: true,
				data: topTracks.map(item => ({
					title: item.trackTitle || 'Unknown Track', // Fallback for null/empty
					url: item.trackUrl,
					playCount: item._count.trackTitle,
				})),
			};
		} catch (error) {
			logger.error('Failed to get top tracks:', error);
			return { success: false, error: 'Failed to fetch top tracks' };
		}
	}

	// ==================== NEW STATISTICS METHODS ====================

	/**
	 * Get server statistics overview
	 */
	static async getServerStatsOverview(
		request: FastifyRequest<{
			Params: { guildId: string };
			Querystring: { period?: TimePeriod; aggregation?: AggregationMethod };
		}>,
		reply: FastifyReply,
	) {
		try {
			const { guildId } = request.params;
			const { period = 'last_24_hours', aggregation = 'average' } = request.query;
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			// Check premium for premium periods
			if (PREMIUM_PERIODS.includes(period)) {
				const isPremium = await checkPremiumStatus(user.discordId);
				if (!isPremium) {
					return reply.status(403).send({
						error: 'Premium required',
						message: 'This feature requires a minimum donation of $1 USD',
						requiredAmount: MINIMUM_DONATION_AMOUNT,
					});
				}
			}

			const { start, end } = getDateRange(period);

			// Get sessions data
			const sessions = await StatsController.getSessionsData(guildId, start, end, aggregation);

			// Get listeners data
			const listeners = await StatsController.getListenersData(guildId, start, end, aggregation);

			// Get track types
			const trackTypes = await StatsController.getTrackTypePercentages(guildId, start, end);

			// Get activity by hours
			const activityHours = await StatsController.getActivityByHours(guildId, start, end);

			// Get activity by weekdays
			const activityWeekdays = await StatsController.getActivityByWeekdays(guildId, start, end);

			// Get most played tracks
			const mostPlayed = await StatsController.getMostPlayedTracks(guildId, start, end, 10);

			// Get top listeners (users who listened the most)
			const mostListened = await StatsController.getTopListeners(guildId, start, end, 10);

			// Get top commands
			const topCommands = await StatsController.getTopCommands(guildId, start, end, 6);

			return {
				success: true,
				data: {
					sessions,
					listeners,
					trackTypes,
					activityHours,
					activityWeekdays,
					mostPlayed,
					mostListened,
					topCommands,
				},
			};
		} catch (error) {
			logger.error('Failed to get server stats overview:', error);
			return reply.status(500).send({ error: 'Failed to fetch server statistics' });
		}
	}

	/**
	 * Build where clause for guild filtering
	 * When guildId is "all", don't filter by guildId to aggregate across all guilds
	 */
	private static buildGuildWhereClause(guildId: string, timestampField: string, start: Date, end: Date): Record<string, unknown> {
		const where: Record<string, unknown> = {
			[timestampField]: { gte: start, lte: end },
		};
		
		if (guildId !== 'all') {
			where.guildId = guildId;
		}
		
		return where;
	}

	/**
	 * Get sessions data for chart
	 */
	private static async getSessionsData(
		guildId: string,
		start: Date,
		end: Date,
		aggregation: AggregationMethod,
	): Promise<number[]> {
		try {
			// Build where clause - don't filter by guildId if "all"
			const where = StatsController.buildGuildWhereClause(guildId, 'startedAt', start, end);

			// First try PlaybackSession table
			const sessions = await prisma.playbackSession.findMany({
				where,
				orderBy: { startedAt: 'asc' },
			});

			// If PlaybackSession has data, use it
			if (sessions.length > 0) {
				// Group by hour intervals
				const hourlyData: Record<string, number[]> = {};

				for (const session of sessions) {
					const hourKey = new Date(session.startedAt);
					hourKey.setMinutes(0, 0, 0);
					const key = hourKey.toISOString();

					if (!hourlyData[key]) {
						hourlyData[key] = [];
					}
					hourlyData[key].push(1); // Count each session as 1
				}

				// Apply aggregation
				return Object.values(hourlyData).map(data => aggregateData(data, aggregation));
			}

			// Fallback to PlayerHistory table
			const historyWhere = StatsController.buildGuildWhereClause(guildId, 'playedAt', start, end);
			const playerHistory = await prisma.playerHistory.findMany({
				where: historyWhere,
				orderBy: { playedAt: 'asc' },
			});

			if (playerHistory.length === 0) {
				return [];
			}

			// Group by hour intervals using PlayerHistory
			const hourlyData: Record<string, number[]> = {};

			for (const play of playerHistory) {
				const hourKey = new Date(play.playedAt);
				hourKey.setMinutes(0, 0, 0);
				const key = hourKey.toISOString();

				if (!hourlyData[key]) {
					hourlyData[key] = [];
				}
				hourlyData[key].push(1); // Count each play as 1
			}

			// Apply aggregation
			return Object.values(hourlyData).map(data => aggregateData(data, aggregation));
		} catch (error) {
			logger.error('Failed to get sessions data:', error);
			return [];
		}
	}

	/**
	 * Get listeners data for chart
	 */
	private static async getListenersData(
		guildId: string,
		start: Date,
		end: Date,
		aggregation: AggregationMethod,
	): Promise<number[]> {
		try {
			// Build where clause - don't filter by guildId if "all"
			const where = StatsController.buildGuildWhereClause(guildId, 'startedAt', start, end);

			// First try PlaybackSession table
			const sessions = await prisma.playbackSession.findMany({
				where,
				orderBy: { startedAt: 'asc' },
				select: {
					startedAt: true,
					listenerCount: true,
				},
			});

			// If PlaybackSession has data, use it
			if (sessions.length > 0) {
				// Group by hour intervals
				const hourlyData: Record<string, number[]> = {};

				for (const session of sessions) {
					const hourKey = new Date(session.startedAt);
					hourKey.setMinutes(0, 0, 0);
					const key = hourKey.toISOString();

					if (!hourlyData[key]) {
						hourlyData[key] = [];
					}
					hourlyData[key].push(session.listenerCount);
				}

				// Apply aggregation
				return Object.values(hourlyData).map(data => aggregateData(data, aggregation));
			}

			// Fallback: PlayerHistory doesn't have listener count, return empty array
			// In the future, this could estimate based on guild member count at time of play
			return [];
		} catch (error) {
			logger.error('Failed to get listeners data:', error);
			return [];
		}
	}

	/**
	 * Detect source from track URL
	 */
	private static detectSourceFromUrl(url: string): string {
		if (url.includes('youtube.com') || url.includes('youtu.be')) {
			return 'youtube';
		}
		if (url.includes('spotify.com')) {
			return 'spotify';
		}
		if (url.includes('soundcloud.com')) {
			return 'soundcloud';
		}
		return 'youtube'; // Default to youtube
	}

	/**
	 * Build where clause for guild filtering in groupBy queries
	 * When guildId is "all", don't filter by guildId to aggregate across all guilds
	 */
	private static buildGroupByWhereClause(guildId: string, timestampField: string, start: Date, end: Date): Record<string, unknown> {
		const where: Record<string, unknown> = {
			[timestampField]: { gte: start, lte: end },
		};
		
		if (guildId !== 'all') {
			where.guildId = guildId;
		}
		
		return where;
	}

	/**
	 * Get track type percentages (YouTube, Spotify, SoundCloud)
	 */
	static async getTrackTypePercentages(
		guildId: string,
		start: Date,
		end: Date,
	): Promise<TrackTypePercentages> {
		try {
			// Build where clause - don't filter by guildId if "all"
			const where = StatsController.buildGroupByWhereClause(guildId, 'startedAt', start, end);

			// First try TrackPlay table
			const trackPlays = await prisma.trackPlay.groupBy({
				by: ['source'],
				where,
				_count: {
					source: true,
				},
			});

			const total = trackPlays.reduce((sum, item) => sum + item._count.source, 0);

			// If TrackPlay has data, use it
			if (total > 0) {
				const result: TrackTypePercentages = { youtube: 0, spotify: 0, soundcloud: 0 };

				for (const item of trackPlays) {
					const percentage = Math.round((item._count.source / total) * 100);
					if (item.source === 'youtube') {
						result.youtube = percentage;
					} else if (item.source === 'spotify') {
						result.spotify = percentage;
					} else if (item.source === 'soundcloud') {
						result.soundcloud = percentage;
					}
				}

				return result;
			}

			// Fallback to PlayerHistory table - use playedAt instead of startedAt
			const historyWhere = StatsController.buildGroupByWhereClause(guildId, 'playedAt', start, end);
			const playerHistory = await prisma.playerHistory.findMany({
				where: historyWhere,
				select: {
					trackUrl: true,
				},
			});

			if (playerHistory.length === 0) {
				return { youtube: 0, spotify: 0, soundcloud: 0 };
			}

			// Count sources from URLs
			const sourceCounts: Record<string, number> = { youtube: 0, spotify: 0, soundcloud: 0 };
			
			for (const item of playerHistory) {
				const source = StatsController.detectSourceFromUrl(item.trackUrl);
				sourceCounts[source] = (sourceCounts[source] || 0) + 1;
			}

			const historyTotal = playerHistory.length;
			return {
				youtube: Math.round((sourceCounts.youtube / historyTotal) * 100),
				spotify: Math.round((sourceCounts.spotify / historyTotal) * 100),
				soundcloud: Math.round((sourceCounts.soundcloud / historyTotal) * 100),
			};
		} catch (error) {
			logger.error('Failed to get track type percentages:', error);
			return { youtube: 0, spotify: 0, soundcloud: 0 };
		}
	}

	/**
	 * Get activity distribution by hours
	 */
	static async getActivityByHours(guildId: string, start: Date, end: Date): Promise<ActivityData[]> {
		try {
			// Build where clause - don't filter by guildId if "all"
			const where = StatsController.buildGuildWhereClause(guildId, 'startedAt', start, end);

			// First try PlaybackSession table
			const sessions = await prisma.playbackSession.findMany({
				where,
				select: {
					startedAt: true,
					duration: true,
				},
			});

			// Initialize hourly data (0-23)
			const hourlyData: number[] = new Array(24).fill(0);

			// If PlaybackSession has data, use it
			if (sessions.length > 0) {
				for (const session of sessions) {
					const hour = new Date(session.startedAt).getHours();
					hourlyData[hour] += session.duration;
				}

				// Format as ActivityData array
				return hourlyData.map((value, hour) => ({
					label: `${hour.toString().padStart(2, '0')}:00`,
					value,
				}));
			}

			// Fallback to PlayerHistory table
			const historyWhere = StatsController.buildGuildWhereClause(guildId, 'playedAt', start, end);
			const playerHistory = await prisma.playerHistory.findMany({
				where: historyWhere,
				select: {
					playedAt: true,
					duration: true,
				},
			});

			// Use duration from PlayerHistory (convert ms to seconds)
			for (const play of playerHistory) {
				const hour = new Date(play.playedAt).getHours();
				hourlyData[hour] += Math.floor(play.duration / 1000); // Convert ms to seconds
			}

			// Format as ActivityData array
			return hourlyData.map((value, hour) => ({
				label: `${hour.toString().padStart(2, '0')}:00`,
				value,
			}));
		} catch (error) {
			logger.error('Failed to get activity by hours:', error);
			return Array.from({ length: 24 }, (_, i) => ({
				label: `${i.toString().padStart(2, '0')}:00`,
				value: 0,
			}));
		}
	}

	/**
	 * Get activity distribution by weekdays
	 */
	static async getActivityByWeekdays(
		guildId: string,
		start: Date,
		end: Date,
	): Promise<ActivityData[]> {
		try {
			// Build where clause - don't filter by guildId if "all"
			const where = StatsController.buildGuildWhereClause(guildId, 'startedAt', start, end);

			// First try PlaybackSession table
			const sessions = await prisma.playbackSession.findMany({
				where,
				select: {
					startedAt: true,
					duration: true,
				},
			});

			// Initialize weekday data (0 = Sunday, 6 = Saturday)
			const weekdayData: number[] = new Array(7).fill(0);
			const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

			// If PlaybackSession has data, use it
			if (sessions.length > 0) {
				for (const session of sessions) {
					const day = new Date(session.startedAt).getDay();
					weekdayData[day] += session.duration;
				}

				// Format as ActivityData array
				return weekdayData.map((value, day) => ({
					label: weekdayLabels[day] ?? 'Unknown',
					value,
				}));
			}

			// Fallback to PlayerHistory table
			const historyWhere = StatsController.buildGuildWhereClause(guildId, 'playedAt', start, end);
			const playerHistory = await prisma.playerHistory.findMany({
				where: historyWhere,
				select: {
					playedAt: true,
					duration: true,
				},
			});

			// Use duration from PlayerHistory (convert ms to seconds)
			for (const play of playerHistory) {
				const day = new Date(play.playedAt).getDay();
				weekdayData[day] += Math.floor(play.duration / 1000); // Convert ms to seconds
			}

			// Format as ActivityData array
			return weekdayData.map((value, day) => ({
				label: weekdayLabels[day] ?? 'Unknown',
				value,
			}));
		} catch (error) {
			logger.error('Failed to get activity by weekdays:', error);
			const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
			return weekdayLabels.map(label => ({ label, value: 0 }));
		}
	}

	/**
	 * Get most played tracks by play count
	 */
	static async getMostPlayedTracks(
		guildId: string,
		start: Date,
		end: Date,
		limit: number = 10,
	): Promise<TrackStats[]> {
		try {
			// Build where clause - don't filter by guildId if "all"
			const where = StatsController.buildGroupByWhereClause(guildId, 'startedAt', start, end);

			// First try TrackPlay table
			const trackPlays = await prisma.trackPlay.groupBy({
				by: ['trackName', 'trackUrl', 'source'],
				where,
				_count: {
					trackName: true,
				},
				_avg: {
					duration: true,
				},
				orderBy: {
					_count: { trackName: 'desc' },
				},
				take: limit,
			});

			// If TrackPlay has data, use it
			if (trackPlays.length > 0) {
				return trackPlays.map(item => ({
					name: item.trackName,
					url: item.trackUrl ?? undefined,
					source: item.source,
					playCount: item._count.trackName,
					totalDuration: item._avg.duration ?? 0,
				}));
			}

			// Fallback to PlayerHistory table - use playedAt instead of startedAt
			const historyWhere: Record<string, unknown> = {
				...StatsController.buildGroupByWhereClause(guildId, 'playedAt', start, end),
				trackTitle: { not: '' }, // Filter out empty track titles
			};
			
			const playerHistory = await prisma.playerHistory.groupBy({
				by: ['trackTitle', 'trackUrl'],
				where: historyWhere,
				_count: {
					trackTitle: true,
				},
				_sum: {
					duration: true,
				},
				orderBy: {
					_count: { trackTitle: 'desc' },
				},
				take: limit,
			});

			return playerHistory.map(item => ({
				name: item.trackTitle || 'Unknown Track', // Fallback for null/empty
				url: item.trackUrl ?? undefined,
				source: StatsController.detectSourceFromUrl(item.trackUrl),
				playCount: item._count.trackTitle,
				totalDuration: Math.floor((item._sum.duration ?? 0) / 1000), // Convert ms to seconds
			}));
		} catch (error) {
			logger.error('Failed to get most played tracks:', error);
			return [];
		}
	}

	/**
	 * Get top listeners (users who listened the most by total duration)
	 */
	static async getTopListeners(
		guildId: string,
		start: Date,
		end: Date,
		limit: number = 10,
	): Promise<TopListener[]> {
		try {
			// Build where clause - don't filter by guildId if "all"
			const where = StatsController.buildGroupByWhereClause(guildId, 'startedAt', start, end);

			// Query TrackPlay table grouped by playedBy (user ID)
			const trackPlays = await prisma.trackPlay.groupBy({
				by: ['playedBy'],
				where: {
					...where,
				},
				_sum: {
					duration: true,
				},
				_count: {
					playedBy: true,
				},
				orderBy: {
					_sum: { duration: 'desc' },
				},
				take: limit,
			});

			// If TrackPlay has data, fetch user info from Discord
			if (trackPlays.length > 0) {
				const listeners = await Promise.all(
					trackPlays.map(async (item) => {
						// Note: playedBy should contain user IDs (Discord snowflakes)
						// Legacy data may contain usernames instead, which won't resolve via Discord API
						const userId = item.playedBy;
						if (!userId) {
							return null;
						}

						// Check if userId looks like a Discord snowflake (17-19 digit number)
						const isSnowflake = /^\d{17,19}$/.test(userId);

						// Try to get user info from Discord bots
						let userInfo: { username: string; avatar: string | null } | null = null;

						if (isSnowflake) {
							// New data: userId is a Discord snowflake, fetch from Discord
							for (const bot of activeBots) {
								try {
									const user = await bot.users.fetch(userId);
									if (user) {
										userInfo = {
											username: user.username,
											avatar: user.avatar,
										};
										break;
									}
								} catch {
									// User not found in this bot's cache, try next bot
								}
							}
						} else {
							// Legacy data: userId is actually a username, use it directly
							userInfo = {
								username: userId,
								avatar: null,
							};
						}

						const listener: TopListener = {
							userId,
							username: userInfo?.username ?? 'Unknown User',
							avatar: userInfo?.avatar ?? null,
							totalDuration: item._sum.duration ?? 0,
							sessionCount: item._count.playedBy,
						};
						return listener;
					})
				);

				// Filter out null entries
				return listeners.filter((listener): listener is TopListener => listener !== null);
			}

			// No data available
			return [];
		} catch (error) {
			logger.error('Failed to get top listeners:', error);
			return [];
		}
	}

	/**
	 * Get top commands by usage
	 */
	static async getTopCommands(
		guildId: string,
		start: Date,
		end: Date,
		limit: number = 6,
	): Promise<CommandStats[]> {
		try {
			// Build where clause - don't filter by guildId if "all"
			const where = StatsController.buildGroupByWhereClause(guildId, 'usedAt', start, end);

			const commandUsage = await prisma.commandUsage.groupBy({
				by: ['commandName'],
				where,
				_count: {
					commandName: true,
				},
				orderBy: {
					_count: { commandName: 'desc' },
				},
				take: limit,
			});

			return commandUsage.map(item => ({
				name: item.commandName,
				usageCount: item._count.commandName,
			}));
		} catch (error) {
			logger.error('Failed to get top commands:', error);
			return [];
		}
	}

	// ==================== CHART ENDPOINT METHODS ====================

	/**
	 * Get sessions chart data
	 */
	static async getSessionsChart(
		request: FastifyRequest<{
			Params: { guildId: string };
			Querystring: { period?: TimePeriod; aggregation?: AggregationMethod };
		}>,
		reply: FastifyReply,
	) {
		try {
			const { guildId } = request.params;
			const { period = 'last_24_hours', aggregation = 'average' } = request.query;
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			if (PREMIUM_PERIODS.includes(period)) {
				const isPremium = await checkPremiumStatus(user.discordId);
				if (!isPremium) {
					return reply.status(403).send({
						error: 'Premium required',
						message: 'This feature requires a minimum donation of $1 USD',
					});
				}
			}

			const { start, end } = getDateRange(period);
			// Build where clause - don't filter by guildId if "all"
			const where = StatsController.buildGuildWhereClause(guildId, 'startedAt', start, end);
			
			const sessions = await prisma.playbackSession.findMany({
				where,
				orderBy: { startedAt: 'asc' },
			});

			// Group by hour intervals
			const hourlyData: Record<string, ChartDataPoint[]> = {};

			for (const session of sessions) {
				const hourKey = new Date(session.startedAt);
				hourKey.setMinutes(0, 0, 0);
				const key = hourKey.toISOString();

				if (!hourlyData[key]) {
					hourlyData[key] = [];
				}
				hourlyData[key].push({
					timestamp: session.startedAt.toISOString(),
					value: 1,
					label: hourKey.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
				});
			}

			// Aggregate and format data
			const data: ChartDataPoint[] = Object.entries(hourlyData).map(([timestamp, points]) => ({
				timestamp,
				value: aggregateData(
					points.map(p => p.value),
					aggregation,
				),
				label: new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
			}));

			return { success: true, data, period, aggregation };
		} catch (error) {
			logger.error('Failed to get sessions chart:', error);
			return reply.status(500).send({ error: 'Failed to fetch sessions chart data' });
		}
	}

	/**
	 * Get listeners chart data
	 */
	static async getListenersChart(
		request: FastifyRequest<{
			Params: { guildId: string };
			Querystring: { period?: TimePeriod; aggregation?: AggregationMethod };
		}>,
		reply: FastifyReply,
	) {
		try {
			const { guildId } = request.params;
			const { period = 'last_24_hours', aggregation = 'average' } = request.query;
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			if (PREMIUM_PERIODS.includes(period)) {
				const isPremium = await checkPremiumStatus(user.discordId);
				if (!isPremium) {
					return reply.status(403).send({
						error: 'Premium required',
						message: 'This feature requires a minimum donation of $1 USD',
					});
				}
			}

			const { start, end } = getDateRange(period);
			// Build where clause - don't filter by guildId if "all"
			const where = StatsController.buildGuildWhereClause(guildId, 'startedAt', start, end);
			
			const sessions = await prisma.playbackSession.findMany({
				where,
				orderBy: { startedAt: 'asc' },
				select: {
					startedAt: true,
					listenerCount: true,
				},
			});

			// Group by hour intervals
			const hourlyData: Record<string, number[]> = {};

			for (const session of sessions) {
				const hourKey = new Date(session.startedAt);
				hourKey.setMinutes(0, 0, 0);
				const key = hourKey.toISOString();

				if (!hourlyData[key]) {
					hourlyData[key] = [];
				}
				hourlyData[key].push(session.listenerCount);
			}

			// Aggregate and format data
			const data: ChartDataPoint[] = Object.entries(hourlyData).map(([timestamp, values]) => ({
				timestamp,
				value: aggregateData(values, aggregation),
				label: new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
			}));

			return { success: true, data, period, aggregation };
		} catch (error) {
			logger.error('Failed to get listeners chart:', error);
			return reply.status(500).send({ error: 'Failed to fetch listeners chart data' });
		}
	}

	/**
	 * Get track types chart data
	 */
	static async getTrackTypesChart(
		request: FastifyRequest<{
			Params: { guildId: string };
			Querystring: { period?: TimePeriod };
		}>,
		reply: FastifyReply,
	) {
		try {
			const { guildId } = request.params;
			const { period = 'last_24_hours' } = request.query;
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			if (PREMIUM_PERIODS.includes(period)) {
				const isPremium = await checkPremiumStatus(user.discordId);
				if (!isPremium) {
					return reply.status(403).send({
						error: 'Premium required',
						message: 'This feature requires a minimum donation of $1 USD',
					});
				}
			}

			const { start, end } = getDateRange(period);
			const data = await StatsController.getTrackTypePercentages(guildId, start, end);

			return { success: true, data, period };
		} catch (error) {
			logger.error('Failed to get track types chart:', error);
			return reply.status(500).send({ error: 'Failed to fetch track types chart data' });
		}
	}

	/**
	 * Get activity by hours chart data
	 */
	static async getActivityHoursChart(
		request: FastifyRequest<{
			Params: { guildId: string };
			Querystring: { period?: TimePeriod };
		}>,
		reply: FastifyReply,
	) {
		try {
			const { guildId } = request.params;
			const { period = 'last_24_hours' } = request.query;
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			if (PREMIUM_PERIODS.includes(period)) {
				const isPremium = await checkPremiumStatus(user.discordId);
				if (!isPremium) {
					return reply.status(403).send({
						error: 'Premium required',
						message: 'This feature requires a minimum donation of $1 USD',
					});
				}
			}

			const { start, end } = getDateRange(period);
			const data = await StatsController.getActivityByHours(guildId, start, end);

			return { success: true, data, period };
		} catch (error) {
			logger.error('Failed to get activity hours chart:', error);
			return reply.status(500).send({ error: 'Failed to fetch activity hours chart data' });
		}
	}

	/**
	 * Get activity by weekdays chart data
	 */
	static async getActivityWeekdaysChart(
		request: FastifyRequest<{
			Params: { guildId: string };
			Querystring: { period?: TimePeriod };
		}>,
		reply: FastifyReply,
	) {
		try {
			const { guildId } = request.params;
			const { period = 'last_24_hours' } = request.query;
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			if (PREMIUM_PERIODS.includes(period)) {
				const isPremium = await checkPremiumStatus(user.discordId);
				if (!isPremium) {
					return reply.status(403).send({
						error: 'Premium required',
						message: 'This feature requires a minimum donation of $1 USD',
					});
				}
			}

			const { start, end } = getDateRange(period);
			const data = await StatsController.getActivityByWeekdays(guildId, start, end);

			return { success: true, data, period };
		} catch (error) {
			logger.error('Failed to get activity weekdays chart:', error);
			return reply.status(500).send({ error: 'Failed to fetch activity weekdays chart data' });
		}
	}

	/**
	 * Get most played tracks list
	 */
	static async getMostPlayedList(
		request: FastifyRequest<{
			Params: { guildId: string };
			Querystring: { period?: TimePeriod };
		}>,
		reply: FastifyReply,
	) {
		try {
			const { guildId } = request.params;
			const { period = 'last_24_hours' } = request.query;
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			if (PREMIUM_PERIODS.includes(period)) {
				const isPremium = await checkPremiumStatus(user.discordId);
				if (!isPremium) {
					return reply.status(403).send({
						error: 'Premium required',
						message: 'This feature requires a minimum donation of $1 USD',
					});
				}
			}

			const { start, end } = getDateRange(period);
			const data = await StatsController.getMostPlayedTracks(guildId, start, end, 10);

			return { success: true, data, period };
		} catch (error) {
			logger.error('Failed to get most played list:', error);
			return reply.status(500).send({ error: 'Failed to fetch most played list' });
		}
	}

	/**
	 * Get most listened tracks list
	 */
	static async getMostListenedList(
		request: FastifyRequest<{
			Params: { guildId: string };
			Querystring: { period?: TimePeriod };
		}>,
		reply: FastifyReply,
	) {
		try {
			const { guildId } = request.params;
			const { period = 'last_24_hours' } = request.query;
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			if (PREMIUM_PERIODS.includes(period)) {
				const isPremium = await checkPremiumStatus(user.discordId);
				if (!isPremium) {
					return reply.status(403).send({
						error: 'Premium required',
						message: 'This feature requires a minimum donation of $1 USD',
					});
				}
			}

			const { start, end } = getDateRange(period);
			const data = await StatsController.getTopListeners(guildId, start, end, 10);

			return { success: true, data, period };
		} catch (error) {
			logger.error('Failed to get most listened list:', error);
			return reply.status(500).send({ error: 'Failed to fetch most listened list' });
		}
	}

	/**
	 * Get top commands list
	 */
	static async getTopCommandsList(
		request: FastifyRequest<{
			Params: { guildId: string };
			Querystring: { period?: TimePeriod };
		}>,
		reply: FastifyReply,
	) {
		try {
			const { guildId } = request.params;
			const { period = 'last_24_hours' } = request.query;
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			if (PREMIUM_PERIODS.includes(period)) {
				const isPremium = await checkPremiumStatus(user.discordId);
				if (!isPremium) {
					return reply.status(403).send({
						error: 'Premium required',
						message: 'This feature requires a minimum donation of $1 USD',
					});
				}
			}

			const { start, end } = getDateRange(period);
			const data = await StatsController.getTopCommands(guildId, start, end, 6);

			return { success: true, data, period };
		} catch (error) {
			logger.error('Failed to get top commands list:', error);
			return reply.status(500).send({ error: 'Failed to fetch top commands list' });
		}
	}

	/**
	 * Check user premium status
	 */
	static async checkPremium(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		try {
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const isPremium = await checkPremiumStatus(user.discordId);
			const totalDonated = await getTotalDonated(user.discordId);

			return {
				success: true,
				data: {
					isPremium,
					totalDonated,
					currency: 'USD',
				},
			};
		} catch (error) {
			logger.error('Failed to check premium status:', error);
			return reply.status(500).send({ error: 'Failed to check premium status' });
		}
	}

	/**
	 * Get servers the user is in (that the bot is also in)
	 */
	static async getUserServers(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		try {
			const user = request.dashboardUser;

			if (!user) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			logger.info(`[getUserServers] Looking for servers for user ${user.discordId}`);
			logger.info(`[getUserServers] Active bots count: ${activeBots.length}`);

			// Get all guilds the user is in by checking mutual guilds across all active bots
			const userServers: Array<{
				guildId: string;
				guildName: string;
				guildIcon: string | null;
				memberCount: number;
				botClientId: string;
				botName: string;
			}> = [];

			for (const bot of activeBots) {
				logger.info(`[getUserServers] Checking bot ${bot.user?.username} (${bot.user?.id}) with ${bot.guilds.cache.size} guilds`);
				for (const guild of bot.guilds.cache.values()) {
					// Check if user is in this guild - fetch from API if not in cache
					const member = guild.members.cache.get(user.discordId)
						|| await guild.members.fetch(user.discordId).catch(() => null);
					
					if (member) {
						logger.info(`[getUserServers] Found user in guild ${guild.name} (${guild.id})`);
						userServers.push({
							guildId: guild.id,
							guildName: guild.name,
							guildIcon: guild.icon,
							memberCount: guild.memberCount,
							botClientId: bot.user?.id || 'Unknown Bot',
							botName: bot.user?.username || 'Unknown Bot',
						});
					}
				}
			}

			logger.info(`[getUserServers] Found ${userServers.length} servers for user`);

			// Remove duplicates (user might be in same guild with multiple bots)
			const uniqueServers = userServers.filter(
				(server, index, self) => index === self.findIndex(s => s.guildId === server.guildId)
			);

			logger.info(`[getUserServers] Returning ${uniqueServers.length} unique servers`);

			return {
				success: true,
				data: uniqueServers,
			};
		} catch (error) {
			logger.error('Failed to get user servers:', error);
			return reply.status(500).send({ error: 'Failed to get user servers' });
		}
	}
}
