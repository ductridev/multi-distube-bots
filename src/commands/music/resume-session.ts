// src/commands/resume-session.js
/* 
    Command: resume-session
    Description: Resumes the queue session.
    Usage: b!resume-session
    Category: music
    Aliases: rs, rsession, resumesession
*/

import { Command } from '../../@types/command';
import { GuildTextBasedChannel, Message } from 'discord.js';
import { QueueSessionModel } from '../../models/QueueSession';
import { replyWithEmbed } from '../../utils/embedHelper';

const resume: Command = {
    name: 'resume-session',
    description: 'Khôi phục lần nghe gần nhất từ cơ sở dữ liệu.',
    usage: 'b!resume-session',
    category: 'music',
    aliases: ['rss', 'rsession', 'resumesession'],
    async execute(message: Message, _args: string[], distube) {
        const vc = message.member?.voice.channel;
        if (!vc) {
            await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
            return;
        }

        const session = await QueueSessionModel.findOne({ userId: message.author.id });
        if (!session || session.urls.length === 0) {
            await replyWithEmbed(message, 'warning', '⚠️ Không có session nào để khôi phục.');
            return;
        }

        try {
            for (const url of session.urls.reverse()) {
                await distube.play(vc, url, {
                    member: message.member!,
                    textChannel: message.channel as GuildTextBasedChannel,
                });
            }
            await replyWithEmbed(message, 'success', '🔁 Đã khôi phục hàng đợi.');
        } catch (err) {
            console.error('Resume error:', err);
            await replyWithEmbed(message, 'error', 'Không thể khôi phục hàng đợi.');
        }
    },
};

export = resume;
