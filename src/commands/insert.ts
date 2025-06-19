// src/commands/insert.js
/* 
  Command: insert
  Description: Inserts a song into the queue at a specific position.
  Usage: b!insert <position> <song name or URL>
  Category: music
  Aliases: i, ins
*/

import { Command } from '../@types/command';
import { GuildTextBasedChannel, Message } from 'discord.js';
import { replyWithEmbed } from '../utils/embedHelper';
import { Playlist } from 'distube';
import { setInitiator } from '../utils/sessionStore';
import { getPluginForUrl } from '../utils/getPluginNameForUrl';

const insert: Command = {
  name: 'insert',
  description: 'Thêm bài hát vào hàng đợi tại một vị trí cụ thể.',
  usage: 'b!insert <position> <song name or URL>',
  category: 'music',
  aliases: ['i', 'ins'],
  async execute(message: Message, args: string[], distube) {
    const query = args.join(' ');
    if (!query) {
      await replyWithEmbed(message, 'error', 'Vui lòng nhập tên bài hát hoặc URL.');
      return;
    }

    const vc = message.member?.voice.channel;
    if (!vc) {
      await replyWithEmbed(message, 'error', 'Bạn cần tham gia một kênh thoại.');
      return;
    }

    setInitiator(message.guildId!, message.author.id);

    try {
      const plugin = await getPluginForUrl(distube, query);
      const songOrPlaylist = await plugin.resolve(query, {});

      let queue = distube.getQueue(message);

      distube.play(vc, songOrPlaylist, { member: message.member!, textChannel: message.channel as GuildTextBasedChannel });

      if (songOrPlaylist instanceof Playlist) {
        if (!queue || queue.songs.length === 0) {
          replyWithEmbed(message, 'success', `▶️ Đang phát playlist [**${songOrPlaylist.name}**](${songOrPlaylist.url}) gồm ${songOrPlaylist.songs.length} bài hát.\nThời lượng phát: **${songOrPlaylist.formattedDuration}**.`);
        } else {
          replyWithEmbed(message, 'success', `▶️ Đã thêm playlist [**${songOrPlaylist.name}**](${songOrPlaylist.url}) gồm ${songOrPlaylist.songs.length} bài hát vào danh sách phát.\nThời lượng phát: **${songOrPlaylist.formattedDuration}**.\nThời gian dự kiến sẽ phát: **${songOrPlaylist.formattedDuration}**.`);
        }
      } else {
        if (!queue || queue.songs.length === 0) {
          replyWithEmbed(message, 'success', `▶️ Đang phát bài hát [**${songOrPlaylist.name}**](${songOrPlaylist.url}).\nThời lượng phát: **${songOrPlaylist.formattedDuration}**.`);
        } else {
          replyWithEmbed(message, 'success', `▶️ Đã thêm bài [**${songOrPlaylist.name}**](${songOrPlaylist.url}) vào danh sách phát.\nThời lượng phát: **${songOrPlaylist.formattedDuration}**.\nThời gian dự kiến sẽ phát: **${songOrPlaylist.formattedDuration}**.`);
        }
      }
    } catch (err: any) {
      console.error('Lỗi khi chèn bài hát:', err);
      if (err instanceof Error && err.message.includes('Unsupported URL')) await replyWithEmbed(message, 'error', 'URL không hợp lệ hoặc không được hỗ trợ.');
      else await replyWithEmbed(message, 'error', 'Không thể thêm bài hát vào hàng đợi.');
    }
  },
};

export = insert;
