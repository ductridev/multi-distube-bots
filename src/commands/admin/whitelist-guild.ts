// src/commands/admin/whitelist-guild.ts
/*
    Command: whitelist
    Description: Add or remove a guild from the whitelist.
    Usage: b!whitelist add/remove <guildId>
    Category: admin
    Aliases: wl
*/
import { Command } from '../../@types/command';
import GuildAccess from '../../models/GuildAccess';
import { replyWithEmbed } from '../../utils/embedHelper';

export const whitelist: Command = {
    name: 'whitelist',
    description: 'Add or remove a guild from the whitelist',
    usage: 'b!whitelist add/remove <guildId>',
    category: 'admin',
    adminOnly: true,
    aliases: [],
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
};