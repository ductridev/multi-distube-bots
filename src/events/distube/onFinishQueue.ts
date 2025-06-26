// src/events/distube/onFinishQueue.ts

import { GuildTextBasedChannel } from "discord.js";
import { Queue } from "distube";
import { sendWithEmbed } from "../../utils/embedHelper";
import { QueueSessionModel } from "../../models/QueueSession";

export const onFinishQueue = async (queue: Queue, noSongTimeouts: Map<string, NodeJS.Timeout>) => {
    try {
        const vc = queue.voiceChannel;
        if (!vc?.id || noSongTimeouts.has(vc.id)) return;

        if (!queue.textChannel) {
            console.error('Queue text channel is undefined.');
            return;
        }

        if (queue.autoplay) {
            const prevSong = queue.previousSongs[queue.previousSongs.length - 1];
            const plugin = prevSong.plugin;
            const relatedSongs = await plugin?.getRelatedSongs(prevSong)
            if (!relatedSongs) {
                queue.voice.leave();
                await queue.stop();
                QueueSessionModel.deleteOne({ userId: queue.previousSongs[queue.previousSongs.length - 1].id });
                sendWithEmbed(queue.textChannel, 'warning', 'Không tìm thấy bài hát nào nữa. Dừng phát');
                return;
            }
            queue.addToQueue(relatedSongs);
        }

        sendWithEmbed(queue.textChannel, 'warning', 'Danh sách phát đã hết. Tôi sẽ rời sau 10 phút nếu không có bài hát mới.');

        const timeout = setTimeout(async () => {
            queue.voice.leave();
            await queue.stop();
            sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'info', '👋 Tôi đã rời khỏi vì không có bài hát mới sau 10 phút.');
            noSongTimeouts.delete(vc.id);
        }, 10 * 60_000);

        noSongTimeouts.set(vc.id, timeout);
    } catch (err) {
        console.error(err);
        // Do nothing
    }
}