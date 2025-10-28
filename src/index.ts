import * as fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { shardStart } from './shard';
import { type Lavamusic } from './structures';
import AsyncLock from './structures/AsyncLock';
import { restoreSessions } from './utils/functions/loadSessionsOnStartup';
import { Player } from 'lavalink-client';
import { ShardStateManager } from './structures/ShardStateManager';

const prisma = new PrismaClient();

export const activeBots: Lavamusic[] = [];

// Guild-specific bot preferences (guildId -> clientId[])
export const guildBotPreferences: Map<string, string[]> = new Map();

// Legacy in-memory maps - still used for non-sharded mode
// When sharded, use client.shardStateManager instead
export const voiceChannelMap: Map<string, Map<string, string>> = new Map();

export const sessionMap: Map<string, Map<string, Player | string>> = new Map();

export const updateSession: Map<string, NodeJS.Timeout> = new Map();

export const vcLocks = new AsyncLock();

/**
 * Get the appropriate state manager based on whether the client is sharded
 */
export function getStateManager(client: Lavamusic): ShardStateManager | null {
	// If client has shardStateManager, use it
	if ((client as any).shardStateManager) {
		return (client as any).shardStateManager;
	}
	return null;
}

export function registerBot(botInstance: Lavamusic) {
	activeBots.push(botInstance);
	
	// Set up auto-sync when the bot is ready
	botInstance.once('ready', async () => {
		try {
			await syncBotWithGuilds(botInstance);
		} catch (error) {
			console.error(`Failed to sync bot ${botInstance.childEnv.clientId} with guilds:`, error);
		}
	});
}

// Function to sync bot with all guilds it's currently in
async function syncBotWithGuilds(botInstance: Lavamusic) {
	const guilds = botInstance.guilds.cache;
	let syncedCount = 0;
	
	for (const [guildId, guild] of guilds) {
		try {
			await addBotToGuild(guildId, botInstance.childEnv.clientId);
			syncedCount++;
		} catch (error) {
			console.error(`Failed to sync bot ${botInstance.childEnv.clientId} with guild ${guildId} (${guild.name}):`, error);
		}
	}
	
	console.log(`Bot ${botInstance.childEnv.clientId} synced with ${syncedCount}/${guilds.size} guilds`);
}

// Guild bot preference management
export async function addBotToGuild(guildId: string, clientId: string) {
	const currentBots = guildBotPreferences.get(guildId) || [];
	if (!currentBots.includes(clientId)) {
		currentBots.push(clientId);
		guildBotPreferences.set(guildId, currentBots);
		// Save to database
		await saveBotPreferencesToDB(guildId, currentBots);
	}
}

export async function removeBotFromGuild(guildId: string, clientId: string) {
	const currentBots = guildBotPreferences.get(guildId) || [];
	const index = currentBots.indexOf(clientId);
	if (index !== -1) {
		currentBots.splice(index, 1);
		if (currentBots.length === 0) {
			guildBotPreferences.delete(guildId);
			await deleteBotPreferencesFromDB(guildId);
		} else {
			guildBotPreferences.set(guildId, currentBots);
			await saveBotPreferencesToDB(guildId, currentBots);
		}
	}
}

export function getGuildBotPreferences(guildId: string): string[] {
	return guildBotPreferences.get(guildId) || [];
}

export function getBotsForGuild(guildId: string): Lavamusic[] {
	const preferredClientIds = guildBotPreferences.get(guildId);
	
	if (!preferredClientIds || preferredClientIds.length === 0) {
		// No bots added to this guild, return empty array
		return [];
	}
	
	// Only return bots that are specifically configured for this guild
	const guildBots = activeBots.filter(bot => 
		preferredClientIds.includes(bot.childEnv.clientId)
	);
	
	return guildBots;
}

// Database functions for persistence
async function saveBotPreferencesToDB(guildId: string, clientIds: string[]) {
	try {
		await prisma.guildBotPreferences.upsert({
			where: { guildId },
			update: { botClientIds: clientIds },
			create: { guildId, botClientIds: clientIds }
		});
	} catch (error) {
		console.error(`Failed to save bot preferences for guild ${guildId}:`, error);
	}
}

async function deleteBotPreferencesFromDB(guildId: string) {
	try {
		await prisma.guildBotPreferences.delete({
			where: { guildId }
		});
	} catch (error) {
		console.error(`Failed to delete bot preferences for guild ${guildId}:`, error);
	}
}

export async function loadBotPreferencesFromDB() {
	try {
		const preferences = await prisma.guildBotPreferences.findMany();
		for (const pref of preferences) {
			guildBotPreferences.set(pref.guildId, pref.botClientIds);
		}
		console.log(`Loaded bot preferences for ${preferences.length} guilds`);
	} catch (error) {
		console.error('Failed to load bot preferences from database:', error);
	}
}

// Utility function to manually sync all active bots with their current guilds
export async function syncAllBotsWithGuilds() {
	console.log('Starting manual sync of all bots with their guilds...');
	let totalSynced = 0;
	
	for (const bot of activeBots) {
		if (bot.isReady()) {
			try {
				await syncBotWithGuilds(bot);
				totalSynced++;
			} catch (error) {
				console.error(`Failed to sync bot ${bot.childEnv.clientId}:`, error);
			}
		}
	}
	
	console.log(`Manual sync completed: ${totalSynced}/${activeBots.length} bots synced`);
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
		console.error('LavaLogo.txt file is missing');
		process.exit(1);
	}
	// console.clear();
	// Set a custom title for the console window
	setConsoleTitle('Lavamusic');
	prisma.botConfig.findMany({ where: { active: true } }).then(async bots => {
		if (!bots.length) {
			console.error('[LAUNCH] No bot configurations found.');
			process.exit(1);
		}
		await restoreSessions();
		await loadBotPreferencesFromDB();
		// shardStart(logger, bots[0]);
		// shardStart(logger, bots[1]);
		// shardStart(logger, bots[2]);
		// shardStart(logger, bots[3]);
		for (const bot of bots) {
			shardStart(bot);
		}
	});
} catch (err) {
	console.error('[CLIENT] An error has occurred:', err);
}