import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type ChannelSelectMenuInteraction,
	GuildMember,
	type MentionableSelectMenuInteraction,
	PermissionFlagsBits,
	MessageFlags,
	type RoleSelectMenuInteraction,
	type StringSelectMenuInteraction,
	type TextChannel,
	type UserSelectMenuInteraction,
	Message,
	ComponentType,
} from 'discord.js';
import type { Player, Track, TrackStartEvent } from 'lavalink-client';
import { T } from '../../structures/I18n';
import { Event, type Lavamusic } from '../../structures/index';
import type { Requester } from '../../types';
import { trackStart } from '../../utils/SetupSystem';
import { sessionMap } from '../..';

export default class TrackStart extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'trackStart',
		});
	}

	public async run(player: Player, track: Track | null, _payload: TrackStartEvent): Promise<void> {
		// Prevent this event from running if repeat mode is track
		if (player.repeatMode === 'track') return

		const guild = this.client.guilds.cache.get(player.guildId);
		if (player.options.customData) player.options.customData.botClientId = this.client.childEnv.clientId
		// Save player
		if (!sessionMap.has(player.guildId)) sessionMap.set(player.guildId, new Map());
		sessionMap.get(player.guildId)!.set(player.voiceChannelId!, player);
		// Cancel timeout
		this.client.timeoutSongsMap.get(player.guildId)?.close();
		this.client.timeoutSongsMap.delete(player.guildId);
		if (!guild) return;
		if (!player.textChannelId) return;
		if (!track) return;
		const channel = guild.channels.cache.get(player.textChannelId) as TextChannel;
		if (!channel) return;

		// Save player queue
		await player.queue.utils.save();

		this.client.utils.updateStatus(this.client, guild.id);

		const locale = await this.client.db.getLanguage(guild.id);

		// if (player.voiceChannelId) {
		// 	await this.client.utils.setVoiceStatus(this.client, player.voiceChannelId, `🎵 ${track.info.title}`);
		// }

		const embed = this.client
			.embed()
			.setAuthor({
				name: T(locale, 'player.trackStart.now_playing'),
				iconURL:
					this.client.config.icons[track.info.sourceName] ?? this.client.user?.displayAvatarURL({ extension: 'png' }),
			})
			.setColor(this.client.color.main)
			.setDescription(`**[${track.info.title}](${track.info.uri})**`)
			.setFooter({
				text: T(locale, 'player.trackStart.requested_by', {
					user: (track.requester as Requester).username,
				}) + " • BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
				iconURL: (track.requester as Requester).avatarURL,
			})
			.setThumbnail(track.info.artworkUrl)
			.addFields(
				{
					name: T(locale, 'player.trackStart.duration'),
					value: track.info.isStream ? 'LIVE' : this.client.utils.formatTime(track.info.duration),
					inline: true,
				},
				{
					name: T(locale, 'player.trackStart.author'),
					value: track.info.author,
					inline: true,
				},
			)
			.setFooter({
				text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
				iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
			})
			.setTimestamp();

		const setup = await this.client.db.getSetup(guild.id);

		if (setup && setup.textId) {
			const textChannel = guild.channels.cache.get(setup.textId) as TextChannel;
			if (textChannel) {
				await trackStart(setup.messageId, textChannel, player, track, this.client, locale);
			}
		} else {
			const message = await channel.send({
				embeds: [embed],
				components: [createButtonRow(player, this.client)],
				flags: 4096
			});

			player.set('messageId', message.id);
			createCollector(message, player, track, embed, this.client, locale);
		}
	}
}

function createButtonRow(player: Player, client: Lavamusic): ActionRowBuilder<ButtonBuilder> {
	const previousButton = new ButtonBuilder()

		.setCustomId('previous')
		.setEmoji(client.emoji.previous)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(!player.queue.previous);

	const resumeButton = new ButtonBuilder()
		.setCustomId('resume')
		.setEmoji(player.paused ? client.emoji.resume : client.emoji.pause)
		.setStyle(player.paused ? ButtonStyle.Success : ButtonStyle.Secondary);

	const stopButton = new ButtonBuilder().setCustomId('stop').setEmoji(client.emoji.stop).setStyle(ButtonStyle.Danger);

	const skipButton = new ButtonBuilder()
		.setCustomId('skip')
		.setEmoji(client.emoji.skip)
		.setStyle(ButtonStyle.Secondary);

	const loopButton = new ButtonBuilder()
		.setCustomId('loop')
		.setEmoji(player.repeatMode === 'track' ? client.emoji.loop.track : client.emoji.loop.none)
		.setStyle(player.repeatMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary);

	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		resumeButton,
		previousButton,
		stopButton,
		skipButton,
		loopButton,
	);
}

