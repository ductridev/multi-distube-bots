import type { Client } from 'discord.js';

/**
 * ShardStateManager - Manages voice channel state across shards using IPC
 * This provides Redis-like functionality using Discord.js's built-in shard messaging
 * for zero-dependency, high-performance cross-shard communication
 */
export class ShardStateManager {
	private client: Client;
	private localVoiceMap: Map<string, Map<string, string>> = new Map(); // guildId -> vcId -> botClientId
	private localSessionMap: Map<string, Map<string, any>> = new Map(); // guildId -> vcId -> sessionData

	constructor(client: Client) {
		this.client = client;
		this.setupMessageHandlers();
	}

	/**
	 * Setup custom event handlers for cross-shard communication
	 * Uses client events instead of shard.on() which doesn't exist
	 */
	private setupMessageHandlers(): void {
		// Listen for custom shardMessage events
		this.client.on('shardMessage' as any, (message: any) => {
			if (!message || typeof message !== 'object') return;

			switch (message.type) {
				case 'VOICE_CHANNEL_SET':
					this.handleVoiceChannelSet(message.data);
					break;
				case 'VOICE_CHANNEL_DELETE':
					this.handleVoiceChannelDelete(message.data);
					break;
				case 'SESSION_SET':
					this.handleSessionSet(message.data);
					break;
				case 'SESSION_DELETE':
					this.handleSessionDelete(message.data);
					break;
				default:
					break;
			}
		});
	}

	/**
	 * Broadcast message to all shards
	 */
	private async broadcast(message: any): Promise<void> {
		if (!this.client.shard) {
			// Not sharded, just update local state
			return;
		}
		
		try {
			await this.client.shard.broadcastEval((client, context) => {
				client.emit('shardMessage', context);
			}, { context: message });
		} catch (error) {
			console.error('[ShardState] Broadcast error:', error);
		}
	}

	/**
	 * Handle voice channel set message
	 */
	private handleVoiceChannelSet(data: any): void {
		const { guildId, voiceChannelId, botClientId } = data;
		if (!this.localVoiceMap.has(guildId)) {
			this.localVoiceMap.set(guildId, new Map());
		}
		this.localVoiceMap.get(guildId)!.set(voiceChannelId, botClientId);
	}

	/**
	 * Handle voice channel delete message
	 */
	private handleVoiceChannelDelete(data: any): void {
		const { guildId, voiceChannelId, botClientId } = data;
		const guildMap = this.localVoiceMap.get(guildId);
		if (!guildMap) return;

		if (voiceChannelId) {
			guildMap.delete(voiceChannelId);
		} else if (botClientId) {
			// Delete all entries for this bot
			for (const [vcId, clientId] of guildMap.entries()) {
				if (clientId === botClientId) {
					guildMap.delete(vcId);
				}
			}
		}
	}

	/**
	 * Handle session set message
	 */
	private handleSessionSet(data: any): void {
		const { guildId, voiceChannelId, sessionData } = data;
		if (!this.localSessionMap.has(guildId)) {
			this.localSessionMap.set(guildId, new Map());
		}
		this.localSessionMap.get(guildId)!.set(voiceChannelId, sessionData);
	}

	/**
	 * Handle session delete message
	 */
	private handleSessionDelete(data: any): void {
		const { guildId, voiceChannelId } = data;
		const guildMap = this.localSessionMap.get(guildId);
		if (!guildMap) return;
		guildMap.delete(voiceChannelId);
	}

	/**
	 * Set voice channel mapping across all shards
	 */
	async setVoiceChannelMapping(guildId: string, voiceChannelId: string, botClientId: string): Promise<void> {
		// Update local first
		if (!this.localVoiceMap.has(guildId)) {
			this.localVoiceMap.set(guildId, new Map());
		}
		this.localVoiceMap.get(guildId)!.set(voiceChannelId, botClientId);

		// Broadcast to other shards
		await this.broadcast({
			type: 'VOICE_CHANNEL_SET',
			data: { guildId, voiceChannelId, botClientId }
		});
	}

