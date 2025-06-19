// src/models/QueueSession.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IQueueSession extends Document {
  userId: string;
  urls: string[];
  updatedAt: Date;
}

const sessionSchema = new Schema<IQueueSession>(
  {
    userId: { type: String, required: true, unique: true },
    urls: [String],
  },
  { timestamps: true, collection: 'queuesessions' }
);

export const QueueSessionModel = mongoose.model<IQueueSession>('QueueSession', sessionSchema);
