import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Loop extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'loop',
			description: {
				content: 'cmd.loop.description',
				examples: ['loop off', 'loop queue', 'loop song'],
				usage: 'loop',
			},
			category: 'general',
			aliases: ['loop'],
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
			options: [
				{
					name: 'mode',
					description: 'The loop mode you want to set',
					type: 3,
					required: false,
					choices: [
						{
							name: 'Off',
							value: 'off',
						},
						{
							name: 'Song',
							value: 'song',
						},
						{
							name: 'Queue',
							value: 'queue',
						},
					],
				},
			],
		});
	}

	public async run(client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
		const embed = this.client.embed().setColor(this.client.color.main).setFooter({
			text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
			iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
		})
			.setTimestamp();
		const player = client.manager.getPlayer(ctx.guild!.id);
		let loopMessage = '';

		const argument = args[0];

		if (argument) {
			if (argument === 'song' || argument === 'track' || argument === 's') {
				player?.setRepeatMode('track');
				loopMessage = ctx.locale('cmd.loop.looping_song');
			} else if (argument === 'queue' || argument === 'q') {
				player?.setRepeatMode('queue');
				loopMessage = ctx.locale('cmd.loop.looping_queue');
			} else if (argument === 'off' || argument === 'o') {
				player?.setRepeatMode('off');
				loopMessage = ctx.locale('cmd.loop.looping_off');
			} else {
				loopMessage = ctx.locale('cmd.loop.invalid_mode');
			}
		} else {
			switch (player?.repeatMode) {
				case 'off': {
					player.setRepeatMode('track');
					loopMessage = ctx.locale('cmd.loop.looping_song');
					break;
				}
				case 'track': {
					player.setRepeatMode('queue');
					loopMessage = ctx.locale('cmd.loop.looping_queue');
					break;
				}
				case 'queue': {
					player.setRepeatMode('off');
					loopMessage = ctx.locale('cmd.loop.looping_off');
					break;
				}
			}
		}

		return await ctx.sendMessage({
			embeds: [embed.setDescription(loopMessage)],
		});
	}
}


