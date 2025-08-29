import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Skip extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'skip',
			description: {
				content: 'cmd.skip.description',
				examples: ['skip'],
				usage: 'skip',
			},
			category: 'music',
			aliases: ['s', 'sk'],
			cooldown: 0,
			args: false,
			vote: true,
			player: {
				voice: true,
				dj: true,
				active: true,
				djPerm: null,
			},
			permissions: {
				dev: false,
				client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
				user: [],
			},
			slashCommand: true,
			options: [],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		const player = client.manager.getPlayer(ctx.guild!.id);
		const embed = this.client.embed().setFooter({
			text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
			iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
		})
			.setTimestamp();
		if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'));
		const autoplay = player.get<boolean>('autoplay');
		if (!autoplay && player.queue.tracks.length === 0) {
			player.stopPlaying(true, false);
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.stop.messages.stopped'))],
			});
		}
		const currentTrack = player.queue.current?.info;
		const requesterId = player.queue.current?.requester;
		const userId = ctx.author?.id;

		// If the user is the requester, skip immediately
		// If the user is summoner, skip immediately
		// If the requester is bot so it's from autoplay mode, skip immediately
		if (requesterId && userId && (requesterId === userId || player.get('summonUserId') === userId || ctx.guild.members.cache.find(m => m.id === requesterId)?.client.user.bot)) {
			player.skip(0, !autoplay);
			if (ctx.isInteraction) {
				return await ctx.sendMessage({
					embeds: [
						embed.setColor(this.client.color.main).setDescription(
							ctx.locale('cmd.skip.messages.skipped', {
								title: currentTrack?.title,
								uri: currentTrack?.uri,
							}),
						),
					],
				});
			}
			ctx.message?.react('👍');
			return;
		}

		// If the user is not the requester or summoner, check for skip votes
		if (!userId) {
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.messages.no_user'))],
			});
		}

		// Vote to skip logic
		if (!player.get('skipVotes')) player.set('skipVotes', new Set());
		if (!player.get('keepVotes')) player.set('keepVotes', new Set());
		const skipVotes = player.get('skipVotes') as Set<string>;
		const keepVotes = player.get('keepVotes') as Set<string>;

		// Count listeners (exclude bots)
		const channel = ctx.guild?.members.cache.get(userId)?.voice?.channel;
		let listeners = 0;
		if (channel && channel.members) {
			listeners = channel.members.filter((m: any) => !m.user.bot).size;
		} else {
			listeners = 1; // fallback
		}

		// If there are only 2 listeners, skip voting
		if (listeners <= 2) {
			player.skip(0, !autoplay);
			skipVotes.clear();
			keepVotes.clear();
			player.set('skipVotes', skipVotes);
			player.set('keepVotes', keepVotes);
			if (ctx.isInteraction) {
				return await ctx.sendMessage({
					embeds: [
						embed.setColor(this.client.color.main).setDescription(
							ctx.locale('cmd.skip.messages.skipped', {
								title: currentTrack?.title,
								uri: currentTrack?.uri,
							}),
						),
					],
				});
			}
			ctx.message?.react('👍');
			return;
		}
		const needed = Math.ceil(listeners / 2);
		const votes = skipVotes.size;

		// Send embed with buttons if this is the first vote
		if (votes === 0 && keepVotes.size === 0) {
			const voteEmbed = embed.setColor(this.client.color.main)
				.setDescription(ctx.locale('cmd.skip.messages.vote_embed', { votes, needed }));
			const components = [
				{
					type: 1, // ActionRow
					components: [
						{
							type: 2, // Button
							style: 3, // Success (green)
							custom_id: 'skip_vote_yes',
							label: ctx.locale('cmd.skip.messages.button_skip'),
						},
						{
							type: 2, // Button
							style: 4, // Danger (red)
							custom_id: 'skip_vote_no',
							label: ctx.locale('cmd.skip.messages.button_keep'),
						},
					],
				},
			];
			const sent = await ctx.sendMessage({
				embeds: [voteEmbed],
				components,
			});
			// Optionally store sent.id for later editing
			player.set('skipVoteMessageId', sent.id);
			// Add the user's vote
			skipVotes.add(userId);
			player.set('skipVotes', skipVotes);
			return;
		}

		// If user already voted, do not allow duplicate votes
		if (skipVotes.has(userId) || keepVotes.has(userId)) {
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.skip.messages.already_voted'))],
			});
		}

		// Add the user's vote (default to skip for now, interaction handler will handle both)
		skipVotes.add(userId);
		player.set('skipVotes', skipVotes);

		// Try to update the voting embed if it exists
		const skipVoteMessageId = player.get('skipVoteMessageId') as string | undefined;
		if (skipVoteMessageId && channel) {
			try {
				const voteMsg = await channel.messages.fetch(skipVoteMessageId);
				await voteMsg.edit({
					embeds: [
						embed.setColor(this.client.color.main).setDescription(
							ctx.locale('cmd.skip.messages.vote_embed', { votes: skipVotes.size, needed })
						)
					],
				});
			} catch (e) {
				// message might be deleted or inaccessible
			}
		}

		// If enough votes, skip
		if (skipVotes.size >= needed) {
			player.skip(0, !autoplay);
			skipVotes.clear();
			keepVotes.clear();
			player.set('skipVotes', skipVotes);
			player.set('keepVotes', keepVotes);
			if (ctx.isInteraction) {
				return await ctx.sendMessage({
					embeds: [
						embed.setColor(this.client.color.main).setDescription(
							ctx.locale('cmd.skip.messages.skipped', {
								title: currentTrack?.title,
								uri: currentTrack?.uri,
							}),
						),
					],
				});
			}
			ctx.message?.react('👍');
		} else {
			// Optionally send a new message if not using buttons
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.main).setDescription(ctx.locale('cmd.skip.messages.vote_embed', { votes: skipVotes.size, needed }))],
			});
		}
	}
}


