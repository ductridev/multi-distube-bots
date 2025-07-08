import type { Player } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';

export default class PlayerMuteChange extends Event {
    constructor(client: Lavamusic, file: string) {
        super(client, file, {
            name: "playerMuteChange",
        });
    }

    public async run(player: Player, _selfMuted: boolean, serverMuted: boolean): Promise<void> {
        if (!player) return;

        if (serverMuted && player.playing && !player.paused) {
            player.pause();
        } else if (!serverMuted && player.paused) {
            player.resume();
        }
    }
}

