// src/commands/insert.js
/* 
  Command: insert
  Description: Inserts a song into the queue at a specific position.
  Usage: b!insert <position> <song name or URL>
  Category: music
  Aliases: i, ins
*/

import { Command } from '../../@types/command';
import {
  EmbedBuilder,
  GuildTextBasedChannel,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { replyEmbedWFooter, replyWithEmbed } from '../../utils/embedHelper';
import { Playlist, Song } from 'distube';
import { setInitiator } from '../../utils/sessionStore';
import { getPluginForUrl } from '../../utils/getPluginNameForUrl';
import { getEstimatedWaitTime, getQueuePosition, getUpcomingPosition } from '../../utils/queueEstimate';
import { saveLimitedArray } from '../../utils/mongoArrayLimiter';
import { QueueSessionModel } from '../../models/QueueSession';
import { RecentTrackModel } from '../../models/RecentTrack';
import { getSongOrPlaylist } from '../../utils/getSongOrPlaylist';

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
      const songOrPlaylist = await getSongOrPlaylist(distube, query);

      if (!songOrPlaylist) {
        await replyWithEmbed(message, 'error', 'Không tìm thấy bài hát nào phù hợp.');
        return;
      }

      if (songOrPlaylist instanceof Playlist && songOrPlaylist.songs.length === 0) {
        await replyWithEmbed(message, 'error', 'Không thể phát playlist này.');
        return;
      } else if (songOrPlaylist instanceof Song && songOrPlaylist.duration === 0) {
        await replyWithEmbed(message, 'error', 'Không thể phát bài hát này.');
        return;
      }

      if (!songOrPlaylist.url) {
        await replyWithEmbed(message, 'error', 'Không thể phát bài hát hoặc playlist này.');
        return;
      }

      // Save session
      saveLimitedArray(QueueSessionModel, message.author.id, 'urls', songOrPlaylist.url);

      // Save recent track
      saveLimitedArray(RecentTrackModel, message.author.id, 'tracks', songOrPlaylist.url);

      await distube.play(vc, songOrPlaylist, { member: message.member!, textChannel: message.channel as GuildTextBasedChannel });

      let queue = distube.getQueue(message);

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

      if (songOrPlaylist instanceof Playlist) {
        if (queue && queue.songs.length === 0) {
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
          case 'shuffle':
            queue.shuffle();
            await interaction.reply({ content: '🔀 Đã xáo trộn hàng chờ.', ephemeral: true });
            break;
        }
      });
    } catch (err: any) {
      console.error('Lỗi khi chèn bài hát:', err);
      if (err instanceof Error && err.message.includes('Unsupported URL')) await replyWithEmbed(message, 'error', 'URL không hợp lệ hoặc không được hỗ trợ.');
      else await replyWithEmbed(message, 'error', 'Không thể thêm bài hát vào hàng đợi.');
    }
  },
};

export = insert;
