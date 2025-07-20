import { ChannelType, TextChannel, type GuildMember, type VoiceState } from 'discord.js';
import { Event, type Lavamusic } from '../../structures/index';
import { sessionMap, voiceChannelMap } from '../..';
import { T } from '../../structures/I18n';

export default class VoiceStateUpdate extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'voiceStateUpdate',
		});
	}

	public async run(oldState: VoiceState, newState: VoiceState): Promise<any> {
		const guildId = newState.guild.id;
		if (!guildId) return;

		const player = this.client.manager.getPlayer(guildId);
		if (!player) return;

		if (!player?.voiceChannelId) return;

		const vc = newState.guild.channels.cache.get(player.voiceChannelId);
		if (!(vc && vc.members instanceof Map)) return;

		const is247 = await this.client.db.get_247(this.client.childEnv.clientId, guildId);

		if (!(newState.guild.members.cache.get(this.client.user!.id)?.voice.channelId || !is247) && player) {
			return player.destroy();
		}

		let type: 'join' | 'leave' | 'move' | null = null;

		if (!oldState.channelId && newState.channelId) {
			type = 'join';
		} else if (oldState.channelId && !newState.channelId) {
			type = 'leave';
		} else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
			type = 'move';
		}

		if (type === 'join') {
			this.handale.join(newState, this.client);
		} else if (type === 'leave') {
			this.handale.leave(newState, this.client);
		} else if (type === 'move') {
			this.handale.move(newState, this.client);
		}
	}

	handale = {
		async join(newState: VoiceState, client: Lavamusic) {
			await new Promise(resolve => setTimeout(resolve, 3000));
			const bot = newState.guild.voiceStates.cache.get(client.user!.id);
			if (!bot) {
				client.timeoutListenersMap.delete(newState.guild.id);
				return;
			}

			if (
				bot.id === client.user?.id &&
				bot.channelId &&
				bot.channel?.type === ChannelType.GuildStageVoice &&
				bot.suppress
			) {
				if (bot.channel && bot.member && bot.channel.permissionsFor(bot.member!).has('MuteMembers')) {
					await bot.setSuppressed(false);
				}
			}

			const player = client.manager.getPlayer(newState.guild.id);
			if (!player) return;

			if (!player?.voiceChannelId) return;

			const vc = newState.guild.channels.cache.get(player.voiceChannelId);
			if (!(vc && vc.members instanceof Map)) return;
			if (newState.id === client.user?.id && !newState.serverDeaf) {
				const permissions = vc.permissionsFor(newState.guild.members.me!);
				if (permissions?.has('DeafenMembers')) {
					await newState.setDeaf(true);
				}
			}

			if (newState.id === client.user?.id) {
				if (newState.serverMute && !player.paused) {
					player.pause();
				} else if (!newState.serverMute && player.paused) {
					player.resume();
				}
			}
		},

		async leave(newState: VoiceState, client: Lavamusic) {
			const player = client.manager.getPlayer(newState.guild.id);
			if (!player) return;
			if (!player?.voiceChannelId) return;
			const is247 = await client.db.get_247(client.childEnv.clientId, newState.guild.id);
			const vc = newState.guild.channels.cache.get(player.voiceChannelId);
			if (!(vc && vc.members instanceof Map)) return;

			if (newState.member?.user.bot) {
				const guildMap = voiceChannelMap.get(player.guildId);

				if (guildMap) {
					if (player.options.voiceChannelId) {
						// Remove specific VC mapping
						guildMap.delete(player.options.voiceChannelId);
					} else {
						// VoiceChannelId is null → Clear any entry where this bot is still mapped
						for (const [vcId, botId] of guildMap.entries()) {
							if (botId === client.childEnv.clientId) {
								guildMap.delete(vcId);
							}
						}
					}
				}

				const guildSessionMap = sessionMap.get(player.guildId);

				if (guildSessionMap) {
					if (player.options.voiceChannelId) {
						// Remove specific VC mapping
						guildSessionMap.delete(player.options.voiceChannelId);
					}
				}
			}

			if (vc.members instanceof Map && [...vc.members.values()].filter((x: GuildMember) => !x.user.bot).length <= 0) {
				if (!client.timeoutListenersMap.has(player.guildId) && !client.timeoutSongsMap.has(player.guildId) && !is247) {
					const channel = client.channels.cache.get(player.textChannelId!);
					const locale = await client.db.getLanguage(player.guildId);
					const embed = client.embed().setFooter({
						text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
						iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
					})
						.setTimestamp();
					const time = 5;

					if (channel && channel.isTextBased()) {
						await (channel as TextChannel).send({
							embeds: [embed.setColor(client.color.main).setDescription(T(locale, 'will_leave.no_listeners', { time: time }))],
						});
					}
					const timeout = setTimeout(async () => {
						if (!player?.voiceChannelId) return;

						const playerVoiceChannel = newState.guild.channels.cache.get(player?.voiceChannelId);
						if (
							player &&
							playerVoiceChannel &&
							playerVoiceChannel.members instanceof Map &&
							[...playerVoiceChannel.members.values()].filter((x: GuildMember) => !x.user.bot).length <= 0
						) {
							if (!is247) {
								player.destroy();
							}
						}
					}, time * 60_000);
					client.timeoutListenersMap.set(player.guildId, timeout);
				}
			}
		},

		async move(newState: VoiceState, client: Lavamusic) {
			// delay for 3 seconds
			await new Promise(resolve => setTimeout(resolve, 3000));
			const bot = newState.guild.voiceStates.cache.get(client.user!.id);
			if (bot) {
				if (
					bot.id === client.user?.id &&
					bot.channelId &&
					bot.channel?.type === ChannelType.GuildStageVoice &&
					bot.suppress
				) {
					if (bot.channel && bot.member && bot.channel.permissionsFor(bot.member!).has('MuteMembers')) {
						await bot.setSuppressed(false);
					}
				}
			}

			// If move to another voice channel
			const player = client.manager.getPlayer(newState.guild.id);
			if (!player) return;
			if (!player?.voiceChannelId) return;
			const is247 = await client.db.get_247(client.childEnv.clientId, newState.guild.id);
			const vc = newState.guild.channels.cache.get(player.voiceChannelId);
			if (!(vc && vc.members instanceof Map)) return;

			if (vc.members instanceof Map && [...vc.members.values()].filter((x: GuildMember) => !x.user.bot).length <= 0) {
				if (!client.timeoutListenersMap.has(player.guildId) && !client.timeoutSongsMap.has(player.guildId) && !is247) {
					const channel = client.channels.cache.get(player.textChannelId!);
					const locale = await client.db.getLanguage(player.guildId);
					const embed = client.embed().setFooter({
						text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
						iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
					})
						.setTimestamp();
					const time = 5;

					if (channel && channel.isTextBased()) {
						await (channel as TextChannel).send({
							embeds: [embed.setColor(client.color.main).setDescription(T(locale, 'will_leave.no_listeners', { time: time }))],
						});
					}
					const timeout = setTimeout(async () => {
						if (!player?.voiceChannelId) return;

						const playerVoiceChannel = newState.guild.channels.cache.get(player?.voiceChannelId);
						if (
							player &&
							playerVoiceChannel &&
							playerVoiceChannel.members instanceof Map &&
							[...playerVoiceChannel.members.values()].filter((x: GuildMember) => !x.user.bot).length <= 0
						) {
							if (!is247) {
								player.destroy();
							}
						}
					}, time * 60_000);
					client.timeoutListenersMap.set(player.guildId, timeout);
				}
			} else if (vc.members instanceof Map && [...vc.members.values()].filter((x: GuildMember) => !x.user.bot).length > 0) {
				client.timeoutListenersMap.get(player.guildId)?.close();
				client.timeoutListenersMap.delete(player.guildId);
			}
		},
	};
}


