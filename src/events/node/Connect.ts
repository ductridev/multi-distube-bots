import type { LavalinkNode } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { sendLog } from '../../utils/BotLog';

export default class Connect extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'connect',
		});
	}

	public async run(node: LavalinkNode): Promise<void> {
		this.client.logger.success(`Node ${node.id} is ready!`);

		await node.updateSession(true, 60e3);

		let data = await this.client.db.get_247(this.client.childEnv.clientId);
		if (!data) return;

		if (!Array.isArray(data)) {
			data = [data];
		}

		data.forEach((main: { guildId: string; textId: string, botClientId: string; voiceId: string }, index: number) => {
			setTimeout(async () => {
				if (this.client.childEnv.clientId !== main.botClientId) return;

				const guild = this.client.guilds.cache.get(main.guildId);
				if (!guild) return;

				const channel = guild.channels.cache.get(main.textId);
				const vc = guild.channels.cache.get(main.voiceId);

				if (channel && vc) {
					try {
						const player = this.client.manager.createPlayer({
							guildId: guild.id,
							voiceChannelId: vc.id,
							textChannelId: channel.id,
							selfDeaf: true,
							selfMute: false,
						});
						if (!player.connected) await player.connect();
						player.set('autoplay', true);
					} catch (error) {
						this.client.logger.error(`Failed to create queue for guild ${guild.id}: ${error}`);
					}
				} else {
					this.client.logger.warn(
						`Missing channels for guild ${guild.id}. Text channel: ${main.textId}, Voice channel: ${main.voiceId}`,
					);
				}
			}, index * 1000);
		});

		sendLog(this.client, `Node ${node.id} is ready!`, 'success');
	}
}


