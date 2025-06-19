// src/commands/playrecent.js
/* 
    Command: playrecent
    Description: Plays the most recent song played by the user.
    Usage: b!playrecent
    Category: music
    Aliases: pr, precent
*/

import { Command } from '../@types/command';
import { GuildTextBasedChannel, Message } from 'discord.js';
import { RecentTrackModel } from '../models/RecentTrack';
import { replyWithEmbed } from '../utils/embedHelper';
import { setInitiator } from '../utils/sessionStore';

const playrecent: Command = {
    name: 'playrecent',
    description: 'Phát lịch sử bài hát gần đây.',
    usage: 'b!playrecent',
    category: 'music',
    aliases: ['pr', 'precent'],
    async execute(message: Message, _args: string[], distube) {
        const vc = message.member?.voice.channel;
        if (!vc) {
            await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
            return;
        }

        await setInitiator(message.guildId!, message.author.id);

        try {
            const recent = await RecentTrackModel.findOne({ userId: message.author.id });

            if (!recent || recent.tracks.length === 0) {
                await replyWithEmbed(message, 'warning', '⚠️ Bạn chưa phát bài nào gần đây.');
                return;
            }

            await distube.play(vc, recent.tracks[0], {
                member: message.member!,
                textChannel: message.channel as GuildTextBasedChannel,
            });

            await replyWithEmbed(message, 'success', '▶️ Đã phát lại bài gần nhất bạn đã nghe.');
        } catch (err) {
            console.error('Lỗi phát lại từ MongoDB:', err);
            await replyWithEmbed(message, 'error', 'Không thể truy cập lịch sử từ cơ sở dữ liệu.');
        }
    },
};

export = playrecent;
