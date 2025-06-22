// src/middleware/commandPermissionCheck.ts
import { Message } from 'discord.js';
import { Command } from '../@types/command';
import { replyWithEmbed } from '../utils/embedHelper';

// Replace with your actual owner ID check
const isOwner = (userId: string): boolean => {
    const OWNER_IDS = ['566577469172351007']; // Add your real owner IDs here
    return OWNER_IDS.includes(userId);
};

export async function canRunCommand(message: Message, command: Command): Promise<boolean> {
    const member = message.member;

    // If command is owner-only
    if (command.ownerOnly) {
        if (!isOwner(message.author.id)) {
            await replyWithEmbed(message, 'denied', '⛔ Lệnh này chỉ dành cho chủ sở hữu bot.');
            return false;
        }
    }

    // If command is admin-only
    if (command.adminOnly) {
        if (!member?.permissions.has('Administrator') && !isOwner(message.author.id)) {
            await replyWithEmbed(message, 'denied', '⛔ Lệnh này chỉ dành cho quản trị viên hoặc chủ sở hữu.');
            return false;
        }
    }

    // All checks passed
    return true;
}
