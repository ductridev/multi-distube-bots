import type { LavalinkNode } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
// import { sendLog } from '../../utils/BotLog';

export default class Reconnecting extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'reconnecting',
		});
	}

	public async run(_node: LavalinkNode): Promise<void> {
		// this.client.logger.success(`Node ${node.id} is reconnecting!`);

		// sendLog(this.client, `Node ${node.id} is reconnecting!`, 'success');
	}
}


