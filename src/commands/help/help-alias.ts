// src/commands/help-alias.ts
/*
    Command: help-alias
    Description: Hiển thị danh sách lệnh hoặc thông tin chi tiết về một lệnh theo cách ngắn gọn.
    Usage: b!help-alias [tên lệnh]
    Category: help
    Aliases: h, hal
*/

import { Command } from '../../@types/command';
import {
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ComponentType,
    ButtonInteraction,
    StringSelectMenuInteraction
} from 'discord.js';
import { replyEmbedWFooter, replyWithEmbed } from '../../utils/embedHelper';
import { loadAllCommands } from '../../utils/loadCommands';

const ITEMS_PER_PAGE = 10;

interface PageState {
    category: string;
    page: number;
    embeds: EmbedBuilder[];
}

const helpAlias: Command = {
    name: 'help-alias',
    description: 'Hiển thị danh sách lệnh hoặc thông tin chi tiết về một lệnh theo cách ngắn gọn.',
    usage: 'b!help-alias [tên lệnh]',
    category: 'help',
    aliases: ['hl', 'hal'],

    async execute(message: Message, args: string[]) {
        try {
            const commands = await loadAllCommands();

            // === Show command details if given ===
            if (args.length) {
                const name = args[0].toLowerCase();
                const cmd = commands.find(c =>
                    c.name.toLowerCase() === name ||
                    (c.aliases?.map(a => a.toLowerCase()).includes(name))
                );

                if (!cmd) {
                    await replyWithEmbed(message, 'error', `Không có lệnh tên \`${name}\`. Hãy dùng \`b!help\` để xem danh sách.`);
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`📘 Chi tiết lệnh \`${cmd.name}\``)
                    .addFields(
                        { name: '📄 Mô tả', value: cmd.description || 'Không có mô tả.' },
                        { name: '🔧 Cách dùng', value: `\`${cmd.usage || 'Không có thông tin.'}\`` },
                        {
                            name: '🧩 Alias',
                            value: cmd.aliases?.length ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'Không có',
                        }
                    )
                    .setColor(0x00bfff);

                await replyEmbedWFooter(message, embed);
                return;
            }

            // === Build category list ===
            const categories = Array.from(
                new Set(commands.map(c => c.category || 'uncategorized'))
            ).sort();
            categories.unshift('all');

            // Helper to build paginated embeds based on category
            function buildEmbedsFor(category: string): EmbedBuilder[] {
                const commandArray = [...commands.values()];
                const filtered = category === 'all'
                    ? commandArray
                    : commandArray.filter(c => c.category === category);

                const unique = filtered.filter((cmd, index, self) =>
                    self.findIndex(c => c.name === cmd.name) === index
                );

                const pages: EmbedBuilder[] = [];

                for (let i = 0; i < unique.length; i += ITEMS_PER_PAGE) {
                    const chunk = unique.slice(i, i + ITEMS_PER_PAGE);

                    const embed = new EmbedBuilder()
                        .setTitle(
                            category === 'all'
                                ? '📚 Alias của tất cả lệnh'
                                : `📚 Alias trong mục “${category}”`
                        )
                        .setDescription('Dùng `b!help-alias <tên lệnh>` để xem chi tiết.')
                        .setFooter({ text: `Trang ${pages.length + 1}` })
                        .setColor(0x00bfff);

                    let fieldLines: string[] = [];
                    let currentLength = 0;

                    for (const cmd of chunk) {
                        const aliasStr = cmd.aliases?.length
                            ? cmd.aliases.map(a => `\`${a}\``).join(', ')
                            : `\`${cmd.name}\``;

                        const line = `🔹 ${aliasStr} — ${cmd.description || 'Không có mô tả.'}`;
                        const lineLength = line.length + 1;

                        if (currentLength + lineLength > 1024) {
                            embed.addFields({
                                name: 'Alias:',
                                value: fieldLines.join('\n'),
                                inline: false,
                            });
                            fieldLines = [line];
                            currentLength = lineLength;
                        } else {
                            fieldLines.push(line);
                            currentLength += lineLength;
                        }
                    }

                    if (fieldLines.length > 0) {
                        embed.addFields({
                            name: 'Alias:',
                            value: fieldLines.join('\n'),
                            inline: false,
                        });
                    }

                    pages.push(embed);
                }

                if (pages.length === 0) {
                    pages.push(
                        new EmbedBuilder()
                            .setTitle('📚 Không có lệnh nào ở mục này')
                            .setColor(0x00bfff)
                    );
                }

                return pages;
            }

            // Initial state: “all” category
            const state: PageState = {
                category: 'all',
                page: 0,
                embeds: buildEmbedsFor('all'),
            };

            // Build select menu and nav buttons
            const categoryMenu = new StringSelectMenuBuilder()
                .setCustomId('help_category')
                .setPlaceholder('Chọn mục lệnh...')
                .addOptions(
                    categories.map(cat => ({
                        label: cat,
                        value: cat,
                        description: cat === 'all'
                            ? 'Xem tất cả alias'
                            : `Alias trong mục ${cat}`,
                    }))
                );

            const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categoryMenu);
            const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('◀️ Trước')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Tiếp ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(state.embeds.length <= 1)
            );

            const helpMessage = await replyEmbedWFooter(message, state.embeds[state.page], [row1, row2]);

            const collector = helpMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 120_000,
            });

            const menuCollector = helpMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 120_000,
            });

            menuCollector.on('collect', async (int: StringSelectMenuInteraction) => {
                if (int.customId !== 'help_category' || int.user.id !== message.author.id) return;
                await int.deferUpdate();

                state.category = int.values[0];
                state.embeds = buildEmbedsFor(state.category);
                state.page = 0;

                const [prevBtn, nextBtn] = row2.components as ButtonBuilder[];
                prevBtn.setDisabled(true);
                nextBtn.setDisabled(state.embeds.length <= 1);

                await helpMessage.edit({
                    embeds: [state.embeds[state.page]],
                    components: [row1, row2],
                });
            });

            collector.on('collect', async (int: ButtonInteraction) => {
                if (int.user.id !== message.author.id) {
                    await int.reply({ content: '❌ Bạn không thể điều khiển menu này.', ephemeral: true });
                    return;
                }
                await int.deferUpdate();

                if (int.customId === 'prev_page') {
                    state.page = Math.max(state.page - 1, 0);
                } else if (int.customId === 'next_page') {
                    state.page = Math.min(state.page + 1, state.embeds.length - 1);
                }

                const [prevBtn, nextBtn] = row2.components as ButtonBuilder[];
                prevBtn.setDisabled(state.page === 0);
                nextBtn.setDisabled(state.page === state.embeds.length - 1);

                await helpMessage.edit({
                    embeds: [state.embeds[state.page]],
                    components: [row1, row2],
                });
            });

            collector.on('end', async () => {
                const disabledRow1 = row1.setComponents(
                    row1.components.map(c => c.setDisabled(true))
                );
                const disabledRow2 = row2.setComponents(
                    row2.components.map(c => c.setDisabled(true))
                );
                await helpMessage.edit({
                    components: [disabledRow1, disabledRow2],
                });
            });
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
};

export = helpAlias;
