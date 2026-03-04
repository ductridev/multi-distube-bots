/**
 * RateLimitTracker - Centralized Discord API Rate Limit Tracking Service
 *
 * Tracks global request counts, handles rate limit errors, and provides throttling utilities.
 *
 * Discord Rate Limits:
 * - Global Rate Limit: 50 requests/second across all endpoints
 * - Per-Route Rate Limits: Varies by endpoint
 * - Resource-Specific Rate Limits: Independent limits for specific guilds/channels
 * - Invalid Request Limit: 10,000 per 10 minutes (can cause Cloudflare ban)
 */

/**
 * Rate limit scope types from Discord API
 */
export type RateLimitScope = 'global' | 'user' | 'shared' | 'unknown';

/**
 * Information about a rate limit event
 */
export interface RateLimitInfo {
	/** The scope of the rate limit */
	scope: RateLimitScope;
	/** Milliseconds to wait before retrying */
	retryAfterMs: number;
	/** Whether this is a global rate limit */
	isGlobal: boolean;
	/** Maximum requests allowed (if known) */
	limit?: number;
	/** Remaining requests (if known) */
	remaining?: number;
	/** Seconds until reset (if known) */
	resetAfter?: number;
	/** Rate limit bucket identifier */
	bucket?: string;
}

/**
 * Request metrics for monitoring
 */
export interface RequestMetrics {
	/** Total requests tracked */
	totalRequests: number;
	/** Requests in the last second */
	requestsLastSecond: number;
	/** Requests in the last minute */
	requestsLastMinute: number;
	/** Number of rate limit hits */
	rateLimitHits: number;
	/** Number of global rate limit hits */
	globalRateLimitHits: number;
	/** Timestamp of last request */
	lastRequestTime: number;
}

/**
 * Centralized rate limit tracking service for Discord API operations.
 * Implements singleton pattern for global state management.
 */
export class RateLimitTracker {
	private static instance: RateLimitTracker | null = null;

	// Request tracking
	private requestTimestamps: number[] = [];
	private rateLimitHits: number = 0;
	private globalRateLimitHits: number = 0;

	// Global rate limit state
	private globalBackoffUntil: number = 0;

	// Bucket tracking (per-route)
	private bucketBackoffs: Map<string, number> = new Map();

	// Configuration
	private readonly GLOBAL_RATE_LIMIT = 50;
	private readonly SAFETY_BUFFER = 0.35; // 35% buffer
	private readonly MAX_REQUESTS_PER_SECOND = this.GLOBAL_RATE_LIMIT * (1 - this.SAFETY_BUFFER); // ~32.5
	private readonly CLEANUP_INTERVAL = 60000; // 1 minute
	private cleanupIntervalId: NodeJS.Timeout | null = null;

	/**
	 * Private constructor for singleton pattern
	 */
	private constructor() {
		this.startCleanup();
	}

	/**
	 * Get the singleton instance of RateLimitTracker
	 */
	static getInstance(): RateLimitTracker {
		if (!RateLimitTracker.instance) {
			RateLimitTracker.instance = new RateLimitTracker();
		}
		return RateLimitTracker.instance;
	}

	/**
	 * Record that a request was made
	 */
	recordRequest(): void {
		const now = Date.now();
		this.requestTimestamps.push(now);
	}

	/**
	 * Check if we can make a request without hitting rate limits
	 */
	canMakeRequest(): boolean {
		// Check global backoff first
		if (Date.now() < this.globalBackoffUntil) {
			return false;
		}

		// Clean old timestamps
		const oneSecondAgo = Date.now() - 1000;
		this.requestTimestamps = this.requestTimestamps.filter(t => t > oneSecondAgo);

		// Check if under limit
		return this.requestTimestamps.length < this.MAX_REQUESTS_PER_SECOND;
	}

	/**
	 * Get milliseconds to wait before next request can be made
	 */
	getWaitTime(): number {
		// Check global backoff
		const globalWait = this.globalBackoffUntil - Date.now();
		if (globalWait > 0) return globalWait;

		// If under limit, no wait
		if (this.canMakeRequest()) return 0;

		// Wait until oldest request is more than 1 second old
		const oneSecondAgo = Date.now() - 1000;
		const oldestInWindow = this.requestTimestamps.find(t => t > oneSecondAgo);
		if (oldestInWindow) {
			return oldestInWindow + 1000 - Date.now() + 10; // +10ms buffer
		}
		return 0;
	}

	/**
	 * Handle a rate limit error from Discord API
	 */
	handleRateLimitError(error: any): RateLimitInfo {
		const info = this.parseRateLimitError(error);

		if (info.isGlobal || info.scope === 'global') {
			this.globalRateLimitHits++;
			this.globalBackoffUntil = Date.now() + info.retryAfterMs;
		} else if (info.bucket) {
			this.bucketBackoffs.set(info.bucket, Date.now() + info.retryAfterMs);
		}

		this.rateLimitHits++;
		return info;
	}

