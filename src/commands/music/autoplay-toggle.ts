// src/commands/autoplay-toggle.js
/* 
    Command: autoplay-toggle
    Description: Toggles autoplay for the current queue.
    Usage: b!autoplay-toggle
    Category: music
    Aliases: auto, au-toggle
*/

import { Command } from '../../@types/command';
import { Message } from 'discord.js';
import { replyWithEmbed } from '../../utils/embedHelper';

const autoplayToggle: Command = {
    name: 'autoplay-toggle',
    description: 'Bật/Tắt tự động phát bài hát.',
    usage: 'b!autoplay-toggle',
    category: 'music',
    aliases: ['auto', 'au-toggle'],
    async execute(message: Message, _args: string[], distube) {
        const vc = message.member?.voice.channel;
        if (!vc) {
            await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại để phát album.');
            return;
        }

        const queue = distube.getQueue(message);
        if (!queue) {
            await replyWithEmbed(message, 'error', 'Không có bài hát nào đang phát.');
            return;
        }

        const autoplay = distube.toggleAutoplay(message);
        await replyWithEmbed(message, 'success', `🔁 Tự động phát đã được **${autoplay ? 'bật' : 'tắt'}**.`);
    },
};

export = autoplayToggle;
