// src/commands/playleave.js
/* 
  Command: playleave
  Description: Plays a song or playlist and leaves the voice channel after the song finishes.
  Usage: b!playleave <song name or URL>
  Category: music
  Aliases: pl, pleave
*/

import { Command } from '../@types/command';
import {
  EmbedBuilder,
  GuildTextBasedChannel,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { replyEmbedWFooter, replyWithEmbed, sendWithEmbed } from '../utils/embedHelper';
import { setInitiator } from '../utils/sessionStore';
import { Events, Playlist, Song } from 'distube';
import { getPluginForUrl } from '../utils/getPluginNameForUrl';
import { getEstimatedWaitTime, getQueuePosition, getUpcomingPosition } from '../utils/queueEstimate';

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

      const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('pause')
          .setLabel('⏯ Pause')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('skip')
          .setLabel('⏭ Skip')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('stop')
          .setLabel('⏹ Stop')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('loop')
          .setLabel('🔁 Loop')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('shuffle')
          .setLabel('🔀 Shuffle')
          .setStyle(ButtonStyle.Primary),
      );

      const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .addFields(
          {
            name: '📌 Danh sách phát',
            value: `[${songOrPlaylist.name}](${songOrPlaylist.url})`,
          },
          {
            name: '📊 Độ dài danh sách phát',
            value: songOrPlaylist.formattedDuration,
            inline: true,
          },
          {
            name: '🎵 Danh sách',
            value: songOrPlaylist instanceof Playlist ? `${songOrPlaylist.songs.length}` : `1`,
            inline: true,
          },
          {
            name: '⏳ Thời gian ước tính cho đến khi phát',
            value: getEstimatedWaitTime(queue),
            inline: false,
          },
          {
            name: '📍 Số bài hát còn lại tới khi phát',
            value: getUpcomingPosition(queue),
            inline: true,
          },
          {
            name: '📦 Vị trí trong hàng chờ',
            value: getQueuePosition(queue),
            inline: true,
          },
        );

      if (songOrPlaylist instanceof Playlist) {
        if (!queue || queue.songs.length === 0) {
          embed.setTitle('🎶 Đang phát playlist');
          embed.setThumbnail(songOrPlaylist.songs[0]?.thumbnail || '');
        } else {
          embed.setTitle('🎶 Đã thêm playlist');
          embed.setThumbnail(songOrPlaylist.songs[0]?.thumbnail || '');
        }
      } else {
        if (!queue || queue.songs.length === 0) {
          embed.setTitle('🎶 Đang phát bài hát');
          embed.setThumbnail(songOrPlaylist.thumbnail || '');
        } else {
          embed.setTitle('🎶 Đã thêm bài hát');
          embed.setThumbnail(songOrPlaylist?.thumbnail || '');
        }
      }

      const reply = await replyEmbedWFooter(message, embed, controlRow);
      const collector = reply.createMessageComponentCollector({
        time: 60_000 * 5, // 5 minutes
      });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: '⛔ Bạn không thể điều khiển nhạc này.',
            ephemeral: true,
          });
        }

        const queue = distube.getQueue(message);
        if (!queue) return interaction.reply({ content: '🚫 Không có nhạc đang phát.', ephemeral: true });

        switch (interaction.customId) {
          case 'pause':
            if (queue.paused) {
              queue.resume();
              await interaction.reply({ content: '▶️ Đã tiếp tục phát.', ephemeral: true });
            } else {
              queue.pause();
              await interaction.reply({ content: '⏸ Đã tạm dừng phát.', ephemeral: true });
            }
            break;

          case 'skip':
            queue.skip();
            await interaction.reply({ content: '⏭ Đã chuyển bài.', ephemeral: true });
            break;

          case 'stop':
            queue.stop();
            await interaction.reply({ content: '🛑 Đã dừng phát nhạc.', ephemeral: true });
            break;

          case 'loop':
            const mode = queue.repeatMode === 0 ? 1 : 0;
            queue.setRepeatMode(mode);
            await interaction.reply({
              content: mode ? '🔁 Đã bật lặp lại bài hát.' : '➡️ Đã tắt lặp lại.',
              ephemeral: true,
            });
            break;
        }
      });

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
