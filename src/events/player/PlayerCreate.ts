import type { Player } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { sessionMap, voiceChannelMap } from '../..';
// import { VoiceBasedChannel } from 'discord.js';

export default class PlayerCreate extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'playerCreate',
		});
	}

	public async run(player: Player, _reason: string): Promise<void> {
		if (!voiceChannelMap.has(player.guildId)) voiceChannelMap.set(player.guildId, new Map());
		voiceChannelMap.get(player.guildId)!.set(player.voiceChannelId!, this.client.childEnv.clientId);

		if (!player.options.customData) player.options.customData = {};
		player.options.customData.botClientId = this.client.childEnv.clientId;

		// const vc = (this.client.channels.cache.get(player.voiceChannelId!) as VoiceBasedChannel);

		// Change to Singapore RTC
		// if (vc.rtcRegion === null) vc.setRTCRegion('singapore');

		// Save player
		if (!sessionMap.has(player.guildId)) sessionMap.set(player.guildId, new Map());
		sessionMap.get(player.guildId)!.set(player.voiceChannelId!, player);

		this.client.playerSaver!.set(player.guildId, JSON.stringify(player.toJSON()));
		// await this.client.db.setSavedPlayerData(player.toJSON(), this.client.childEnv.clientId);
	}
}


