import type { Client } from 'discord.js';
import type { ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

/**
 * ScalableStateManager - For 2M+ guilds using BullMQ/Redis
 * Falls back to IPC (ShardStateManager) when Redis is unavailable
 * Compatible with Dragonfly and Redis
 */
export class ScalableStateManager {
	private client: Client;
	private redis: IORedis | null = null;
	private localCache: Map<string, { data: any; expires: number }> = new Map();
	private cacheTimeout = 30000; // 30 seconds cache
	private useRedis: boolean;
	private keyPrefix: string;
	private connection: ConnectionOptions | null = null;

	constructor(client: Client, redisUrl?: string, keyPrefix = 'lavamusic:') {
		this.client = client;
		this.useRedis = !!redisUrl;
		this.keyPrefix = keyPrefix;
		
		if (this.useRedis && redisUrl) {
			this.initRedis(redisUrl);
		} else {
			console.log('[ScalableState] Redis not configured, using IPC fallback mode');
		}
	}

	private async initRedis(redisUrl: string): Promise<void> {
		try {
			// Parse Redis URL for BullMQ connection options
			const url = new URL(redisUrl);
			
			this.connection = {
				host: url.hostname,
				port: url.port ? Number.parseInt(url.port) : 6379,
				password: url.password || undefined,
				db: url.pathname ? Number.parseInt(url.pathname.slice(1)) : 0,
				maxRetriesPerRequest: null, // Required for BullMQ
				enableReadyCheck: false, // Better for Dragonfly
			};

			// Create IORedis instance for direct operations
			this.redis = new IORedis({
				...this.connection,
				keyPrefix: this.keyPrefix,
				lazyConnect: false,
				retryStrategy: (times) => {
					const delay = Math.min(times * 50, 2000);
					return delay;
				},
			});
			
			this.redis.on('error', (err) => {
				console.error('[Redis] Error:', err);
				console.log('[ScalableState] Falling back to IPC mode due to Redis error');
				this.useRedis = false;
			});
			
			this.redis.on('connect', () => {
				console.log('[Redis] Connected');
			});

			this.redis.on('ready', () => {
				console.log('[Redis] Ready - ScalableStateManager using Redis mode');
			});

			await this.redis.ping();
		} catch (error) {
			console.error('[Redis] Failed to connect:', error);
			console.log('[ScalableState] Falling back to IPC mode');
			this.useRedis = false;
			this.redis = null;
		}
	}

	/**
	 * Get from cache with TTL check
	 */
	private getFromCache(key: string): any | null {
		const cached = this.localCache.get(key);
		if (!cached) return null;
		
		if (Date.now() > cached.expires) {
			this.localCache.delete(key);
			return null;
		}
		
		return cached.data;
	}

	/**
	 * Set cache with TTL
	 */
	private setCache(key: string, data: any): void {
		this.localCache.set(key, {
			data,
			expires: Date.now() + this.cacheTimeout
		});
	}

	/**
	 * Check if running in sharded mode
	 */
	private isSharded(): boolean {
		return !!this.client.shard && this.client.shard.count > 1;
	}

	/**
	 * Set voice channel mapping - SHARD-LOCAL approach or Redis
	 */
	async setVoiceChannelMapping(guildId: string, voiceChannelId: string, botClientId: string): Promise<void> {
		const key = `vc:${guildId}:${voiceChannelId}`;
		
		if (this.useRedis && this.redis) {
			// Redis: Global state, no broadcast needed
			try {
				await this.redis.setex(key, 3600, botClientId); // 1 hour TTL
				this.setCache(key, botClientId);
			} catch (error) {
				console.error('[ScalableState] Redis set error, falling back to local cache:', error);
				this.setCache(key, botClientId);
			}
		} else if (this.isSharded()) {
			// IPC Fallback (Sharded): Only query the shard that owns this guild
			const shardId = this.getShardIdForGuild(guildId);
			
			if (this.client.shard?.ids.includes(shardId)) {
				// This shard owns the guild, store locally
				this.setCache(key, botClientId);
			}
			// Don't broadcast - only the owning shard needs to know
		} else {
			// Non-sharded mode: just use local cache
			this.setCache(key, botClientId);
		}
	}

	/**
	 * Get bot in specific voice channel - QUERY THE RIGHT SHARD or use Redis
	 */
	async getBotInVoiceChannel(guildId: string, voiceChannelId: string): Promise<string | null> {
		const key = `vc:${guildId}:${voiceChannelId}`;
		
		// Check local cache first
		const cached = this.getFromCache(key);
		if (cached) return cached;
		
		if (this.useRedis && this.redis) {
			// Redis: Direct lookup
			try {
				const result = await this.redis.get(key);
				if (result) this.setCache(key, result);
				return result;
			} catch (error) {
				console.error('[ScalableState] Redis get error, using local cache:', error);
				return this.getFromCache(key);
			}
		} else if (this.isSharded()) {
			// IPC Fallback (Sharded): Query the shard that owns this guild
			const shardId = this.getShardIdForGuild(guildId);
			
			if (this.client.shard?.ids.includes(shardId)) {
				// This shard owns the guild
				return this.getFromCache(key);
			} else {
				// Query the correct shard via broadcastEval
				try {
					const results = await this.client.shard!.broadcastEval(
						(client, context) => {
							if (!client.shard?.ids.includes(context.shardId)) return null;
							
							const manager = (client as any).shardStateManager;
							if (!manager) return null;
							
							const cached = manager.localCache.get(context.key);
							return cached?.data || null;
						},
						{ context: { shardId, key } }
					);
					
					const result = results.find(r => r !== null);
					if (result) this.setCache(key, result);
					return result || null;
				} catch (error) {
					console.error('[ScalableState] Shard query error:', error);
					return null;
				}
			}
		} else {
			// Non-sharded mode: use local cache
			return this.getFromCache(key);
		}
	}

	/**
	 * Get voice channel mapping for a guild - SHARD-LOCAL or Redis
	 */
	async getVoiceChannelMapping(guildId: string): Promise<Map<string, string>> {
		if (this.useRedis && this.redis) {
			// Redis: Scan for all vc:guildId:* keys
			try {
				const keys = await this.redis.keys(`vc:${guildId}:*`);
				const mapping = new Map<string, string>();
				
				for (const key of keys) {
					const voiceChannelId = key.split(':')[2];
					const botClientId = await this.redis.get(key);
					if (botClientId) {
						mapping.set(voiceChannelId, botClientId);
					}
				}
				
				return mapping;
			} catch (error) {
				console.error('[ScalableState] Redis scan error, using local cache:', error);
				// Fall through to local cache
			}
		}
		
		if (this.isSharded()) {
			// IPC Fallback (Sharded): Only return mappings for guilds this shard owns
			const shardId = this.getShardIdForGuild(guildId);
			
			if (!this.client.shard?.ids.includes(shardId)) {
				// Query the correct shard
				try {
					const results = await this.client.shard!.broadcastEval(
						(client, context) => {
							if (!client.shard?.ids.includes(context.shardId)) return null;
							
							const manager = (client as any).shardStateManager;
							if (!manager) return null;
							
							const mapping: Record<string, string> = {};
							for (const [key, cached] of manager.localCache.entries()) {
								if (key.startsWith(`vc:${context.guildId}:`)) {
									const vcId = key.split(':')[2];
									mapping[vcId] = cached.data;
								}
							}
							return mapping;
						},
						{ context: { shardId, guildId } }
					);
					
					const result = results.find(r => r !== null);
					if (result) {
						const mapping = new Map<string, string>();
						for (const [vcId, botId] of Object.entries(result)) {
							mapping.set(vcId, botId);
						}
						return mapping;
					}
				} catch (error) {
					console.error('[ScalableState] Shard query error:', error);
				}
			}
		}
		
		// Return local mappings for this guild (non-sharded or local shard)
		const mapping = new Map<string, string>();
		for (const [key, cached] of this.localCache.entries()) {
			if (key.startsWith(`vc:${guildId}:`)) {
				const vcId = key.split(':')[2];
				if (Date.now() <= cached.expires) {
					mapping.set(vcId, cached.data);
				}
			}
		}
		return mapping;
	}

	/**
	 * Get all active bot IDs in a guild
	 */
	async getActiveBotIds(guildId: string): Promise<Set<string>> {
		const mapping = await this.getVoiceChannelMapping(guildId);
		return new Set(mapping.values());
	}

	/**
	 * Remove voice channel mapping
	 */
	async removeVoiceChannel(guildId: string, voiceChannelId: string): Promise<void> {
		const key = `vc:${guildId}:${voiceChannelId}`;
		
		if (this.useRedis && this.redis) {
			try {
				await this.redis.del(key);
				this.localCache.delete(key);
			} catch (error) {
				console.error('[ScalableState] Redis delete error:', error);
			}
		} else {
			this.localCache.delete(key);
		}
	}

	/**
	 * Remove all voice channels for a bot in a guild
	 */
	async removeBotFromGuild(guildId: string, botClientId: string): Promise<void> {
		const mapping = await this.getVoiceChannelMapping(guildId);
		
		for (const [vcId, clientId] of mapping.entries()) {
			if (clientId === botClientId) {
				await this.removeVoiceChannel(guildId, vcId);
			}
		}
	}

	/**
	 * Save player session
	 */
	async savePlayerSession(guildId: string, voiceChannelId: string, sessionData: any): Promise<void> {
		const key = `session:${guildId}:${voiceChannelId}`;
		const data = typeof sessionData === 'string' ? sessionData : JSON.stringify(sessionData);
		
		if (this.useRedis && this.redis) {
			try {
				await this.redis.setex(key, 3600, data);
				this.setCache(key, data);
			} catch (error) {
				console.error('[ScalableState] Redis session save error:', error);
			}
		} else {
			this.setCache(key, data);
		}
	}

	/**
	 * Get player session
	 */
	async getPlayerSession(guildId: string, voiceChannelId: string): Promise<any | null> {
		const key = `session:${guildId}:${voiceChannelId}`;
		
		const cached = this.getFromCache(key);
		if (cached) {
			try {
				return JSON.parse(cached);
			} catch {
				return cached;
			}
		}
		
		if (this.useRedis && this.redis) {
			try {
				const result = await this.redis.get(key);
				if (result) {
					this.setCache(key, result);
					try {
						return JSON.parse(result);
					} catch {
						return result;
					}
				}
			} catch (error) {
				console.error('[ScalableState] Redis session get error:', error);
			}
		}
		
		return null;
	}

	/**
	 * Remove player session
	 */
	async removePlayerSession(guildId: string, voiceChannelId: string): Promise<void> {
		const key = `session:${guildId}:${voiceChannelId}`;
		
		if (this.useRedis && this.redis) {
			try {
				await this.redis.del(key);
				this.localCache.delete(key);
			} catch (error) {
				console.error('[ScalableState] Redis session delete error:', error);
			}
		} else {
			this.localCache.delete(key);
		}
	}

	/**
	 * Get all player sessions for a guild
	 */
	async getGuildPlayerSessions(guildId: string): Promise<Map<string, any>> {
		const sessions = new Map<string, any>();
		
		if (this.useRedis && this.redis) {
			try {
				const keys = await this.redis.keys(`session:${guildId}:*`);
				for (const key of keys) {
					const vcId = key.split(':')[2];
					const data = await this.redis.get(key);
					if (data) {
						try {
							sessions.set(vcId, JSON.parse(data));
						} catch {
							sessions.set(vcId, data);
						}
					}
				}
			} catch (error) {
				console.error('[ScalableState] Redis sessions scan error:', error);
			}
		} else {
			for (const [key, cached] of this.localCache.entries()) {
				if (key.startsWith(`session:${guildId}:`) && Date.now() <= cached.expires) {
					const vcId = key.split(':')[2];
					try {
						sessions.set(vcId, JSON.parse(cached.data));
					} catch {
						sessions.set(vcId, cached.data);
					}
				}
			}
		}
		
		return sessions;
	}

	/**
	 * Calculate which shard ID owns a guild (Discord's algorithm)
	 */
	private getShardIdForGuild(guildId: string): number {
		const totalShards = this.client.shard?.count || 1;
		return Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
	}

	/**
	 * Clear local cache
	 */
	clearLocalCache(): void {
		this.localCache.clear();
	}

	/**
	 * Cleanup expired cache entries
	 */
	async cleanupExpiredCache(): Promise<void> {
		const now = Date.now();
		for (const [key, cached] of this.localCache.entries()) {
			if (now > cached.expires) {
				this.localCache.delete(key);
			}
		}
	}

	/**
	 * Disconnect Redis
	 */
	async disconnect(): Promise<void> {
		if (this.redis) {
			await this.redis.quit();
		}
	}
}
