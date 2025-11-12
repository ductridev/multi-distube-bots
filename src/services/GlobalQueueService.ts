/**
 * Global Queue Service
 * View and manage all playing tracks across all bots
 */

import type { Lavamusic } from "../structures/index.js";
import Logger from "../structures/Logger.js";

export interface GlobalQueueTrack {
	guildId: string;
	guildName: string;
	botClientId: string;
	botName: string;
	track: {
		title: string;
		author: string;
		duration: number;
		uri: string;
		requester: {
			id: string;
			username: string;
		};
	};
	position: number; // Position in queue (0 = now playing)
	voiceChannel: {
		id: string;
		name: string;
		memberCount: number;
	};
	textChannel: {
		id: string;
		name: string;
	};
}

export interface GlobalQueueStats {
	totalPlayers: number;
	totalTracks: number;
	totalListeners: number;
	activeBots: number;
	topGenres?: string[];
}

export class GlobalQueueService {
	private logger: Logger;

	constructor(private bots: Lavamusic[]) {
		this.logger = new Logger("GlobalQueue");
	}

	/**
	 * Get all currently playing tracks across all bots
	 */
	public getAllPlaying(): GlobalQueueTrack[] {
		const allTracks: GlobalQueueTrack[] = [];

		for (const bot of this.bots) {
			if (!bot.isReady()) {
				continue;
			}

			try {
				const manager = bot.manager;
				if (!manager) {
					continue;
				}

				for (const [guildId, player] of manager.players) {
					if (!player.queue.current) {
						continue;
					}

					const guild = bot.guilds.cache.get(guildId);
					if (!guild) {
						continue;
					}

					const voiceChannel = guild.channels.cache.get(player.voiceChannelId!);
					const textChannel = guild.channels.cache.get(player.textChannelId!);

					if (!voiceChannel || !textChannel || !voiceChannel.isVoiceBased()) {
						continue;
					}

					const track: GlobalQueueTrack = {
						guildId,
						guildName: guild.name,
						botClientId: bot.childEnv.clientId,
						botName: bot.childEnv.name,
						track: {
							title: player.queue.current.info.title,
							author: player.queue.current.info.author,
							duration: player.queue.current.info.duration,
							uri: player.queue.current.info.uri,
							requester: {
								id: (player.queue.current.requester as any)?.id || "unknown",
								username: (player.queue.current.requester as any)?.username || "Unknown",
							},
						},
						position: 0,
						voiceChannel: {
							id: voiceChannel.id,
							name: voiceChannel.name,
							memberCount: voiceChannel.members.size,
						},
						textChannel: {
							id: textChannel.id,
							name: textChannel.name,
						},
					};

					allTracks.push(track);
				}
			} catch (error) {
				this.logger.error(
					`[Global Queue] Error getting tracks for bot ${bot.childEnv.clientId}: ${error}`,
				);
			}
		}

		return allTracks;
	}

	/**
	 * Get all queued tracks (including upcoming tracks)
	 */
	public getAllQueued(): GlobalQueueTrack[] {
		const allTracks: GlobalQueueTrack[] = [];

		for (const bot of this.bots) {
			if (!bot.isReady()) {
				continue;
			}

			try {
				const manager = bot.manager;
				if (!manager) {
					continue;
				}

				for (const [guildId, player] of manager.players) {
					const guild = bot.guilds.cache.get(guildId);
					if (!guild) {
						continue;
					}

					const voiceChannel = guild.channels.cache.get(player.voiceChannelId!);
					const textChannel = guild.channels.cache.get(player.textChannelId!);

					if (!voiceChannel || !textChannel || !voiceChannel.isVoiceBased()) {
						continue;
					}

					// Add current track
					if (player.queue.current) {
						allTracks.push({
							guildId,
							guildName: guild.name,
							botClientId: bot.childEnv.clientId,
							botName: bot.childEnv.name,
							track: {
								title: player.queue.current.info.title,
								author: player.queue.current.info.author,
								duration: player.queue.current.info.duration,
								uri: player.queue.current.info.uri,
								requester: {
									id: (player.queue.current.requester as any)?.id || "unknown",
									username: (player.queue.current.requester as any)?.username || "Unknown",
								},
							},
							position: 0,
							voiceChannel: {
								id: voiceChannel.id,
								name: voiceChannel.name,
								memberCount: voiceChannel.members.size,
							},
							textChannel: {
								id: textChannel.id,
								name: textChannel.name,
							},
						});
					}

					// Add queued tracks
					let position = 1;
					for (const track of player.queue.tracks) {
						allTracks.push({
							guildId,
							guildName: guild.name,
							botClientId: bot.childEnv.clientId,
							botName: bot.childEnv.name,
							track: {
								title: track.info.title,
								author: track.info.author || "Unknown",
								duration: track.info.duration || 0,
								uri: track.info.uri || "",
								requester: {
									id: (track.requester as any)?.id || "unknown",
									username: (track.requester as any)?.username || "Unknown",
								},
							},
							position,
							voiceChannel: {
								id: voiceChannel.id,
								name: voiceChannel.name,
								memberCount: voiceChannel.members.size,
							},
							textChannel: {
								id: textChannel.id,
								name: textChannel.name,
							},
						});
						position++;
					}
				}
			} catch (error) {
				this.logger.error(
					`[Global Queue] Error getting queued tracks for bot ${bot.childEnv.clientId}: ${error}`,
				);
			}
		}

		return allTracks;
	}

	/**
	 * Get global queue statistics
	 */
	public getStats(): GlobalQueueStats {
		const playing = this.getAllPlaying();
		const queued = this.getAllQueued();

		let totalListeners = 0;
		const activeBotIds = new Set<string>();

		for (const track of playing) {
			totalListeners += track.voiceChannel.memberCount;
			activeBotIds.add(track.botClientId);
		}

		return {
			totalPlayers: playing.length,
			totalTracks: queued.length,
			totalListeners,
			activeBots: activeBotIds.size,
		};
	}

	/**
	 * Get tracks for a specific bot
	 */
	public getTracksByBot(clientId: string): GlobalQueueTrack[] {
		return this.getAllQueued().filter((t) => t.botClientId === clientId);
	}

	/**
	 * Get tracks for a specific guild
	 */
	public getTracksByGuild(guildId: string): GlobalQueueTrack[] {
		return this.getAllQueued().filter((t) => t.guildId === guildId);
	}

	/**
	 * Search tracks by title or author
	 */
	public searchTracks(query: string): GlobalQueueTrack[] {
		const lowerQuery = query.toLowerCase();
		return this.getAllQueued().filter(
			(t) =>
				t.track.title.toLowerCase().includes(lowerQuery) ||
				t.track.author.toLowerCase().includes(lowerQuery),
		);
	}

	/**
	 * Get most popular tracks currently playing
	 */
	public getPopularTracks(limit = 10): Array<{
		title: string;
		author: string;
		uri: string;
		playCount: number;
	}> {
		const trackCounts = new Map<
			string,
			{ title: string; author: string; count: number }
		>();

		for (const track of this.getAllQueued()) {
			const existing = trackCounts.get(track.track.uri);
			if (existing) {
				existing.count++;
			} else {
				trackCounts.set(track.track.uri, {
					title: track.track.title,
					author: track.track.author,
					count: 1,
				});
			}
		}

		return Array.from(trackCounts.entries())
			.map(([uri, data]) => ({
				title: data.title,
				author: data.author,
				uri,
				playCount: data.count,
			}))
			.sort((a, b) => b.playCount - a.playCount)
			.slice(0, limit);
	}
}
