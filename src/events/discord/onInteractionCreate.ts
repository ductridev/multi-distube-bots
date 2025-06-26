// src/events/discord/onInteractionCreate.ts

import { Interaction } from 'discord.js';
import { DisTube } from 'distube';
import ExtendedClient from '../../@types/extendedClient';
import { canRunCommand } from '../../middleware/commandPermissionCheck';
import selectBotForCommand from '../../utils/selectBotResponseUser';
import GuildAccess from '../../models/GuildAccess';
import BotInstance from '../../@types/botInstance';

export const onInteractionCreate = async (
    interaction: Interaction,
    activeBots: BotInstance[],
    mainPrefix: string,
    client: ExtendedClient,
    distube: DisTube,
    name: string
) => {
    try {
        if (!interaction.isChatInputCommand() || !interaction.guildId) return;

        const guildId = interaction.guildId;

        // Check blacklist/whitelist
        const access = await GuildAccess.findOne({ guildId });
        if (access?.type === 'blacklist') return;
        if (process.env.ONLY_WHITELIST === 'true') {
            if (!access || access.type !== 'whitelist') return;
        }

        const command = client.commands.get(interaction.commandName);
        if (!command || typeof command.run !== 'function') return;

        const user = interaction.user;
        const member = interaction.guild?.members.cache.get(user.id);
        const userVCId = member?.voice.channelId;

        const allowed = await canRunCommand(interaction, command);
        if (!allowed) return;

        // Step 1: If any bot is already in the user's VC, let only that one respond
        const botInSameVC = activeBots.find(b => b.voiceChannelMap?.get(guildId) === userVCId);
        if (botInSameVC) {
            if (botInSameVC.client.user?.id !== client.user?.id) return;

            try {
                await command.run(interaction, distube, client);
            } catch (err) {
                console.error(`[${name}] Error in slash command '${interaction.commandName}':`, err);
                if (!interaction.replied) {
                    await interaction.reply({ content: '❌ Đã xảy ra lỗi khi thực thi lệnh.', ephemeral: true });
                }
            }
            return;
        }

        // Step 2: Determine the best bot based on availability
        const [selectedBot, isFree] = selectBotForCommand(command, activeBots, guildId, userVCId);

        const isThisBot = client.user?.id === selectedBot.client.user?.id;
        if (!isThisBot) return;

        // Step 3: Block if selected bot is in a different VC
        const currentVC = selectedBot.voiceChannelMap?.get(guildId);
        const botAlreadyInOtherVC = currentVC && currentVC !== userVCId;
        if (botAlreadyInOtherVC) {
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Bot này đang hoạt động ở kênh thoại khác. Vui lòng chờ hoặc sử dụng bot khác.',
                    ephemeral: true
                });
            }
            return;
        }

        // Step 4: Execute if bot is free
        if (isFree) {
            try {
                await command.run(interaction, distube, client);
            } catch (err) {
                console.error(`[${name}] Error in slash command '${interaction.commandName}':`, err);
                if (!interaction.replied) {
                    await interaction.reply({
                        content: '❌ Đã xảy ra lỗi khi thực thi lệnh.',
                        ephemeral: true
                    });
                }
            }
            return;
        }

        // Step 5: All bots are busy
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Tất cả các bot đều đang được sử dụng, bạn có thể thử lại sau.',
                ephemeral: true
            });
        }
    } catch (err) {
        console.error('❌ Error in onInteractionCreate:', err);
        // Do nothing
    }
};