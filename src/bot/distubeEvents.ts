// src/bot/distubeEvents.ts
import { DisTube, Events, Queue, Song } from 'distube';
import ExtendedClient from '../@types/extendedClient';
import { sendWithEmbed } from '../utils/embedHelper';
import { GuildTextBasedChannel } from 'discord.js';
import { onFinishQueue } from '../events/distube/onFinishQueue';
import { onFinishSong } from '../events/distube/onFinishSong';
import { onPlaySong } from '../events/distube/onPlaySong';
import { onNoRelated } from '../events/distube/onNoRelated';

export function registerDisTubeEvents(
    distube: DisTube,
    client: ExtendedClient,
    name: string,
    noSongTimeouts: Map<string, NodeJS.Timeout>,
    noListenerTimeouts: Map<string, NodeJS.Timeout>,
    noPlayWarningTimeouts: Map<string, NodeJS.Timeout>,
) {
    // distube.on(Events.FFMPEG_DEBUG, console.debug);
    // distube.on(Events.DEBUG, console.debug);
    distube.on(Events.FINISH, (queue: Queue) => onFinishQueue(queue, noSongTimeouts));

    distube.on(Events.FINISH_SONG, (queue: Queue, song: Song) => onFinishSong(queue, song, noListenerTimeouts));
    distube.on(Events.PLAY_SONG, (queue: Queue, song: Song) => onPlaySong(queue, song, noSongTimeouts, noPlayWarningTimeouts));

    distube.on(Events.NO_RELATED, (queue: Queue) => onNoRelated(queue, noSongTimeouts));

    distube.on(Events.ERROR, (error: Error, queue: Queue, song: Song | undefined) => {
        console.error(`[${name}] Error in distube:`, error);
        if (song) {
            console.error(`[${name}] Song:`, song.name, song.stream.playFromSource ? song.stream.url : song.url);
            sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'error', `Không thể phát bài hát: [${song.name}](${song.url}).`);
            return;
        }
        sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'error', 'Có gì đó đã xảy ra khi chúng tôi đang phát nhạc.');
    });
}
