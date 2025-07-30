import type { TextChannel } from 'discord.js';
import type { Player } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { updateSetup } from '../../utils/SetupSystem';
import { sessionMap, voiceChannelMap } from '../..';

export default class PlayerDestroy extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'playerDestroy',
		});
	}

	public async run(player: Player, _reason: string): Promise<void> {
		const guild = this.client.guilds.cache.get(player.guildId);
		const guildMap = voiceChannelMap.get(player.guildId);

		if (guildMap) {
			if (player.options.voiceChannelId && guildMap.has(player.options.voiceChannelId)) {
				// Remove specific VC mapping
				guildMap.delete(player.options.voiceChannelId);
			} else {
				// VoiceChannelId is null → Clear any entry where this bot is still mapped
				for (const [vcId, botId] of guildMap.entries()) {
					if (botId === this.client.childEnv.clientId) {
						guildMap.delete(vcId);
					}
				}
			}
		}

		const guildSessionMap = sessionMap.get(player.guildId);

		if (guildSessionMap) {
			if (player.options.voiceChannelId) {
				// Remove specific VC mapping
				guildSessionMap.delete(player.options.voiceChannelId);
			}
		}

		this.client.playerSaver!.delPlayer(player.guildId);
		// await this.client.db.deleteSavedPlayerData(player.guildId, this.client.childEnv.clientId);

		if (!guild) return;
		const locale = await this.client.db.getLanguage(player.guildId);
		await updateSetup(this.client, guild, locale);

		if (player.voiceChannelId) {
			// await this.client.utils.setVoiceStatus(this.client, player.voiceChannelId, "");
		}

		const messageId = player.get<string | undefined>('messageId');
		if (!messageId) return;

		const channel = guild.channels.cache.get(player.textChannelId!) as TextChannel;
		if (!channel) return;

		const message = await channel.messages.fetch(messageId).catch(() => {
			null;
		});
		if (!message) return;

		if (message.editable) {
			await message.edit({ components: [] }).catch(() => {
				null;
			});
		}
	}
}


