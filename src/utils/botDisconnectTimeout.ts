import { Queue } from "distube";

export const cancelNoSongTimeout = (queue: Queue, noSongTimeouts: Map<string, NodeJS.Timeout>) => {
    const guildId = queue.textChannel?.guild.id;
    if (!guildId) return;

    const timeout = noSongTimeouts.get(guildId);
    if (timeout) {
        clearTimeout(timeout);
        noSongTimeouts.delete(guildId);
    }
}