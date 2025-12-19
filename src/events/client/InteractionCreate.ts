import {
	ActionRowBuilder,
	type AutocompleteInteraction,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Collection,
	CommandInteraction,
	EmbedBuilder,
	MessageFlags,
	type GuildMember,
	InteractionType,
	PermissionFlagsBits,
	type TextChannel,
	ChatInputCommandInteraction,
	ButtonInteraction,
} from 'discord.js';
import { T } from '../../structures/I18n';
import { Context, Event, type Lavamusic } from '../../structures/index';
import { vcLocks, voiceChannelMap, getBotsForGuild } from '../..';
import { Stay } from '@prisma/client';

export default class InteractionCreate extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'interactionCreate',
		});
	}

	public async run(interaction: CommandInteraction | AutocompleteInteraction | ButtonInteraction): Promise<any> {
		if (!(interaction.guild && interaction.guildId)) return;

		if (interaction instanceof CommandInteraction && interaction.isCommand()) {
			const setup = await this.client.db.getSetup(interaction.guildId);
			const allowedCategories = ['filters', 'music', 'playlist'];
			const commandInSetup = this.client.commands.get(interaction.commandName);
			const locale = await this.client.db.getLanguage(interaction.guildId);

			const guildId = interaction.guildId;
			const userVCId = (interaction.member as GuildMember | null)?.voice?.channelId ?? null;

			if (
				setup &&
				interaction.channelId === setup.textId &&
				!(commandInSetup && allowedCategories.includes(commandInSetup.category))
			) {
				return await interaction.reply({
					content: T(locale, 'event.interaction.setup_channel'),
					flags: MessageFlags.Ephemeral,
				});
			}

			const matchedPrefix = interaction.applicationId;

			const { commandName } = interaction;
			await this.client.db.get(interaction.guildId);

			const command = this.client.commands.get(commandName);
			if (!command) return;

			const allBots = getBotsForGuild(guildId);
			
			// Check if no bots are configured for this guild
			if (allBots.length === 0) {
				await interaction.reply({
					content: T(locale, 'event.message.no_bots_configured'),
					ephemeral: true
				});
				return;
			}
			
			let chosenBot: typeof this.client = allBots[0];
			let valid = true;
	
			if (userVCId) {
				await vcLocks.acquire(`${guildId}-${userVCId}`, async () => {
					const guildMap = voiceChannelMap.get(guildId) ?? new Map<string, string>();
					const activeClientIds = new Set(guildMap.values());
	
					const botMeta = await Promise.all(
						allBots.map(async bot => {
							const [prefix, is247] = await Promise.all([
								bot.db.getPrefix(guildId, bot.childEnv.clientId),
								bot.db.get_247(bot.childEnv.clientId, guildId)
							]);
							return {
								bot,
								clientId: bot.childEnv.clientId,
								prefix,
								is247: is247 as Stay,
								isInAnyVC: activeClientIds.has(bot.childEnv.clientId)
							};
						})
					);
	
					// Check: Is this bot supposed to handle this message?
	
					const botInSameVC = guildMap.get(userVCId);
	
					// Check: Bot already in user's VC
					const sameVCBot = botMeta.find(entry => botInSameVC === entry.clientId);
					if (sameVCBot) {
						chosenBot = sameVCBot.bot;
						valid = true;
						return;
					}
	
					// Matching prefix & idle
					const matchingFreeBot = botMeta.find(entry =>
						entry.clientId === matchedPrefix && !entry.isInAnyVC
					);
					if (matchingFreeBot) {
						chosenBot = matchingFreeBot.bot;
						valid = true;
						return;
					}
	
					// Any idle bot
					const idleBot = botMeta.find(entry => !entry.isInAnyVC);
					if (idleBot) {
						chosenBot = idleBot.bot;
						valid = true;
						return;
					}
	
					// No bot available
					valid = false;
				});
			}
	
			if (this.client.user!.id !== chosenBot!.user!.id) return;
	
			if (!valid) {
				await interaction.reply({
					content: T(locale, 'event.message.no_free_bots'),
				});
				return;
			}

			const ctx = new Context(interaction as any, (interaction as ChatInputCommandInteraction).options.data as any);
			ctx.setArgs((interaction as ChatInputCommandInteraction).options.data as any);
			ctx.guildLocale = locale;
			const clientMember = interaction.guild.members.resolve(this.client.user!)!;
			if (
				!(
					interaction.inGuild() &&
					interaction.channel?.permissionsFor(clientMember)?.has(PermissionFlagsBits.ViewChannel)
				)
			)
				return;

			if (
				!(
					clientMember.permissions.has(PermissionFlagsBits.ViewChannel) &&
					clientMember.permissions.has(PermissionFlagsBits.SendMessages) &&
					clientMember.permissions.has(PermissionFlagsBits.EmbedLinks) &&
					clientMember.permissions.has(PermissionFlagsBits.ReadMessageHistory)
				)
			) {
				return await (interaction.member as GuildMember)
					.send({
						content: T(locale, 'event.interaction.no_send_message'),
					})
					.catch(() => {
						null;
					});
			}

			const logs = this.client.channels.cache.get(this.client.env.LOG_COMMANDS_ID!);

			if (command.permissions) {
				if (command.permissions?.client) {
					const missingClientPermissions = command.permissions.client.filter(
						(perm: any) => !clientMember.permissions.has(perm),
					);

					if (missingClientPermissions.length > 0) {
						return await interaction.reply({
							content: T(locale, 'event.interaction.no_permission', {
								permissions: missingClientPermissions.map((perm: string) => `\`${perm}\``).join(', '),
							}),
							flags: MessageFlags.Ephemeral,
						});
					}
				}

				if (
					command.permissions?.user &&
					!(interaction.member as GuildMember).permissions.has(command.permissions.user)
				) {
					const missingUserPermissions = Array.isArray(command.permissions.user)
						? command.permissions.user
						: [command.permissions.user];
					await interaction.reply({
						content: T(locale, 'event.interaction.no_user_permission', {
							permissions: missingUserPermissions.map((perm: string) => `\`${perm}\``).join(', '),
						}),
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				if (command.permissions?.dev && this.client.env.OWNER_IDS) {
					const isDev = this.client.env.OWNER_IDS.includes(interaction.user.id);
					if (!isDev) return;
				}
			}
			if (command.vote
				&& this.client.env.TOPGG
				&& (!this.client.env.SKIP_VOTES_GUILDS || !this.client.env.SKIP_VOTES_GUILDS.find(id => id === interaction.guildId))
				&& (!this.client.env.SKIP_VOTES_USERS || !this.client.env.SKIP_VOTES_USERS.find(id => id === interaction.user.id))
			) {
				const isDev = this.client.env.OWNER_IDS?.includes(interaction.user.id);
				const voted = await this.client.topGG.hasVoted(interaction.user.id);
				if (!(isDev || voted)) {
					const voteBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setLabel(T(locale, 'event.interaction.vote_button'))
							.setURL(`https://top.gg/bot/${this.client.env.TOPGG_CLIENT_ID ?? '1385166515099275346'}/vote`)
							.setStyle(ButtonStyle.Link),
					);

					return await interaction.reply({
						content: T(locale, 'event.interaction.vote_message'),
						components: [voteBtn],
						flags: MessageFlags.Ephemeral,
					});
				}
			}
			if (command.player) {
				if (command.player.voice) {
					const isDev = this.client.env.OWNER_IDS!.includes(interaction.user.id);
					if (this.client.config.maintenance && !isDev) {
						const embed = this.client.embed()
							.setAuthor({
								name: T(locale, 'maintenance.title'),
								iconURL: this.client.user?.displayAvatarURL(),
							})
							.setColor(this.client.color.main)
							.setDescription(T(locale, 'event.message.maintenance') || 'The bot is currently under maintenance. Some commands may not work properly.')
							.addFields([
								{
									name: T(locale, 'maintenance.status_title'), // 🔒 Status
									value: `\`\`\`diff\n- ${T(locale, 'maintenance.status_value')}\n\`\`\``, // - MAINTENANCE ENABLED
									inline: true,
								},
								{
									name: T(locale, 'maintenance.affected_title'), // 🕒 Affected Features
									value: `\`\`\`${T(locale, 'maintenance.affected_value')}\`\`\``, // All music playback and queue commands are temporarily disabled.
									inline: true,
								},
							])
							.setFooter({
								text: 'BuNgo Music Bot 🎵 • Made by Gúp Bu Ngô with ♥️',
								iconURL: 'https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg',
							})
							.setTimestamp();

						return await interaction.reply({ embeds: [embed], ephemeral: true });
					}

					const member = interaction.member as GuildMember;
					const voiceChannel = member.voice.channel;

					if (!voiceChannel) {
						return await interaction.reply({
							content: T(locale, 'event.interaction.no_voice_channel', { command: command.name }),
							ephemeral: true,
						});
					}

					if (voiceChannel.userLimit > 0 && voiceChannel.members.size >= voiceChannel.userLimit && !voiceChannel.members.has(clientMember.id)) {
						return await interaction.reply({
							content: T(locale, 'event.interaction.voice_channel_full', { command: command.name, channel: voiceChannel.id }),
							ephemeral: true,
						});
					}

					if (!voiceChannel.permissionsFor(this.client.user!)?.has(PermissionFlagsBits.Connect)) {
						return await interaction.reply({
							content: T(locale, 'event.interaction.no_connect_permission', { command: command.name }),
							ephemeral: true,
						});
					}

					if (!voiceChannel.permissionsFor(this.client.user!)?.has(PermissionFlagsBits.Speak)) {
						return await interaction.reply({
							content: T(locale, 'event.interaction.no_speak_permission', { command: command.name }),
							ephemeral: true,
						});
					}

					if (!clientMember.permissions.has(PermissionFlagsBits.Connect)) {
						return await interaction.reply({
							content: T(locale, 'event.interaction.no_connect_permission', { command: command.name }),
						});
					}

					if (!clientMember.permissions.has(PermissionFlagsBits.Speak)) {
						return await interaction.reply({
							content: T(locale, 'event.interaction.no_speak_permission', { command: command.name }),
						});
					}

					if (
						(interaction.member as GuildMember).voice.channel?.type === ChannelType.GuildStageVoice &&
						!clientMember.permissions.has(PermissionFlagsBits.RequestToSpeak)
					) {
						return await interaction.reply({
							content: T(locale, 'event.interaction.no_request_to_speak', { command: command.name }),
						});
					}

					if (
						clientMember.voice.channel &&
						clientMember.voice.channelId !== (interaction.member as GuildMember).voice.channelId
					) {
						return await interaction.reply({
							content: T(locale, 'event.interaction.different_voice_channel', {
								channel: `<#${clientMember.voice.channelId}>`,
								command: command.name,
							}),
						});
					}
				}

				if (command.player.active) {
					const queue = this.client.manager.getPlayer(interaction.guildId);
					if (!queue?.queue.current) {
						return await interaction.reply({
							content: T(locale, 'event.interaction.no_music_playing'),
						});
					}
				}

				if (command.player.dj) {
					const dj = await this.client.db.getDj(interaction.guildId);
					if (dj?.mode) {
						const djRole = await this.client.db.getRoles(interaction.guildId);
						if (!djRole) {
							return await interaction.reply({
								content: T(locale, 'event.interaction.no_dj_role'),
							});
						}

						const hasDJRole = (interaction.member as GuildMember).roles.cache.some(role =>
							djRole.map(r => r.roleId).includes(role.id),
						);
						if (!(hasDJRole && !(interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageGuild))) {
							return await interaction.reply({
								content: T(locale, 'event.interaction.no_dj_permission'),
								flags: MessageFlags.Ephemeral,
							});
						}
					}
				}
			}

			if (!this.client.cooldown.has(commandName)) {
				this.client.cooldown.set(commandName, new Collection());
			}

			const now = Date.now();
			const timestamps = this.client.cooldown.get(commandName)!;
			const cooldownAmount = (command.cooldown || 5) * 1000;

			if (timestamps.has(interaction.user.id)) {
				const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;
				const timeLeft = (expirationTime - now) / 1000;
				if (now < expirationTime && timeLeft > 0.9) {
					return await interaction.reply({
						content: T(locale, 'event.interaction.cooldown', {
							time: timeLeft.toFixed(1),
							command: commandName,
						}),
					});
				}
				timestamps.set(interaction.user.id, now);
				setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
			} else {
				timestamps.set(interaction.user.id, now);
				setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
			}

			try {
				await command.run(this.client, ctx, ctx.args);
				if (setup && interaction.channelId === setup.textId && allowedCategories.includes(command.category)) {
					setTimeout(() => {
						interaction.deleteReply().catch(() => {
							null;
						});
					}, 5000);
				}
				if (logs) {
					const embed = new EmbedBuilder()
						.setAuthor({
							name: 'Slash - Command Logs',
							iconURL: this.client.user?.avatarURL({ size: 2048 })!,
						})
						.setColor(this.client.config.color.blue)
						.addFields(
							{ name: 'Command', value: `\`${command.name}\``, inline: true },
							{ name: 'User', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
							{ name: 'Guild', value: `${interaction.guild.name} (\`${interaction.guild.id}\`)`, inline: true },
						)
						.setFooter({
							text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
							iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
						})
						.setTimestamp();

					await (logs as TextChannel).send({ embeds: [embed], flags: 4096 });
				}
			} catch (error) {
				this.client.logger.error(error);
				await interaction.reply({
					content: T(locale, 'event.interaction.error', { error }),
				});
			}
		} else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
			const command = this.client.commands.get(interaction.commandName);
			if (!command) return;

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				this.client.logger.error(error);
			}
		} else if (interaction.type === InteractionType.MessageComponent && interaction.isButton()) {
			// --- Skip/Keep Vote Button Handler ---
			if ('isButton' in interaction && typeof interaction.isButton === 'function' && interaction.isButton()) {
				const button = interaction as import('discord.js').ButtonInteraction;
				const { customId } = button;

				// Import VotingSystem for handling votes
				const { VotingSystem } = await import('../../utils/VotingSystem');

				// Handle voting buttons
				if (customId.endsWith('_vote_yes') || customId.endsWith('_vote_no')) {
					const action = customId.replace('_vote_yes', '').replace('_vote_no', '');
					const voteType = customId.endsWith('_vote_yes') ? 'yes' : 'no';
					
					await VotingSystem.handleVoteButton(this.client, button, action, voteType);
					return;
				}
			}
			// --- End Skip/Keep/Stop Vote Button Handler ---
		}
	}
}


