import { Queue } from "distube";

export const cancelNoSongTimeout = (queue: Queue, noSongTimeouts: Map<string, NodeJS.Timeout>) => {
    const vc = queue.voiceChannel;
    if (!vc) return;

    const timeout = noSongTimeouts.get(vc.id);
    if (timeout) {
        clearTimeout(timeout);
        noSongTimeouts.delete(vc.id);
    }
}