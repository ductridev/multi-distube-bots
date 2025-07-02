// src/events/distube/onPlaySong.ts

import { Queue, Song } from "distube";
import { GuildTextBasedChannel } from "discord.js";
import { sendWithEmbed } from "../../utils/embedHelper";
import { clearVoiceTimeouts } from "../../utils/clearVoiceTimeouts";

export const onPlaySong = async (queue: Queue, song: Song, noSongTimeouts: Map<string, NodeJS.Timeout>, noPlayWarningTimeouts: Map<string, NodeJS.Timeout>) => {
    try {
        clearVoiceTimeouts(queue.voiceChannel!.id, noSongTimeouts, noPlayWarningTimeouts);

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
    } catch (err) {
        console.error(err);
        // Do nothing
    }
};