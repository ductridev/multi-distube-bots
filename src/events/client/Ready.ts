import { AutoPoster } from 'topgg-autoposter';
import { Event, type Lavamusic } from '../../structures/index';

export default class Ready extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'ready',
		});
	}

	public async run(): Promise<void> {
		this.client.logger.success(`${this.client.user?.tag} is ready!`);

		this.client.user?.setPresence({
			activities: [
				{
					name: this.client.childEnv.activity ?? 'Tui tên Bô',
					type: this.client.childEnv.activityType as any,
				},
			],
			status: this.client.childEnv.status as any,
		});

		if (this.client.env.TOPGG) {
			const autoPoster = AutoPoster(this.client.env.TOPGG, this.client);
			setInterval(() => {
				autoPoster.on('posted', _stats => {
					null;
				});
			}, 24 * 60 * 60e3); // 24 hours in milliseconds
		} else {
			this.client.logger.warn('Top.gg token not found. Skipping auto poster.');
		}
		await this.client.manager.init({ ...this.client.user!, shards: 'auto' });
	}
}