	/**
	 * Parse rate limit information from Discord API error
	 */
	parseRateLimitError(error: any): RateLimitInfo {
		const scope: RateLimitScope = error.scope ??
			(error.global ? 'global' :
			(error.headers?.get('X-RateLimit-Scope') as RateLimitScope) ?? 'unknown');

		const retryAfterMs = (error.retryAfter ?? error.retry_after ?? 0) * 1000;

		return {
			scope,
			retryAfterMs,
			isGlobal: scope === 'global' || error.global === true,
			limit: error.limit ?? parseInt(error.headers?.get('X-RateLimit-Limit') ?? '0'),
			remaining: error.remaining ?? parseInt(error.headers?.get('X-RateLimit-Remaining') ?? '0'),
			resetAfter: error.resetAfter ?? parseFloat(error.headers?.get('X-RateLimit-Reset-After') ?? '0'),
			bucket: error.bucket ?? error.headers?.get('X-RateLimit-Bucket') ?? undefined,
		};
	}

	/**
	 * Get current request metrics
	 */
	getMetrics(): RequestMetrics {
		const now = Date.now();
		const oneSecondAgo = now - 1000;
		const oneMinuteAgo = now - 60000;

		const requestsLastSecond = this.requestTimestamps.filter(t => t > oneSecondAgo).length;
		const requestsLastMinute = this.requestTimestamps.filter(t => t > oneMinuteAgo).length;

		return {
			totalRequests: this.requestTimestamps.length,
			requestsLastSecond,
			requestsLastMinute,
			rateLimitHits: this.rateLimitHits,
			globalRateLimitHits: this.globalRateLimitHits,
			lastRequestTime: this.requestTimestamps.length > 0 ? this.requestTimestamps[this.requestTimestamps.length - 1] : 0,
		};
	}

	/**
	 * Execute a function with automatic rate limit handling
	 */
	async throttled<T>(fn: () => Promise<T>): Promise<T> {
		// Wait if needed
		const waitTime = this.getWaitTime();
		if (waitTime > 0) {
			await this.sleep(waitTime);
		}

		// Record request
		this.recordRequest();

		try {
			return await fn();
		} catch (error: any) {
			if (error.code === 429 || error.status === 429) {
				const info = this.handleRateLimitError(error);
				// Wait and retry once
				await this.sleep(info.retryAfterMs);
				return this.throttled(fn);
			}
			throw error;
		}
	}

	/**
	 * Execute multiple functions with rate limiting
	 * @param fns Array of functions to execute
	 * @param requestsPerSecond Maximum requests per second (default: 32)
	 */
	async throttledAll<T>(fns: (() => Promise<T>)[], requestsPerSecond: number = 32): Promise<T[]> {
		const results: T[] = [];
		const delayMs = 1000 / requestsPerSecond;

		for (const fn of fns) {
			results.push(await this.throttled(fn));
			await this.sleep(delayMs);
		}

		return results;
	}

	/**
	 * Check if a specific bucket is in backoff
	 * @param bucket The bucket identifier to check
	 */
	isBucketInBackoff(bucket: string): boolean {
		const backoffUntil = this.bucketBackoffs.get(bucket);
		if (!backoffUntil) return false;
		return Date.now() < backoffUntil;
	}

	/**
	 * Get the wait time for a specific bucket
	 * @param bucket The bucket identifier to check
	 */
	getBucketWaitTime(bucket: string): number {
		const backoffUntil = this.bucketBackoffs.get(bucket);
		if (!backoffUntil) return 0;
		return Math.max(0, backoffUntil - Date.now());
	}

	/**
	 * Check if currently in global backoff
	 */
	isInGlobalBackoff(): boolean {
		return Date.now() < this.globalBackoffUntil;
	}

	/**
	 * Get the remaining global backoff time in milliseconds
	 */
	getGlobalBackoffRemaining(): number {
		return Math.max(0, this.globalBackoffUntil - Date.now());
	}

	/**
	 * Get the maximum requests per second (with safety buffer applied)
	 */
	getMaxRequestsPerSecond(): number {
		return this.MAX_REQUESTS_PER_SECOND;
	}

	/**
	 * Reset all tracking state (useful for testing)
	 */
	reset(): void {
		this.requestTimestamps = [];
		this.rateLimitHits = 0;
		this.globalRateLimitHits = 0;
		this.globalBackoffUntil = 0;
		this.bucketBackoffs.clear();
	}

	/**
	 * Sleep helper function
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Start the cleanup interval to remove old timestamps
	 */
	private startCleanup(): void {
		this.cleanupIntervalId = setInterval(() => {
			const oneMinuteAgo = Date.now() - 60000;
			this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);

			// Also clean up expired bucket backoffs
			const now = Date.now();
			for (const [bucket, backoffUntil] of this.bucketBackoffs.entries()) {
				if (now >= backoffUntil) {
					this.bucketBackoffs.delete(bucket);
				}
			}
		}, this.CLEANUP_INTERVAL);
	}

	/**
	 * Destroy the instance and clean up resources
	 */
	destroy(): void {
		if (this.cleanupIntervalId) {
			clearInterval(this.cleanupIntervalId);
			this.cleanupIntervalId = null;
		}
	}

	/**
	 * Reset the singleton instance (useful for testing)
	 */
	static resetInstance(): void {
		if (RateLimitTracker.instance) {
			RateLimitTracker.instance.destroy();
			RateLimitTracker.instance = null;
		}
	}
}
