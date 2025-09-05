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

		// Check if bot is currently connected to a voice channel
		const botVoiceState = ctx.guild!.members.cache.get(client.user!.id)?.voice;
		const is247 = await client.db.get_247(client.childEnv.clientId, ctx.guild!.id);

		if (player && botVoiceState?.channelId) {
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

		// If bot is in 247 mode but not connected, allow joining the new channel
		// and update the 247 mode to the new channel
		if (is247 && !botVoiceState?.channelId) {
			try {
				await client.db.set_247(ctx.guild!.id, client.childEnv.clientId, ctx.channel.id, memberVoiceChannel.id);
				client.logger.info(`Updated 247 mode voice channel for guild ${ctx.guild!.id} to ${memberVoiceChannel.id}`);
			} catch (error) {
				client.logger.error('Error updating 247 mode channel:', error);
			}
		}

		if (!player) {
			player = client.manager.createPlayer({
				guildId: ctx.guild!.id,
				voiceChannelId: memberVoiceChannel.id,
				textChannelId: ctx.channel.id,
				selfMute: false,
				selfDeaf: true,
				vcRegion: memberVoiceChannel.rtcRegion!,
			});
			player.set('summonUserId', ctx.author!.id);
		} else {
			// Update existing player's voice channel
			player.options.voiceChannelId = memberVoiceChannel.id;
		}
		
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


