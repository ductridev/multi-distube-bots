import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type TextChannel } from 'discord.js';
import type Lavamusic from '../structures/Lavamusic';
import { T } from '../structures/I18n';
import { activeBots } from '..';
import { RateLimitTracker } from '../services/RateLimitTracker.js';

/**
 * Map to store session start timestamps
 * Key: `guildId:clientId`, Value: timestamp
 */
const sessionStartTimes = new Map<string, number>();

/**
 * Map to store last message send time
 * Key: `guildId:clientId`, Value: timestamp
 */
const lastMessageTimes = new Map<string, number>();

/**
 * Interval for checking and sending periodic messages (30 seconds)
 * This determines how often the system checks if messages should be sent
 */
const CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds - checks frequently

/**
 * Send message every 30 minutes of playback
 * 30 * 60 * 1000 (30 minutes)
 */
const MESSAGE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Global interval reference
 */
let periodicCheckInterval: NodeJS.Timeout | null = null;

export class PeriodicMessageSystem {
	/**
	 * Rate limiter instance for Discord API operations
	 */
	private static rateLimiter: RateLimitTracker = RateLimitTracker.getInstance();

	/**
	 * Mark session start for a guild/bot combination
	 */
	public static startSession(guildId: string, clientId: string): void {
		const key = `${guildId}:${clientId}`;
		if (!sessionStartTimes.has(key)) {
			sessionStartTimes.set(key, Date.now());
		}
	}

	/**
	 * Clear session data when player is destroyed or queue ends
	 */
	public static endSession(guildId: string, clientId: string): void {
		const key = `${guildId}:${clientId}`;
		sessionStartTimes.delete(key);
		lastMessageTimes.delete(key);
	}

	/**
	 * Start the periodic message checking job
	 * Should be called once when the bot starts
	 */
	public static startPeriodicCheck(): void {
		if (periodicCheckInterval) {
			console.log('[PERIODIC MESSAGES] Already running, skipping...');
			return; // Already running
		}

		periodicCheckInterval = setInterval(async () => {
			try {
				const now = Date.now();
				let activePlayersCount = 0;
				
				// Check all active bots' players
				for (const bot of activeBots) {
					const players = Array.from(bot.manager.players.values());

					for (const player of players) {
						// DEBUG: Log player state
						console.log(`[PERIODIC DEBUG] Guild: ${player.guildId}, Playing: ${player.playing}, Queue: ${player.queue.tracks.length}, State: ${player.toJSON()}, TextChannel: ${player.textChannelId}`);

						// Only process if player is actively playing
						if (!player.playing) {
							console.log(`[PERIODIC DEBUG] Skipping guild ${player.guildId} - player not playing`);
							continue;
						}

						activePlayersCount++;
						const clientId = bot.childEnv.clientId;
						const key = `${player.guildId}:${clientId}`;
						const sessionStart = sessionStartTimes.get(key);
						
						console.log(`[PERIODIC DEBUG] Key: ${key}, SessionStart: ${sessionStart}`);
						
						if (!sessionStart) {
							// Session not tracked yet, start it
							console.log(`[PERIODIC DEBUG] No session found for ${key}, starting new session`);
							this.startSession(player.guildId, clientId);
							continue;
						}

						const lastMessageTime = lastMessageTimes.get(key) || sessionStart;
						const timeSinceLastMessage = now - lastMessageTime;
						const minutesSinceLastMessage = Math.floor(timeSinceLastMessage / 60000);

						console.log(`[PERIODIC DEBUG] LastMessageTime: ${lastMessageTime}, TimeSince: ${minutesSinceLastMessage} min, Interval: ${MESSAGE_INTERVAL_MS / 60000} min`);

						// Check if 30 minutes have passed since last message
						if (timeSinceLastMessage >= MESSAGE_INTERVAL_MS) {
							console.log(`[PERIODIC DEBUG] Sending periodic message to guild ${player.guildId}`);
							await this.sendPeriodicMessage(bot, player.guildId, player.textChannelId!);
							lastMessageTimes.set(key, now);
							console.log(`[PERIODIC DEBUG] Message sent successfully, updated lastMessageTime`);
						} else {
							console.log(`[PERIODIC DEBUG] Not sending message yet - ${minutesSinceLastMessage} min elapsed, need ${MESSAGE_INTERVAL_MS / 60000} min`);
						}
					}
				}
				
				console.log(`[PERIODIC DEBUG] Check completed. Active players: ${activePlayersCount}`);
			} catch (error) {
				console.error('[PERIODIC MESSAGES] Check error:', error);
			}
		}, CHECK_INTERVAL_MS);
	}

	/**
	 * Stop the periodic check job
	 */
	public static stopPeriodicCheck(): void {
		if (periodicCheckInterval) {
			clearInterval(periodicCheckInterval);
			periodicCheckInterval = null;
			console.log('[PERIODIC MESSAGES] Stopped periodic check');
		}
	}

