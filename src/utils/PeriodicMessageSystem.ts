import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type TextChannel } from 'discord.js';
import type Lavamusic from '../structures/Lavamusic';
import { T } from '../structures/I18n';
import { activeBots } from '..';

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
						// Only process if player is actively playing
						if (!player.playing) continue;

						activePlayersCount++;
						const clientId = bot.childEnv.clientId;
						const key = `${player.guildId}:${clientId}`;
						const sessionStart = sessionStartTimes.get(key);
						
						if (!sessionStart) {
							// Session not tracked yet, start it
							this.startSession(player.guildId, clientId);
							continue;
						}

						const lastMessageTime = lastMessageTimes.get(key) || sessionStart;
						const timeSinceLastMessage = now - lastMessageTime;

						// Check if 30 minutes have passed since last message
						if (timeSinceLastMessage >= MESSAGE_INTERVAL_MS) {
							await this.sendPeriodicMessage(bot, player.guildId, player.textChannelId!);
							lastMessageTimes.set(key, now);
						}
					}
				}
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
			const guild = client.guilds.cache.get(guildId);
			if (!guild) return;

			const player = client.manager.getPlayer(guildId);
			if (!player || !player.playing) return;

			const textChannel = guild.channels.cache.get(textChannelId) as TextChannel;
			if (!textChannel) return;

			// Check how many bots are in the voice channel
			const voiceChannel = guild.channels.cache.get(player.voiceChannelId!);
			if (!voiceChannel || !('members' in voiceChannel)) return;

			const totalBotsAvailable = activeBots.filter(bot =>
				guild.members.cache.has(bot.user!.id)
			).length;

			const botsInVC = voiceChannel.members instanceof Map
				? Array.from(voiceChannel.members.values()).filter((m: any) => m.user.bot).length
				: 0;
			const needsMoreBots = botsInVC < totalBotsAvailable;

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
						.setURL('https://ductridev.github.io/multi-distube-bots/')
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

			await textChannel.send({
				embeds: [periodicEmbed],
				components: [buttons],
			}).catch(() => null);
		} catch (error) {
			console.error('[PERIODIC MESSAGES] Failed to send message:', error);
		}
	}
}
