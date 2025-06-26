// src/events/distube/onFinishSong.ts

import { GuildTextBasedChannel } from "discord.js";
import { Queue, Song } from "distube";
import { sendWithEmbed } from "../../utils/embedHelper";
import { saveLimitedArray } from "../../utils/mongoArrayLimiter";
import { QueueSessionModel } from "../../models/QueueSession";
import { getSession } from "../../utils/sessionStore";

export const onFinishSong = async (
    queue: Queue,
    song: Song,
    noListenerTimeouts: Map<string, NodeJS.Timeout>
) => {
    try {
        const guildId = queue.textChannel?.guild.id;
        const vc = queue.voiceChannel;
        if (!guildId || !vc) return;

        // Only apply when no more songs and no listeners
        if (queue.previousSongs.length === 0) return;

        const nonBotListeners = vc.members.filter(m => !m.user.bot);
        if (nonBotListeners.size > 0 || noListenerTimeouts.has(vc.id)) return;

        sendWithEmbed(
            queue.textChannel as GuildTextBasedChannel,
            'warning',
            '⚠️ Không có ai trong kênh thoại. Tôi sẽ rời sau 10 phút nếu không có ai tham gia.'
        );

        const session = await getSession(guildId, vc.id);

        if (session) {
            saveLimitedArray(QueueSessionModel, session.initiatorId, 'urls', queue.songs.map(s => s.url ?? '').filter(Boolean));
        }

        const timeout = setTimeout(async () => {
            const stillNoListeners = vc.members.filter(m => !m.user.bot).size === 0;
            if (stillNoListeners) {
                queue.voice.leave();
                await queue.stop();
                sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'info', '👋 Tôi đã rời khỏi vì không có người nghe.');
            }
            noListenerTimeouts.delete(vc.id);
        }, 10 * 60_000);

        noListenerTimeouts.set(vc.id, timeout);
    } catch (err) {
        console.error(err);
        // Do nothing
    }
};