	/**
	 * Get voice channel mapping for a guild (from local cache)
	 */
	async getVoiceChannelMapping(guildId: string): Promise<Map<string, string>> {
		// In sharded environment, we rely on broadcasts to keep all shards in sync
		// So we can safely return the local copy
		return this.localVoiceMap.get(guildId) || new Map();
	}

	/**
	 * Get bot in specific voice channel
	 */
	async getBotInVoiceChannel(guildId: string, voiceChannelId: string): Promise<string | null> {
		const guildMap = this.localVoiceMap.get(guildId);
		return guildMap?.get(voiceChannelId) || null;
	}

	/**
	 * Get all active bot client IDs in a guild
	 */
	async getActiveBotIds(guildId: string): Promise<Set<string>> {
		const guildMap = this.localVoiceMap.get(guildId);
		if (!guildMap) return new Set();
		return new Set(guildMap.values());
	}

	/**
	 * Remove voice channel mapping across all shards
	 */
	async removeVoiceChannelMapping(guildId: string, voiceChannelId: string): Promise<void> {
		// Update local first
		const guildMap = this.localVoiceMap.get(guildId);
		if (guildMap) {
			guildMap.delete(voiceChannelId);
		}

		// Broadcast to other shards
		await this.broadcast({
			type: 'VOICE_CHANNEL_DELETE',
			data: { guildId, voiceChannelId }
		});
	}

	/**
	 * Remove all mappings for a specific bot across all shards
	 */
	async removeBotFromGuild(guildId: string, botClientId: string): Promise<void> {
		// Update local first
		const guildMap = this.localVoiceMap.get(guildId);
		if (guildMap) {
			for (const [vcId, clientId] of guildMap.entries()) {
				if (clientId === botClientId) {
					guildMap.delete(vcId);
				}
			}
		}

		// Broadcast to other shards
		await this.broadcast({
			type: 'VOICE_CHANNEL_DELETE',
			data: { guildId, botClientId }
		});
	}

	/**
	 * Save player session across all shards
	 */
	async savePlayerSession(guildId: string, voiceChannelId: string, sessionData: any): Promise<void> {
		// Update local first
		if (!this.localSessionMap.has(guildId)) {
			this.localSessionMap.set(guildId, new Map());
		}
		this.localSessionMap.get(guildId)!.set(voiceChannelId, sessionData);

		// Broadcast to other shards
		await this.broadcast({
			type: 'SESSION_SET',
			data: { guildId, voiceChannelId, sessionData }
		});
	}

	/**
	 * Get player session (from local cache)
	 */
	async getPlayerSession(guildId: string, voiceChannelId: string): Promise<any | null> {
		const guildMap = this.localSessionMap.get(guildId);
		return guildMap?.get(voiceChannelId) || null;
	}

	/**
	 * Remove player session across all shards
	 */
	async removePlayerSession(guildId: string, voiceChannelId: string): Promise<void> {
		// Update local first
		const guildMap = this.localSessionMap.get(guildId);
		if (guildMap) {
			guildMap.delete(voiceChannelId);
		}

		// Broadcast to other shards
		await this.broadcast({
			type: 'SESSION_DELETE',
			data: { guildId, voiceChannelId }
		});
	}

	/**
	 * Get all player sessions for a guild (from local cache)
	 */
	async getGuildPlayerSessions(guildId: string): Promise<Map<string, any>> {
		return this.localSessionMap.get(guildId) || new Map();
	}

	/**
	 * Clear local cache (useful for cleanup)
	 */
	clearLocalCache(): void {
		this.localVoiceMap.clear();
		this.localSessionMap.clear();
	}

	/**
	 * Get statistics across all shards
	 */
	async getStats(): Promise<any> {
		if (!this.client.shard) {
			return {
				totalGuilds: this.localVoiceMap.size,
				totalSessions: this.localSessionMap.size,
				shards: 1
			};
		}

		const stats = await this.client.shard.broadcastEval(client => {
			// Access the shardStateManager from the client
			const manager = (client as any).shardStateManager;
			if (!manager) return null;

			return {
				shardId: client.shard?.ids[0],
				guilds: manager.localVoiceMap.size,
				sessions: manager.localSessionMap.size
			};
		});

		return {
			shards: stats.filter(s => s !== null),
			totalShards: this.client.shard.count
		};
	}
}
