// src/commands/leave.js
/* 
    Command: leave
    Description: Leaves the voice channel the bot is in.
    Usage: b!leave
    Category: music
    Aliases: l
*/

import { getVoiceConnection } from '@discordjs/voice';
import { Command } from '../@types/command';
import { Message } from 'discord.js';
import { replyWithEmbed } from '../utils/embedHelper';
import { DisTube } from 'distube';

const leave: Command = {
    name: 'leave',
    description: 'Rời khỏi kênh thoại.',
    usage: 'b!leave',
    category: 'music',
    aliases: ['l'],
    async execute(message: Message, _args: string[], distube: DisTube) {
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

        try {
            distube.voices.leave(guildId);
            await replyWithEmbed(message, 'info', '👋 Đã rời khỏi kênh thoại. Hẹn gặp lại ✌💋');
        } catch (err) {
            console.error('Lỗi khi rời kênh thoại:', err);
            await replyWithEmbed(message, 'error', 'Không thể rời khỏi kênh thoại.');
        }
    },
};

export = leave;
