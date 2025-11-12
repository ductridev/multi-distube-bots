import { FastifyInstance } from 'fastify';
import { BotController } from '../controllers/BotController';
import { authenticateJWT, requireOwner, validateCSRF } from '../middleware/auth';
import { canViewBot, canManageBot, auditLog } from '../middleware/permissions';
import { apiRateLimiter, botManagementRateLimiter } from '../middleware/rateLimit';
import type { CreateBotDTO, UpdateBotDTO } from '../types';

export async function botRoutes(fastify: FastifyInstance) {
	// Apply rate limiting to all bot routes
	fastify.addHook('preHandler', apiRateLimiter);

	// Get all bots
	fastify.get('/', { preHandler: [authenticateJWT] }, async (_request, reply) => {
		const result = await BotController.getAllBots();
		if (!result.success) {
			return reply.status(500).send(result);
		}
		return reply.send(result);
	});

	// Get specific bot
	fastify.get('/:id', { preHandler: [authenticateJWT, canViewBot] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const result = await BotController.getBotById(id);
		if (!result.success) {
			return reply.status(404).send(result);
		}
		return reply.send(result);
	});

	// Create new bot (owner only with CSRF and audit)
	fastify.post(
		'/',
		{ preHandler: [botManagementRateLimiter, authenticateJWT, requireOwner, validateCSRF, auditLog('bot.create')] },
		async (request, reply) => {
			const data = request.body as CreateBotDTO;
			const result = await BotController.createBot(data);
			if (!result.success) {
				return reply.status(400).send(result);
			}
			return reply.status(201).send(result);
		},
	);

	// Update bot (requires bot management permission with CSRF and audit)
	fastify.patch(
		'/:id',
		{ preHandler: [botManagementRateLimiter, authenticateJWT, canManageBot, validateCSRF, auditLog('bot.update')] },
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const data = request.body as UpdateBotDTO;
			const result = await BotController.updateBot(id, data);
			if (!result.success) {
				return reply.status(400).send(result);
			}
			return reply.send(result);
		},
	);

	// Delete bot (owner only with CSRF and audit)
	fastify.delete(
		'/:id',
		{ preHandler: [botManagementRateLimiter, authenticateJWT, requireOwner, validateCSRF, auditLog('bot.delete')] },
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const result = await BotController.deleteBot(id);
		if (!result.success) {
			return reply.status(400).send(result);
		}
		return reply.send(result);
	});

	// Get bot stats
	fastify.get('/:id/stats', { preHandler: [authenticateJWT] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const result = await BotController.getBotStats(id);
		if (!result.success) {
			return reply.status(404).send(result);
		}
		return reply.send(result);
	});
}
