import { Command, type Context, type Lavamusic } from '../../structures/index.js';

export default class Vibrato extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'vibrato',
			description: {
				content: 'cmd.vibrato.description',
				examples: ['vibrato'],
				usage: 'vibrato',
			},
			category: 'filters',
			aliases: ['vb'],
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
		if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'));
		const vibratoEnabled = player.filterManager.filters.vibrato;

		if (vibratoEnabled) {
			player.filterManager.toggleVibrato();
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale('cmd.vibrato.messages.disabled'),
						color: this.client.color.main,
					},
				],
			});
		} else {
			player.filterManager.toggleVibrato();
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale('cmd.vibrato.messages.enabled'),
						color: this.client.color.main,
					},
				],
			});
		}
	}
}


