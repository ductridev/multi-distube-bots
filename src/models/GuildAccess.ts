// src/models/GuildAccess.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IGuildAccess extends Document {
    guildId: string;
    type: 'whitelist' | 'blacklist';
}

const GuildAccessSchema = new Schema<IGuildAccess>({
    guildId: { type: String, required: true, unique: true },
    type: { type: String, enum: ['whitelist', 'blacklist'], required: true },
});

export default mongoose.model<IGuildAccess>('GuildAccess', GuildAccessSchema);
