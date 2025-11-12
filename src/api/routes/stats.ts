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
}
