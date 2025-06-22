// src/commands/addadmin.ts
/*
    Command: addadmin
    Description: Adds a user as an admin.
    Usage: b!addadmin @user
    Category: owner
    Aliases: adminadd
*/

import { Message, User } from 'discord.js';
import { Command } from '../../@types/command';
import { BotAdminModel } from '../../models/BotAdmin';
import DisTube from 'distube';
import { replyWithEmbed } from '../../utils/embedHelper';
import { isBotAdmin } from '../../utils/permissions';

const addadmin: Command = {
    name: 'addadmin',
    description: 'Thêm người dùng làm quản trị viên bot.',
    usage: 'b!addadmin @user',
    category: 'owner',
    aliases: ['adminadd'],
    execute: async (message: Message, args: string[], distube: DisTube) => {
        // Only allow server admins to run this
        if (!(await isBotAdmin(message.author.id))) {
            await replyWithEmbed(message, 'denied', 'Bạn không phải là admin bot.');
            return;
        }

        const user = message.mentions.users.first();
        if (!user) {
            await replyWithEmbed(message, 'error', 'Vui lòng đề cập tới người dùng để thêm làm admin.');
            return;
        }

        try {
            const existing = await BotAdminModel.findOne({ userId: user.id });
            if (existing) {
                await replyWithEmbed(message, 'info', `Người dùng <@${user.id}> đã là admin.`);
                return;
            }

            await BotAdminModel.create({ userId: user.id });
            await replyWithEmbed(message, 'success', `Đã thêm <@${user.id}> làm admin bot.`);
        } catch (err: any) {
            console.error('Lỗi khi thêm admin:', err);
            await replyWithEmbed(message, 'error', 'Có lỗi xảy ra khi thêm admin.');
        }
    },
};

export = addadmin;
