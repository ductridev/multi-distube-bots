// src/models/BotConfig.ts
import mongoose, { Schema } from 'mongoose';

export interface IBotConfig {
    name: string;
    token: string;
    prefix: string;
    enabled: boolean;
    displayName?: string;
    avatarURL?: string;
    ownerId: string;
}

const BotConfigSchema = new Schema<IBotConfig>(
    {
        name: { type: String, required: true, unique: true },
        token: { type: String, required: true },
        prefix: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        displayName: { type: String },
        avatarURL: { type: String },
        ownerId: { type: String, required: true },
    },
    { collection: 'botconfigs' }
);

export const BotConfigModel = mongoose.model<IBotConfig>('BotConfig', BotConfigSchema);
