import { FastifyInstance } from 'fastify';
import { PlayerController } from '../controllers/PlayerController';
import { authenticateJWT } from '../middleware/auth';
import type { PlayerControlDTO } from '../types';

export async function playerRoutes(fastify: FastifyInstance) {
	// Get all active players
	fastify.get('/', { preHandler: [authenticateJWT] }, async (_request, reply) => {
		const result = await PlayerController.getAllPlayers();
		if (!result.success) {
			return reply.status(500).send(result);
		}
		return reply.send(result);
	});

	// Get player for specific guild
	fastify.get('/:guildId', { preHandler: [authenticateJWT] }, async (request, reply) => {
		const { guildId } = request.params as { guildId: string };
		const result = await PlayerController.getPlayer(guildId);
		if (!result.success) {
			return reply.status(404).send(result);
		}
		return reply.send(result);
	});

	// Control player
	fastify.post('/:guildId/control', { preHandler: [authenticateJWT] }, async (request, reply) => {
		const { guildId } = request.params as { guildId: string };
		const control = request.body as PlayerControlDTO;
		const result = await PlayerController.controlPlayer(guildId, control);
		if (!result.success) {
			return reply.status(400).send(result);
		}
		return reply.send(result);
	});
}
