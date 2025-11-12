import { Command, type Context, type Lavamusic } from '../../structures/index';
import { VotingSystem } from '../../utils/VotingSystem';

export default class Pause extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'pause',
			description: {
				content: 'cmd.pause.description',
				examples: ['pause'],
				usage: 'pause',
			},
			category: 'music',
			aliases: ['pu'],
			cooldown: 3,
			args: false,
			vote: false,
			player: {
				voice: true,
				dj: false,
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
		const embed = this.client.embed()
			.setFooter({
				text: 'BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️',
				iconURL:
					'https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg',
			})
			.setTimestamp();

		if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'));

		if (player?.paused) {
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('player.errors.already_paused'))],
			});
		}

		// Check voting
		const voteResult = await VotingSystem.checkVote({
			client,
			ctx,
			player,
			action: 'pause',
		});

		if (voteResult.alreadyVoted) {
			return await ctx.sendMessage({
				embeds: [
					embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.pause.messages.already_voted')),
				],
			});
		}

		if (!voteResult.shouldExecute) {
			// Vote was registered but not enough votes yet
			if (voteResult.needsVoting) {
				return; // Voting embed was already sent
			}
			return;
		}

		// Execute pause
		player?.pause();

		return await ctx.sendMessage({
			embeds: [embed.setColor(this.client.color.main).setDescription(ctx.locale('cmd.pause.successfully_paused'))],
		});
	}
}

