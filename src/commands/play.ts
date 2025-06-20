// src/commands/play.js
/* 
  Command: play
  Description: Plays a song or adds it to the queue.
  Usage: b!play <song name or URL>
  Category: music
  Aliases: p
*/

import { Playlist } from 'distube';
import { Command } from '../@types/command';
import { GuildTextBasedChannel, Message } from 'discord.js';
import { replyWithEmbed } from '../utils/embedHelper';
import { setInitiator } from '../utils/sessionStore';
import { getPluginForUrl } from '../utils/getPluginNameForUrl';

const play: Command = {
  name: 'play',
  description: 'Phát bài hát hoặc thêm bài hát vào hàng đợi.',
  usage: 'b!play <song name or URL>',
  category: 'music',
  aliases: ['p'],
  async execute(message: Message, args: string[], distube) {
    const query = args.join(' ');
    if (!query) {
      await replyWithEmbed(message, 'error', 'Vui lòng nhập tên bài hát hoặc đường dẫn URL.');
      return;
    }

    const vc = message.member?.voice.channel;
    if (!vc) {
      await replyWithEmbed(message, 'error', 'Bạn cần tham gia một kênh thoại trước.');
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
          await replyWithEmbed(message, 'success', `▶️ Đang phát playlist [**${songOrPlaylist.name}**](${songOrPlaylist.url}) gồm ${songOrPlaylist.songs.length} bài hát.\nThời lượng phát: **${songOrPlaylist.formattedDuration}**.`);
        } else {
          await replyWithEmbed(message, 'success', `▶️ Đã thêm playlist [**${songOrPlaylist.name}**](${songOrPlaylist.url}) gồm ${songOrPlaylist.songs.length} bài hát vào danh sách phát.\nThời lượng phát: **${songOrPlaylist.formattedDuration}**.`);
        }
      } else {
        if (!queue || queue.songs.length === 0) {
          await replyWithEmbed(message, 'success', `▶️ Đang phát bài hát [**${songOrPlaylist.name}**](${songOrPlaylist.url}).\nThời lượng phát: **${songOrPlaylist.formattedDuration}**.`);
        } else {
          await replyWithEmbed(message, 'success', `▶️ Đã thêm bài [**${songOrPlaylist.name}**](${songOrPlaylist.url}) vào danh sách phát.\nThời lượng phát: **${songOrPlaylist.formattedDuration}**.`);
        }
      }
    } catch (err) {
      console.error('Lỗi khi phát nhạc:', err);
      if (err instanceof Error && err.message.includes('Unsupported URL')) await replyWithEmbed(message, 'error', 'URL không hợp lệ hoặc không được hỗ trợ.');
      else await replyWithEmbed(message, 'error', 'Không thể phát bài hát.');
    }
  },
};

export = play;
