import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { Player } from 'lavalink-client';
import type { Context } from '../structures/index';
import type Lavamusic from '../structures/Lavamusic';

export interface VoteResult {
	shouldExecute: boolean;
	alreadyVoted?: boolean;
	isPrivileged?: boolean;
	needsVoting?: boolean;
}

/**
 * Map to store active vote timeouts
 * Key: `guildId:action`, Value: NodeJS.Timeout
 */
const voteTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * Vote timeout duration in milliseconds (3 minutes)
 */
const VOTE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

export interface VoteCheckOptions {
	client: Lavamusic;
	ctx: Context;
	player: Player;
	action: 'skip' | 'stop' | 'pause' | 'resume' | 'volume' | 'seek' | 'shuffle' | 'skipto' | 'clearqueue';
	actionData?: any; // For actions that need additional data (e.g., volume level)
}

/**
 * Comprehensive voting system for music commands
 * Rules:
 * 1. Requester of current track can control their own track (skip, pause, resume, etc.)
 * 2. Summoner (user who called the bot) has full control
 * 3. DJ role members have full control
 * 4. Bots (autoplay) tracks can be controlled by anyone
 * 5. For <=2 listeners, no voting needed
 * 6. For >2 listeners, majority vote required (>50%)
 */
export class VotingSystem {
	/**
	 * Check if user has privilege to execute action without voting
	 */
	public static hasPrivilege(
		ctx: Context,
		player: Player,
		isDJ: boolean = false,
	): { hasPrivilege: boolean; reason: string } {
		const userId = ctx.author?.id;
		if (!userId) {
			return { hasPrivilege: false, reason: 'no_user' };
		}

		// Check if user is the summoner (who called the bot)
		const summonUserId = player.get<string>('summonUserId');
		if (summonUserId === userId) {
			return { hasPrivilege: true, reason: 'summoner' };
		}

		// Check if user is DJ
		if (isDJ) {
			return { hasPrivilege: true, reason: 'dj' };
		}

		// Check if user is requester of current track
		const requesterId = player.queue.current?.requester;
		if (requesterId === userId) {
			return { hasPrivilege: true, reason: 'requester' };
		}

		// Check if current track is from autoplay (bot requester)
		if (requesterId && ctx.guild?.members.cache.find(m => m.id === requesterId)?.user.bot) {
			return { hasPrivilege: true, reason: 'autoplay_track' };
		}

		return { hasPrivilege: false, reason: 'none' };
	}

	/**
	 * Count non-bot listeners in voice channel
	 */
	public static countListeners(ctx: Context): number {
		const userId = ctx.author?.id;
		if (!userId) return 1;

		const channel = ctx.guild?.members.cache.get(userId)?.voice?.channel;
		if (channel && channel.members) {
			return channel.members.filter((m: any) => !m.user.bot).size;
		}
		return 1; // fallback
	}

	/**
	 * Check if action requires voting and handle the vote
	 */
	public static async checkVote(options: VoteCheckOptions): Promise<VoteResult> {
		const { client, ctx, player, action, actionData } = options;
		const userId = ctx.author?.id;

		if (!userId) {
			return { shouldExecute: false };
		}

		// Check for privilege first
		const isDJ = await this.checkDJPermission(client, ctx);
		const privilegeCheck = this.hasPrivilege(ctx, player, isDJ);

		if (privilegeCheck.hasPrivilege) {
			return { shouldExecute: true, isPrivileged: true };
		}

		// Count listeners
		const listeners = this.countListeners(ctx);

		// If only 1-2 listeners, execute immediately
		if (listeners <= 2) {
			return { shouldExecute: true, isPrivileged: false };
		}

		// Need voting - get or create vote set
		const voteKey = `${action}Votes`;
		const keepKey = 'keepVotes';

		if (!player.get(voteKey)) player.set(voteKey, new Set<string>());
		if (!player.get(keepKey)) player.set(keepKey, new Set<string>());

		const actionVotes = player.get(voteKey) as Set<string>;
		const keepVotes = player.get(keepKey) as Set<string>;

		// Check if user already voted
		if (actionVotes.has(userId) || keepVotes.has(userId)) {
			return { shouldExecute: false, alreadyVoted: true, needsVoting: true };
		}

		const needed = Math.ceil(listeners / 2);

		// First vote - create voting embed
		if (actionVotes.size === 0 && keepVotes.size === 0) {
			await this.createVoteEmbed(client, ctx, player, action, needed, actionData);
			// Add the user's vote
			actionVotes.add(userId);
			player.set(voteKey, actionVotes);
			return { shouldExecute: false, needsVoting: true };
		}

		// Add vote
		actionVotes.add(userId);
		player.set(voteKey, actionVotes);

		// Update voting embed
		await this.updateVoteEmbed(client, ctx, player, action, actionVotes.size, needed);

		// Check if enough votes
		if (actionVotes.size >= needed) {
			// Clear votes
			actionVotes.clear();
			keepVotes.clear();
			player.set(voteKey, actionVotes);
			player.set(keepKey, keepVotes);
			return { shouldExecute: true, needsVoting: true };
		}

		return { shouldExecute: false, needsVoting: true };
	}

