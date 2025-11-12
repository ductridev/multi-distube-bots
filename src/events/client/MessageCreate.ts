import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Collection,
	EmbedBuilder,
	type GuildMember,
	type Message,
	PermissionFlagsBits,
	type TextChannel,
} from 'discord.js';
import { T } from '../../structures/I18n';
import { Context, Event, type Lavamusic } from '../../structures/index';
import { env } from '../../env';
import { getBotsForGuild } from '../..';
import { Stay } from '@prisma/client';

export default class MessageCreate extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'messageCreate',
		});
	}

	public async run(message: Message): Promise<any> {
		if (message.author.bot) return;
		if (!(message.guild && message.guildId)) return;

		const guildId = message.guildId;
		const userVCId = message.member?.voice?.channelId ?? null;

		const setup = await this.client.db.getSetup(message.guildId!);
		if (setup && setup.textId === message.channelId) {
			return this.client.emit('setupSystem', message);
		}
		const locale = await this.client.db.getLanguage(message.guildId!);
		const botClientId = this.client.childEnv.id;

		const allPrefixes = await this.client.db.getAllPrefixes(guildId);
		allPrefixes.push(env.GLOBAL_PREFIX);

		const prefix = await this.client.db.getPrefix(guildId, botClientId);
		const mention = new RegExp(`^<@!?${this.client.user?.id}>( |)$`);
		if (mention.test(message.content)) {
			await message.reply({
				content: T(locale, 'event.message.prefix_mention', {
					prefix: prefix,
				}),
			});
			return;
		}

		const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const prefixPatterns = allPrefixes.map(p => `(${escapeRegex(p)})`);
		const combinedPrefixRegex = new RegExp(`^(${prefixPatterns.join('|')})\\s*`);

		const match = message.content.toLocaleLowerCase().match(combinedPrefixRegex);
		if (!match) return;
		const [matchedPrefix] = match;
		const args = message.content.slice(matchedPrefix.length).trim().split(/ +/g);
		const cmd = args.shift()?.toLowerCase();
		if (!cmd) return;
		const command = this.client.commands.get(cmd) || this.client.commands.get(this.client.aliases.get(cmd) as string);
		if (!command) return;

		const allBots = getBotsForGuild(guildId);
		
		// Check if no bots are configured for this guild
		if (allBots.length === 0) {
			// Only one bot should reply to avoid spam
			if (this.client.childEnv.id === this.client.childEnv.id) {
				await message.reply({
					content: T(locale, 'event.message.no_bots_configured')
				});
			}
			return;
		}
		
		// Early return: If this bot is not configured for this guild, skip processing
		if (!allBots.some(bot => bot.user?.id === this.client.user?.id)) {
			return;
		}
		
		let chosenBot: typeof this.client | null = null;
		let valid = true;

		// CRITICAL FIX: Use a shared state across ALL bot instances
		// We need to check ACTUAL voice state from Discord, not from local memory
		// because each bot instance might have different in-memory state
		const voiceStates = message.guild!.voiceStates.cache;
		const botClientIds = allBots.map(b => b.user!.id);
		
		// Build REAL voice channel mapping from Discord's actual state
		const realGuildMap = new Map<string, string>();
		const realActiveClientIds = new Set<string>();
		
		for (const [, voiceState] of voiceStates) {
			if (voiceState.channelId && botClientIds.includes(voiceState.member!.user.id)) {
				realGuildMap.set(voiceState.channelId, voiceState.member!.user.id);
				realActiveClientIds.add(voiceState.member!.user.id);
			}
		}

		const botMeta = await Promise.all(
			allBots.map(async bot => {
				const [prefix, is247] = await Promise.all([
					bot.db.getPrefix(guildId, bot.childEnv.clientId),
					bot.db.get_247(bot.childEnv.clientId, guildId)
				]);
				return {
					bot,
					clientId: bot.childEnv.clientId,
					name: bot.childEnv.name,
					prefix,
					is247: is247 as Stay,
					isInAnyVC: realActiveClientIds.has(bot.user!.id) // Use REAL state
				};
			})
		);

		// Deterministic bot selection (same result across all bot instances)
		if (userVCId) {
			const botInSameVC = realGuildMap.get(userVCId);

			// Priority 1: Bot already in user's VC
			const sameVCBot = botMeta.find(entry => botInSameVC === entry.bot.user!.id);
			if (sameVCBot) {
				chosenBot = sameVCBot.bot;
				valid = true;
			}
			// Priority 2: Bot with matching prefix that is idle
			else {
				const matchingFreeBot = botMeta.find(entry =>
					entry.prefix === matchedPrefix.trim() && !entry.isInAnyVC
				);
				if (matchingFreeBot) {
					chosenBot = matchingFreeBot.bot;
					valid = true;
				}
				// Priority 3: Any idle bot (deterministic: use first idle bot found)
				else {
					const idleBot = botMeta.find(entry => !entry.isInAnyVC);
					if (idleBot) {
						chosenBot = idleBot.bot;
						valid = true;
					}
					// Priority 4: If using global prefix and all bots busy, use message ID hash
					else if (matchedPrefix.trim() === env.GLOBAL_PREFIX) {
						// All bots are busy, but user still wants to queue
						// Use deterministic distribution based on message ID
						const botIndex = parseInt(message.id.slice(-4), 16) % allBots.length;
						chosenBot = allBots[botIndex];
						valid = true;
					}
					// No bot available - all bots are busy in other VCs
					else {
						chosenBot = null;
						valid = false;
					}
				}
			}
		} else {
			// User not in voice channel - select bot based on prefix match or distribution
			// First try to match the prefix
			const matchingPrefixBot = botMeta.find(entry => entry.prefix === matchedPrefix.trim());
			if (matchingPrefixBot) {
				chosenBot = matchingPrefixBot.bot;
			}
			// Otherwise, use round-robin or first bot that matches
			// If using global prefix, distribute commands across all available bots
			else if (matchedPrefix.trim() === env.GLOBAL_PREFIX) {
				// Simple distribution: use hash of message ID to pick a bot
				const botIndex = parseInt(message.id.slice(-4), 16) % allBots.length;
				chosenBot = allBots[botIndex];
			}
			// Fallback to first available bot
			else {
				chosenBot = allBots[0];
			}
		}

		// Only the chosen bot should continue processing
		if (!chosenBot || this.client.user!.id !== chosenBot.user!.id) return;

		if (!valid) {
			await message.reply({
				content: T(locale, 'event.message.no_free_bots'),
			});
			return;
		}

		const ctx = new Context(message, args);
		ctx.setArgs(args);
		ctx.guildLocale = locale;

		const clientMember = message.guild!.members.resolve(this.client.user!)!;
		const isDev = this.client.env.OWNER_IDS?.includes(message.author.id);

		if (!(message.inGuild() && message.channel.permissionsFor(clientMember)?.has(PermissionFlagsBits.ViewChannel)))
			return;

		if (
			!(
				clientMember.permissions.has(PermissionFlagsBits.ViewChannel) &&
				clientMember.permissions.has(PermissionFlagsBits.SendMessages) &&
				clientMember.permissions.has(PermissionFlagsBits.EmbedLinks) &&
				clientMember.permissions.has(PermissionFlagsBits.ReadMessageHistory)
			)
		) {
			return await message.author
				.send({
					content: T(locale, 'event.message.no_send_message'),
				})
				.catch(() => {
					null;
				});
		}

		if (command.permissions) {
			if (command.permissions?.client) {
				const missingClientPermissions = command.permissions.client.filter(
					(perm: any) => !clientMember.permissions.has(perm),
				);

				if (missingClientPermissions.length > 0) {
					return await message.reply({
						content: T(locale, 'event.message.no_permission', {
							permissions: missingClientPermissions.map((perm: string) => `\`${perm}\``).join(', '),
						}),
					});
				}
			}

			if (command.permissions?.user) {
				if (!(isDev || (message.member as GuildMember).permissions.has(command.permissions.user))) {
					const missingUserPermissions = Array.isArray(command.permissions.user)
						? command.permissions.user
						: [command.permissions.user];

					return await message.reply({
						content: T(locale, 'event.message.no_user_permission', {
							permissions: missingUserPermissions.map((perm: string) => `\`${perm}\``).join(', '),
						}),
					});
				}
			}

			if (command.permissions?.dev && this.client.env.OWNER_IDS) {
				if (!isDev) return;
			}
		}

		if (command.vote
			&& this.client.env.TOPGG
			&& (!this.client.env.SKIP_VOTES_GUILDS || !this.client.env.SKIP_VOTES_GUILDS.find(id => id === message.guildId))
			&& (!this.client.env.SKIP_VOTES_USERS || !this.client.env.SKIP_VOTES_USERS.find(id => id === message.author.id))
		) {
			const voted = await this.client.topGG.hasVoted(message.author.id);
			if (!(isDev || voted)) {
				const voteBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setLabel(T(locale, 'event.message.vote_button'))
						.setURL(`https://top.gg/bot/${this.client.env.TOPGG_CLIENT_ID ?? '1385166515099275346'}/vote`)
						.setStyle(ButtonStyle.Link),
				);

				return await message.reply({
					content: T(locale, 'event.message.vote_message'),
					components: [voteBtn],
				});
			}
		}

		if (command.player) {
			if (command.player.voice) {
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

					return await message.reply({ embeds: [embed] });
				}

				const voiceChannel = (message.member as GuildMember).voice.channel;
				const botMember = message.guild?.members.me;
				if (!voiceChannel) {
					return await message.reply({
						content: T(locale, 'event.message.no_voice_channel', { command: command.name }),
					});
				}

				if (voiceChannel.userLimit > 0 && voiceChannel.members.size >= voiceChannel.userLimit && !voiceChannel.members.has(botMember?.id ?? '')) {
					return await message.reply({
						content: T(locale, 'event.message.voice_channel_full', { command: command.name, channel: voiceChannel.id }),
					});
				}

				if (!voiceChannel.permissionsFor(this.client.user!)?.has(PermissionFlagsBits.Connect)) {
					return await message.reply({
						content: T(locale, 'event.message.no_connect_permission', { command: command.name }),
					});
				}

				if (!voiceChannel.permissionsFor(this.client.user!)?.has(PermissionFlagsBits.Speak)) {
					return await message.reply({
						content: T(locale, 'event.message.no_speak_permission', { command: command.name }),
					});
				}

				if (!clientMember.permissions.has(PermissionFlagsBits.Connect)) {
					return await message.reply({
						content: T(locale, 'event.message.no_connect_permission', { command: command.name }),
					});
				}

				if (!clientMember.permissions.has(PermissionFlagsBits.Speak)) {
					return await message.reply({
						content: T(locale, 'event.message.no_speak_permission', { command: command.name }),
					});
				}

				if (
					(message.member as GuildMember).voice.channel?.type === ChannelType.GuildStageVoice &&
					!clientMember.permissions.has(PermissionFlagsBits.RequestToSpeak)
				) {
					return await message.reply({
						content: T(locale, 'event.message.no_request_to_speak', { command: command.name }),
					});
				}

				if (
					clientMember.voice.channel &&
					clientMember.voice.channelId !== (message.member as GuildMember).voice.channelId
				) {
					return await message.reply({
						content: T(locale, 'event.message.different_voice_channel', {
							channel: `<#${clientMember.voice.channelId}>`,
							command: command.name,
						}),
					});
				}
			}

			if (command.player.active) {
				const queue = this.client.manager.getPlayer(message.guildId);
				if (!queue?.queue.current) {
					return await message.reply({
						content: T(locale, 'event.message.no_music_playing'),
					});
				}
			}

			if (command.player.dj) {
				const dj = await this.client.db.getDj(message.guildId);
				if (dj?.mode) {
					const djRole = await this.client.db.getRoles(message.guildId);
					if (!djRole) {
						return await message.reply({
							content: T(locale, 'event.message.no_dj_role'),
						});
					}

					const hasDJRole = (message.member as GuildMember).roles.cache.some(role =>
						djRole.map(r => r.roleId).includes(role.id),
					);
					if (
						!(isDev || (hasDJRole && !(message.member as GuildMember).permissions.has(PermissionFlagsBits.ManageGuild)))
					) {
						return await message.reply({
							content: T(locale, 'event.message.no_dj_permission'),
						});
					}
				}
			}
		}

		if (command.args && args.length === 0) {
			const embed = this.client
				.embed()
				.setColor(this.client.color.red)
				.setTitle(T(locale, 'event.message.missing_arguments'))
				.setDescription(
					T(locale, 'event.message.missing_arguments_description', {
						command: command.name,
						examples: command.description.examples ? command.description.examples.join('\n') : 'None',
					}),
				)
				.setFooter({
					text: T(locale, 'event.message.syntax_footer'),
					iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg"
				});
			await message.reply({ embeds: [embed] });
			return;
		}

		if (!this.client.cooldown.has(cmd)) {
			this.client.cooldown.set(cmd, new Collection());
		}
		const now = Date.now();
		const timestamps = this.client.cooldown.get(cmd)!;
		const cooldownAmount = (command.cooldown || 5) * 1000;

		if (timestamps.has(message.author.id)) {
			const expirationTime = timestamps.get(message.author.id)! + cooldownAmount;
			const timeLeft = (expirationTime - now) / 1000;
			if (now < expirationTime && timeLeft > 0.9) {
				return await message.reply({
					content: T(locale, 'event.message.cooldown', { time: timeLeft.toFixed(1), command: cmd }),
				});
			}
			timestamps.set(message.author.id, now);
			setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
		} else {
			timestamps.set(message.author.id, now);
			setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
		}

		if (args.includes('@everyone') || args.includes('@here')) {
			return await message.reply({
				content: T(locale, 'event.message.no_mention_everyone'),
			});
		}

		try {
			// Update player text channel if a player exists and command is music-related
			const musicCategories = ['music', 'filters', 'playlist'];
			if (musicCategories.includes(command.category)) {
				const player = this.client.manager.getPlayer(message.guildId);
				if (player && player.textChannelId !== message.channelId) {
					player.textChannelId = message.channelId;
				}
			}

			return command.run(this.client, ctx, ctx.args);
		} catch (error: any) {
			this.client.logger.error(error);
			await message.reply({
				content: T(locale, 'event.message.error', { error: error.message || 'Unknown error' }),
			});
		} finally {
			const logs = this.client.channels.cache.get(this.client.env.LOG_COMMANDS_ID!);
			if (logs) {
				const embed = new EmbedBuilder()
					.setAuthor({
						name: 'Prefix - Command Logs',
						iconURL: this.client.user?.avatarURL({ size: 2048 })!,
					})
					.setColor(this.client.config.color.green)
					.addFields(
						{ name: 'Command', value: `\`${command.name}\``, inline: true },
						{ name: 'User', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
						{ name: 'Guild', value: `${message.guild.name} (\`${message.guild.id}\`)`, inline: true },
					)
					.setFooter({
						text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
						iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
					})
					.setTimestamp();

				await (logs as TextChannel).send({ embeds: [embed], flags: 4096 });
			}
		}
	}
}


