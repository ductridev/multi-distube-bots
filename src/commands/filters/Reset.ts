import { Command, type Context, type Lavamusic } from '../../structures/index.js';

export default class Reset extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'reset',
			description: {
				content: 'cmd.reset.description',
				examples: ['reset'],
				usage: 'reset',
			},
			category: 'filters',
			aliases: ['rs'],
			cooldown: 3,
			args: false,
			vote: false,
			player: {
				voice: true,
				dj: true,
				active: false,
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
		player.filterManager.resetFilters();
		player.filterManager.clearEQ();
		await ctx.sendMessage({
			embeds: [
				{
					description: ctx.locale('cmd.reset.messages.filters_reset'),
					color: this.client.color.main,
				},
			],
		});
	}
}


