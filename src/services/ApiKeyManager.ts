/**
 * API Key Manager
 * Manage API keys for third-party integrations
 */

import Logger from "../structures/Logger.js";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

export interface ApiKey {
	id: string;
	key: string;
	name: string;
	userId: string;
	permissions: string[];
	rateLimit: number; // requests per minute
	expiresAt?: Date;
	createdAt: Date;
	lastUsed?: Date;
	usageCount: number;
}

export class ApiKeyManager {
	private logger: Logger;
	private prisma: PrismaClient;
	private cache = new Map<string, ApiKey>();
	private usageCounts = new Map<string, number[]>(); // Key -> timestamps of recent requests

	constructor() {
		this.logger = new Logger("ApiKeyManager");
		this.prisma = new PrismaClient();
		this.loadKeysToCache();
	}

	/**
	 * Load all API keys from database into cache
	 */
	private async loadKeysToCache(): Promise<void> {
		try {
			const keys = await this.prisma.apiKey.findMany();
			for (const key of keys) {
				const apiKey: ApiKey = {
					id: key.id,
					key: key.key,
					name: key.name,
					userId: key.userId,
					permissions: key.permissions,
					rateLimit: key.rateLimit,
					expiresAt: key.expiresAt || undefined,
					createdAt: key.createdAt,
					lastUsed: key.lastUsed || undefined,
					usageCount: key.usageCount,
				};
				this.cache.set(key.key, apiKey);
			}
			this.logger.info(`[API Key Manager] Loaded ${keys.length} API keys from database`);
		} catch (error) {
			this.logger.error("[API Key Manager] Failed to load keys from database:", error);
		}
	}

	/**
	 * Generate a new API key
	 */
	public async createApiKey(
		userId: string,
		name: string,
		permissions: string[],
		rateLimit = 100,
		expiresInDays?: number,
	): Promise<ApiKey> {
		this.logger.info(`[API Key Manager] Creating API key for user ${userId}`);

		// Generate secure random key
		const key = `bm_${randomBytes(32).toString("hex")}`;

		const expiresAt = expiresInDays
			? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
			: null;

		// Save to database
		const dbKey = await this.prisma.apiKey.create({
			data: {
				key,
				name,
				userId,
				permissions,
				rateLimit,
				expiresAt,
				usageCount: 0,
			},
		});

		const apiKey: ApiKey = {
			id: dbKey.id,
			key: dbKey.key,
			name: dbKey.name,
			userId: dbKey.userId,
			permissions: dbKey.permissions,
			rateLimit: dbKey.rateLimit,
			expiresAt: dbKey.expiresAt || undefined,
			createdAt: dbKey.createdAt,
			lastUsed: dbKey.lastUsed || undefined,
			usageCount: dbKey.usageCount,
		};

		// Cache it
		this.cache.set(apiKey.key, apiKey);

		this.logger.info(
			`[API Key Manager] Created API key: ${name} for user ${userId}`,
		);

		return apiKey;
	}

	/**
	 * Validate an API key
	 */
	public async validateKey(
		key: string,
	): Promise<{ valid: boolean; reason?: string; apiKey?: ApiKey }> {
		const apiKey = this.cache.get(key);

		if (!apiKey) {
			return { valid: false, reason: "Invalid API key" };
		}

		// Check expiration
		if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
			return { valid: false, reason: "API key has expired" };
		}

		// Check rate limit
		if (!(await this.checkRateLimit(key))) {
			return { valid: false, reason: "Rate limit exceeded" };
		}

		// Update usage in database and cache
		const now = new Date();
		apiKey.lastUsed = now;
		apiKey.usageCount++;

		// Update in database (async, don't wait)
		this.prisma.apiKey.update({
			where: { key },
			data: {
				lastUsed: now,
				usageCount: { increment: 1 },
			},
		}).catch((error: unknown) => {
			this.logger.error("[API Key Manager] Failed to update key usage:", error);
		});

