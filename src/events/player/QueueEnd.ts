import type { TextChannel } from 'discord.js';
import type { Player, Track, TrackStartEvent } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { updateSetup } from '../../utils/SetupSystem';
import { T } from '../../structures/I18n';

export default class QueueEnd extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'queueEnd',
		});
	}

	public async run(player: Player, _track: Track | null, _payload: TrackStartEvent): Promise<void> {
		const guild = this.client.guilds.cache.get(player.guildId);
		if (!guild) return;

		// Save player queue
		await player.queue.utils.save();

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

		const is247 = await this.client.db.get_247(this.client.childEnv.clientId, player.guildId);

		if (player.queue.tracks.length <= 0) {
			if (!this.client.timeoutListenersMap.has(player.guildId) && !this.client.timeoutSongsMap.has(player.guildId) && !is247 && !player.get('autoplay')) {
				const channel = this.client.channels.cache.get(player.textChannelId!);
				const locale = await this.client.db.getLanguage(player.guildId);
				const embed = this.client.embed().setFooter({
					text: "BuNgo Music Bot 🎵 • Maded by Gúp Bu Ngô with ♥️",
					iconURL: "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg",
				})
					.setTimestamp();
				const time = 5;

				if (channel && channel.isTextBased()) {
					await (channel as TextChannel).send({
						embeds: [embed.setColor(this.client.color.main).setDescription(T(locale, 'will_leave.no_songs', { time: time }))],
					});
				}
				const timeout = setTimeout(async () => {
					if (!player?.voiceChannelId) return;

					if (!is247) {
						player.destroy();
					}
				}, time * 60_000);
				this.client.timeoutSongsMap.set(player.guildId, timeout);
			}
		}
	}
}


