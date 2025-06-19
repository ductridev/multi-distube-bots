// src/commands/playleave.js
/* 
  Command: playleave
  Description: Plays a song or playlist and leaves the voice channel after the song finishes.
  Usage: b!playleave <song name or URL>
  Category: music
  Aliases: pl, pleave
*/

import { Command } from '../@types/command';
import { GuildTextBasedChannel, Message } from 'discord.js';
import { replyWithEmbed, sendWithEmbed } from '../utils/embedHelper';
import { setInitiator } from '../utils/sessionStore';
import { Events, Playlist, Song } from 'distube';
import { getPluginForUrl } from '../utils/getPluginNameForUrl';

const playleave: Command = {
  name: 'playleave',
  description: 'Phát bài hát hoặc playlist và rời khỏi kênh thoại sau khi kết thúc.',
  usage: 'b!playleave <song name or URL>',
  category: 'music',
  aliases: ['pl', 'pleave'],
  async execute(message: Message, args: string[], distube) {
    const query = args.join(' ');
    if (!query) {
      await replyWithEmbed(message, 'error', 'Vui lòng nhập bài hát hoặc URL.');
      return;
    }

    const vc = message.member?.voice.channel;
    if (!vc) {
      await replyWithEmbed(message, 'error', 'Bạn cần tham gia kênh thoại trước.');
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
          await replyWithEmbed(message, 'success', `▶️ Đang phát playlist [**${songOrPlaylist.name}**](${songOrPlaylist.url})</a> gồm ${songOrPlaylist.songs.length} bài hát.\nThời lượng phát: **${songOrPlaylist.formattedDuration}**.`);
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

      // Optional safety: auto leave after current song
      const leaveListener = (queue: any, finishedSong?: any) => {
        if (queue.url === songOrPlaylist.url && songOrPlaylist instanceof Playlist) {
          queue.voice.leave();
          sendWithEmbed(message.channel as GuildTextBasedChannel, 'success', 'Phát xong playlist, đã rời kênh thoại.');
        }

        if (finishedSong && finishedSong.url === songOrPlaylist.url && songOrPlaylist instanceof Song) {
          queue.voice.leave();
          sendWithEmbed(message.channel as GuildTextBasedChannel, 'success', 'Phát xong bài, đã rời kênh thoại.');
        }
      };

      distube.addListener(Events.FINISH, leaveListener);
      distube.addListener(Events.FINISH_SONG, leaveListener);

    } catch (e) {
      console.error('Lỗi khi phát và rời kênh:', e);
      await replyWithEmbed(message, 'error', 'Không thể phát bài hát.');
    }
  },
};

export = playleave;
