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
} from 'discord.js';
import { Command } from '../@types/command';
import DisTube from 'distube';

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
            await message.reply('🔇 Không có bài hát nào trong hàng đợi.');
            return;
        }

        const songs = queue.songs;
        const totalPages = Math.ceil(songs.length / PAGE_SIZE);
        let currentPage = 0;

        const renderPage = (page: number) => {
            const start = page * PAGE_SIZE;
            const pageSongs = songs.slice(start, start + PAGE_SIZE);

            const nowPlaying = songs[0];
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
                    text: `Trang ${page + 1} / ${totalPages}`,
                })
                .setTimestamp();

            if (nowPlaying.thumbnail) embed.setThumbnail(nowPlaying.thumbnail);

            const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ Trước')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Tiếp ➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages - 1)
            );

            return { embeds: [embed], components: [buttons] };
        };

        const { embeds, components } = renderPage(currentPage);
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

            if (interaction.customId === 'prev_page' && currentPage > 0) {
                currentPage--;
            } else if (
                interaction.customId === 'next_page' &&
                currentPage < totalPages - 1
            ) {
                currentPage++;
            }

            const newPage = renderPage(currentPage);
            await interaction.update(newPage);
        });

        collector.on('end', async () => {
            try {
                const disabledComponents = components.map(row => {
                    const disabledRow = ActionRowBuilder.from<ButtonBuilder>(row);
                    disabledRow.components.forEach(btn => btn.setDisabled(true));
                    return disabledRow;
                });
                await reply.edit({ components: disabledComponents });
            } catch {
                await reply.delete();
            }
        });
    },
};

export = queue;
