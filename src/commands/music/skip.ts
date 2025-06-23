// src/commands/skip.ts
/* 
    Command: skip
    Description: Skips the current song and plays the next song in the queue.
    Usage: b!skip
    Category: music
    Aliases: s, sk
*/

import { Message } from "discord.js";
import { Command } from "../../@types/command";
import DisTube from "distube";
import { replyWithEmbed } from "../../utils/embedHelper";
import { startVotingUI } from "../../utils/startVotingUI";

const skip: Command = {
    name: 'skip',
    description: 'Bỏ qua bài hát hiện tại và phát bài hát tiếp theo.',
    usage: 'b!skip',
    category: 'music',
    aliases: ['s', 'sk'],
    execute: async (message: Message, args: string[], distube: DisTube) => {
        try {
            await startVotingUI(message, distube, 'skip', async () => {
                const guildId = message.guild?.id;
                if (!guildId) return;

                const vc = message.member?.voice.channel;
                if (!vc) {
                    await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
                    return;
                }

                const queue = distube.getQueue(guildId);
                if (queue && queue.songs.length > 0) {
                    await distube.skip(message);
                    await replyWithEmbed(message, 'success', 'Đã bỏ qua bài hát.');
                } else {
                    await replyWithEmbed(message, 'error', 'Không có bài hát nào đang phát.');
                }
            });
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
}

export = skip;