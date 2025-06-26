// src/commands/album-search.js
/* 
    Command: album-search
    Description: Searches for an album and plays the first result.
    Usage: b!album-search <album name>
    Category: music
    Aliases: ab
*/

import { Command } from '../../@types/command';
import { GuildTextBasedChannel, Message } from 'discord.js';
import ytSearch from 'yt-search';
import { DisTube, Playlist } from 'distube';
import { replyWithEmbed } from '../../utils/embedHelper';
import { setInitiator } from '../../utils/sessionStore';
import { getSongOrPlaylist } from '../../utils/getSongOrPlaylist';

const albumSearch: Command = {
  name: 'album-search',
  description: 'Tìm kếm bài hát theo album và phát bài hát đầu tiên.',
  usage: 'b!album-search <album name>',
  category: 'music',
  aliases: ['ab'],
  async execute(message: Message, args: string[], distube: DisTube) {
    try {
      const query = args.join(' ');
      if (!query) {
        await replyWithEmbed(message, 'error', 'Nhập từ khóa album (ví dụ: `album BlackPink`)');
        return;
      }

      const vc = message.member?.voice.channel;
      if (!vc) {
        await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại để phát album.');
        return;
      }

      setInitiator(message.guildId!, vc.id, message.author.id);

      let queue = distube.getQueue(message);

      if (!queue) {
        await distube.queues.create(vc, message.channel as GuildTextBasedChannel)
      }

      try {
        // Append "album" to increase likelihood of getting a playlist
        const songOrPlaylist = await getSongOrPlaylist(distube, `${query} album`);

        if (!songOrPlaylist) {
          await replyWithEmbed(message, 'warning', 'Không tìm thấy album nào phù hợp.');
          return;
        }

        queue?.addToQueue(songOrPlaylist instanceof Playlist ? songOrPlaylist.songs : songOrPlaylist);

        await replyWithEmbed(message, 'success', `🎼 Đang phát album: **${songOrPlaylist.name}**`);
      } catch (err) {
        console.error('Lỗi tìm album:', err);
        await replyWithEmbed(message, 'error', 'Không thể phát album.');
      }
    } catch (err) {
      console.error(err);
      // Do nothing
    }
  },
};

export = albumSearch;
