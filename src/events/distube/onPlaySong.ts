import { Queue, Song } from "distube";
import { QueueSessionModel } from "../../models/QueueSession";
import { RecentTrackModel } from "../../models/RecentTrack";
import { GuildTextBasedChannel } from "discord.js";
import { sendWithEmbed } from "../../utils/embedHelper";

export const onPlaySong = async (queue: Queue, song: Song) => {
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

    // Send now playing message
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

    sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'info', `${sourceEmoji} Đang phát bài hát [**${song.name}**](${song.url}).`);
};