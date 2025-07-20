import type { Player, Track } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';

export default class PlayerPaused extends Event {
    constructor(client: Lavamusic, file: string) {
        super(client, file, {
            name: 'playerPaused',
        });
    }

    public async run(player: Player, track: Track): Promise<void> {
        if (!player || !track) return;

        if (player.voiceChannelId) {
            await this.client.db.setSavedPlayerData(player.toJSON(), this.client.childEnv.clientId);
            // await this.client.utils.setVoiceStatus(this.client, player.voiceChannelId, `⏸️ ${track.info.title}`);
        }
    }
}

