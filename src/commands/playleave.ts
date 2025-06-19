// src/commands/playleave.js
/* 
  Command: playleave
  Description: Plays a song and leaves the voice channel after the song finishes.
  Usage: b!playleave <song name or URL>
  Category: music
  Aliases: pl, pleave
*/

import { Command } from '../@types/command';
import { GuildTextBasedChannel, Message } from 'discord.js';
import { replyWithEmbed } from '../utils/embedHelper';
import { setInitiator } from '../utils/sessionStore';

const playleave: Command = {
  name: 'playleave',
  description: 'Phát bài hát và rời khỏi kênh thoại sau khi bài hát kết thúc.',
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

    await setInitiator(message.guildId!, message.author.id);

    try {
      await distube.play(vc, query, {
        member: message.member!,
        textChannel: message.channel as GuildTextBasedChannel,
      });

      const queue = distube.getQueue(message);
      if (!queue) {
        await replyWithEmbed(message, 'error', 'Không thể phát bài hát.');
        return;
      }

      const song = queue.songs[0];

      // Optional safety: auto leave after current song
      const leaveListener = (queue: any, finishedSong: any) => {
        if (finishedSong.url === song.url) {
          queue.voice.leave();
          (message.channel as GuildTextBasedChannel).send('✅ Phát xong bài, đã rời kênh thoại.');
        }
      };

    } catch (e) {
      console.error('Lỗi khi phát và rời kênh:', e);
      await replyWithEmbed(message, 'error', 'Không thể phát bài hát.');
    }
  },
};

export = playleave;
