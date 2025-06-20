// src/models/BotAdmin.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IBotAdmin extends Document {
    userId: string;     // Discord user ID
}

const BotAdminSchema = new Schema<IBotAdmin>({
    userId: { type: String, required: true, unique: true },
}, { collection: 'bot_admins' });

export const BotAdminModel = mongoose.model<IBotAdmin>('BotAdmin', BotAdminSchema);
