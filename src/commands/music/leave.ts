import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Leave extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'leave',
			description: {
				content: 'cmd.leave.description',
				examples: ['leave'],
				usage: 'leave',
			},
			category: 'music',
			aliases: ['l'],
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
		if(!ctx.guild) return;
		const guildId = ctx.guild.id;
		const player = client.manager.getPlayer(guildId);
		const embed = this.client.embed().setFooter({
			text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
			iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
		})
			.setTimestamp();

		if (player) {
			const channelId = player.voiceChannelId;
			player.destroy();
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.main).setDescription(ctx.locale('cmd.leave.left', { channelId }))],
			});
		}

		return await ctx.sendMessage({
			embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.leave.not_in_channel'))],
		});
	}
}


