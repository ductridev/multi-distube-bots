import { FastifyInstance } from 'fastify';
import { StatsController } from '../controllers/StatsController';
import { authenticateJWT } from '../middleware/auth';

export async function statsRoutes(fastify: FastifyInstance) {
	// Get overview statistics
	fastify.get('/overview', { preHandler: [authenticateJWT] }, async (_request, reply) => {
		const result = await StatsController.getOverview();
		if (!result.success) {
			return reply.status(500).send(result);
		}
		return reply.send(result);
	});

	// Get per-bot metrics
	fastify.get('/bots', { preHandler: [authenticateJWT] }, async (_request, reply) => {
		const result = await StatsController.getBotMetrics();
		if (!result.success) {
			return reply.status(500).send(result);
		}
		return reply.send(result);
	});

	// Get historical statistics
	fastify.get('/history', { preHandler: [authenticateJWT] }, async (request, reply) => {
		const { clientId, days } = request.query as { clientId?: string; days?: string };
		const result = await StatsController.getHistory(clientId, days ? parseInt(days) : 7);
		if (!result.success) {
			return reply.status(500).send(result);
		}
		return reply.send(result);
	});

	// Get top guilds
	fastify.get('/top-guilds', { preHandler: [authenticateJWT] }, async (request, reply) => {
		const { limit } = request.query as { limit?: string };
		const result = await StatsController.getTopGuilds(limit ? parseInt(limit) : 10);
		if (!result.success) {
			return reply.status(500).send(result);
		}
		return reply.send(result);
	});

	// Get top tracks
	fastify.get('/top-tracks', { preHandler: [authenticateJWT] }, async (request, reply) => {
		const { limit } = request.query as { limit?: string };
		const result = await StatsController.getTopTracks(limit ? parseInt(limit) : 10);
		if (!result.success) {
			return reply.status(500).send(result);
		}
		return reply.send(result);
	});

	// Check premium status
	fastify.get('/check-premium', { preHandler: [authenticateJWT] }, async (request, reply) => {
		return StatsController.checkPremium(request, reply);
	});

	// Get user's servers (guilds the user and bot share)
	fastify.get('/user/servers', { preHandler: [authenticateJWT] }, async (request, reply) => {
		return StatsController.getUserServers(request, reply);
	});

	// ==================== SERVER-SPECIFIC STATISTICS ====================

	// Get server stats overview
	fastify.get<{ Params: { guildId: string } }>(
		'/servers/:guildId/overview',
		{ preHandler: [authenticateJWT] },
		async (request, reply) => {
			return StatsController.getServerStatsOverview(
				request as any,
				reply,
			);
		},
	);

	// Get sessions chart data
	fastify.get<{ Params: { guildId: string } }>(
		'/servers/:guildId/charts/sessions',
		{ preHandler: [authenticateJWT] },
		async (request, reply) => {
			return StatsController.getSessionsChart(
				request as any,
				reply,
			);
		},
	);

	// Get listeners chart data
	fastify.get<{ Params: { guildId: string } }>(
		'/servers/:guildId/charts/listeners',
		{ preHandler: [authenticateJWT] },
		async (request, reply) => {
			return StatsController.getListenersChart(
				request as any,
				reply,
			);
		},
	);

	// Get track types chart data
	fastify.get<{ Params: { guildId: string } }>(
		'/servers/:guildId/charts/track-types',
		{ preHandler: [authenticateJWT] },
		async (request, reply) => {
			return StatsController.getTrackTypesChart(
				request as any,
				reply,
			);
		},
	);

	// Get activity by hours chart data
	fastify.get<{ Params: { guildId: string } }>(
		'/servers/:guildId/charts/activity/hours',
		{ preHandler: [authenticateJWT] },
		async (request, reply) => {
			return StatsController.getActivityHoursChart(
				request as any,
				reply,
			);
		},
	);

	// Get activity by weekdays chart data
	fastify.get<{ Params: { guildId: string } }>(
		'/servers/:guildId/charts/activity/weekdays',
		{ preHandler: [authenticateJWT] },
		async (request, reply) => {
			return StatsController.getActivityWeekdaysChart(
				request as any,
				reply,
			);
		},
	);

	// Get most played tracks list
	fastify.get<{ Params: { guildId: string } }>(
		'/servers/:guildId/lists/most-played',
		{ preHandler: [authenticateJWT] },
		async (request, reply) => {
			return StatsController.getMostPlayedList(
				request as any,
				reply,
			);
		},
	);

	// Get most listened tracks list
	fastify.get<{ Params: { guildId: string } }>(
		'/servers/:guildId/lists/most-listened',
		{ preHandler: [authenticateJWT] },
		async (request, reply) => {
			return StatsController.getMostListenedList(
				request as any,
				reply,
			);
		},
	);

	// Get top commands list
	fastify.get<{ Params: { guildId: string } }>(
		'/servers/:guildId/lists/top-commands',
		{ preHandler: [authenticateJWT] },
		async (request, reply) => {
			return StatsController.getTopCommandsList(
				request as any,
				reply,
			);
		},
	);
}
