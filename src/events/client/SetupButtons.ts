import type { Message } from 'discord.js';
import { T } from '../../structures/I18n';
import { Event, type Lavamusic } from '../../structures/index';
import type { Requester } from '../../types';
import { getButtons } from '../../utils/Buttons';
import { buttonReply } from '../../utils/SetupSystem';
import { VotingSystem } from '../../utils/VotingSystem';
import { checkDj } from '../player/TrackStart';

export default class SetupButtons extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'setupButtons',
		});
	}

	public async run(interaction: any): Promise<void> {
		const locale = await this.client.db.getLanguage(interaction.guildId);

		if (!interaction.replied)
			await interaction.deferReply().catch(() => {
				null;
			});
		if (!interaction.member.voice.channel) {
			return await buttonReply(
				interaction,
				T(locale, 'event.setupButton.no_voice_channel_button'),
				this.client.color.red,
			);
		}
		const clientMember = interaction.guild.members.cache.get(this.client.user?.id);
		if (clientMember.voice.channel && clientMember.voice.channelId !== interaction.member.voice.channelId) {
			return await buttonReply(
				interaction,
				T(locale, 'event.setupButton.different_voice_channel_button', {
					channel: clientMember.voice.channel,
				}),
				this.client.color.red,
			);
		}
		const player = this.client.manager.getPlayer(interaction.guildId);
		if (!player)
			return await buttonReply(interaction, T(locale, 'event.setupButton.no_music_playing'), this.client.color.red);
		if (!player.queue)
			return await buttonReply(interaction, T(locale, 'event.setupButton.no_music_playing'), this.client.color.red);
		if (!player.queue.current)
			return await buttonReply(interaction, T(locale, 'event.setupButton.no_music_playing'), this.client.color.red);
		const data = await this.client.db.getSetup(interaction.guildId);
		const { title, uri, duration, artworkUrl, sourceName, isStream } = player.queue.current.info;
		let message: Message | undefined;
		try {
			message = await interaction.channel.messages.fetch(data?.messageId, {
				cache: true,
			});
		} catch (_e) {
			null;
		}

		const iconUrl = this.client.config.icons[sourceName] || this.client.user?.displayAvatarURL({ extension: 'png' });
		const embed = this.client
			.embed()
			.setAuthor({
				name: T(locale, 'event.setupButton.now_playing'),
				iconURL: iconUrl,
			})
			.setColor(this.client.color.main)
			.setDescription(
				`[${title}](${uri}) - ${isStream ? T(locale, 'event.setupButton.live') : this.client.utils.formatTime(duration)} - ${T(locale, 'event.setupButton.requested_by', { requester: (player.queue.current.requester as Requester).id })}`,
			)
			.setImage(artworkUrl || this.client.user?.displayAvatarURL({ extension: 'png' })!);

		if (!interaction.isButton()) return;
		if (!(await checkDj(this.client, interaction))) {
			return await buttonReply(interaction, T(locale, 'event.setupButton.no_dj_permission'), this.client.color.red);
		}
		if (message) {
			const handleVolumeChange = async (change: number) => {
				const vol = player.volume + change;
				player.setVolume(vol);
				await buttonReply(interaction, T(locale, 'event.setupButton.volume_set', { vol }), this.client.color.main);
				await message.edit({
					embeds: [
						embed.setFooter({
							text: T(locale, 'event.setupButton.volume_footer', {
								vol,
								displayName: interaction.member.displayName,
							}) + " • BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
							iconURL: interaction.member.displayAvatarURL({}),
						}),
					],
				});
			};
			switch (interaction.customId) {
				case 'PREV_BUT': {
					if (!player.queue.previous) {
						return await buttonReply(
							interaction,
							T(locale, 'event.setupButton.no_previous_track'),
							this.client.color.main,
						);
					}
					player.play({
						track: player.queue.previous[0],
					});
					await buttonReply(interaction, T(locale, 'event.setupButton.playing_previous'), this.client.color.main);
					await message.edit({
						embeds: [
							embed.setFooter({
								text: T(locale, 'event.setupButton.previous_footer', {
									displayName: interaction.member.displayName,
								}) + " • BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
								iconURL: interaction.member.displayAvatarURL({}),
							}),
						],
					});
					break;
				}
				case 'REWIND_BUT': {
					const time = player.position - 10000;
					if (time < 0) {
						player.seek(0);
					} else {
						player.seek(time);
					}
					await buttonReply(interaction, T(locale, 'event.setupButton.rewinded'), this.client.color.main);
					await message.edit({
						embeds: [
							embed.setFooter({
								text: T(locale, 'event.setupButton.rewind_footer', {
									displayName: interaction.member.displayName,
								}) + " • BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
								iconURL: interaction.member.displayAvatarURL({}),
							}),
						],
					});
					break;
				}
				case 'PAUSE_BUT': {
					const name = player.paused ? T(locale, 'event.setupButton.resumed') : T(locale, 'event.setupButton.paused');
					if (player.paused) {
						player.resume();
					} else {
						player.pause();
					}
					await buttonReply(interaction, T(locale, 'event.setupButton.pause_resume', { name }), this.client.color.main);
					await message.edit({
						embeds: [
							embed.setFooter({
								text: T(locale, 'event.setupButton.pause_resume_footer', {
									name,
									displayName: interaction.member.displayName,
								}) + " • BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
								iconURL: interaction.member.displayAvatarURL({}),
							}),
						],
						components: getButtons(player, this.client),
					});
					break;
				}
				case 'FORWARD_BUT': {
					const time = player.position + 10000;
					if (time > player.queue.current.info.duration) {
						return await buttonReply(interaction, T(locale, 'event.setupButton.forward_limit'), this.client.color.main);
					}
					player.seek(time);
					await buttonReply(interaction, T(locale, 'event.setupButton.forwarded'), this.client.color.main);
					await message.edit({
						embeds: [
							embed.setFooter({
								text: T(locale, 'event.setupButton.forward_footer', {
									displayName: interaction.member.displayName,
								}) + " • BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
								iconURL: interaction.member.displayAvatarURL({}),
							}),
						],
					});
					break;
				}
				case 'SKIP_BUT': {
					const autoplay = player.get<boolean>('autoplay');
					if (!autoplay && player.queue.tracks.length === 0) {
						return await buttonReply(
							interaction,
							T(locale, 'event.setupButton.no_music_to_skip'),
							this.client.color.main,
						);
					}

					// Check voting - use button-specific voting method
					const userId = interaction.user.id;
					const isDJ = await VotingSystem['checkDJPermission'](this.client, {
						guild: interaction.guild,
						author: interaction.user,
					} as any);
					const privilegeCheck = VotingSystem.hasPrivilege(
						{
							guild: interaction.guild,
							author: interaction.user,
						} as any,
						player,
						isDJ,
					);

					// Count listeners
					const member = interaction.guild.members.cache.get(userId);
					const channel = member?.voice?.channel;
					let listeners = 1;
					if (channel && channel.members) {
						listeners = channel.members.filter((m: any) => !m.user.bot).size;
					}

					// If privileged or <= 2 listeners, execute immediately
					if (!privilegeCheck.hasPrivilege && listeners > 2) {
						// Need voting
						const voteKey = 'skipVotes';
						const keepKey = 'keepVotes';

						if (!player.get(voteKey)) player.set(voteKey, new Set<string>());
						if (!player.get(keepKey)) player.set(keepKey, new Set<string>());

						const skipVotes = player.get(voteKey) as Set<string>;
						const keepVotes = player.get(keepKey) as Set<string>;

						// Check if user already voted
						if (skipVotes.has(userId) || keepVotes.has(userId)) {
							return await buttonReply(
								interaction,
								T(locale, 'cmd.skip.messages.already_voted'),
								this.client.color.red,
							);
						}

						const needed = Math.ceil(listeners / 2);

						// Add vote
						skipVotes.add(userId);
						player.set(voteKey, skipVotes);

						// Check if enough votes
						if (skipVotes.size < needed) {
							// Not enough votes yet
							return await buttonReply(
								interaction,
								T(locale, 'cmd.skip.messages.vote_registered', {
									votes: skipVotes.size,
									needed,
								}),
								this.client.color.main,
							);
						}

						// Clear votes
						skipVotes.clear();
						keepVotes.clear();
						player.set(voteKey, skipVotes);
						player.set(keepKey, keepVotes);
					}

					// Execute skip
					player.skip(0, !autoplay);
					await buttonReply(interaction, T(locale, 'event.setupButton.skipped'), this.client.color.main);

					const newTrack = player.queue.current?.info;
					const newEmbed = this.client
						.embed()
						.setAuthor({
							name: T(locale, 'event.setupButton.now_playing'),
							iconURL: this.client.config.icons[newTrack?.sourceName || ''] || this.client.user?.displayAvatarURL({ extension: 'png' }),
						})
						.setColor(this.client.color.main)
						.setDescription(
							`[${newTrack?.title}](${newTrack?.uri}) - ${newTrack?.isStream ? T(locale, 'event.setupButton.live') : this.client.utils.formatTime(newTrack?.duration)} - ${T(locale, 'event.setupButton.requested_by', { requester: (player.queue.current?.requester as Requester).id })}`
						)
						.setImage(newTrack?.artworkUrl || this.client.user?.displayAvatarURL({ extension: 'png' })!);

					if (message) {
						await message.edit({
							embeds: [newEmbed],
							components: getButtons(player, this.client),
						});
					}
					break;
				}
				case 'LOW_VOL_BUT':
					await handleVolumeChange(-10);
					break;
				case 'LOOP_BUT': {
					const loopOptions: Array<'off' | 'queue' | 'track'> = ['off', 'queue', 'track'];
					const newLoop = loopOptions[(loopOptions.indexOf(player.repeatMode) + 1) % loopOptions.length];
					player.setRepeatMode(newLoop);
					await buttonReply(
						interaction,
						T(locale, 'event.setupButton.loop_set', {
							loop: newLoop,
						}),
						this.client.color.main,
					);
					await message.edit({
						embeds: [
							embed.setFooter({
								text: T(locale, 'event.setupButton.loop_footer', {
									loop: newLoop,
									displayName: interaction.member.displayName,
								}) + " • BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
								iconURL: interaction.member.displayAvatarURL({}),
							}),
						],
					});
					break;
				}
				case 'STOP_BUT': {
					// Clear the messageId before stopping to ensure new messages are created for future tracks
					player.set('messageId', undefined);
					player.stopPlaying(true, false);
					await buttonReply(interaction, T(locale, 'event.setupButton.stopped'), this.client.color.main);
					await message.edit({
						embeds: [
							embed
								.setFooter({
									text: T(locale, 'event.setupButton.stopped_footer', {
										displayName: interaction.member.displayName,
									}) + " • BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
									iconURL: interaction.member.displayAvatarURL({}),
								})
								.setDescription(T(locale, 'event.setupButton.nothing_playing'))
								.setImage(this.client.config.links.img)
								.setAuthor({
									name: this.client.user?.username!,
									iconURL: this.client.user?.displayAvatarURL({
										extension: 'png',
									})!,
								}),
						],
					});
					break;
				}
				case 'SHUFFLE_BUT': {
					player.queue.shuffle();
					await buttonReply(interaction, T(locale, 'event.setupButton.shuffled'), this.client.color.main);
					break;
				}
				case 'HIGH_VOL_BUT':
					await handleVolumeChange(10);
					break;
			}
		}
	}
}


