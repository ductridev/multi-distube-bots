import type { TextChannel } from 'discord.js';
import type { Player } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { updateSetup } from '../../utils/SetupSystem';
import { VoiceStateHelper } from '../../utils/VoiceStateHelper';

export default class PlayerDestroy extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'playerDestroy',
		});
	}

	public async run(player: Player, _reason: string): Promise<void> {
		const guild = this.client.guilds.cache.get(player.guildId);

		// Clear any pending timeouts for this guild
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

		// Remove voice channel mapping across shards
		if (player.options.voiceChannelId) {
			await VoiceStateHelper.removeVoiceChannel(
				this.client,
				player.guildId,
				player.options.voiceChannelId
			);
		} else {
			// VoiceChannelId is null → Clear any entry where this bot is still mapped
			await VoiceStateHelper.removeBotFromGuild(
				this.client,
				player.guildId,
				this.client.childEnv.clientId
			);
		}

		// Remove player session across shards
		if (player.options.voiceChannelId) {
			await VoiceStateHelper.removeSession(
				this.client,
				player.guildId,
				player.options.voiceChannelId
			);
		}

		// Only delete player data if NOT in graceful shutdown mode
		// During graceful shutdown, we want to preserve player state for resume
		if (!this.client.isShuttingDown) {
			this.client.playerSaver!.delPlayer(player.guildId);
			// await this.client.db.deleteSavedPlayerData(player.guildId, this.client.childEnv.clientId);
		} else {
			this.client.logger.info(`Preserving player data for guild ${player.guildId} during shutdown`);
		}

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


