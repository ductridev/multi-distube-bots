import { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitStore {
	[key: string]: {
		count: number;
		resetAt: number;
	};
}

const store: RateLimitStore = {};

// Clean up expired entries periodically
setInterval(() => {
	const now = Date.now();
	for (const key in store) {
		if (store[key].resetAt < now) {
			delete store[key];
		}
	}
}, 60000); // Clean up every minute

export interface RateLimitOptions {
	max: number;
	windowMs: number;
	skipSuccessfulRequests?: boolean;
	skipFailedRequests?: boolean;
	keyGenerator?: (request: FastifyRequest) => string;
	handler?: (request: FastifyRequest, reply: FastifyReply) => void;
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
	const {
		max,
		windowMs,
		skipSuccessfulRequests = false,
		skipFailedRequests = false,
		keyGenerator = (req) => req.ip || 'unknown',
		handler,
	} = options;

	return async (request: FastifyRequest, reply: FastifyReply) => {
		const key = keyGenerator(request);
		const now = Date.now();

		// Clean up expired entries for this key
		if (store[key] && store[key].resetAt < now) {
			delete store[key];
		}

		// Initialize or get existing entry
		if (!store[key]) {
			store[key] = {
				count: 0,
				resetAt: now + windowMs,
			};
		}

		// Increment counter (will be decremented if needed based on response)
		store[key].count++;

		// Check if limit exceeded
		if (store[key].count > max) {
			const retryAfter = Math.ceil((store[key].resetAt - now) / 1000);
			reply.header('Retry-After', retryAfter.toString());
			reply.header('X-RateLimit-Limit', max.toString());
			reply.header('X-RateLimit-Remaining', '0');
			reply.header('X-RateLimit-Reset', new Date(store[key].resetAt).toISOString());

			if (handler) {
				return handler(request, reply);
			}

			return reply.status(429).send({
				error: 'Too many requests',
				message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
				retryAfter,
			});
		}

		// Set rate limit headers
		reply.header('X-RateLimit-Limit', max.toString());
		reply.header('X-RateLimit-Remaining', (max - store[key].count).toString());
		reply.header('X-RateLimit-Reset', new Date(store[key].resetAt).toISOString());

		// Handle skip options by attaching to request context
		if (skipSuccessfulRequests || skipFailedRequests) {
			const originalKey = key;
			const originalStore = store;
			
			// Store the cleanup function to be called after response
			(request as any)._rateLimitCleanup = () => {
				const statusCode = reply.statusCode;
				const success = statusCode >= 200 && statusCode < 300;
				const failed = statusCode >= 400;

				if ((skipSuccessfulRequests && success) || (skipFailedRequests && failed)) {
					if (originalStore[originalKey]) {
						originalStore[originalKey].count--;
					}
				}
			};
		}
	};
}

/**
 * Preset rate limiters for different endpoints
 */

// Strict rate limit for authentication endpoints
export const authRateLimiter = createRateLimiter({
	max: 15,
	windowMs: 10 * 60 * 1000, // 10 minutes
	skipSuccessfulRequests: true,
	handler: (request, reply) => {
		request.log.warn(`Auth rate limit exceeded for IP: ${request.ip}`);
		return reply.status(429).send({
			error: 'Too many authentication attempts',
			message: 'Please wait 15 minutes before trying again.',
		});
	},
});

// Moderate rate limit for general API endpoints
export const apiRateLimiter = createRateLimiter({
	max: 100,
	windowMs: 60 * 1000, // 1 minute
	skipSuccessfulRequests: false,
});

// Strict rate limit for bot management operations
export const botManagementRateLimiter = createRateLimiter({
	max: 10,
	windowMs: 60 * 1000, // 1 minute
	skipSuccessfulRequests: true, // Only count failed requests
});

// Lenient rate limit for read-only operations
export const readOnlyRateLimiter = createRateLimiter({
	max: 300,
	windowMs: 60 * 1000, // 1 minute
	skipSuccessfulRequests: false,
});

// Per-user rate limiter (requires authentication)
export function createUserRateLimiter(options: Omit<RateLimitOptions, 'keyGenerator'>) {
	return createRateLimiter({
		...options,
		keyGenerator: (request) => {
			const user = (request as any).dashboardUser;
			return user ? `user:${user.id}` : `ip:${request.ip}`;
		},
	});
}

// Adaptive rate limiter that adjusts based on system load
export class AdaptiveRateLimiter {
	private baseMax: number;
	private currentMax: number;
	private systemLoadThreshold: number;

	constructor(baseMax: number, systemLoadThreshold = 0.8) {
		this.baseMax = baseMax;
		this.currentMax = baseMax;
		this.systemLoadThreshold = systemLoadThreshold;
	}

	/**
	 * Adjust rate limit based on system load
	 */
	adjustForLoad(cpuUsage: number, memoryUsage: number): void {
		const maxUsage = Math.max(cpuUsage, memoryUsage);

		if (maxUsage > this.systemLoadThreshold) {
			// Reduce limit when system is under load
			this.currentMax = Math.floor(this.baseMax * (1 - (maxUsage - this.systemLoadThreshold)));
		} else {
			// Restore to base limit when system is healthy
			this.currentMax = this.baseMax;
		}
	}

	/**
	 * Get current rate limiter
	 */
	getRateLimiter(windowMs: number) {
		return createRateLimiter({
			max: this.currentMax,
			windowMs,
		});
	}
}
