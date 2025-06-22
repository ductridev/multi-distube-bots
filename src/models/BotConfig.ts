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
    bio?: string;
    bannerURL?: string;
    presence?: string;
    status?: string;
    streamURL?: string;
    avatarUpdated?: boolean;
    bannerUpdated?: boolean;
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
        bio: { type: String },
        bannerURL: { type: String },
        presence: { type: String },
        status: { type: String },
        streamURL: { type: String },
        avatarUpdated: { type: Boolean, default: false },
        bannerUpdated: { type: Boolean, default: false },
    },
    { collection: 'botconfigs' }
);

export const BotConfigModel = mongoose.model<IBotConfig>('BotConfig', BotConfigSchema);
