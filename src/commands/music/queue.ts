// src/commands/queue.ts
/* 
    Command: queue
    Description: Displays the queue.
    Usage: b!queue
    Category: music
    Aliases: q
*/

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    Message,
    StringSelectMenuBuilder,
} from 'discord.js';
import { Command } from '../../@types/command';
import DisTube from 'distube';
import { replyWithEmbed } from '../../utils/embedHelper';

const PAGE_SIZE = 10;

const queue: Command = {
    name: 'queue',
    description: 'Xem danh sách bài hát trong hàng đợi.',
    usage: 'b!queue',
    category: 'music',
    aliases: ['q'],

    execute: async (message: Message, args: string[], distube: DisTube) => {
        const queue = distube.getQueue(message);
        if (!queue || !queue.songs.length) {
            await replyWithEmbed(message, 'info', '🔇 Không có bài hát nào trong hàng đợi.');
            return;
        }

        const songs = queue.songs.slice(1);
        const nowPlaying = queue.songs[0];
        const totalPages = Math.ceil(songs.length / PAGE_SIZE);

        let currentPage = 0;

        const buildDropdownRow = () => {
            const start = currentPage * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            const dropdownSongs = songs.slice(start, end);

            const options = dropdownSongs.map((song, i) => ({
                label: `${start + i + 1}. ${song.name}`.slice(0, 100),
                description: song.formattedDuration,
                value: String(start + i + 1),
            }));

            return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('jump_to_song')
                    .setPlaceholder('🔎 Chọn bài để chuyển đến')
                    .addOptions(options)
            );
        };

        const renderPage = () => {
            const start = currentPage * PAGE_SIZE;
            const pageSongs = songs.slice(start, start + PAGE_SIZE);

            const upcoming = pageSongs
                .map(
                    (s, i) =>
                        `\`${start + i + 1}.\` [${s.name}](${s.url}) • ${s.formattedDuration}`
                )
                .join('\n');

            const embed = new EmbedBuilder()
                .setColor('#1DB954')
                .setTitle('🎶 Hàng Đợi Phát Nhạc')
                .setDescription(upcoming || '*Không có bài tiếp theo.*')
                .addFields({
                    name: '▶️ Đang phát',
                    value: `[${nowPlaying.name}](${nowPlaying.url}) • ${nowPlaying.formattedDuration}`,
                })
                .setFooter({
                    text: `Trang nhạc ${currentPage + 1}/${totalPages}`,
                })
                .setTimestamp();

            if (nowPlaying.thumbnail) embed.setThumbnail(nowPlaying.thumbnail);

            const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ Trước')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Tiếp ➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === totalPages - 1)
            );

            const dropdownRow = buildDropdownRow();

            return {
                embeds: [embed],
                components: [dropdownRow, buttonRow],
            };
        };

        const { embeds, components } = renderPage();
        const reply = await message.reply({ embeds, components });

        const collector = reply.createMessageComponentCollector({
            time: 60_000,
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                await interaction.reply({
                    content: '⛔ Bạn không thể điều khiển hàng đợi này.',
                    ephemeral: true,
                });
                return;
            }

            if (interaction.isButton()) {
                if (interaction.customId === 'prev_page' && currentPage > 0) {
                    currentPage--;
                } else if (interaction.customId === 'next_page' && currentPage < totalPages - 1) {
                    currentPage++;
                }

                await interaction.update(renderPage());
            }

            if (interaction.isStringSelectMenu() && interaction.customId === 'jump_to_song') {
                const index = parseInt(interaction.values[0]);
                try {
                    await queue.jump(index);
                    await interaction.reply({
                        content: `⏩ Đã chuyển đến bài thứ ${index}: **${songs[index - 1].name}**`,
                        ephemeral: true,
                    });
                } catch {
                    await interaction.reply({
                        content: `⚠️ Không thể chuyển đến bài số ${index}.`,
                        ephemeral: true,
                    });
                }
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
            } catch (err) {
                console.warn('⚠️ Could not disable components:', err);
                try {
                    await reply.delete();
                } catch (_) { }
            }
        });
    },
};

export = queue;
