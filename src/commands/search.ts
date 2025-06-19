// src/commands/search.js
/* 
    Command: search
    Description: Searches for a song and adds it to the queue if user selects.
    Usage: b!search <song name>
    Category: music
    Aliases: s
*/

import { Command } from '../@types/command';
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
import { replyWithEmbed } from '../utils/embedHelper';
import { setInitiator } from '../utils/sessionStore';

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

        await setInitiator(message.guildId!, message.author.id);

        try {

            // Perform search with more results for pagination (up to 50)
            const searchResult = await ytSearch(query);
            const videos = searchResult.videos.slice(0, 50);

            if (!videos.length) {
                await replyWithEmbed(message, 'warning', '⚠️ Không tìm thấy kết quả nào.');
                return;
            }

            const totalPages = Math.ceil(videos.length / PAGE_SIZE);
            let currentPage = 0;

            const renderPage = (page: number) => {
                const start = page * PAGE_SIZE;
                const pageVideos = videos.slice(start, start + PAGE_SIZE);

                const embed = new EmbedBuilder()
                    .setTitle(`🔎 Kết quả tìm kiếm - Trang ${page + 1}/${totalPages}`)
                    .setDescription('Vui lòng chọn một bài hát từ danh sách bên dưới:')
                    .setColor('Blue')
                    .setFooter({ text: `Hiển thị kết quả từ ${start + 1} đến ${start + pageVideos.length} trên tổng số ${videos.length}` });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('search_select')
                    .setPlaceholder('Chọn một bài hát')
                    .addOptions(
                        pageVideos.map((video, i) => ({
                            label: `${start + i + 1}. ${video.title.slice(0, 100)}`,
                            value: video.url,
                            description: video.author.name.slice(0, 50),
                        }))
                    );

                const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

                const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('⬅️ Trang trước')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Trang tiếp ➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages - 1)
                );

                return { embeds: [embed], components: [selectRow, buttonRow] };
            };

            let replyData = renderPage(currentPage);
            const sentMessage = await message.reply(replyData);

            const collector = sentMessage.createMessageComponentCollector({
                time: 45_000,
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    await interaction.reply({ content: '⛔ Bạn không được phép sử dụng menu này.', ephemeral: true });
                    return;
                }

                if (interaction.isStringSelectMenu()) {
                    await interaction.deferUpdate();
                    const selectedUrl = interaction.values[0];

                    await distube.play(vc, selectedUrl, {
                        textChannel: message.channel as GuildTextBasedChannel,
                        member: message.member!,
                    });

                    await interaction.editReply({ components: [], content: `✅ Đang phát bài hát bạn đã chọn.` });
                    collector.stop();
                }

                if (interaction.isButton()) {
                    if (interaction.customId === 'prev_page' && currentPage > 0) {
                        currentPage--;
                    } else if (interaction.customId === 'next_page' && currentPage < totalPages - 1) {
                        currentPage++;
                    }
                    const updatedData = renderPage(currentPage);
                    await interaction.update(updatedData);
                }
            });

            collector.on('end', async () => {
                try {
                    await sentMessage.edit({ components: [] });
                } catch {
                    await sentMessage.delete();
                }
            });
        } catch (err) {
            console.error('Lỗi playselect:', err);
            await replyWithEmbed(message, 'error', 'Không thể chọn bài từ playlist.');
        }
    },
};
