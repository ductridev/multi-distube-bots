import { GuildTextBasedChannel } from "discord.js";
import { Queue } from "distube";
import { sendWithEmbed } from "../../utils/embedHelper";

export const onFinishQueue = (queue: Queue, noSongTimeouts: Map<string, NodeJS.Timeout>) => {
    const guildId = queue.textChannel?.guild.id;
    if (!guildId || noSongTimeouts.has(guildId)) return;

    if (!queue.textChannel) {
        console.error('Queue text channel is undefined.');
        return;
    }

    sendWithEmbed(queue.textChannel, 'warning', 'Danh sách phát đã hết. Tôi sẽ rời sau 10 phút nếu không có bài hát mới.');

    const timeout = setTimeout(() => {
        queue.stop();
        sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'info', '👋 Tôi đã rời khỏi vì không có bài hát mới sau 10 phút.');
        noSongTimeouts.delete(guildId);
    }, 10 * 60_000);

    noSongTimeouts.set(guildId, timeout);
}