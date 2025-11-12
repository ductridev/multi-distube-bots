import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { env } from '../../env';
import { CSRFProtection } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';

const prisma = new PrismaClient();

export async function authRoutes(fastify: FastifyInstance) {
	// Apply rate limiting to all auth routes
	fastify.addHook('preHandler', authRateLimiter);

	// Discord OAuth2 callback
	fastify.post('/discord', async (request, reply) => {
		try {
			const { code } = request.body as { code: string };

			if (!code) {
				return reply.status(400).send({ error: 'Authorization code required' });
			}

			// Exchange code for access token
			const redirectUri = `${env.DASHBOARD_URL}/auth/callback`;
			
			fastify.log.info('Token exchange attempt:', {
				client_id: env.DISCORD_CLIENT_ID,
				redirect_uri: redirectUri,
				has_code: !!code,
				has_secret: !!env.DISCORD_CLIENT_SECRET
			});

			const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: env.DISCORD_CLIENT_ID || env.TOPGG_CLIENT_ID || '',
					client_secret: env.DISCORD_CLIENT_SECRET || '',
					grant_type: 'authorization_code',
					code,
					redirect_uri: redirectUri,
				}),
			});

			const tokenData = await tokenResponse.json();

			if (!tokenResponse.ok) {
				fastify.log.error('Discord token exchange failed:', tokenData);
				return reply.status(400).send({ 
					error: 'Failed to exchange code for token',
					details: tokenData.error_description || tokenData.error || 'Unknown error'
				});
			}

			// Fetch user info
			const userResponse = await fetch('https://discord.com/api/users/@me', {
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
				},
			});

			const userData = await userResponse.json();

			if (!userResponse.ok) {
				return reply.status(400).send({ error: 'Failed to fetch user info' });
			}

			// Log user info for debugging
			fastify.log.info(`Discord user attempting login: ${userData.username}#${userData.discriminator} (${userData.id})`);
			fastify.log.info(`Owner IDs: ${JSON.stringify(env.OWNER_IDS)}`);

			// Check if user is owner
			const isOwner = env.OWNER_IDS?.includes(userData.id);
			const role = isOwner ? 'owner' : 'user';

			fastify.log.info(`User ${userData.id} role determined: ${role} (isOwner: ${isOwner})`);

			if (role === 'user') {
				return reply.status(403).send({ 
					error: 'Unauthorized: Only bot owners can access the dashboard',
					details: `Your Discord ID (${userData.id}) is not in the authorized owner list. Please contact the bot administrator.`
				});
			}

			// Create or update user
			const user = await prisma.dashboardUser.upsert({
				where: { discordId: userData.id },
				update: {
					username: userData.username,
					avatar: userData.avatar,
					lastLogin: new Date(),
				},
				create: {
					discordId: userData.id,
					username: userData.username,
					avatar: userData.avatar,
					role,
				},
			});

			// Create JWT token
			const token = fastify.jwt.sign({
				discordId: user.discordId,
				role: user.role,
			});

			// Generate CSRF token
			const csrfToken = CSRFProtection.generate(user.id);

			// Create session
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

			await prisma.dashboardSession.create({
				data: {
					userId: user.id,
					token,
					expiresAt,
					ipAddress: request.ip,
					userAgent: request.headers['user-agent'],
				},
			});

			// Set cookie with secure options
			reply.setCookie('dashboard_session', token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
				maxAge: 7 * 24 * 60 * 60, // 7 days
				path: '/',
				signed: false,
			});

			return reply.send({
				success: true,
				token,
				csrfToken, // Send CSRF token to client
				user: {
					id: user.id,
					discordId: user.discordId,
					username: user.username,
					avatar: user.avatar,
					role: user.role,
					managedBots: user.managedBots,
				},
			});
		} catch (error) {
			fastify.log.error('Auth error:', error);
			return reply.status(500).send({ error: 'Authentication failed' });
		}
	});

	// Get current user
	fastify.get('/me', async (request, reply) => {
		try {
			const token = request.cookies?.dashboard_session || request.headers.authorization?.replace('Bearer ', '');

			if (!token) {
				return reply.status(401).send({ error: 'Not authenticated' });
			}

			const session = await prisma.dashboardSession.findUnique({
				where: { token },
				include: { user: true },
			});

			if (!session || session.expiresAt < new Date()) {
				return reply.status(401).send({ error: 'Session expired' });
			}

			// Update last login timestamp
			await prisma.dashboardUser.update({
				where: { id: session.user.id },
				data: { lastLogin: new Date() },
			});

			// Generate new CSRF token
			const csrfToken = CSRFProtection.generate(session.user.id);

			return reply.send({
				success: true,
				csrfToken,
				user: {
					id: session.user.id,
					discordId: session.user.discordId,
					username: session.user.username,
					avatar: session.user.avatar,
					role: session.user.role,
					managedBots: session.user.managedBots,
					createdAt: session.user.createdAt,
					lastLogin: session.user.lastLogin,
				},
			});
		} catch (error) {
			fastify.log.error('Get user error:', error);
			return reply.status(500).send({ error: 'Failed to fetch user' });
		}
	});

	// Refresh token
	fastify.post('/refresh', async (request, reply) => {
		try {
			const token = request.cookies?.dashboard_session || request.headers.authorization?.replace('Bearer ', '');

			if (!token) {
				return reply.status(401).send({ error: 'Not authenticated' });
			}

			const session = await prisma.dashboardSession.findUnique({
				where: { token },
				include: { user: true },
			});

			if (!session || session.expiresAt < new Date()) {
				return reply.status(401).send({ error: 'Session expired' });
			}

			// Create new JWT token
			const newToken = fastify.jwt.sign({
				discordId: session.user.discordId,
				role: session.user.role,
			});

			// Generate new CSRF token
			const csrfToken = CSRFProtection.generate(session.user.id);

			// Update session
			const newExpiresAt = new Date();
			newExpiresAt.setDate(newExpiresAt.getDate() + 7);

			await prisma.dashboardSession.update({
				where: { id: session.id },
				data: {
					token: newToken,
					expiresAt: newExpiresAt,
				},
			});

			// Set new cookie
			reply.setCookie('dashboard_session', newToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
				maxAge: 7 * 24 * 60 * 60,
				path: '/',
				signed: false,
			});

			return reply.send({
				success: true,
				token: newToken,
				csrfToken,
			});
		} catch (error) {
			fastify.log.error('Token refresh error:', error);
			return reply.status(500).send({ error: 'Failed to refresh token' });
		}
	});

	// Logout
	fastify.post('/logout', async (request, reply) => {
		try {
			const token = request.cookies?.dashboard_session || request.headers.authorization?.replace('Bearer ', '');

			if (token) {
				await prisma.dashboardSession.delete({
					where: { token },
				});
			}

			reply.clearCookie('dashboard_session');

			return reply.send({ success: true });
		} catch (error) {
			fastify.log.error('Logout error:', error);
			return reply.status(500).send({ error: 'Logout failed' });
		}
	});
}
