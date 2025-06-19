// src/commands/playsingle.js
/* 
    Command: playsingle
    Description: Plays a single song from a playlist if specified else plays the first song.
    Usage: b!playsingle <playlist URL>
    Category: music
    Aliases: psi, psingle
*/

import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    Message,
    GuildTextBasedChannel,
} from 'discord.js';
import { Playlist } from 'distube';
import { Command } from '../@types/command';
import { replyWithEmbed } from '../utils/embedHelper';
import { setInitiator } from '../utils/sessionStore';

const PAGE_SIZE = 20;

const playsingle: Command = {
    name: 'playsingle',
    description: 'Phát bài hát trong playlist nếu có bài hát được chỉ định (mặc định phát bài hát đầu tiên).',
    usage: 'b!playsingle <playlist URL>',
    category: 'music',
    aliases: ['psi', 'psingle'],
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
                await replyWithEmbed(message, 'warning', '⚠️ Không tìm thấy playlist hoặc không có bài.');
                return;
            }

            const totalPages = Math.ceil(playlist.songs.length / PAGE_SIZE);
            let currentPage = 0;

            const renderPage = (page: number) => {
                const start = page * PAGE_SIZE;
                const songs = playlist.songs.slice(start, start + PAGE_SIZE);

                const options = songs.map((song, i) => ({
                    label: song.name?.slice(0, 100) || 'Không tên',
                    description: song.formattedDuration,
                    value: String(start + i),
                }));

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

                const list = songs.map(
                    (song, i) => `\`${start + i + 1}.\` ${song.name} (${song.formattedDuration})`
                ).join('\n');

                const content = `📄 **Trang ${page + 1}/${totalPages} - ${playlist.name || 'Không tên'}**\n${list}`;

                return { content, components: [row, buttons] };
            };

            let { content, components } = renderPage(currentPage);
            const reply = await message.reply({ content, components });

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
                    const selected = playlist.songs[index];

                    if (!selected.url) {
                        await interaction.reply({ content: '⛔ Bài hát không có link.', ephemeral: true });
                        return;
                    }

                    await distube.play(vc, selected.url, {
                        member: message.member!,
                        textChannel: message.channel as GuildTextBasedChannel,
                    });

                    await interaction.update({
                        content: `✅ Đang phát: **${selected.name}**`,
                        components: [],
                    });

                    collector.stop(); // Stop listening
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
            console.error('Lỗi playsingle:', err);
            await replyWithEmbed(message, 'error', 'Không thể phát bài đầu tiên từ playlist.');
        }
    },
};

export = playsingle;