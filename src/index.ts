import * as fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { shardStart } from './shard';
import Logger from './structures/Logger';
import { type Lavamusic } from './structures';
import AsyncLock from './structures/AsyncLock';
import { restoreSessions } from './utils/functions/loadSessionsOnStartup';
import { Player } from 'lavalink-client';

const logger = new Logger();

const prisma = new PrismaClient();

export const activeBots: Lavamusic[] = [];

export const voiceChannelMap: Map<string, Map<string, string>> = new Map();

export const sessionMap: Map<string, Map<string, Player | string>> = new Map();

export const updateSession: Map<string, NodeJS.Timeout> = new Map();

export const vcLocks = new AsyncLock();

export function registerBot(botInstance: Lavamusic) {
	activeBots.push(botInstance);
}

/**
 * Sets the console window title.
 * @param title - The new title for the console window.
 */
function setConsoleTitle(title: string): void {
	// Write the escape sequence to change the console title
	process.stdout.write(`\x1b]0;${title}\x07`);
}

try {
	if (!fs.existsSync('./src/utils/LavaLogo.txt')) {
		logger.error('LavaLogo.txt file is missing');
		process.exit(1);
	}
	// console.clear();
	// Set a custom title for the console window
	setConsoleTitle('Lavamusic');
	prisma.botConfig.findMany({ where: { active: true } }).then(async bots => {
		if (!bots.length) {
			logger.error('[LAUNCH] No bot configurations found.');
			process.exit(1);
		}
		await restoreSessions();
		// shardStart(logger, bots[0]);
		// shardStart(logger, bots[1]);
		// shardStart(logger, bots[2]);
		// shardStart(logger, bots[3]);
		for (const bot of bots) {
			shardStart(logger, bot);
		}
	});
} catch (err) {
	logger.error('[CLIENT] An error has occurred:', err);
}