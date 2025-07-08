import type { Player, Track } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';

export default class PlayerResumed extends Event {
    constructor(client: Lavamusic, file: string) {
        super(client, file, {
            name: 'playerResumed',
        });
    }

    public async run(player: Player, track: Track): Promise<void> {
        if (!player || !track) return;

        if (player.voiceChannelId) {
            await this.client.utils.setVoiceStatus(this.client, player.voiceChannelId, `🎵 ${track.info.title}`);
        }
    }
}

