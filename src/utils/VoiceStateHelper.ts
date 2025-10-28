import type { Lavamusic } from '../structures';
import { voiceChannelMap, sessionMap } from '..';

/**
 * Voice channel state helper - provides unified interface for both sharded and non-sharded modes
 */
export class VoiceStateHelper {
	/**
	 * Set voice channel mapping (bot -> voice channel)
	 */
	static async setVoiceChannel(
		client: Lavamusic,
		guildId: string,
		voiceChannelId: string,
		botClientId: string
	): Promise<void> {
		// Use ShardStateManager if available (sharded mode)
		if (client.shardStateManager) {
			await client.shardStateManager.setVoiceChannelMapping(guildId, voiceChannelId, botClientId);
		} else {
			// Fallback to legacy in-memory map (non-sharded mode)
			if (!voiceChannelMap.has(guildId)) {
				voiceChannelMap.set(guildId, new Map());
			}
			voiceChannelMap.get(guildId)!.set(voiceChannelId, botClientId);
		}
	}

	/**
	 * Get voice channel mapping for a guild
	 */
	static async getVoiceChannelMapping(client: Lavamusic, guildId: string): Promise<Map<string, string>> {
		if (client.shardStateManager) {
			return await client.shardStateManager.getVoiceChannelMapping(guildId);
		} else {
			return voiceChannelMap.get(guildId) || new Map();
		}
	}

	/**
	 * Get bot in specific voice channel
	 */
	static async getBotInVoiceChannel(
		client: Lavamusic,
		guildId: string,
		voiceChannelId: string
	): Promise<string | null> {
		if (client.shardStateManager) {
			return await client.shardStateManager.getBotInVoiceChannel(guildId, voiceChannelId);
		} else {
			const guildMap = voiceChannelMap.get(guildId);
			return guildMap?.get(voiceChannelId) || null;
		}
	}

	/**
	 * Get all active bot IDs in a guild
	 */
	static async getActiveBotIds(client: Lavamusic, guildId: string): Promise<Set<string>> {
		if (client.shardStateManager) {
			return await client.shardStateManager.getActiveBotIds(guildId);
		} else {
			const guildMap = voiceChannelMap.get(guildId);
			if (!guildMap) return new Set();
			return new Set(guildMap.values());
		}
	}

	/**
	 * Remove voice channel mapping
	 */
	static async removeVoiceChannel(client: Lavamusic, guildId: string, voiceChannelId: string): Promise<void> {
		if (client.shardStateManager) {
			await client.shardStateManager.removeVoiceChannelMapping(guildId, voiceChannelId);
		} else {
			const guildMap = voiceChannelMap.get(guildId);
			if (guildMap) {
				guildMap.delete(voiceChannelId);
			}
		}
	}

	/**
	 * Remove all voice channels for a bot in a guild
	 */
	static async removeBotFromGuild(client: Lavamusic, guildId: string, botClientId: string): Promise<void> {
		if (client.shardStateManager) {
			await client.shardStateManager.removeBotFromGuild(guildId, botClientId);
		} else {
			const guildMap = voiceChannelMap.get(guildId);
			if (guildMap) {
				for (const [vcId, clientId] of guildMap.entries()) {
					if (clientId === botClientId) {
						guildMap.delete(vcId);
					}
				}
			}
		}
	}

	/**
	 * Save player session
	 */
	static async saveSession(
		client: Lavamusic,
		guildId: string,
		voiceChannelId: string,
		sessionData: any
	): Promise<void> {
		if (client.shardStateManager) {
			await client.shardStateManager.savePlayerSession(guildId, voiceChannelId, sessionData);
		} else {
			if (!sessionMap.has(guildId)) {
				sessionMap.set(guildId, new Map());
			}
			sessionMap.get(guildId)!.set(voiceChannelId, sessionData);
		}
	}

	/**
	 * Get player session
	 */
	static async getSession(client: Lavamusic, guildId: string, voiceChannelId: string): Promise<any | null> {
		if (client.shardStateManager) {
			return await client.shardStateManager.getPlayerSession(guildId, voiceChannelId);
		} else {
			const guildMap = sessionMap.get(guildId);
			return guildMap?.get(voiceChannelId) || null;
		}
	}

	/**
	 * Remove player session
	 */
	static async removeSession(client: Lavamusic, guildId: string, voiceChannelId: string): Promise<void> {
		if (client.shardStateManager) {
			await client.shardStateManager.removePlayerSession(guildId, voiceChannelId);
		} else {
			const guildMap = sessionMap.get(guildId);
			if (guildMap) {
				guildMap.delete(voiceChannelId);
			}
		}
	}

	/**
	 * Get all sessions for a guild
	 */
	static async getGuildSessions(client: Lavamusic, guildId: string): Promise<Map<string, any>> {
		if (client.shardStateManager) {
			return await client.shardStateManager.getGuildPlayerSessions(guildId);
		} else {
			return sessionMap.get(guildId) || new Map();
		}
	}
}
