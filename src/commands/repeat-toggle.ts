// src/commands/repeat-toggle.ts
/* 
    Command: repeat-toggle
    Description: Toggles repeat mode for the current queue.
    Usage: b!repeat-toggle
    Category: music
    Aliases: rp, repeat, re-toggle
*/

import { Message } from "discord.js";
import DisTube, { RepeatMode } from "distube";
import { replyWithEmbed } from "../utils/embedHelper";
import { Command } from "../@types/command";

const repeatToggle: Command = {
    name: 'repeat-toggle',
    description: 'Bật/Tắt lặp bài hát.',
    usage: 'b!repeat-toggle',
    category: 'music',
    aliases: ['rp', 'repeat', 're-toggle'],
    execute: async (message: Message, args: string[], distube: DisTube) => {
        const vc = message.member?.voice.channel;
        if (!vc) {
            await replyWithEmbed(message, 'error', 'Bạn cần tham gia một kênh thoại trước.');
            return;
        }

        const queue = distube.getQueue(message);
        if (!queue) {
            await replyWithEmbed(message, 'error', 'Không có bài hát nào đang phát.');
            return;
        }

        const repeatMode = args[0];

        if (repeatMode === 'queue') {
            distube.setRepeatMode(message.member.guild.id, RepeatMode.QUEUE);
            await replyWithEmbed(message, 'success', 'Bật lặp danh sách bài hát.');
        } else if (repeatMode === 'track') {
            distube.setRepeatMode(message.member.guild.id, RepeatMode.SONG);
            await replyWithEmbed(message, 'success', 'Bật lặp bài hát.');
        } else {
            distube.setRepeatMode(message.member.guild.id, RepeatMode.DISABLED);
            await replyWithEmbed(message, 'success', 'Tắt lặp bài hát.');
        }
    }
}

export = repeatToggle;