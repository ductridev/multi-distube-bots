// src/utils/sessionStore.ts
import { SessionModel } from '../models/Session';

export async function setInitiator(guildId: string, userId: string) {
    const now = Date.now();
    const session = await SessionModel.findOne({ guildId });

    if (session) {
        session.initiatorId = userId;
        session.joinedAt = now;
        session.voteSkips = [];
        session.voteStops = [];
        session.voteExpireAt = null;
        await session.save();
    } else {
        await SessionModel.create({
            guildId,
            initiatorId: userId,
            joinedAt: now,
            voteSkips: [],
            voteStops: [],
            voteExpireAt: null,
        });
    }
}

export async function getSession(guildId: string) {
    const session = await SessionModel.findOne({ guildId }).lean();
    if (!session) return undefined;

    return {
        ...session,
        voteSkips: new Set(session.voteSkips),
        voteStops: new Set(session.voteStops),
        voteExpire: null, // No timer in MongoDB
    };
}

export async function clearSession(guildId: string) {
    await SessionModel.deleteOne({ guildId });
}

export async function setVoteExpire(guildId: string, ms: number) {
    const expireAt = new Date(Date.now() + ms);
    await SessionModel.updateOne({ guildId }, { voteExpireAt: expireAt });
}
