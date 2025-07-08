import * as fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { shardStart } from './shard';
import Logger from './structures/Logger';
import { ThemeSelector } from './utils/ThemeSelector';
import { type Lavamusic } from './structures';

const logger = new Logger();

const theme = new ThemeSelector();

const prisma = new PrismaClient();

export const activeBots: Lavamusic[] = [];

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
	const logFile = fs.readFileSync('./src/utils/LavaLogo.txt', 'utf-8');
	console.log(theme.purpleNeon(logFile));
	prisma.botConfig.findMany({ where: { active: true } }).then(async bots => {
		if (!bots.length) {
			logger.error('[LAUNCH] No bot configurations found.');
			process.exit(1);
		}
		// shardStart(logger, bots[0]);
		// shardStart(logger, bots[1]);
		// shardStart(logger, bots[2]);
		// shardStart(logger, bots[3]);
		for (const bot of bots) {
			// Wait for 5 seconds before starting the shards
			await new Promise(resolve => setTimeout(resolve, 5000));
			shardStart(logger, bot);
		}
	});
} catch (err) {
	logger.error('[CLIENT] An error has occurred:', err);
}