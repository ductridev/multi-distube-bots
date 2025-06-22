// src/commands/stop.ts
/* 
    Command: stop
    Description: Stops the bot and leaving the voice channel.
    Usage: b!stop
    Category: music
    Aliases: s, st
*/

import { Message } from "discord.js";
import { Command } from "../../@types/command";
import DisTube from "distube";
import { replyWithEmbed } from "../../utils/embedHelper";
import { startVotingUI } from "../../utils/startVotingUI";
import { QueueSessionModel } from "../../models/QueueSession";

const skip: Command = {
    name: 'stop',
    description: 'Dừng phát và rời khỏi kênh thoại.',
    usage: 'b!stop',
    category: 'music',
    aliases: ['s', 'st'],
    execute: async (message: Message, args: string[], distube: DisTube) => {
        await startVotingUI(message, distube, 'stop', async () => {
            const guildId = message.guild?.id;
            if (!guildId) return;

            const vc = message.member?.voice.channel;
            if (!vc) {
                await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
                return;
            }

            if (!distube.voices.get(guildId)) {
                await replyWithEmbed(message, 'error', 'Bot không ở trong kênh thoại.');
                return;
            }

            const queue = distube.getQueue(guildId);
            if (queue && queue.songs.length > 0) {
                queue.stop();
                QueueSessionModel.deleteOne({ userId: message.author.id });
                distube.voices.leave(guildId);
                await replyWithEmbed(message, 'success', '👋 Đã dừng phát và rời khỏi kênh thoại. Hẹn gặp lại ✌💋');
            }
        });
    },
}

export = skip;