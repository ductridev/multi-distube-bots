import { Event, type Lavamusic } from '../../structures/index';

export default class Raw extends Event {
	client: Lavamusic;

	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'raw',
		});
		this.client = client;
	}

	public async run(d: any): Promise<void> {
		this.client.manager.sendRawData(d);
	}
}


