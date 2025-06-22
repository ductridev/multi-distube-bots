// src/commands/admin/remove-bot.ts
import { Command } from '../../@types/command';
import { Message } from 'discord.js';
import { BotConfigModel } from '../../models/BotConfig';
import { replyWithEmbed } from '../../utils/embedHelper';
import { activeBots } from '../../botManager';

const removeBot: Command = {
    name: 'removebot',
    description: 'Xóa bot theo prefix, name, ID hoặc tag bot.',
    usage: 'b!removebot <prefix | name | _id | tag>',
    category: 'admin',
    ownerOnly: true,
    aliases: [],

    execute: async (message: Message, args: string[]) => {
        const input = args[0];

        // Try extract from bot mention if exists
        const mentionedBot = message.mentions.users.first();
        const identifier = mentionedBot?.id || input;

        if (!identifier) {
            await replyWithEmbed(message, 'error', '❌ Bạn phải cung cấp prefix, name, ID hoặc tag bot để xóa.');
            return;
        }

        // Lookup bot in DB
        const bot = await BotConfigModel.findOne({
            $or: [
                { prefix: identifier },
                { name: identifier },
                { _id: identifier },
                { token: { $regex: identifier, $options: 'i' } }, // Optional if you store token (not recommended)
            ]
        });

        if (!bot) {
            await replyWithEmbed(message, 'warning', `❗ Không tìm thấy bot với định danh: \`${identifier}\`.`);
            return;
        }

        // Stop the bot if active
        const index = activeBots.findIndex(
            b => b.client.user?.id === mentionedBot?.id || b.client.prefix === bot.prefix || b.name === bot.name
        );

        if (index !== -1) {
            try {
                const instance = activeBots[index];
                await instance.client.destroy();
                activeBots.splice(index, 1);
                console.log(`🛑 Bot ${bot.name} đã được dừng.`);
            } catch (err) {
                console.warn(`⚠️ Không thể dừng bot ${bot.name}:`, err);
            }
        }

        await BotConfigModel.deleteOne({ _id: bot._id });

        await replyWithEmbed(message, 'success', `✅ Đã xóa bot \`${bot.name}\` (prefix: \`${bot.prefix}\`).`);
    },
};

export = removeBot;
