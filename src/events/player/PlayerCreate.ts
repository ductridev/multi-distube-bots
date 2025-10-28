import type { Player } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { VoiceStateHelper } from '../../utils/VoiceStateHelper';
// import { VoiceBasedChannel } from 'discord.js';

export default class PlayerCreate extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'playerCreate',
		});
	}

	public async run(player: Player, _reason: string): Promise<void> {
		// Clear any existing timeouts for this guild (cleanup from previous session)
		const listenerTimeout = this.client.timeoutListenersMap.get(player.guildId);
		if (listenerTimeout) {
			clearTimeout(listenerTimeout);
			this.client.timeoutListenersMap.delete(player.guildId);
		}
		
		const songTimeout = this.client.timeoutSongsMap.get(player.guildId);
		if (songTimeout) {
			clearTimeout(songTimeout);
			this.client.timeoutSongsMap.delete(player.guildId);
		}

		// Update voice channel mapping across shards
		await VoiceStateHelper.setVoiceChannel(
			this.client,
			player.guildId,
			player.voiceChannelId!,
			this.client.childEnv.clientId
		);

		if (!player.options.customData) player.options.customData = {};
		player.options.customData.botClientId = this.client.childEnv.clientId;

		// const vc = (this.client.channels.cache.get(player.voiceChannelId!) as VoiceBasedChannel);

		// Change to Singapore RTC
		// if (vc.rtcRegion === null) vc.setRTCRegion('singapore');

		// Save player session across shards
		await VoiceStateHelper.saveSession(
			this.client,
			player.guildId,
			player.voiceChannelId!,
			player
		);

		this.client.playerSaver!.set(player.guildId, JSON.stringify(player.toJSON()));
		// await this.client.db.setSavedPlayerData(player.toJSON(), this.client.childEnv.clientId);
	}
}


