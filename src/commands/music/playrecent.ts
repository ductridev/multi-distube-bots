// src/commands/playrecent.js
/* 
    Command: playrecent
    Description: Plays the most recent song played by the user.
    Usage: b!playrecent
    Category: music
    Aliases: pr, precent
*/

import { Command } from '../../@types/command';
import {
    GuildTextBasedChannel,
    Message,
} from 'discord.js';
import { RecentTrackModel } from '../../models/RecentTrack';
import { replyWithEmbed } from '../../utils/embedHelper';
import { setInitiator } from '../../utils/sessionStore';
import { getSongOrPlaylist } from '../../utils/getSongOrPlaylist';
import { Playlist, Song } from 'distube';
import { canBotJoinVC } from '../../utils/voicePermission';

const playrecent: Command = {
    name: 'playrecent',
    description: 'Phát lịch sử bài hát gần đây.',
    usage: 'b!playrecent',
    category: 'music',
    aliases: ['pr', 'precent'],
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

            setInitiator(message.guildId!, vc.id, message.author.id);

            try {
                const recent = await RecentTrackModel.findOne({ userId: message.author.id });

                if (!recent || recent.tracks.length === 0) {
                    await replyWithEmbed(message, 'warning', '⚠️ Bạn chưa phát bài nào gần đây.');
                    return;
                }

                const songOrPlaylist = await getSongOrPlaylist(distube, recent.tracks[0]);

                if (songOrPlaylist instanceof Playlist && songOrPlaylist.songs.length === 0) {
                    await replyWithEmbed(message, 'error', 'Không thể phát playlist này.');
                    return;
                } else if (songOrPlaylist instanceof Song && songOrPlaylist.duration === 0) {
                    await replyWithEmbed(message, 'error', 'Không thể phát bài hát này.');
                    return;
                } else if (!songOrPlaylist) {
                    await replyWithEmbed(message, 'error', 'Không tìm thấy bài hát nào phù hợp.');
                    return;
                }

                if (!songOrPlaylist.url) {
                    await replyWithEmbed(message, 'error', 'Không thể phát bài hát hoặc playlist này.');
                    return;
                }

                let queue = distube.getQueue(message);

                if (!queue) {
                    queue = await distube.queues.create(vc, message.channel as GuildTextBasedChannel)
                }

                queue.addToQueue(songOrPlaylist instanceof Playlist ? songOrPlaylist.songs : songOrPlaylist);

                if (!queue.playing) {
                    queue.play();
                }

                await replyWithEmbed(message, 'success', '▶️ Đã phát lại bài gần nhất bạn đã nghe.');
            } catch (err) {
                console.error('Lỗi phát lại từ MongoDB:', err);
                await replyWithEmbed(message, 'error', 'Không thể truy cập lịch sử từ cơ sở dữ liệu.');
            }
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
};

export = playrecent;
