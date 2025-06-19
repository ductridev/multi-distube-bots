// src/models/GlobalConfig.ts
import mongoose, { Schema } from 'mongoose';

export interface IGlobalConfig {
    key: string;
    value: any;
}

const GlobalConfigSchema = new Schema<IGlobalConfig>(
    {
        key: { type: String, required: true, unique: true },
        value: { type: Schema.Types.Mixed, required: true },
    },
    { collection: 'globalconfigs' }
);

export const GlobalConfigModel = mongoose.model<IGlobalConfig>('GlobalConfig', GlobalConfigSchema);
