// src/commands/album-search.js
/* 
    Command: album-search
    Description: Searches for an album and plays the first result.
    Usage: b!album-search <album name>
    Category: music
    Aliases: ab
*/

import { Command } from '../@types/command';
import { GuildTextBasedChannel, Message } from 'discord.js';
import ytSearch from 'yt-search';
import { DisTube } from 'distube';
import { replyWithEmbed } from '../utils/embedHelper';
import { setInitiator } from '../utils/sessionStore';

const albumSearch: Command = {
  name: 'album-search',
  description: 'Tìm kếm bài hát theo album và phát bài hát đầu tiên.',
  usage: 'b!album-search <album name>',
  category: 'music',
  aliases: ['ab'],
  async execute(message: Message, args: string[], distube: DisTube) {
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

    await setInitiator(message.guildId!, message.author.id);

    try {
      // Append "album" to increase likelihood of getting a playlist
      const result = await ytSearch(`${query} album`);
      const playlist = result.playlists[0];

      if (!playlist) {
        await replyWithEmbed(message, 'warning', 'Không tìm thấy album nào phù hợp.');
        return;
      }

      await distube.play(vc, playlist.url, {
        member: message.member!,
        textChannel: message.channel as GuildTextBasedChannel,
      });

      await replyWithEmbed(message, 'success', `🎼 Đang phát album: **${playlist.title}**`);
    } catch (err) {
      console.error('Lỗi tìm album:', err);
      await replyWithEmbed(message, 'error', 'Không thể phát album.');
    }
  },
};

export = albumSearch;
