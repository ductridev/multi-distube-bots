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
import { getSongOrPlaylist } from '../../utils/getSongOrPlaylist';
import { Playlist, Song } from 'distube';
import { canBotJoinVC } from '../../utils/voicePermission';

const resume: Command = {
    name: 'resume-session',
    description: 'Khôi phục lần nghe gần nhất từ cơ sở dữ liệu.',
    usage: 'b!resume-session',
    category: 'music',
    aliases: ['rss', 'rsession', 'resumesession'],
    async execute(message: Message, _args: string[], distube) {
        try {
            const vc = message.member?.voice.channel;
            if (!vc) {
                await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
                return;
            }

            const error = canBotJoinVC(vc, message.client.user!.id);
            if (error) {
                await replyWithEmbed(message, 'error', error);
                return;
            }

            const session = await QueueSessionModel.findOne({ userId: message.author.id });
            if (!session || session.urls.length === 0) {
                await replyWithEmbed(message, 'warning', '⚠️ Không có session nào để khôi phục.');
                return;
            }

            try {
                let queue = distube.getQueue(message);

                if (!queue) {
                    queue = await distube.queues.create(vc, message.channel as GuildTextBasedChannel)
                }

                for (const url of session.urls.reverse()) {
                    const songOrPlaylist = await getSongOrPlaylist(distube, url);
                    if (songOrPlaylist instanceof Playlist && songOrPlaylist.songs.length === 0) {
                        await replyWithEmbed(message, 'error', `Không thể phát playlist [${url}](${url}).`);
                        return;
                    } else if (songOrPlaylist instanceof Song && songOrPlaylist.duration === 0) {
                        await replyWithEmbed(message, 'error', `Không thể phát bài hát [${url}](${url}).`);
                        return;
                    } else if (!songOrPlaylist) {
                        await replyWithEmbed(message, 'error', 'Không tìm thấy bài hát nào phù hợp.');
                        return;
                    }

                    if (!songOrPlaylist.url) {
                        await replyWithEmbed(message, 'error', 'Không thể phát bài hát hoặc playlist [${url}](${url}).');
                        return;
                    }
                    queue.addToQueue(songOrPlaylist instanceof Playlist ? songOrPlaylist.songs : songOrPlaylist);

                    if (!queue.playing) {
                        queue.play();
                    }
                }
                await replyWithEmbed(message, 'success', '🔁 Đã khôi phục hàng đợi.');
            } catch (err) {
                console.error('Resume error:', err);
                await replyWithEmbed(message, 'error', 'Không thể khôi phục hàng đợi.');
            }
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
};

export = resume;