function createCollector(
	message: Message<true>,
	player: Player,
	_track: Track,
	embed: any,
	client: Lavamusic,
	locale: string,
): void {
	const collector = message.createMessageComponentCollector({
		filter: async (b: ButtonInteraction) => {
			if (!b.isButton()) return false;
			if (b.member instanceof GuildMember) {
				const isSameVoiceChannel = b.guild?.members.me?.voice.channelId === b.member.voice.channelId;
				if (isSameVoiceChannel) return true;
			}
			await b.reply({
				content: T(locale, 'player.trackStart.not_connected_to_voice_channel', {
					channel: b.guild?.members.me?.voice.channelId ?? 'None',
				}),
				flags: MessageFlags.Ephemeral,
			});
			return false;
		},
		componentType: ComponentType.Button,
	});

	collector.on('collect', async (interaction: ButtonInteraction<'cached'>) => {
		if (!(await checkDj(client, interaction))) {
			await interaction.reply({
				content: T(locale, 'player.trackStart.need_dj_role'),
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const editMessage = async (text: string): Promise<void> => {
			if (message && message.editable) {
				await message.edit({
					embeds: [
						embed.setFooter({
							text: text + " • BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️",
							iconURL: interaction.user.avatarURL({}),
						}),
					],
					components: [createButtonRow(player, client)],
				});
			}
		};
		switch (interaction.customId) {
			case 'previous':
				if (player.queue.previous) {
					await interaction.deferUpdate();
					const previousTrack = player.queue.previous[0];
					player.play({
						track: previousTrack,
					});
					await editMessage(
						T(locale, 'player.trackStart.previous_by', {
							user: interaction.user.tag,
						}),
					);
				} else {
					await interaction.reply({
						content: T(locale, 'player.trackStart.no_previous_song'),
						flags: MessageFlags.Ephemeral,
					});
				}
				break;
			case 'resume':
				if (player.paused) {
					player.resume();
					await interaction.deferUpdate();
					await editMessage(
						T(locale, 'player.trackStart.resumed_by', {
							user: interaction.user.tag,
						}),
					);
				} else {
					player.pause();
					await interaction.deferUpdate();
					await editMessage(
						T(locale, 'player.trackStart.paused_by', {
							user: interaction.user.tag,
						}),
					);
				}
				break;
			case 'stop': {
				player.stopPlaying(true, false);
				await interaction.deferUpdate();
				break;
			}
			case 'skip':
				const autoplay = player.get<boolean>('autoplay');
				if (!autoplay && player.queue.tracks.length === 0) {
					player.stopPlaying(true, false);
					await editMessage(T(locale, 'cmd.stop.messages.stopped'));
				} else if (player.queue.tracks.length > 0) {
					await interaction.deferUpdate();
					player.skip();
					await editMessage(
						T(locale, 'player.trackStart.skipped_by', {
							user: interaction.user.tag,
						}),
					);
				} else {
					player.skip(0, !autoplay);
					await editMessage(
						T(locale, 'player.trackStart.skipped_by', {
							user: interaction.user.tag,
						}),
					);
				}
				break;
			case 'loop': {
				await interaction.deferUpdate();
				switch (player.repeatMode) {
					case 'off': {
						player.setRepeatMode('track');
						await editMessage(
							T(locale, 'player.trackStart.looping_by', {
								user: interaction.user.tag,
							}),
						);
						break;
					}
					case 'track': {
						player.setRepeatMode('queue');
						await editMessage(
							T(locale, 'player.trackStart.looping_queue_by', {
								user: interaction.user.tag,
							}),
						);
						break;
					}
					case 'queue': {
						player.setRepeatMode('off');
						await editMessage(
							T(locale, 'player.trackStart.looping_off_by', {
								user: interaction.user.tag,
							}),
						);
						break;
					}
				}
				break;
			}
		}
	});
}

export async function checkDj(
	client: Lavamusic,
	interaction:
		| ButtonInteraction<'cached'>
		| StringSelectMenuInteraction<'cached'>
		| UserSelectMenuInteraction<'cached'>
		| RoleSelectMenuInteraction<'cached'>
		| MentionableSelectMenuInteraction<'cached'>
		| ChannelSelectMenuInteraction<'cached'>,
): Promise<boolean> {
	const dj = await client.db.getDj(interaction.guildId);
	if (dj?.mode) {
		const djRole = await client.db.getRoles(interaction.guildId);
		if (!djRole) return false;
		const hasDjRole = interaction.member.roles.cache.some(role => djRole.map(r => r.roleId).includes(role.id));
		if (!(hasDjRole || interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))) {
			return false;
		}
	}
	return true;
}


