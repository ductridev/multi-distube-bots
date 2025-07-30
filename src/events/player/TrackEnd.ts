import type { GuildMember, TextChannel, VoiceBasedChannel } from 'discord.js';
import type { Player, Track, TrackStartEvent } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { updateSetup } from '../../utils/SetupSystem';
import { T } from '../../structures/I18n';

export default class TrackEnd extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'trackEnd',
		});
	}

	public async run(player: Player, _track: Track | null, _payload: TrackStartEvent): Promise<void> {
		// Prevent this event from running if repeat mode is track
		if (player.repeatMode === 'track') return

		// Save player queue
		await player.queue.utils.save();

		const guild = this.client.guilds.cache.get(player.guildId);
		if (!guild) return;

		const locale = await this.client.db.getLanguage(player.guildId);
		await updateSetup(this.client, guild, locale);

		const messageId = player.get<string | undefined>('messageId');
		if (!messageId) return;

		const channel = guild.channels.cache.get(player.textChannelId!) as TextChannel;
		if (!channel) return;

		const message = await channel.messages.fetch(messageId).catch(() => {
			null;
		});
		if (!message) return;

		if (message.deletable)
			message.delete().catch(() => {
				null;
			});

		const is247 = await this.client.db.get_247(this.client.childEnv.clientId, player.guildId);
		const vc = guild.channels.cache.get(player.voiceChannelId!) as VoiceBasedChannel;
		if (!(vc && vc.members instanceof Map)) return;

		if (vc.members instanceof Map && [...vc.members.values()].filter((x: GuildMember) => !x.user.bot).length <= 0) {
			if (!this.client.timeoutListenersMap.has(player.guildId) && !this.client.timeoutSongsMap.has(player.guildId) && !is247) {
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
						embeds: [embed.setColor(this.client.color.main).setDescription(T(locale, 'will_leave.no_listeners', { time: time }))],
					});
				}
				const timeout = setTimeout(async () => {
					if (!player?.voiceChannelId) return;

					if (!is247) {
						player.destroy();
					}
				}, time * 60_000);
				this.client.timeoutListenersMap.set(player.guildId, timeout);
			}
		}
	}
}


