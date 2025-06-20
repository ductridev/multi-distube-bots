// src/bot/distubeEvents.ts
import { DisTube, Events, Queue, Song } from 'distube';
import { RecentTrackModel } from '../models/RecentTrack';
import { QueueSessionModel } from '../models/QueueSession';
import ExtendedClient from '../@types/extendedClient';
import { sendWithEmbed } from '../utils/embedHelper';
import { GuildTextBasedChannel } from 'discord.js';

export function registerDisTubeEvents(
    distube: DisTube,
    client: ExtendedClient,
    name: string,
    noSongTimeouts: Map<string, NodeJS.Timeout>,
    noListenerTimeouts: Map<string, NodeJS.Timeout>
) {
    distube.on(Events.FINISH, (queue: Queue) => {
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
    });

    distube.on(Events.ADD_SONG, cancelNoSongTimeout);
    distube.on(Events.ADD_LIST, cancelNoSongTimeout);

    function cancelNoSongTimeout(queue: Queue) {
        const guildId = queue.textChannel?.guild.id;
        if (!guildId) return;

        const timeout = noSongTimeouts.get(guildId);
        if (timeout) {
            clearTimeout(timeout);
            noSongTimeouts.delete(guildId);
        }
    }

    distube.on(Events.PLAY_SONG, async (queue: Queue, song: Song) => {
        const userId = song.member?.id;
        const guildId = queue.textChannel?.guild.id;
        const channel = queue.voice?.channel;
        if (!userId || !guildId || !channel) return;

        // Save session
        const existing = await QueueSessionModel.findOne({ userId });
        const updated = [song.url, ...(existing?.urls || [])].slice(0, 10);
        await QueueSessionModel.updateOne({ userId }, { $set: { urls: updated } }, { upsert: true });

        // Save recent track
        const existingTrack = await RecentTrackModel.findOne({ userId });
        const recent = [song.url, ...(existingTrack?.tracks || [])].slice(0, 5);
        await RecentTrackModel.updateOne({ userId }, { $set: { tracks: recent } }, { upsert: true });

        if (queue.previousSongs.length === 0) return;

        const songSource = song.source;
        let sourceEmoji = '';
        if (songSource === 'youtube')
            sourceEmoji = '<:youtubeicon:1385543095143235584>';
        else if (songSource === 'spotify')
            sourceEmoji = '<:spotifyicon:1385543086888718356>';
        else if (songSource === 'soundcloud')
            sourceEmoji = '<:soundcloudicon:1385543084493766717>';
        else if (songSource === 'deezer')
            sourceEmoji = '<:deezericon:1385543082476568716>';
        else if (songSource === 'bandlab')
            sourceEmoji = '<:bandlabicon:1385543080635142174>';

        const nonBotListeners = channel.members.filter(m => !m.user.bot);
        if (nonBotListeners.size > 0 || noListenerTimeouts.has(guildId)) {
            sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'info', `${sourceEmoji} Đang phát bài hát [**${song.name}**](${song.url}).`);
            return;
        }

        sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'warning', '⚠️ Không có ai trong kênh thoại. Tôi sẽ rời sau 10 phút nếu không có ai tham gia.');

        const timeout = setTimeout(() => {
            if (channel.members.filter(m => !m.user.bot).size === 0) {
                queue.stop();
                sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'info', '👋 Tôi đã rời khỏi vì không có người nghe.');
            }
            noListenerTimeouts.delete(guildId);
        }, 10 * 60_000);

        noListenerTimeouts.set(guildId, timeout);
    });

    distube.on(Events.ERROR, (error: Error, queue: Queue, song: Song | undefined) => {
        console.error(`[${name}] Error in distube:`, error);
        sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'error', 'Có gì đó đã xảy ra khi chúng tôi đang phát nhạc.');
    });
}
