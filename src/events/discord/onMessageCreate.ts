// src/events/discord/onMessageCreate.ts

import { Message } from 'discord.js';
import { DisTube } from 'distube';
import ExtendedClient from '../../@types/extendedClient';
import BotInstance from '../../@types/botInstance';
import { replyWithEmbed } from '../../utils/embedHelper';
import selectBotForCommand from '../../utils/selectBotResponseUser';
import { canRunCommand } from '../../middleware/commandPermissionCheck';

export const onMessageCreate = async (message: Message, activeBots: BotInstance[], mainPrefix: string, client: ExtendedClient, distube: DisTube, name: string) => {
    if (message.author.bot || !message.guild) return;

    const allPrefixes = activeBots.map(b => b.client.prefix).concat(mainPrefix);
    const usedPrefix = allPrefixes.find(p => message.content.startsWith(p));
    if (!usedPrefix) return;

    const args = message.content.slice(usedPrefix.length).trim().split(/\s+/);
    const cmdName = args.shift()?.toLowerCase() || '';
    const command = client.commands.get(cmdName);
    if (!command) return;

    const userVCId = message.member?.voice.channelId;

    const allowed = await canRunCommand(message, command);
    if (!allowed) return;

    // Step 1: If any bot is already in the user's VC, let only that one respond
    const botInSameVC = activeBots.find(b => b.currentVoiceChannelId === userVCId);
    if (botInSameVC) {
        if (botInSameVC.client.user?.id !== client.user?.id) return;

        try {
            await command.execute(message, args, distube);
        } catch (err) {
            console.error(`[${name}] Error in command '${cmdName}':`, err);
            replyWithEmbed(message, 'error', 'Có gì đó đã xảy ra khi thực hiện lệnh.');
        }
        return;
    }

    // Step 2: Determine the best bot based on prefix and availability
    const [selectedBot, isFree] = selectBotForCommand(command, activeBots, userVCId, usedPrefix);

    const isThisBot = client.user?.id === selectedBot.client.user?.id;
    if (!isThisBot) return; // Only selected bot should continue

    // Step 3: Block if selected bot is in a different VC
    const botAlreadyInOtherVC = selectedBot.currentVoiceChannelId && selectedBot.currentVoiceChannelId !== userVCId;
    if (botAlreadyInOtherVC) {
        await replyWithEmbed(message, 'error', 'Bot này đang hoạt động ở kênh thoại khác. Vui lòng chờ hoặc sử dụng bot khác.');
        return;
    }

    // Step 4: Execute if bot is free
    if (isFree) {
        try {
            await command.execute(message, args, distube);
        } catch (err) {
            console.error(`[${name}] Error in command '${cmdName}':`, err);
            replyWithEmbed(message, 'error', 'Có gì đó đã xảy ra khi thực hiện lệnh.');
        }
        return;
    }

    // Step 5: All bots are busy
    await replyWithEmbed(message, 'error', 'Tất cả các bot đều đang được sử dụng, bạn có thể thử lại sau.');
};