		return { valid: true, apiKey };
	}

	/**
	 * Check rate limit for a key
	 */
	private async checkRateLimit(key: string): Promise<boolean> {
		const apiKey = this.cache.get(key);
		if (!apiKey) {
			return false;
		}

		const now = Date.now();
		const oneMinuteAgo = now - 60000;

		// Get recent requests
		const recentRequests = this.usageCounts.get(key) || [];
		const requestsInLastMinute = recentRequests.filter((t) => t > oneMinuteAgo);

		// Check if over limit
		if (requestsInLastMinute.length >= apiKey.rateLimit) {
			return false;
		}

		// Add this request
		requestsInLastMinute.push(now);
		this.usageCounts.set(key, requestsInLastMinute);

		return true;
	}

	/**
	 * Revoke an API key
	 */
	public async revokeKey(key: string): Promise<boolean> {
		this.logger.info(`[API Key Manager] Revoking API key: ${key.substring(0, 10)}...`);

		const exists = this.cache.has(key);
		if (!exists) {
			return false;
		}

		// Delete from cache
		this.cache.delete(key);
		this.usageCounts.delete(key);

		// Delete from database
		try {
			await this.prisma.apiKey.delete({ where: { key } });
			this.logger.info(`[API Key Manager] Revoked API key`);
		} catch (error) {
			this.logger.error("[API Key Manager] Failed to delete key from database:", error);
			return false;
		}

		return true;
	}

	/**
	 * Get all API keys for a user
	 */
	public async getUserKeys(userId: string): Promise<ApiKey[]> {
		return Array.from(this.cache.values()).filter((k) => k.userId === userId);
	}

	/**
	 * Get API key by ID
	 */
	public async getKeyById(id: string): Promise<ApiKey | undefined> {
		return Array.from(this.cache.values()).find((k) => k.id === id);
	}

	/**
	 * Update API key permissions
	 */
	public async updatePermissions(
		key: string,
		permissions: string[],
	): Promise<ApiKey | undefined> {
		const apiKey = this.cache.get(key);
		if (!apiKey) {
			return undefined;
		}

		apiKey.permissions = permissions;

		// Update in database
		await this.prisma.apiKey.update({
			where: { key },
			data: { permissions },
		});

		this.logger.info(
			`[API Key Manager] Updated permissions for API key ${apiKey.name}`,
		);

		return apiKey;
	}

	/**
	 * Update rate limit
	 */
	public async updateRateLimit(
		key: string,
		rateLimit: number,
	): Promise<ApiKey | undefined> {
		const apiKey = this.cache.get(key);
		if (!apiKey) {
			return undefined;
		}

		apiKey.rateLimit = rateLimit;

		// Update in database
		await this.prisma.apiKey.update({
			where: { key },
			data: { rateLimit },
		});

		this.logger.info(
			`[API Key Manager] Updated rate limit for API key ${apiKey.name} to ${rateLimit}/min`,
		);

		return apiKey;
	}

	/**
	 * Get usage statistics for a key
	 */
	public getKeyStats(key: string): {
		totalUsage: number;
		lastUsed?: Date;
		currentRateUsage: number;
		rateLimit: number;
	} | undefined {
		const apiKey = this.cache.get(key);
		if (!apiKey) {
			return undefined;
		}

		const recentRequests = this.usageCounts.get(key) || [];
		const oneMinuteAgo = Date.now() - 60000;
		const requestsInLastMinute = recentRequests.filter((t) => t > oneMinuteAgo);

		return {
			totalUsage: apiKey.usageCount,
			lastUsed: apiKey.lastUsed,
			currentRateUsage: requestsInLastMinute.length,
			rateLimit: apiKey.rateLimit,
		};
	}

	/**
	 * Check if key has permission
	 */
	public hasPermission(key: string, permission: string): boolean {
		const apiKey = this.cache.get(key);
		if (!apiKey) {
			return false;
		}

		return (
			apiKey.permissions.includes("*") || apiKey.permissions.includes(permission)
		);
	}

	/**
	 * Get all API keys (admin only)
	 */
	public getAllKeys(): ApiKey[] {
		return Array.from(this.cache.values());
	}

	/**
	 * Clean up expired keys
	 */
	public async cleanupExpired(): Promise<number> {
		const now = new Date();
		let cleaned = 0;

		for (const [key, apiKey] of this.cache.entries()) {
			if (apiKey.expiresAt && apiKey.expiresAt < now) {
				this.cache.delete(key);
				this.usageCounts.delete(key);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			this.logger.info(`[API Key Manager] Cleaned up ${cleaned} expired keys`);
		}

		return cleaned;
	}

	/**
	 * Get available permissions
	 */
	public getAvailablePermissions(): string[] {
		return [
			"*", // All permissions
			"bots:read",
			"bots:write",
			"guilds:read",
			"guilds:write",
			"players:read",
			"players:write",
			"stats:read",
			"config:read",
			"config:write",
		];
	}
}
