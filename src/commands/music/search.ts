// src/commands/search.js
/* 
    Command: search
    Description: Searches for a song and adds it to the queue if user selects.
    Usage: b!search <song name>
    Category: music
    Aliases: s
*/

import { Command } from '../../@types/command';
import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    GuildTextBasedChannel,
    Message,
} from 'discord.js';
import ytSearch from 'yt-search';
import { DisTube } from 'distube';
import { replyWithEmbed } from '../../utils/embedHelper';
import { setInitiator } from '../../utils/sessionStore';

const PAGE_SIZE = 20;

export const search: Command = {
    name: 'search',
    description: 'Tìm kiếm bài hát và thêm bài hát vào hàng đợi nếu người dùng chọn.',
    usage: 'b!search <tên bài hát>',
    category: 'music',
    aliases: ['s'],

    async execute(message: Message, args: string[], distube: DisTube) {
        const query = args.join(' ');
        if (!query) {
            await replyWithEmbed(message, 'error', 'Vui lòng nhập từ khóa để tìm kiếm.');
            return;
        }

        const vc = message.member?.voice.channel;
        if (!vc) {
            await replyWithEmbed(message, 'error', 'Bạn cần tham gia kênh thoại trước.');
            return;
        }

        setInitiator(message.guildId!, message.author.id);

        try {
            const searchResult = await ytSearch(query);
            const videos = searchResult.videos.slice(0, 50);

            if (!videos.length) {
                await replyWithEmbed(message, 'warning', '⚠️ Không tìm thấy kết quả nào.');
                return;
            }

            const totalPages = Math.ceil(videos.length / PAGE_SIZE);
            let currentPage = 0;

            const renderPage = () => {
                const start = currentPage * PAGE_SIZE;
                const pageVideos = videos.slice(start, start + PAGE_SIZE);

                const embed = new EmbedBuilder()
                    .setColor('#1DB954')
                    .setTitle('🔎 Kết quả tìm kiếm')
                    .setDescription(
                        pageVideos
                            .map((v, i) => `\`${start + i + 1}.\` [${v.title}](${v.url}) • ${v.timestamp} — ${v.author.name}`)
                            .join('\n')
                    )
                    .setFooter({
                        text: `Trang ${currentPage + 1}/${totalPages} • Hiển thị ${start + 1} - ${start + pageVideos.length} trong tổng ${videos.length}`,
                    })
                    .setTimestamp();

                if (pageVideos[0]?.image) embed.setThumbnail(pageVideos[0].image);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('search_select')
                    .setPlaceholder('🎵 Chọn một bài hát')
                    .addOptions(
                        pageVideos.map((video, i) => ({
                            label: `${start + i + 1}. ${video.title.slice(0, 100)}`,
                            value: video.url,
                            description: `${video.timestamp} — ${video.author.name.slice(0, 50)}`,
                        }))
                    );

                const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
                const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages - 1)
                );

                return { embeds: [embed], components: [row, nav] };
            };

            let messageData = renderPage();
            const reply = await message.reply(messageData);

            const collector = reply.createMessageComponentCollector({
                time: 45_000,
            });

            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id) {
                    await interaction.reply({
                        content: '⛔ Bạn không được phép sử dụng menu này.',
                        ephemeral: true,
                    });
                    return;
                }

                if (interaction.isStringSelectMenu()) {
                    await interaction.deferUpdate();
                    const selectedUrl = interaction.values[0];

                    try {
                        await interaction.editReply({
                            content: `✅ Đang phát bài hát bạn đã chọn.`,
                            embeds: [],
                            components: [],
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

                    distube.play(vc, selectedUrl, {
                        textChannel: message.channel as GuildTextBasedChannel,
                        member: message.member!,
                    });
                }

                if (interaction.isButton()) {
                    if (interaction.customId === 'prev_page' && currentPage > 0) {
                        currentPage--;
                    } else if (interaction.customId === 'next_page' && currentPage < totalPages - 1) {
                        currentPage++;
                    }

                    const updated = renderPage();
                    await interaction.update(updated);
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
            console.error('Lỗi search:', err);
            await replyWithEmbed(message, 'error', 'Không thể tìm kiếm bài hát.');
        }
    },
};
