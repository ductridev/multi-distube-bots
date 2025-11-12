import type { Player } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';

export default class PlayerUpdate extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'playerUpdate',
		});
	}

	public async run(oldPlayer: Player, newPlayer: Player): Promise<void> {
		if (!newPlayer.options.customData) newPlayer.options.customData = {};
		newPlayer.options.customData.botClientId = this.client.childEnv.clientId;
		const newPlayerData = newPlayer.toJSON();

		const shouldSave =
			!oldPlayer ||
			!oldPlayer.node ||
			oldPlayer.voiceChannelId !== newPlayerData.voiceChannelId ||
			oldPlayer.textChannelId !== newPlayerData.textChannelId ||
			oldPlayer.options.selfDeaf !== newPlayerData.options.selfDeaf ||
			oldPlayer.options.selfMute !== newPlayerData.options.selfMute ||
			oldPlayer.node.id !== newPlayerData.nodeId ||
			oldPlayer.node.sessionId !== newPlayerData.nodeSessionId ||
			oldPlayer.options.applyVolumeAsFilter !==
			newPlayerData.options.applyVolumeAsFilter ||
			oldPlayer.options.instaUpdateFiltersFix !==
			newPlayerData.options.instaUpdateFiltersFix ||
			oldPlayer.options.vcRegion !== newPlayerData.options.vcRegion ||
			oldPlayer.queue !== newPlayerData.queue;

		if (shouldSave) {
			// Save player queue
			await newPlayer.queue.utils.save();
			await this.client.playerSaver!.set(newPlayerData.guildId, JSON.stringify(newPlayerData));
			// await this.client.db.setSavedPlayerData(newPlayerData, this.client.childEnv.clientId);
		}
	}
}


