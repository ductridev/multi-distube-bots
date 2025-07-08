import type { DestroyReasonsType, LavalinkNode } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { sendLog } from '../../utils/BotLog';

export default class Destroy extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'destroy',
		});
	}

	public async run(node: LavalinkNode, destroyReason?: DestroyReasonsType): Promise<void> {
		this.client.logger.success(`Node ${node.id} is destroyed!`);
		sendLog(this.client, `Node ${node.id} is destroyed: ${destroyReason}`, 'warn');
	}
}


