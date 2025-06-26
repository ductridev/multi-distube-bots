// src/commands/admin/whitelist-guild.ts
/*
    Command: whitelist
    Description: Add or remove a guild from the whitelist.
    Usage: b!whitelist add/remove <guildId>
    Category: admin
    Aliases: wl
*/
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../@types/command';
import GuildAccess from '../../models/GuildAccess';
import { replyWithEmbed } from '../../utils/embedHelper';

const whitelist: Command = {
    name: 'whitelist',
    description: 'Thêm hoặc xóa bot ra khỏi whitelist.',
    usage: 'b!whitelist add/remove <guildId>',
    category: 'admin',
    adminOnly: true,
    aliases: [],
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Thêm hoặc gỡ guild khỏi whitelist')
        .addStringOption(opt => opt.setName('action').setDescription('add/remove').setRequired(true))
        .addStringOption(opt => opt.setName('guild').setDescription('Guild ID (tùy chọn, mặc định là guild hiện tại)')),
    execute: async (message, args, distube) => {
        if (!args[0] || !['add', 'remove'].includes(args[0])) {
            await replyWithEmbed(message, 'error', 'Usage: `whitelist add/remove <guildId>`');
            return
        }

        const action = args[0];
        const guildId = args[1] || message.guild?.id;
        if (!guildId) {
            await replyWithEmbed(message, 'error', 'Guild ID is required.');
            return
        }

        if (action === 'add') {
            await GuildAccess.findOneAndUpdate(
                { guildId },
                { guildId, type: 'whitelist' },
                { upsert: true }
            );
            await replyWithEmbed(message, 'success', `✅ Guild \`${guildId}\` whitelisted.`);
            return
        }

        if (action === 'remove') {
            await GuildAccess.deleteOne({ guildId, type: 'whitelist' });
            await replyWithEmbed(message, 'success', `⛔ Guild \`${guildId}\` removed from whitelist.`);
        }
    },
    run: async (interaction: ChatInputCommandInteraction) => {
        const action = interaction.options.getString('action', true);
        const guildId = interaction.options.getString('guild') || interaction.guildId;

        if (action === 'add') {
            await GuildAccess.findOneAndUpdate({ guildId }, { guildId, type: 'whitelist' }, { upsert: true });
            await interaction.reply({ content: `✅ Guild \`${guildId}\` whitelisted.`, ephemeral: true });
        } else {
            await GuildAccess.deleteOne({ guildId, type: 'whitelist' });
            await interaction.reply({ content: `⛔ Guild \`${guildId}\` removed from whitelist.`, ephemeral: true });
        }
    },
};

export = whitelist;