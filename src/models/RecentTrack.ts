// src/models/RecentTrack.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IRecentTrack extends Document {
    userId: string;
    tracks: string[]; // list of URLs
    updatedAt: Date;
}

const recentTrackSchema = new Schema<IRecentTrack>(
    {
        userId: { type: String, required: true, unique: true },
        tracks: { type: [String], default: [] },
    },
    { timestamps: true, collection: 'recenttracks' }
);

export const RecentTrackModel = mongoose.model<IRecentTrack>('RecentTrack', recentTrackSchema);
