// src/models/EmbedSettings.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IEmbedSettings extends Document {
    footerText: string;
    footerIconURL: string;
}

const EmbedSettingsSchema = new Schema<IEmbedSettings>({
    footerText: { type: String, required: true },
    footerIconURL: { type: String, required: true },
});

export default mongoose.model<IEmbedSettings>('EmbedSettings', EmbedSettingsSchema);
