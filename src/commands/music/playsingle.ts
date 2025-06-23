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
    EmbedBuilder,
} from 'discord.js';
import { Playlist } from 'distube';
import { Command } from '../../@types/command';
import { replyEmbedWFooter, replyWithEmbed } from '../../utils/embedHelper';
import { setInitiator } from '../../utils/sessionStore';
import { getPluginForUrl } from '../../utils/getPluginNameForUrl';
import { getSongOrPlaylist } from '../../utils/getSongOrPlaylist';

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

        setInitiator(message.guildId!, message.author.id);

        try {
            const playlist = await getSongOrPlaylist(distube, url) as Playlist;

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

            const renderPage = () => {
                const start = currentPage * PAGE_SIZE;
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
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages - 1),
                );

                const list = songs
                    .map((song, i) => `\`${start + i + 1}.\` [${song.name}](${song.url}) • ${song.formattedDuration}`)
                    .join('\n');

                const embed = new EmbedBuilder()
                    .setColor('#1DB954')
                    .setTitle(`🎵 Playlist: ${playlist.name || 'Không tên'}`)
                    .setDescription(list || '*Không có bài hát nào.*')
                    .setFooter({ text: `Trang ${currentPage + 1} / ${totalPages}` })
                    .setTimestamp();

                const thumb = songs[0]?.thumbnail || playlist.songs[0]?.thumbnail;
                if (thumb) embed.setThumbnail(thumb);

                return { embed, components: [row, buttons] };
            };

            let { embed, components } = renderPage();
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
                    const selected = playlist.songs[index];

                    if (!selected.url) {
                        await interaction.reply({ content: '⛔ Bài hát không có link.', ephemeral: true });
                        return;
                    }

                    try {
                        await interaction.update({
                            content: `✅ Đang phát: **${selected.name}**`,
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

                    await distube.play(vc, selected.url, {
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

                    const updateData = renderPage();
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
                } catch (err) {
                    console.warn('⚠️ Could not disable components:', err);
                    try {
                        await reply.delete();
                    } catch (_) { }
                }
            });

        } catch (err) {
            if (err instanceof Error && err.message.includes('Private video.')) {
                await replyWithEmbed(message, 'error', 'Danh sách phát hoặc bài hát nằm trong danh sách phát ở trong trạng thái riêng tư.');
                return;
            }
            console.error('Lỗi playsingle:', err);
            await replyWithEmbed(message, 'error', 'Không thể phát bài đầu tiên từ playlist.');
        }
    },
};

export = playsingle;
