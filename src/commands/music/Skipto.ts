import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Skipto extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'skipto',
			description: {
				content: 'cmd.skipto.description',
				examples: ['skipto 3'],
				usage: 'skipto <number>',
			},
			category: 'music',
			aliases: ['skt'],
			cooldown: 3,
			args: true,
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
			options: [
				{
					name: 'number',
					description: 'cmd.skipto.options.number',
					type: 4,
					required: true,
				},
			],
		});
	}

	public async run(client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
		const player = client.manager.getPlayer(ctx.guild!.id);
		const embed = this.client.embed().setFooter({
				text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
			})
			.setTimestamp();
		const num = Number(args[0]);
		if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'));
		if (player.queue.tracks.length === 0 || Number.isNaN(num) || num > player.queue.tracks.length || num < 1) {
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.skipto.errors.invalid_number'))],
			});
		}

		player.skip(num);
		return await ctx.sendMessage({
			embeds: [
				embed.setColor(this.client.color.main).setDescription(
					ctx.locale('cmd.skipto.messages.skipped_to', {
						number: num,
					}),
				),
			],
		});
	}
}


