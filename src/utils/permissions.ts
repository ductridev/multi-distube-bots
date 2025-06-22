// src/utils/permissions.ts
import { BotAdminModel } from '../models/BotAdmin';

export async function isBotAdmin(userId: string): Promise<boolean> {
    const admin = await BotAdminModel.findOne({ userId });
    return !!admin;
}

export async function isBotAdminOrOwner(userId: string, ownerId: string): Promise<boolean> {
    if (userId === ownerId) return true;
    const admin = await BotAdminModel.findOne({ userId });
    return !!admin;
}
