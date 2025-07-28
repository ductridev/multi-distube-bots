import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class ClearQueue extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'clearqueue',
			description: {
				content: 'cmd.clearqueue.description',
				examples: ['clearqueue'],
				usage: 'clearqueue',
			},
			category: 'music',
			aliases: ['c', 'clq', 'cq', 'clearq', 'clear'],
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

		if (!player) {
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('player.errors.no_player'))],
			});
		}

		if (player.queue.tracks.length === 0) {
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('player.errors.no_song'))],
			});
		}

		player.queue.tracks.splice(0, player.queue.tracks.length);
		return await ctx.sendMessage({
			embeds: [embed.setColor(this.client.color.main).setDescription(ctx.locale('cmd.clearqueue.messages.cleared'))],
		});
	}
}


