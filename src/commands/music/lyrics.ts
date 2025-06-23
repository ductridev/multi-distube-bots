// src/commands/music/lyrics.ts

import {
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} from 'discord.js';
import { Command } from '../../@types/command';
import DisTube from 'distube';
import { replyWithEmbed } from '../../utils/embedHelper';
import { Client } from 'genius-lyrics';

const LYRICS_PER_PAGE = 4000;

export const getLyricsSong = async (searchQuery: string) => {
    const Lyrics = new Client(process.env.GENIUS_TOKEN);
    const geniusSearch = await Lyrics.songs.search(searchQuery);

    if (geniusSearch.length === 0) {
        return undefined;
    }

    return geniusSearch[0];
}

const lyrics: Command = {
    name: 'lyrics',
    description: 'Hiển thị lời bài hát.',
    usage: 'b!lyrics <song name or URL>',
    category: 'music',
    aliases: ['ly', 'lyric'],
    execute: async (message: Message, args: string[], distube: DisTube) => {
        try {
            if (!process.env.GENIUS_TOKEN) {
                await replyWithEmbed(message, 'error', 'Lấy lời bài hát hiện không khả dụng.');
                return;
            }

            const queue = distube.getQueue(message);
            const currentSong = queue?.songs[0];

            if (!currentSong?.name) {
                await replyWithEmbed(message, 'error', 'Không có bài hát nào đang phát.');
                return;
            }

            const geniusSong = await getLyricsSong(currentSong.name);

            if (!geniusSong) {
                await replyWithEmbed(message, 'error', 'Không tìm thấy lời bài hát.');
                return;
            }

            const lyricsText = await geniusSong.lyrics();

            // 🔹 Safe splitting by line with page size control
            const lines = lyricsText.split('\n');
            const pages: string[] = [];
            let buffer = '';

            for (const line of lines) {
                const lineWithNewline = line + '\n';
                if (buffer.length + lineWithNewline.length > LYRICS_PER_PAGE) {
                    pages.push(buffer);
                    buffer = lineWithNewline;
                } else {
                    buffer += lineWithNewline;
                }
            }
            if (buffer) pages.push(buffer);

            let currentPage = 0;

            const buildEmbed = (pageIndex: number) =>
                new EmbedBuilder()
                    .setTitle(`📖 Lyrics - ${currentSong.name}`)
                    .setDescription(pages[pageIndex])
                    .setColor(0x1DB954)
                    .setFooter({ text: `Trang ${pageIndex + 1} / ${pages.length}` })
                    .setTimestamp();

            const getActionRow = (pageIndex: number) =>
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageIndex === pages.length - 1)
                );

            const reply = await message.reply({
                embeds: [buildEmbed(currentPage)],
                components: [getActionRow(currentPage)],
            });

            const collector = reply.createMessageComponentCollector({
                time: 10 * 60_000, // 10 minutes
            });

            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({
                        content: '⛔ Bạn không thể điều khiển phân trang lời bài hát này.',
                        ephemeral: true,
                    });
                }

                if (interaction.customId === 'prev') currentPage--;
                if (interaction.customId === 'next') currentPage++;

                await interaction.update({
                    embeds: [buildEmbed(currentPage)],
                    components: [getActionRow(currentPage)],
                });
            });

            collector.on('end', async () => {
                try {
                    await reply.edit({ components: [] });
                } catch {
                    console.error('Không thể cập nhật phân trang khi hết hạn.');
                    await replyWithEmbed(message, 'error', 'Không thể chuyển trang.');
                }
            });
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
};

export default lyrics;