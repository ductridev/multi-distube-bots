import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Stop extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'stop',
			description: {
				content: 'cmd.stop.description',
				examples: ['stop'],
				usage: 'stop',
			},
			category: 'music',
			aliases: ['sp'],
			cooldown: 3,
			args: false,
			vote: false,
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
		const requesterId = player.queue.current?.requester;
		const userId = ctx.author?.id;

		if (!userId) {
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.messages.no_user'))],
			});
		}

		// If the user is the requester, stop immediately
		if (requesterId && userId && requesterId === userId) {
			player.stopPlaying(true, false);
			if (ctx.isInteraction) {
				return await ctx.sendMessage({
					embeds: [embed.setColor(this.client.color.main).setDescription(ctx.locale('cmd.stop.messages.stopped'))],
				});
			}
			ctx.message?.react('👍');
			return;
		}

		// Vote to stop logic
		if (!player.get('stopVotes')) player.set('stopVotes', new Set());
		if (!player.get('keepVotes')) player.set('keepVotes', new Set());
		const stopVotes = player.get('stopVotes') as Set<string>;
		const keepVotes = player.get('keepVotes') as Set<string>;

		// Count listeners (exclude bots)
		const channel = ctx.guild?.members.cache.get(userId)?.voice?.channel;
		let listeners = 0;
		if (channel && channel.members) {
			listeners = channel.members.filter((m: any) => !m.user.bot).size;
		} else {
			listeners = 1; // fallback
		}

		// If there are only 2 listeners, stop immediately
		if (listeners <= 2) {
			player.stopPlaying(true, false);
			stopVotes.clear();
			keepVotes.clear();
			player.set('stopVotes', stopVotes);
			player.set('keepVotes', keepVotes);
			if (ctx.isInteraction) {
				return await ctx.sendMessage({
					embeds: [embed.setColor(this.client.color.main).setDescription(ctx.locale('cmd.stop.messages.stopped'))],
				});
			}
			ctx.message?.react('👍');
			return;
		}
		const needed = Math.ceil(listeners / 2);
		const votes = stopVotes.size;

		// Send embed with buttons if this is the first vote
		if (votes === 0 && keepVotes.size === 0) {
			const voteEmbed = embed.setColor(this.client.color.main)
				.setDescription(ctx.locale('cmd.stop.messages.vote_embed', { votes, needed }));
			const components = [
				{
					type: 1, // ActionRow
					components: [
						{
							type: 2, // Button
							style: 3, // Success (green)
							custom_id: 'stop_vote_yes',
							label: ctx.locale('cmd.stop.messages.button_stop') || '🛑 Stop',
						},
						{
							type: 2, // Button
							style: 4, // Danger (red)
							custom_id: 'stop_vote_no',
							label: ctx.locale('cmd.stop.messages.button_keep') || '👎 Keep',
						},
					],
				},
			];
			const sent = await ctx.sendMessage({
				embeds: [voteEmbed],
				components,
			});
			player.set('stopVoteMessageId', sent.id);
			stopVotes.add(userId);
			player.set('stopVotes', stopVotes);
			return;
		}

		// If user already voted, do not allow duplicate votes
		if (stopVotes.has(userId) || keepVotes.has(userId)) {
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.stop.messages.already_voted') || 'You have already voted.')],
			});
		}

		// Add the user's vote
		stopVotes.add(userId);
		player.set('stopVotes', stopVotes);

		// Try to update the voting embed if it exists
		const stopVoteMessageId = player.get('stopVoteMessageId') as string | undefined;
		if (stopVoteMessageId && channel) {
			try {
				const voteMsg = await channel.messages.fetch(stopVoteMessageId);
				await voteMsg.edit({
					embeds: [
						embed.setColor(this.client.color.main).setDescription(
							ctx.locale('cmd.stop.messages.vote_embed', { votes: stopVotes.size, needed })
						)
					],
				});
			} catch (e) {
				// message might be deleted or inaccessible
			}
		}

		// If enough votes, stop
		if (stopVotes.size >= needed) {
			player.stopPlaying(true, false);
			stopVotes.clear();
			keepVotes.clear();
			player.set('stopVotes', stopVotes);
			player.set('keepVotes', keepVotes);
			if (ctx.isInteraction) {
				return await ctx.sendMessage({
					embeds: [embed.setColor(this.client.color.main).setDescription(ctx.locale('cmd.stop.messages.stopped'))],
				});
			}
			ctx.message?.react('👍');
		} else {
			// Optionally send a new message if not using buttons
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.main).setDescription(ctx.locale('cmd.stop.messages.vote_embed', { votes: stopVotes.size, needed }))],
			});
		}
	}
}


