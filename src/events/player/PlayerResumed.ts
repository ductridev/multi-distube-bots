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
            if (!player.options.customData) player.options.customData = {};
            player.options.customData.botClientId = this.client.childEnv.clientId;

            const newPlayerData = player.toJSON();
            this.client.playerSaver!.set(newPlayerData.guildId, JSON.stringify(newPlayerData));
            // await this.client.db.setSavedPlayerData(player.toJSON(), this.client.childEnv.clientId);
            // await this.client.utils.setVoiceStatus(this.client, player.voiceChannelId, `🎵 ${track.info.title}`);
        }
    }
}

