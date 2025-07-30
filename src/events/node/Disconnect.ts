import type { LavalinkNode } from 'lavalink-client';
import { Event, type Lavamusic } from '../../structures/index';
import { updateSession } from '../..';
// import { sendLog } from '../../utils/BotLog';

export default class Disconnect extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: 'disconnect',
		});
	}

	public async run(node: LavalinkNode, reason: {
		code?: number;
		reason?: string;
	}): Promise<void> {
		this.client.logger.success(`Node ${node.id} is disconnected!`, reason);

		if (updateSession.has(`${node.id}-${this.client.childEnv.clientId}`)) {
			updateSession.get(`${node.id}-${this.client.childEnv.clientId}`)!.close();
			updateSession.delete(`${node.id}-${this.client.childEnv.clientId}`);
		}

		// sendLog(this.client, `Node ${node.id} is disconnected!`, 'success');
	}
}