	/**
	 * Create initial voting embed with buttons
	 */
	private static async createVoteEmbed(
		client: Lavamusic,
		ctx: Context,
		player: Player,
		action: string,
		needed: number,
		actionData?: any,
	): Promise<void> {
		const embed = new EmbedBuilder()
			.setColor(client.color.main)
			.setDescription(
				ctx.locale(`cmd.${action}.messages.vote_embed`, { 
					votes: 1, 
					needed,
					...(actionData || {})
				}),
			)
			.setFooter({
				text: 'BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️',
				iconURL:
					'https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg',
			})
			.setTimestamp();

		const components = [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`${action}_vote_yes`)
					.setLabel(ctx.locale(`cmd.${action}.messages.button_yes`) || `✅ ${action.charAt(0).toUpperCase() + action.slice(1)}`)
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
					.setCustomId(`${action}_vote_no`)
					.setLabel(ctx.locale(`cmd.${action}.messages.button_no`) || '❌ Keep')
					.setStyle(ButtonStyle.Danger),
			),
		];

		const sent = await ctx.sendMessage({
			embeds: [embed],
			components,
		});

		// Store message ID for later updates
		player.set(`${action}VoteMessageId`, sent.id);

		// Clear any existing timeout for this action
		if (ctx.guild?.id) {
			this.clearVoteTimeout(ctx.guild.id, action);

			// Start 3-minute timeout
			const timeoutKey = `${ctx.guild.id}:${action}`;
			const timeout = setTimeout(() => {
				this.handleVoteTimeout(client, ctx.guild!.id, action, ctx.channel?.id);
			}, VOTE_TIMEOUT_MS);

			voteTimeouts.set(timeoutKey, timeout);
		}
	}

	/**
	 * Update existing voting embed
	 */
	private static async updateVoteEmbed(
		client: Lavamusic,
		ctx: Context,
		player: Player,
		action: string,
		votes: number,
		needed: number,
	): Promise<void> {
		const messageId = player.get(`${action}VoteMessageId`) as string | undefined;
		if (!messageId) return;

		const userId = ctx.author?.id;
		if (!userId) return;

		const channel = ctx.guild?.members.cache.get(userId)?.voice?.channel;
		if (!channel) return;

		try {
			const voteMsg = await (channel as any).messages?.fetch(messageId);
			if (!voteMsg) return;

			const embed = new EmbedBuilder()
				.setColor(client.color.main)
				.setDescription(ctx.locale(`cmd.${action}.messages.vote_embed`, { votes, needed }))
				.setFooter({
					text: 'BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️',
					iconURL:
						'https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg',
				})
				.setTimestamp();

			await voteMsg.edit({ embeds: [embed] });
		} catch (e) {
			// Message might be deleted or inaccessible
		}
	}

	/**
	 * Check if user has DJ permission
	 */
	private static async checkDJPermission(client: Lavamusic, ctx: Context): Promise<boolean> {
		if (!ctx.guild || !ctx.author) return false;

		const dj = await client.db.getDj(ctx.guild.id);
		if (!dj?.mode) return false;

		const member = ctx.guild.members.cache.get(ctx.author.id);
		if (!member) return false;

		// Get DJ roles from Role model
		const roles = await client.db.getRoles(ctx.guild.id);
		if (!roles || roles.length === 0) return false;

		const djRole = roles.find((role) => member.roles.cache.has(role.roleId));
		return !!djRole;
	}

	/**
	 * Handle vote timeout - disable buttons and clear vote state
	 */
	private static async handleVoteTimeout(
		client: Lavamusic,
		guildId: string,
		action: string,
		textChannelId?: string,
	): Promise<void> {
		const player = client.manager.getPlayer(guildId);
		if (!player) return;

		const messageId = player.get(`${action}VoteMessageId`) as string | undefined;
		if (!messageId) return;

		// Clear vote state
		const voteKey = `${action}Votes`;
		const keepKey = 'keepVotes';
		player.set(voteKey, new Set<string>());
		player.set(keepKey, new Set<string>());
		player.set(`${action}VoteMessageId`, undefined);

		// Clear timeout from map
		const timeoutKey = `${guildId}:${action}`;
		voteTimeouts.delete(timeoutKey);

		// Try to update the message to remove buttons
		try {
			let voteMsg;
			if (textChannelId) {
				const channel = await client.channels.fetch(textChannelId);
				if (channel?.isTextBased()) {
					voteMsg = await channel.messages.fetch(messageId);
				}
			}

			if (voteMsg) {
				const embed = new EmbedBuilder()
					.setColor(client.color.red)
					.setDescription(`Vote for ${action} has timed out after 3 minutes. ⏱️`)
					.setFooter({
						text: 'BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️',
						iconURL:
							'https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg',
					})
					.setTimestamp();

				await voteMsg.edit({ embeds: [embed], components: [] });
			}
		} catch (e) {
			// Message might be deleted or inaccessible
		}
	}

	/**
	 * Clear vote timeout for a specific action
	 */
	private static clearVoteTimeout(guildId: string, action: string): void {
		const timeoutKey = `${guildId}:${action}`;
		const timeout = voteTimeouts.get(timeoutKey);
		if (timeout) {
			clearTimeout(timeout);
			voteTimeouts.delete(timeoutKey);
		}
	}

	/**
	 * Handle button interaction for voting
	 */
	public static async handleVoteButton(
		client: Lavamusic,
		interaction: any,
		action: string,
		voteType: 'yes' | 'no',
	): Promise<void> {
		const { guild, user } = interaction;
		if (!guild) return;

		const player = client.manager.getPlayer(guild.id);
		if (!player) {
			await interaction.reply({ content: 'No player found.', ephemeral: true });
			return;
		}

		const voteKey = `${action}Votes`;
		const keepKey = 'keepVotes';

		if (!player.get(voteKey)) player.set(voteKey, new Set<string>());
		if (!player.get(keepKey)) player.set(keepKey, new Set<string>());

		const actionVotes = player.get(voteKey) as Set<string>;
		const keepVotes = player.get(keepKey) as Set<string>;

		// Remove previous votes
		actionVotes.delete(user.id);
		keepVotes.delete(user.id);

		// Add new vote
		if (voteType === 'yes') {
			actionVotes.add(user.id);
		} else {
			keepVotes.add(user.id);
		}

		player.set(voteKey, actionVotes);
		player.set(keepKey, keepVotes);

		// Count listeners
		const member = guild.members.cache.get(user.id);
		const channel = member?.voice?.channel;
		let listeners = 1;
		if (channel && channel.members) {
			listeners = channel.members.filter((m: any) => !m.user.bot).size;
		}

		const needed = Math.ceil(listeners / 2);

		const embed = new EmbedBuilder()
			.setColor(client.color.main)
			.setDescription(
				`Vote to ${action}: **${actionVotes.size}/${needed}**\n✅ to ${action}, ❌ to keep.`,
			)
			.setFooter({
				text: 'BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️',
				iconURL:
					'https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg',
			})
			.setTimestamp();

		// Check if vote passed
		if (actionVotes.size >= needed) {
			// Clear timeout since vote completed
			this.clearVoteTimeout(guild.id, action);

			actionVotes.clear();
			keepVotes.clear();
			player.set(voteKey, actionVotes);
			player.set(keepKey, keepVotes);

			// Execute the action
			await this.executeAction(client, player, action, interaction, embed);
			return;
		}

		// Update vote count
		await interaction.update({
			embeds: [embed],
			components: interaction.message.components,
		});
	}

	/**
	 * Execute the voted action
	 */
	private static async executeAction(
		_client: Lavamusic,
		player: Player,
		action: string,
		interaction: any,
		embed: EmbedBuilder,
	): Promise<void> {
		const autoplay = player.get<boolean>('autoplay');
		const currentTrack = player.queue.current?.info;

		switch (action) {
			case 'skip':
				player.skip(0, !autoplay);
				embed.setDescription(`Skipped [${currentTrack?.title}](${currentTrack?.uri}).`);
				embed.setColor(0x43b581);
				break;

			case 'stop':
				player.set('messageId', undefined);
				player.stopPlaying(true, false);
				embed.setDescription('Stopped the player and cleared the queue.');
				embed.setColor(0x43b581);
				break;

			case 'pause':
				player.pause();
				embed.setDescription('Paused the player.');
				embed.setColor(0x43b581);
				break;

			case 'resume':
				player.resume();
				embed.setDescription('Resumed the player.');
				embed.setColor(0x43b581);
				break;

			case 'shuffle':
				player.queue.shuffle();
				embed.setDescription('Shuffled the queue.');
				embed.setColor(0x43b581);
				break;

			case 'clearqueue':
				while (player.queue.tracks.length > 0) {
					player.queue.tracks.shift();
				}
				embed.setDescription('Cleared the queue.');
				embed.setColor(0x43b581);
				break;

			default:
				embed.setDescription(`Action ${action} executed.`);
				break;
		}

		await interaction.update({
			embeds: [embed],
			components: [],
		});
	}
}