	/**
	 * Get current session status for debugging
	 */
	public static getSessionStatus(): Array<{
		guildId: string;
		clientId: string;
		sessionStarted: string;
		lastMessage: string;
		minutesElapsed: number;
	}> {
		const now = Date.now();
		const status: Array<{
			guildId: string;
			clientId: string;
			sessionStarted: string;
			lastMessage: string;
			minutesElapsed: number;
		}> = [];

		for (const [key, startTime] of sessionStartTimes) {
			const [guildId, clientId] = key.split(':');
			const lastMessageTime = lastMessageTimes.get(key) || startTime;
			const minutesElapsed = Math.floor((now - lastMessageTime) / 60000);

			status.push({
				guildId,
				clientId,
				sessionStarted: new Date(startTime).toISOString(),
				lastMessage: new Date(lastMessageTime).toISOString(),
				minutesElapsed,
			});
		}

		return status;
	}

	/**
	 * Send the periodic reminder message
	 */
	private static async sendPeriodicMessage(
		client: Lavamusic,
		guildId: string,
		textChannelId: string
	): Promise<void> {
		try {
			console.log(`[PERIODIC DEBUG] sendPeriodicMessage called for guild ${guildId}, textChannel ${textChannelId}`);
			
			const guild = client.guilds.cache.get(guildId);
			if (!guild) {
				console.log(`[PERIODIC DEBUG] Guild ${guildId} not found in cache`);
				return;
			}

			const player = client.manager.getPlayer(guildId);
			if (!player || !player.playing) {
				console.log(`[PERIODIC DEBUG] Player not found or not playing for guild ${guildId}. Player exists: ${!!player}, Playing: ${player?.playing}`);
				return;
			}

			const textChannel = guild.channels.cache.get(textChannelId) as TextChannel;
			if (!textChannel) {
				console.log(`[PERIODIC DEBUG] Text channel ${textChannelId} not found in guild ${guildId}`);
				return;
			}

			// Check how many bots are in the voice channel
			const voiceChannel = guild.channels.cache.get(player.voiceChannelId!);
			if (!voiceChannel || !('members' in voiceChannel)) {
				console.log(`[PERIODIC DEBUG] Voice channel ${player.voiceChannelId} not found or invalid`);
				return;
			}

			const totalBotsAvailable = activeBots.filter(bot =>
				guild.members.cache.has(bot.user!.id)
			).length;

			const botsInVC = voiceChannel.members instanceof Map
				? Array.from(voiceChannel.members.values()).filter((m: any) => m.user.bot).length
				: 0;
			const needsMoreBots = botsInVC < totalBotsAvailable;

			console.log(`[PERIODIC DEBUG] Bots in VC: ${botsInVC}, Total available: ${totalBotsAvailable}, Needs more: ${needsMoreBots}`);

			const currentLocale = await client.db.getLanguage(guildId);
			const buttons = new ActionRowBuilder<ButtonBuilder>();

			// Always add vote button
			buttons.addComponents(
				new ButtonBuilder()
					.setLabel(T(currentLocale, 'player.trackStart.vote_button'))
					.setURL('https://top.gg/bot/1385166515099275346')
					.setStyle(ButtonStyle.Link)
			);

			// Add "Get More Bots" button if not all bots are in VC
			if (needsMoreBots) {
				buttons.addComponents(
					new ButtonBuilder()
						.setLabel(T(currentLocale, 'player.trackStart.get_more_bots_button'))
						.setURL('https://music-bots.tuitenbo.com')
						.setStyle(ButtonStyle.Link)
				);
			}

			const messageContent = needsMoreBots
				? T(currentLocale, 'player.trackStart.periodic_message_with_bots')
				: T(currentLocale, 'player.trackStart.periodic_message_vote_only');

			const periodicEmbed = client.embed()
				.setColor(client.color.main)
				.setDescription(messageContent)
				.setFooter({
					text: "BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
					iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
				})
				.setTimestamp();

			console.log(`[PERIODIC DEBUG] Sending message to channel ${textChannelId}`);
			try {
				await this.rateLimiter.throttled(async () => {
					await textChannel.send({
						embeds: [periodicEmbed],
						components: [buttons],
					});
				});
				console.log(`[PERIODIC DEBUG] Message sent successfully to guild ${guildId}`);
			} catch (error: any) {
				if (error.code === 429 || error.status === 429) {
					const info = this.rateLimiter.handleRateLimitError(error);
					console.error(`[PERIODIC] Rate limited in guild ${guildId}. Scope: ${info.scope}, Retry after: ${info.retryAfterMs}ms`);
				} else {
					console.error(`[PERIODIC DEBUG] Failed to send message:`, error);
				}
			}
		} catch (error) {
			console.error('[PERIODIC MESSAGES] Failed to send message:', error);
		}
	}
}
