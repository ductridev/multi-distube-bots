// src/commands/playing.ts
/* 
    Command: playing
    Description: Displays the currently playing song.
    Usage: b!playing
    Category: music
    Aliases: pcr, current, pcurrent
*/

import { Message } from "discord.js";
import { Command } from "../../@types/command";
import DisTube from "distube";
import { replyWithEmbed } from "../../utils/embedHelper";

const playing: Command = {
    name: 'playing',
    description: 'Xem bài hát đang phát.',
    usage: 'b!playing',
    category: 'music',
    aliases: ['pcr', 'current', 'pcurrent'],
    execute: async (message: Message, args: string[], distube: DisTube) => {
        const vc = message.member?.voice.channel;
        if (!vc) {
            await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
            return;
        }

        const queue = distube.getQueue(message);
        if (!queue || !queue.songs.length) {
            replyWithEmbed(
                message,
                'info',
                'Không có bài hát nào đang được phát.',
                undefined,
                '🎧 Không có bài hát'
            );
            return;
        }

        const song = queue.songs[0];

        replyWithEmbed(
            message,
            'info',
            `🎶 **${song.name}**\n⏱️ \`${song.formattedDuration}\`\n👤 **Người yêu cầu:** <@${song.user?.id || 'Không rõ'}>\n🔗 [Link bài hát](${song.url})`,
            undefined,
            '🎵 Đang phát bài hát'
        );

        return;
    }
}

export = playing;