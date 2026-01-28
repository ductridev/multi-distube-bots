import { ChannelType, TextChannel, type GuildMember, type VoiceState } from 'discord.js';
import { Event, type Lavamusic } from '../../structures/index';
import { T } from '../../structures/I18n';
import { activeBots } from '../../index';

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

		// Only process voice state updates for the voice channel THIS bot is in
		// Ignore voice state changes in other voice channels in the same guild
		const relevantChannelId = player.voiceChannelId;
		const isRelevantChange =
			oldState.channelId === relevantChannelId ||
			newState.channelId === relevantChannelId;

		if (!isRelevantChange) {
			// This voice state update is for a different channel - ignore it
			return;
		}

		const vc = newState.guild.channels.cache.get(player.voiceChannelId);
		if (!(vc && vc.members instanceof Map)) return;

		const is247 = await this.client.db.get_247(this.client.childEnv.clientId, guildId);
		const botVoiceState = newState.guild.members.cache.get(this.client.user!.id)?.voice;

		// Only destroy player if bot is not in any voice channel AND 247 mode is not enabled
		// This allows bot to join other channels even when 247 mode is enabled
		if (!botVoiceState?.channelId && !is247 && player) {
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
			this.handale.move(oldState, newState, this.client);
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

			if (newState.member?.user.bot && newState.member?.user.id === client.childEnv.clientId) {
				const channel = client.channels.cache.get(player.textChannelId!);
				const locale = await client.db.getLanguage(player.guildId);
				const embed = client.embed().setFooter({
					text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
					iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
				})
					.setTimestamp();

				// Always disable 247 mode when bot leaves/gets kicked from voice channel
				if (is247) {
					try {
						await client.db.delete_247(newState.guild.id, client.childEnv.clientId);
						client.logger.info(`Disabled 247 mode for guild ${newState.guild.id} due to bot being kicked/leaving voice channel`);
					} catch (error) {
						client.logger.error('Error disabling 247 mode on voice leave:', error);
					}
				}

				// Send kick message - this handles both kicks and manual disconnects
				if (channel && channel.isTextBased()) {
					await (channel as TextChannel).send({
						embeds: [embed.setColor(client.color.red).setDescription(T(locale, 'event.voice_state_update.kicked', { channelId: player.voiceChannelId }))],
					});
				}

				// Destroy player - bot won't rejoin after being kicked
				player.destroy();
				return; // Exit early to prevent any rejoin logic
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
								const channel = client.channels.cache.get(player.textChannelId!);
								const locale = await client.db.getLanguage(player.guildId);
								const embed = client.embed()
									.setFooter({
										text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
										iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
									})
									.setTimestamp();

								if (channel && channel.isTextBased()) {
									await (channel as TextChannel).send({
										embeds: [embed.setColor(client.color.red).setDescription(T(locale, 'event.voice_state_update.left_due_to_timeout_no_listeners', { channelId: player.voiceChannelId }))],
									});
								}

								player.destroy();
							}
						}
					}, time * 60_000);
					client.timeoutListenersMap.set(player.guildId, timeout);
				}
			}
		},

		async move(oldState: VoiceState, newState: VoiceState, client: Lavamusic) {
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

			// Check if this bot was moved to a channel with another bot
			if (newState.member?.user.bot && newState.member?.user.id === client.childEnv.clientId) {
				const channel = client.channels.cache.get(player.textChannelId!);
				const locale = await client.db.getLanguage(player.guildId);
				const embed = client.embed().setFooter({
					text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
					iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
				})
					.setTimestamp();

				// Get the original channel (before move) and new channel (after move)
				const originalChannelId = oldState.channelId;
				const newChannelId = newState.channelId;

				// Check if another bot from activeBots is in the new channel
				if (newChannelId && originalChannelId && newChannelId !== originalChannelId) {
					const newChannel = newState.guild.channels.cache.get(newChannelId);
					if (newChannel && newChannel.members instanceof Map) {
						// Check if any other bot from activeBots is in this channel
						const otherBotsInChannel = activeBots.filter(otherBot =>
							otherBot.user?.id !== client.user?.id && // Not this bot
							newState.guild.members.cache.get(otherBot.user?.id || '')?.voice.channelId === newChannelId
						);

						if (otherBotsInChannel.length > 0) {
							// Another bot is already in the new channel - try to rejoin original
							if (channel && channel.isTextBased()) {
								await (channel as TextChannel).send({
									embeds: [embed.setColor(client.color.yellow).setDescription(
										T(locale, 'event.voice_state_update.moved_to_channel_with_another_bot', { originalChannelId })
									)],
								});
							}

							// Try to rejoin the original channel
							try {
								const originalChannel = newState.guild.channels.cache.get(originalChannelId);

								// Check if bot still has permissions to join the original channel
								if (originalChannel && 'permissionsFor' in originalChannel) {
									const permissions = originalChannel.permissionsFor(newState.guild.members.me!);
									if (permissions && permissions.has(['Connect', 'Speak', 'ViewChannel'])) {
										// Rejoin the original channel by moving the bot back
										bot?.setChannel(originalChannelId);

										if (channel && channel.isTextBased()) {
											await (channel as TextChannel).send({
												embeds: [embed.setColor(client.color.green).setDescription(
													T(locale, 'event.voice_state_update.rejoined_original_channel', { channelId: originalChannelId })
												)],
											});
										}

										return; // Successfully rejoined, exit early
									}
								}

								// If we reach here, we couldn't rejoin - send error and destroy
								if (channel && channel.isTextBased()) {
									await (channel as TextChannel).send({
										embeds: [embed.setColor(client.color.red).setDescription(
											T(locale, 'event.voice_state_update.cannot_rejoin_stopping', { originalChannelId })
										)],
									});
								}

								// Destroy the player
								player.destroy();
								return;

							} catch (error) {
								// Failed to rejoin - send error message and destroy player
								client.logger.error(`Failed to rejoin original channel for bot ${client.childEnv.clientId}:`, error);

								if (channel && channel.isTextBased()) {
									await (channel as TextChannel).send({
										embeds: [embed.setColor(client.color.red).setDescription(
											T(locale, 'event.voice_state_update.cannot_rejoin_stopping', { originalChannelId })
										)],
									});
								}

								player.destroy();
								return;
							}
						}
					}
				} else {
					// Normal move message (when no conflict with other bots)
					if (channel && channel.isTextBased()) {
						await (channel as TextChannel).send({
							embeds: [embed.setColor(client.color.main).setDescription(T(locale, 'event.voice_state_update.moved', { channelId: player.voiceChannelId }))],
						});
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
								const channel = client.channels.cache.get(player.textChannelId!);
								const locale = await client.db.getLanguage(player.guildId);
								const embed = client.embed()
									.setFooter({
										text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
										iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
									})
									.setTimestamp();

								if (channel && channel.isTextBased()) {
									await (channel as TextChannel).send({
										embeds: [embed.setColor(client.color.red).setDescription(T(locale, 'event.voice_state_update.left_due_to_timeout_no_listeners', { channelId: player.voiceChannelId }))],
									});
								}

								player.destroy();
							}
						}
					}, time * 60_000);
					client.timeoutListenersMap.set(player.guildId, timeout);
				}
			} else if (vc.members instanceof Map && [...vc.members.values()].filter((x: GuildMember) => !x.user.bot).length > 0) {
				const timeout = client.timeoutListenersMap.get(player.guildId);
				if (timeout) {
					clearTimeout(timeout);
					client.timeoutListenersMap.delete(player.guildId);
				}
			}
		},
	};
}


