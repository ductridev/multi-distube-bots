// src/commands/playselect.js
/* 
    Command: playselect
    Description: Selects and plays a song from a playlist.
    Usage: b!playselect <playlist URL>
    Category: music
    Aliases: pse, pselect
*/
import { Playlist, Song } from 'distube';
import { Command } from '../@types/command';
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  GuildTextBasedChannel,
} from 'discord.js';
import { replyWithEmbed } from '../utils/embedHelper';
import { setInitiator } from '../utils/sessionStore';

const PAGE_SIZE = 20;

const playselect: Command = {
  name: 'playselect',
  description: 'Lựa chọn và phát 1 bài hát trong playlist.',
  usage: 'b!playselect <playlist URL>',
  category: 'music',
  aliases: ['pse', 'pselect'],

  async execute(message: Message, args: string[], distube) {
    const url = args[0];
    if (!url) {
      await replyWithEmbed(message, 'error', 'Vui lòng nhập URL playlist.');
      return;
    }

    const vc = message.member?.voice.channel;
    if (!vc) {
      await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
      return;
    }

    await setInitiator(message.guildId!, message.author.id);

    try {
      const extractorPlugin = distube.plugins[0];
      const playlist = await extractorPlugin.resolve(url, {}) as Playlist<any>;

      if (!playlist || playlist.songs.length === 0) {
        await replyWithEmbed(message, 'warning', 'Playlist không hợp lệ hoặc không có bài.');
        return;
      }

      const totalPages = Math.ceil(playlist.songs.length / PAGE_SIZE);
      let currentPage = 0;

      const renderPage = (page: number) => {
        const start = page * PAGE_SIZE;
        const songs = playlist.songs.slice(start, start + PAGE_SIZE);

        const options = songs.map((song, i) => {
          const s = song as Song<any>;
          return {
            label: s.name?.slice(0, 100) ?? 'Unknown Song',
            description: s.formattedDuration,
            value: String(start + i),
          };
        });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_song')
          .setPlaceholder('🎵 Chọn một bài hát để phát')
          .addOptions(options);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages - 1),
        );

        const list = songs
          .map((song, i) => `\`${start + i + 1}.\` ${song.name} (${song.formattedDuration})`)
          .join('\n');

        const content = `🎶 **Playlist:** *${playlist.name || 'Không tên'}*\n📄 **Trang ${page + 1}/${totalPages}**\n${list}`;

        return { content, components: [row, buttons] };
      };

      let { content, components } = renderPage(currentPage);
      const reply = await message.reply({ content, components });

      const collector = reply.createMessageComponentCollector({
        time: 30_000,
      });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          await interaction.reply({ content: '⛔ Bạn không được phép sử dụng menu này.', ephemeral: true });
          return;
        }

        if (interaction.isStringSelectMenu()) {
          const index = parseInt(interaction.values[0]);
          const selectedSong = playlist.songs[index] as Song<any>;

          if (!selectedSong.url) {
            await interaction.update({ content: '❌ Không thể phát bài hát.', components: [] });
            return;
          }

          await distube.play(vc, selectedSong.url, {
            member: message.member!,
            textChannel: message.channel as GuildTextBasedChannel,
          });

          await interaction.update({
            content: `✅ Đang phát: **${selectedSong.name}**`,
            components: [],
          });

          collector.stop();
        }

        if (interaction.isButton()) {
          if (interaction.customId === 'prev_page' && currentPage > 0) {
            currentPage--;
          } else if (interaction.customId === 'next_page' && currentPage < totalPages - 1) {
            currentPage++;
          }

          const updateData = renderPage(currentPage);
          await interaction.update(updateData);
        }
      });

      collector.on('end', async () => {
        try {
          await reply.edit({ components: [] });
        } catch {
          await reply.delete();
        }
      });

    } catch (err) {
      console.error('Lỗi playselect:', err);
      await replyWithEmbed(message, 'error', 'Không thể chọn bài từ playlist.');
    }
  },
};

export = playselect;
