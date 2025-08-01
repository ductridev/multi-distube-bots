import type { VoiceChannel } from 'discord.js';
import { Command, type Context, type Lavamusic } from '../../structures/index';

export default class Join extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: 'join',
			description: {
				content: 'cmd.join.description',
				examples: ['join'],
				usage: 'join',
			},
			category: 'music',
			aliases: ['come', 'j'],
			cooldown: 3,
			args: false,
			vote: false,
			player: {
				voice: true,
				dj: false,
				active: false,
				djPerm: null,
			},
			permissions: {
				dev: false,
				client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks', 'Connect', 'Speak'],
				user: [],
			},
			slashCommand: true,
			options: [],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		const embed = this.client.embed().setFooter({
				text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
			})
			.setTimestamp();
		let player = client.manager.getPlayer(ctx.guild!.id);

		if (player) {
			return await ctx.sendMessage({
				embeds: [
					embed.setColor(this.client.color.main).setDescription(
						ctx.locale('cmd.join.already_connected', {
							channelId: player.voiceChannelId,
						}),
					),
				],
			});
		}

		const memberVoiceChannel = (ctx.member as any).voice.channel as VoiceChannel;
		if (!memberVoiceChannel) {
			return await ctx.sendMessage({
				embeds: [embed.setColor(this.client.color.red).setDescription(ctx.locale('cmd.join.no_voice_channel'))],
			});
		}

		player = client.manager.createPlayer({
			guildId: ctx.guild!.id,
			voiceChannelId: memberVoiceChannel.id,
			textChannelId: ctx.channel.id,
			selfMute: false,
			selfDeaf: true,
			vcRegion: memberVoiceChannel.rtcRegion!,
		});
		player.options.voiceChannelId = memberVoiceChannel.id;
		if (!player.connected) await player.connect();
		return await ctx.sendMessage({
			embeds: [
				embed.setColor(this.client.color.main).setDescription(
					ctx.locale('cmd.join.joined', {
						channelId: player.voiceChannelId,
					}),
				),
			],
		});
	}
}


