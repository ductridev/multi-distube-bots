import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import sensible from '@fastify/sensible';
import type { Lavamusic } from '../structures';
import { dashboardSocket } from './websocket/DashboardSocket';
import { authRoutes } from './routes/auth';
import { botRoutes } from './routes/bots';
import { playerRoutes } from './routes/players';
import { statsRoutes } from './routes/stats';
import { StatsController } from './controllers/StatsController';
import { sanitizeRequestBody } from './middleware/auth';
import Logger from '../structures/Logger';

const logger = new Logger('API-Server');

export async function startApiServer(bots: Lavamusic[]) {
	const apiPort = parseInt(process.env.API_PORT || '3002');
	const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
	const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
	const isProduction = process.env.NODE_ENV === 'production';

	// Warn if using default JWT secret in production
	if (isProduction && jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
		logger.warn('⚠️  WARNING: Using default JWT secret in production! Please set JWT_SECRET environment variable.');
	}

	// Create Fastify instance with security configurations
	const fastify = Fastify({
		logger: {
			level: isProduction ? 'warn' : 'info',
		},
		trustProxy: true,
		bodyLimit: 1048576, // 1MB limit
		requestIdHeader: 'x-request-id',
		requestIdLogLabel: 'reqId',
	});

	// Register security plugins
	await fastify.register(helmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				scriptSrc: ["'self'"],
				imgSrc: ["'self'", 'data:', 'https:'],
			},
		},
		crossOriginEmbedderPolicy: false,
		crossOriginResourcePolicy: { policy: 'cross-origin' },
		hsts: {
			maxAge: 31536000,
			includeSubDomains: true,
			preload: true,
		},
	});

	await fastify.register(cors, {
		origin: dashboardUrl.split(',').map(url => url.trim()), // Support multiple origins
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
		exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
	});

	await fastify.register(jwt, {
		secret: jwtSecret,
		sign: {
			expiresIn: '7d',
			algorithm: 'HS256',
		},
		verify: {
			algorithms: ['HS256'],
		},
	});

	await fastify.register(cookie, {
		secret: jwtSecret,
		parseOptions: {
			httpOnly: true,
			secure: isProduction,
			sameSite: isProduction ? 'strict' : 'lax',
		},
	});

	await fastify.register(sensible);

	// Global security middleware
	fastify.addHook('preHandler', async (request) => {
		// Sanitize request body to prevent XSS
		await sanitizeRequestBody(request);

		// Add security headers
		request.headers['x-content-type-options'] = 'nosniff';
		request.headers['x-frame-options'] = 'DENY';
		request.headers['x-xss-protection'] = '1; mode=block';
	});

	// Global error handler
	fastify.setErrorHandler((error, request, reply) => {
		request.log.error(error);

		// Don't expose internal errors in production
		const message = isProduction ? 'Internal server error' : error.message;

		reply.status(error.statusCode || 500).send({
			error: message,
			statusCode: error.statusCode || 500,
			...(isProduction ? {} : { stack: error.stack }),
		});
	});

	// Health check
	fastify.get('/health', async () => {
		return {
			status: 'ok',
			uptime: process.uptime(),
			bots: bots.length,
			timestamp: new Date().toISOString(),
		};
	});

	// Security info endpoint
	fastify.get('/api/security', async () => {
		return {
			csrf: 'enabled',
			rateLimit: 'enabled',
			xss: 'protected',
			helmet: 'enabled',
			https: isProduction ? 'required' : 'optional',
		};
	});

	// Register routes
	await fastify.register(authRoutes, { prefix: '/api/auth' });
	await fastify.register(botRoutes, { prefix: '/api/bots' });
	await fastify.register(playerRoutes, { prefix: '/api/players' });
	await fastify.register(statsRoutes, { prefix: '/api/stats' });

	// Start listening first to get the server
	try {
		await fastify.listen({ port: apiPort, host: '0.0.0.0' });
		logger.success(`🚀 API Server running on http://0.0.0.0:${apiPort}`);
		logger.info(`� CORS enabled for: ${dashboardUrl}`);

		// Initialize WebSocket after server is listening
		// @ts-ignore - fastify.server is the underlying HTTP server
		dashboardSocket.initialize(fastify.server, dashboardUrl);
		logger.info(`� WebSocket server initialized`);
	} catch (err) {
		logger.error('Failed to start API server:', err);
		process.exit(1);
	}

	// Start stats recording interval (every 5 minutes)
	setInterval(async () => {
		await StatsController.recordStats();
	}, 5 * 60 * 1000);

	// Emit bot stats to dashboard every 10 seconds
	setInterval(() => {
		for (const bot of bots) {
			dashboardSocket.emitBotStats({
				clientId: bot.childEnv.clientId,
				guilds: bot.guilds.cache.size,
				players: bot.manager?.players.size || 0,
				memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
				cpu: 0, // Can be calculated if needed
				latency: bot.ws.ping,
				uptime: Math.floor(process.uptime()),
			});
		}
	}, 10 * 1000); // Every 10 seconds

	// Record initial stats
	await StatsController.recordStats();

	return { fastify };
}
