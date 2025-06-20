// src/bot/discordEvents.ts
import { Message } from 'discord.js';
import { DisTube } from 'distube';
import ExtendedClient from '../@types/extendedClient';
import BotInstance from '../@types/botInstance';
import selectBotForCommand from '../utils/selectBotResponseUser';
import { replyWithEmbed } from '../utils/embedHelper';

export function registerDiscordEvents(
    client: ExtendedClient,
    distube: DisTube,
    prefix: string,
    mainPrefix: string,
    name: string,
    noListenerTimeouts: Map<string, NodeJS.Timeout>,
    activeBots: BotInstance[],
) {
    client.on('voiceStateUpdate', (oldState, newState) => {
        const botInstance = activeBots.find(b => b.client.user?.id === newState.id);
        if (botInstance) {
            botInstance.currentVoiceChannelId = newState.channelId ?? undefined;
        }

        const channel = newState.channel;
        const guildId = newState.guild.id;
        if (!channel || newState.member?.user.bot) return;

        const humans = channel.members.filter(m => !m.user.bot);
        if (humans.size > 0 && noListenerTimeouts?.has(guildId)) {
            clearTimeout(noListenerTimeouts.get(guildId));
            noListenerTimeouts.delete(guildId);
        }
    });

    client.on('messageCreate', async (message: Message) => {
        if (message.author.bot || !message.guild) return;

        const allPrefixes = activeBots.map(b => b.client.prefix).concat(mainPrefix);
        const usedPrefix = allPrefixes.find(p => message.content.startsWith(p));
        if (!usedPrefix) return;

        const args = message.content.slice(usedPrefix.length).trim().split(/\s+/);
        const cmdName = args.shift()?.toLowerCase() || '';
        const command = client.commands.get(cmdName);
        if (!command) return;

        const userVCId = message.member?.voice.channelId;

        // Find bot that matches the prefix
        const matchingBot = activeBots.find(b => b.client.prefix === usedPrefix);

        // Select best bot (in case matchingBot is not free)
        const [selectedBot, isFree] = selectBotForCommand(command, activeBots, userVCId);

        const isThisBot = client.user?.id === selectedBot.client.user?.id;
        const isMatchingBot = client.user?.id === matchingBot?.client.user?.id;

        // Not the selected bot and not the matching bot — ignore
        if (!isThisBot && !isMatchingBot) return;

        // If this bot matches prefix and is free, proceed
        if (isMatchingBot && isFree) {
            try {
                await command.execute(message, args, distube);
            } catch (err) {
                console.error(`[${name}] Error in command '${cmdName}':`, err);
                replyWithEmbed(message, 'error', 'Có gì đó đã xảy ra khi thực hiện lệnh.');
            }
            return;
        }

        // If matching bot is not free → allow selected fallback bot to reply
        if (!isThisBot) return;

        if (!isFree) {
            await replyWithEmbed(message, 'error', 'Tất cả các bot đều đang được sử dụng, bạn có thể thử lại sau.');
            return;
        }

        try {
            await command.execute(message, args, distube);
        } catch (err) {
            console.error(`[${name}] Error in command '${cmdName}':`, err);
            replyWithEmbed(message, 'error', 'Có gì đó đã xảy ra khi thực hiện lệnh.');
        }
    });
}
