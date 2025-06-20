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
  EmbedBuilder,
} from 'discord.js';
import { replyEmbedWFooter, replyWithEmbed } from '../utils/embedHelper';
import { setInitiator } from '../utils/sessionStore';
import { getPluginForUrl } from '../utils/getPluginNameForUrl';

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

    setInitiator(message.guildId!, message.author.id);

    try {
      const plugin = await getPluginForUrl(distube, url);
      const playlist = await plugin.resolve(url, {}) as Playlist<any>;

      if (playlist instanceof Playlist) {
        if (!playlist || playlist.songs.length === 0) {
          await replyWithEmbed(message, 'warning', 'Không tìm thấy playlist hoặc không có bài.');
          return;
        }
      } else {
        await replyWithEmbed(message, 'warning', 'Đường dẫn không hợp lệ hoặc không phải playlist.');
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
          .map((song, i) => `\`${start + i + 1}.\` [${song.name}](${song.url}) • ${song.formattedDuration}`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor('#1DB954')
          .setTitle(`📚 Playlist: ${playlist.name || 'Không tên'}`)
          .setDescription(list || '*Không có bài hát.*')
          .setFooter({ text: `Trang ${page + 1} / ${totalPages}` })
          .setTimestamp();

        const thumbnail = songs[0]?.thumbnail || playlist.songs[0]?.thumbnail;
        if (thumbnail) embed.setThumbnail(thumbnail);

        return { embed, components: [row, buttons] };
      };

      let { embed, components } = renderPage(currentPage);
      const reply = await replyEmbedWFooter(message, embed, components);

      const collector = reply.createMessageComponentCollector({
        time: 60_000,
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

          try {
            await interaction.update({
              content: `✅ Đang phát: **${selectedSong.name}**`,
              components: [],
              embeds: [],
            });

            collector.stop();
          } catch (err) {
            console.error('❌ Interaction update failed:', err);
            if (!interaction.replied && !interaction.deferred) {
              await replyWithEmbed(message, 'error',
                '⛔ Quá hạn phản hồi hoặc lỗi xảy ra khi phát bài hát.',
              );
            }

            return;
          }

          distube.play(vc, selectedSong.url, {
            member: message.member!,
            textChannel: message.channel as GuildTextBasedChannel,
          });
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
          const disabledComponents = components.map(row => {
            const newRow = new ActionRowBuilder();

            for (const component of row.components) {
              if (component instanceof ButtonBuilder) {
                newRow.addComponents(ButtonBuilder.from(component).setDisabled(true));
              } else if (component instanceof StringSelectMenuBuilder) {
                newRow.addComponents(StringSelectMenuBuilder.from(component).setDisabled(true));
              }
            }

            return newRow.toJSON();
          });

          await reply.edit({ components: disabledComponents });
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
