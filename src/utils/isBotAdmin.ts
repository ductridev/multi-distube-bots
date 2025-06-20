// src/utils/isBotAdmin.ts
import { BotAdminModel } from '../models/BotAdmin';

export async function isBotAdmin(userId: string): Promise<boolean> {
    const admin = await BotAdminModel.findOne({ userId });
    return !!admin;
}
