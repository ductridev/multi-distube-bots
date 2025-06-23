// src/commands/playlist-search.js
/* 
    Command: playlist-search
    Description: Searches for a playlist and plays the first result.
    Usage: b!playlist-search <playlist name>
    Category: music
    Aliases: pls, pl-search, plsearch, playlistsearch
*/

import { Playlist } from 'distube';
import { Command } from '../../@types/command';
import { GuildTextBasedChannel, Message } from 'discord.js';
import { replyWithEmbed } from '../../utils/embedHelper';
import { setInitiator } from '../../utils/sessionStore';
import { getPluginForUrl } from '../../utils/getPluginNameForUrl';
import { getSongOrPlaylist } from '../../utils/getSongOrPlaylist';

const playlistSearch: Command = {
    name: 'playlist-search',
    description: 'Tìm kếm playlist và phát playlist đầu tiên.',
    usage: 'b!playlist-search <playlist name>',
    category: 'music',
    aliases: ['pls', 'pl-search', 'plsearch', 'playlistsearch'],
    async execute(message: Message, args: string[], distube) {
        try {
            const query = args.join(' ');
            if (!query) {
                await replyWithEmbed(message, 'error', 'Vui lòng nhập từ khóa để tìm playlist.');
                return;
            }

            const vc = message.member?.voice.channel;
            if (!vc) {
                await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
                return;
            }

            setInitiator(message.guildId!, message.author.id);

            try {
                const playlist = await getSongOrPlaylist(distube, query) as Playlist;

                if (!playlist || playlist.songs.length === 0) {
                    await replyWithEmbed(message, 'warning', '⚠️ Không tìm thấy playlist nào phù hợp.');
                    return;
                }

                await distube.play(vc, playlist, {
                    member: message.member!,
                    textChannel: message.channel as GuildTextBasedChannel,
                });

                await replyWithEmbed(message, 'success', `📀 Đang phát playlist: **${playlist.name}**`);
            } catch (err) {
                console.error('playlist-search lỗi:', err);
                await replyWithEmbed(message, 'error', 'Không thể phát playlist.');
            }
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
};

export = playlistSearch;
