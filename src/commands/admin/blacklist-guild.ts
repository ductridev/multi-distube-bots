// src/commands/admin/blacklist-guild.ts
import { Command } from '../../@types/command';
import GuildAccess from '../../models/GuildAccess';
import { replyWithEmbed } from '../../utils/embedHelper';

const blacklist: Command = {
    name: 'blacklist',
    description: 'Add or remove a guild from the blacklist',
    usage: 'b!blacklist add/remove <guildId>',
    category: 'admin',
    adminOnly: true,
    aliases: [],
    execute: async (message, args, dsitube) => {
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
};