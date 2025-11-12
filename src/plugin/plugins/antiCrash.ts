import type { Lavamusic } from '../../structures/index';
import { saveSessions } from '../../utils/functions/saveSessionsOnExit';
import type { BotPlugin } from '../index';

const antiCrash: BotPlugin = {
	name: 'AntiCrash Plugin',
	version: '1.0.0',
	author: 'Appu',
	initialize: (client: Lavamusic) => {
		const handleExit = async (): Promise<void> => {
			if (client) {
				// Set shutdown flag to prevent player data deletion
				client.isShuttingDown = true;
				client.logger.info('Graceful shutdown initiated - preserving player state...');
				saveSessions();
				client.logger.star('Disconnecting from Discord...');
				await client.destroy();
				client.logger.success('Successfully disconnected from Discord!');
				process.exit();
			}
		};
		process.on('unhandledRejection', (reason, promise) => {
			client.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
		});
		process.on('uncaughtException', err => {
			client.logger.error('Uncaught Exception thrown:', err.message, err.stack);
		});
		process.on('SIGINT', handleExit);
		process.on('SIGTERM', handleExit);
		process.on('SIGQUIT', handleExit);
	},
};

export default antiCrash;


