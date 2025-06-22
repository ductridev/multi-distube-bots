// src/commands/removeadmin.ts
/* 
    Command: removeadmin
    Description: Removes admin privileges from a user.
    Usage: b!removeadmin @user
    Category: owner
    Aliases: adminremove, rmadmin
*/

import { Message } from 'discord.js';
import { Command } from '../../@types/command';
import { BotAdminModel } from '../../models/BotAdmin';
import DisTube from 'distube';
import { replyWithEmbed } from '../../utils/embedHelper';

const removeadmin: Command = {
    name: 'removeadmin',
    description: 'Xóa quyền quản trị viên bot của một người dùng.',
    usage: 'b!removeadmin @user',
    category: 'owner',
    aliases: ['adminremove', 'rmadmin'],

    execute: async (message: Message, args: string[], distube: DisTube) => {
        // Check if sender has server Administrator permission
        if (!message.member?.permissions.has('Administrator')) {
            await replyWithEmbed(message, 'denied', 'Bạn không có quyền sử dụng lệnh này.');
            return;
        }

        const user = message.mentions.users.first();
        if (!user) {
            await replyWithEmbed(message, 'error', 'Vui lòng đề cập đến người dùng cần xóa quyền admin.');
            return;
        }

        try {
            const result = await BotAdminModel.findOneAndDelete({ userId: user.id });

            if (!result) {
                await replyWithEmbed(message, 'info', `ℹ️ Người dùng <@${user.id}> không phải admin bot.`);
                return;
            }

            await replyWithEmbed(message, 'success', `Đã xóa quyền admin của <@${user.id}>.`);
        } catch (err: any) {
            console.error('Lỗi khi xóa admin:', err);
            await replyWithEmbed(message, 'error', 'Có lỗi xảy ra khi xóa admin.');
        }
    },
};

export = removeadmin;
