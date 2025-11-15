import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DashboardUser {
	id: string;
	discordId: string;
	username: string;
	avatar: string | null;
	role: string;
	managedBots: string[];
}

/**
 * Check if user has permission to manage a specific bot
 */
export async function canManageBot(request: FastifyRequest, reply: FastifyReply) {
	const user = (request as any).dashboardUser as DashboardUser;
	const { id } = request.params as { id: string };

	if (!user) {
		return reply.status(401).send({ error: 'Unauthorized' });
	}

	// Owners can manage all bots
	if (user.role === 'owner') {
		return;
	}

	// For admins, we need to resolve if this is a MongoDB ID or clientId
	let botClientId = id;
	if (id.match(/^[0-9a-fA-F]{24}$/)) {
		// It's a MongoDB ObjectId, fetch the bot to get clientId
		const bot = await prisma.botConfig.findUnique({
			where: { id },
			select: { clientId: true },
		});
		if (bot) {
			botClientId = bot.clientId;
		}
	}

	// Admins can only manage bots they're assigned to
	if (user.role === 'admin') {
		if (!user.managedBots.includes(botClientId)) {
			return reply.status(403).send({ 
				error: 'Forbidden: You do not have permission to manage this bot',
				details: `You can only manage bots: ${user.managedBots.join(', ')}`
			});
		}
		return;
	}

	// Moderators and users cannot manage bots
	return reply.status(403).send({ 
		error: 'Forbidden: Insufficient permissions to manage bots' 
	});
}

/**
 * Check if user has permission to view bot information
 */
export async function canViewBot(request: FastifyRequest, reply: FastifyReply) {
	const user = (request as any).dashboardUser as DashboardUser;
	const { id } = request.params as { id: string };

	if (!user) {
		return reply.status(401).send({ error: 'Unauthorized' });
	}

	// Owners can view all bots
	if (user.role === 'owner') {
		return;
	}

	// For admins, we need to resolve if this is a MongoDB ID or clientId
	// If it's a MongoDB ID (24 hex chars), we need to fetch the bot to get clientId
	let botClientId = id;
	if (id.match(/^[0-9a-fA-F]{24}$/)) {
		// It's a MongoDB ObjectId, fetch the bot to get clientId
		const prisma = await import('@prisma/client').then(m => new m.PrismaClient());
		const bot = await prisma.botConfig.findUnique({
			where: { id },
			select: { clientId: true },
		});
		if (bot) {
			botClientId = bot.clientId;
		}
	}

	// Admins can view bots they manage
	if (user.role === 'admin' && user.managedBots.includes(botClientId)) {
		return;
	}

	// Moderators can view all bots (read-only)
	if (user.role === 'moderator') {
		return;
	}

	return reply.status(403).send({ 
		error: 'Forbidden: You do not have permission to view this bot' 
	});
}

/**
 * Check if user has permission to control players
 */
export async function canControlPlayer(request: FastifyRequest, reply: FastifyReply) {
	const user = (request as any).dashboardUser as DashboardUser;

	if (!user) {
		return reply.status(401).send({ error: 'Unauthorized' });
	}

	// All authenticated users except 'user' role can control players
	if (['owner', 'admin', 'moderator'].includes(user.role)) {
		return;
	}

	return reply.status(403).send({ 
		error: 'Forbidden: Insufficient permissions to control players' 
	});
}

/**
 * Check if user has permission to view guild information
 */
export async function canViewGuild(request: FastifyRequest, reply: FastifyReply) {
	const user = (request as any).dashboardUser as DashboardUser;

	if (!user) {
		return reply.status(401).send({ error: 'Unauthorized' });
	}

	// All authenticated dashboard users can view guilds
	if (['owner', 'admin', 'moderator'].includes(user.role)) {
		return;
	}

	return reply.status(403).send({ 
		error: 'Forbidden: Insufficient permissions to view guilds' 
	});
}

/**
 * Check if user has permission to modify guild configuration
 */
export async function canModifyGuild(request: FastifyRequest, reply: FastifyReply) {
	const user = (request as any).dashboardUser as DashboardUser;

	if (!user) {
		return reply.status(401).send({ error: 'Unauthorized' });
	}

	// Only owners and admins can modify guild configurations
	if (['owner', 'admin'].includes(user.role)) {
		return;
	}

	return reply.status(403).send({ 
		error: 'Forbidden: Insufficient permissions to modify guild configuration' 
	});
}

/**
 * Audit log middleware to record actions
 */
export function auditLog(action: string) {
	return async (request: FastifyRequest) => {
		const user = (request as any).dashboardUser as DashboardUser;

		if (!user) {
			return; // Skip audit log for unauthenticated requests
		}

		try {
			const { clientId, guildId } = request.params as any;
			const target = clientId || guildId || 'system';

			await prisma.auditLog.create({
				data: {
					userId: user.id,
					action,
					target,
					metadata: {
						method: request.method,
						url: request.url,
						body: JSON.parse(JSON.stringify(request.body || {})),
						ip: request.ip,
						userAgent: request.headers['user-agent'] || 'unknown',
					} as any,
				},
			});
		} catch (error) {
			// Don't block the request if audit log fails
			request.log.error(error, 'Failed to create audit log');
		}
	};
}

/**
 * Role-based access control decorator
 */
export function requireRole(allowedRoles: string[]) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const user = (request as any).dashboardUser as DashboardUser;

		if (!user) {
			return reply.status(401).send({ error: 'Unauthorized' });
		}

		if (!allowedRoles.includes(user.role)) {
			return reply.status(403).send({ 
				error: 'Forbidden: Insufficient permissions',
				details: `Required role: ${allowedRoles.join(' or ')}, your role: ${user.role}`
			});
		}
	};
}
