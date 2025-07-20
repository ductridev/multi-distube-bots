import type { Player } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { voiceChannelMap } from '../..';

export default class PlayerCreate extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'playerCreate',
		});
	}

	public async run(player: Player, _reason: string): Promise<void> {
		if (!voiceChannelMap.has(player.guildId)) voiceChannelMap.set(player.guildId, new Map());
		voiceChannelMap.get(player.guildId)!.set(player.voiceChannelId!, this.client.childEnv.clientId);

		this.client.playerSaver!.set(player.guildId, JSON.stringify(player.toJSON()));
		await this.client.db.setSavedPlayerData(player.toJSON(), this.client.childEnv.clientId);
	}
}


