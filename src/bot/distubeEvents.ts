// src/bot/distubeEvents.ts
import { DisTube, Events, Queue, Song } from 'distube';
import ExtendedClient from '../@types/extendedClient';
import { sendWithEmbed } from '../utils/embedHelper';
import { GuildTextBasedChannel } from 'discord.js';
import { cancelNoSongTimeout } from '../utils/botDisconnectTimeout';
import { onFinishQueue } from '../events/distube/onFinishQueue';
import { onFinishSong } from '../events/distube/onFinishSong';
import { onPlaySong } from '../events/distube/onPlaySong';

export function registerDisTubeEvents(
    distube: DisTube,
    client: ExtendedClient,
    name: string,
    noSongTimeouts: Map<string, NodeJS.Timeout>,
    noListenerTimeouts: Map<string, NodeJS.Timeout>
) {
    // distube.on(Events.FFMPEG_DEBUG, console.debug);
    // distube.on(Events.DEBUG, console.debug);
    distube.on(Events.FINISH, (queue: Queue) => onFinishQueue(queue, noSongTimeouts));

    distube.on(Events.ADD_SONG, (queue: Queue) => cancelNoSongTimeout(queue, noSongTimeouts));
    distube.on(Events.ADD_LIST, (queue: Queue) => cancelNoSongTimeout(queue, noSongTimeouts));

    distube.on(Events.FINISH_SONG, (queue: Queue, song: Song) => onFinishSong(queue, song, noListenerTimeouts));
    distube.on(Events.PLAY_SONG, (queue: Queue, song: Song) => onPlaySong(queue, song));

    distube.on(Events.ERROR, (error: Error, queue: Queue, song: Song | undefined) => {
        console.error(`[${name}] Error in distube:`, error);
        sendWithEmbed(queue.textChannel as GuildTextBasedChannel, 'error', 'Có gì đó đã xảy ra khi chúng tôi đang phát nhạc.');
    });
}
