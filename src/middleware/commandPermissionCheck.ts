// src/middleware/commandPermissionCheck.ts
import { ChatInputCommandInteraction, GuildMember, Message } from 'discord.js';
import { Command } from '../@types/command';
import { replyWithEmbed } from '../utils/embedHelper';

// Replace with your actual owner ID check
const isOwner = (userId: string): boolean => {
    const OWNER_IDS = ['566577469172351007']; // Add your real owner IDs here
    return OWNER_IDS.includes(userId);
};

export async function canRunCommand(
    ctx: Message | ChatInputCommandInteraction,
    command: Command
): Promise<boolean> {
    const isInteraction = 'isChatInputCommand' in ctx;
    const userId = isInteraction ? ctx.user.id : ctx.author.id;
    const member = ctx.member as GuildMember;

    // Owner-only
    if (command.ownerOnly) {
        if (!isOwner(userId)) {
            if (isInteraction) {
                await ctx.reply({ content: '⛔ Lệnh này chỉ dành cho chủ sở hữu bot.', ephemeral: true });
            } else {
                await replyWithEmbed(ctx, 'denied', '⛔ Lệnh này chỉ dành cho chủ sở hữu bot.');
            }
            return false;
        }
    }

    // Admin-only
    if (command.adminOnly) {
        const hasPermission = member?.permissions?.has('Administrator');
        if (!hasPermission && !isOwner(userId)) {
            if (isInteraction) {
                await ctx.reply({ content: '⛔ Lệnh này chỉ dành cho quản trị viên hoặc chủ sở hữu.', ephemeral: true });
            } else {
                await replyWithEmbed(ctx, 'denied', '⛔ Lệnh này chỉ dành cho quản trị viên hoặc chủ sở hữu.');
            }
            return false;
        }
    }

    return true;
}
