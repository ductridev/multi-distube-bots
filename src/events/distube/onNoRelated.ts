// src/events/distube/onFinishQueue.ts

import { GuildTextBasedChannel } from "discord.js";
import { Queue } from "distube";
import { sendWithEmbed } from "../../utils/embedHelper";

export const onNoRelated = (queue: Queue, noSongTimeouts: Map<string, NodeJS.Timeout>) => {
    try {
        const vc = queue.voiceChannel;
        if (!vc?.id || noSongTimeouts.has(vc.id)) return;

        if (!queue.textChannel) {
            console.error('Queue text channel is undefined.');
            return;
        }

        sendWithEmbed(queue.textChannel, 'warning', 'Không tìm thấy bài hát liên quan để tiếp tục phát. Tôi sẽ dừng tự động phát và rời sau 10 phút nếu không có bài hát mới.');

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