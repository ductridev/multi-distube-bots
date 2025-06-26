// src/models/Session.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
    guildId: string;
    channelId: string;
    initiatorId: string;
    joinedAt: number;
    voteSkips: string[];
    voteStops: string[];
    voteExpireAt: Date | null;
}

const sessionSchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    initiatorId: { type: String, required: true },
    joinedAt: { type: Number, required: true },
    voteSkips: { type: [String], default: [] },
    voteStops: { type: [String], default: [] },
    voteExpireAt: { type: Date, default: null },
});

export const SessionModel = mongoose.model<ISession>('Session', sessionSchema);
