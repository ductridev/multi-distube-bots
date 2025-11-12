import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

/**
 * Authenticate JWT token from Authorization header or cookie
 */
export async function authenticateJWT(request: FastifyRequest, reply: FastifyReply) {
	try {
		// Get token from Authorization header or cookie
		const authHeader = request.headers.authorization;
		const cookieToken = request.cookies?.dashboard_session;

		const token = authHeader?.replace('Bearer ', '') || cookieToken;

		if (!token) {
			return reply.status(401).send({ error: 'No authentication token provided' });
		}

		// Verify JWT token
		const decoded = await request.server.jwt.verify(token);

		// Get user from database
		const user = await prisma.dashboardUser.findUnique({
			where: { discordId: (decoded as any).discordId },
		});

		if (!user) {
			return reply.status(401).send({ error: 'User not found' });
		}

		// Check if session is still valid
		const session = await prisma.dashboardSession.findUnique({
			where: { token },
		});

		if (!session || session.expiresAt < new Date()) {
			return reply.status(401).send({ error: 'Session expired' });
		}

		// Validate session IP (optional strict mode)
		const strictMode = process.env.SESSION_STRICT_IP === 'true';
		if (strictMode && session.ipAddress && session.ipAddress !== request.ip) {
			request.log.warn(`IP mismatch for session: ${session.ipAddress} vs ${request.ip}`);
			return reply.status(401).send({ error: 'Session IP mismatch' });
		}

		// Attach user to request
		(request as any).dashboardUser = user;
	} catch (error) {
		request.log.error('JWT authentication failed:', error);
		return reply.status(401).send({ error: 'Invalid token' });
	}
}

/**
 * Require owner role
 */
export async function requireOwner(request: FastifyRequest, reply: FastifyReply) {
	const user = (request as any).dashboardUser;

	if (!user) {
		return reply.status(401).send({ error: 'Unauthorized' });
	}

	if (user.role !== 'owner') {
		return reply.status(403).send({ error: 'Forbidden: Owner access required' });
	}
}

/**
 * Require admin role (owner or admin)
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
	const user = (request as any).dashboardUser;

	if (!user) {
		return reply.status(401).send({ error: 'Unauthorized' });
	}

	if (user.role !== 'owner' && user.role !== 'admin') {
		return reply.status(403).send({ error: 'Forbidden: Admin access required' });
	}
}

/**
 * CSRF token generation and validation
 */
export class CSRFProtection {
	private static tokens = new Map<string, { token: string; expiresAt: number }>();

	/**
	 * Generate a CSRF token for a user
	 */
	static generate(userId: string): string {
		const token = crypto.randomBytes(32).toString('hex');
		const expiresAt = Date.now() + 3600000; // 1 hour

		this.tokens.set(userId, { token, expiresAt });

		// Clean up expired tokens
		this.cleanup();

		return token;
	}

	/**
	 * Validate a CSRF token
	 */
	static validate(userId: string, token: string): boolean {
		const stored = this.tokens.get(userId);

		if (!stored) {
			return false;
		}

		if (stored.expiresAt < Date.now()) {
			this.tokens.delete(userId);
			return false;
		}

		return stored.token === token;
	}

	/**
	 * Remove expired tokens
	 */
	private static cleanup() {
		const now = Date.now();
		for (const [userId, data] of this.tokens.entries()) {
			if (data.expiresAt < now) {
				this.tokens.delete(userId);
			}
		}
	}
}

/**
 * CSRF protection middleware for state-changing operations
 */
export async function validateCSRF(request: FastifyRequest, reply: FastifyReply) {
	// Skip CSRF validation for GET and HEAD requests
	if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
		return;
	}

	const user = (request as any).dashboardUser;

	if (!user) {
		return reply.status(401).send({ error: 'Unauthorized' });
	}

	const csrfToken = request.headers['x-csrf-token'] as string;

	if (!csrfToken) {
		return reply.status(403).send({ error: 'CSRF token required' });
	}

	if (!CSRFProtection.validate(user.id, csrfToken)) {
		return reply.status(403).send({ error: 'Invalid CSRF token' });
	}
}

/**
 * Input sanitization to prevent XSS attacks
 */
export function sanitizeInput(input: any): any {
	if (typeof input === 'string') {
		// Remove HTML tags and dangerous characters
		return input
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/<[^>]+>/g, '')
			.trim();
	}

	if (Array.isArray(input)) {
		return input.map(item => sanitizeInput(item));
	}

	if (typeof input === 'object' && input !== null) {
		const sanitized: any = {};
		for (const key in input) {
			sanitized[key] = sanitizeInput(input[key]);
		}
		return sanitized;
	}

	return input;
}

/**
 * Sanitize request body middleware
 */
export async function sanitizeRequestBody(request: FastifyRequest) {
	if (request.body) {
		request.body = sanitizeInput(request.body);
	}
}
