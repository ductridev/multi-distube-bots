// src/commands/admin/blacklist-guild.ts
/* 
    Command: blacklist
    Description: Add or remove a guild from the blacklist.
    Usage: b!blacklist add/remove <guildId>
    Category: admin
    Aliases: bl
*/
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../@types/command';
import GuildAccess from '../../models/GuildAccess';
import { replyWithEmbed } from '../../utils/embedHelper';

const blacklist: Command = {
    name: 'blacklist',
    description: 'Thêm hoặc xóa bot ra khỏi blacklist.',
    usage: 'b!blacklist add/remove <guildId>',
    category: 'admin',
    adminOnly: true,
    aliases: ['bl'],
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Thêm hoặc gỡ guild khỏi blacklist')
        .addStringOption(opt => opt.setName('action').setDescription('add/remove').setRequired(true))
        .addStringOption(opt => opt.setName('guild').setDescription('Guild ID (tùy chọn, mặc định là guild hiện tại)')),
    execute: async (message, args, distube) => {
        if (!args[0] || !['add', 'remove'].includes(args[0])) {
            await replyWithEmbed(message, 'error', 'Usage: `blacklist add/remove <guildId>`');
            return;
        }

        const action = args[0];
        const guildId = args[1] || message.guild?.id;
        if (!guildId) {
            await replyWithEmbed(message, 'error', 'Guild ID is required.');
            return;
        }

        if (action === 'add') {
            await GuildAccess.findOneAndUpdate(
                { guildId },
                { guildId, type: 'blacklist' },
                { upsert: true }
            );
            await replyWithEmbed(message, 'success', `⛔ Guild \`${guildId}\` blacklisted.`);
        }

        if (action === 'remove') {
            await GuildAccess.deleteOne({ guildId, type: 'blacklist' });
            await replyWithEmbed(message, 'success', `✅ Guild \`${guildId}\` removed from blacklist.`);
        }
    },
    run: async (interaction: ChatInputCommandInteraction) => {
        const action = interaction.options.getString('action', true);
        const guildId = interaction.options.getString('guild') || interaction.guildId;

        if (action === 'add') {
            await GuildAccess.findOneAndUpdate({ guildId }, { guildId, type: 'blacklist' }, { upsert: true });
            await interaction.reply({ content: `⛔ Guild \`${guildId}\` blacklisted.`, ephemeral: true });
        } else {
            await GuildAccess.deleteOne({ guildId, type: 'blacklist' });
            await interaction.reply({ content: `✅ Guild \`${guildId}\` removed from blacklist.`, ephemeral: true });
        }
    },
};

export = blacklist;