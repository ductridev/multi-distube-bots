// src/events/distube/onFinishSong.ts

import { GuildTextBasedChannel } from "discord.js";
import { Queue, Song } from "distube";
import { sendWithEmbed } from "../../utils/embedHelper";

export const onFinishSong = (
    queue: Queue,
    song: Song,
    noListenerTimeouts: Map<string, NodeJS.Timeout>
) => {
    const guildId = queue.textChannel?.guild.id;
    const channel = queue.voice?.channel;
    if (!guildId || !channel) return;

    // Only apply when no more songs and no listeners
    if (queue.previousSongs.length === 0) return;

    const nonBotListeners = channel.members.filter(m => !m.user.bot);
    if (nonBotListeners.size > 0 || noListenerTimeouts.has(guildId)) return;

    sendWithEmbed(
        queue.textChannel as GuildTextBasedChannel,
        'warning',
        '⚠️ Không có ai trong kênh thoại. Tôi sẽ rời sau 10 phút nếu không có ai tham gia.'
    );

    const timeout = setTimeout(() => {
        const stillNoListeners = channel.members.filter(m => !m.user.bot).size === 0;
        if (stillNoListeners) {
            queue.stop();
            sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'info', '👋 Tôi đã rời khỏi vì không có người nghe.');
        }
        noListenerTimeouts.delete(guildId);
    }, 10 * 60_000);

    noListenerTimeouts.set(guildId, timeout);
};
