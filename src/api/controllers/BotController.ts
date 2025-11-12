import { PrismaClient } from '@prisma/client';
import type { CreateBotDTO, UpdateBotDTO } from '../types';
import { activeBots } from '../../index';
import Logger from '../../structures/Logger';

const prisma = new PrismaClient();
const logger = new Logger('BotController');

export class BotController {
	// Get all bots
	static async getAllBots() {
		try {
			const bots = await prisma.botConfig.findMany({
				orderBy: { name: 'asc' },
			});

		// Enhance with runtime status
		const botsWithStatus = bots.map(bot => {
			const activeBot = activeBots.find(b => b.childEnv.clientId === bot.clientId);
			const avatarUrl = activeBot?.user?.displayAvatarURL({ extension: 'png', size: 256 });
			
			// Debug logging
			if (activeBot) {
				logger.info(`Bot ${bot.name} (${bot.clientId}): Avatar URL = ${avatarUrl || 'none'}`);
			}
			
			return {
				...bot,
				name: activeBot?.user?.username || bot.name,
				isOnline: !!activeBot,
				isRunning: !!activeBot,
				guildCount: activeBot?.guilds.cache.size || 0,
				userCount: activeBot?.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0) || 0,
				uptime: activeBot ? process.uptime() : 0,
				ping: activeBot?.ws.ping || 0,
				avatar: avatarUrl || undefined,
			};
		});

		return { success: true, data: botsWithStatus };
		} catch (error) {
			logger.error('Failed to get all bots:', error);
			return { success: false, error: 'Failed to fetch bots' };
		}
	}

	// Get specific bot
	static async getBotById(idOrClientId: string) {
		try {
			// Try to find by clientId first (Discord ID)
			let bot = await prisma.botConfig.findUnique({
				where: { clientId: idOrClientId },
				include: {
					guildConfigs: true,
					stays: true,
				},
			});

			// If not found and it looks like a MongoDB ObjectId, try finding by id
			if (!bot && idOrClientId.match(/^[0-9a-fA-F]{24}$/)) {
				bot = await prisma.botConfig.findUnique({
					where: { id: idOrClientId },
					include: {
						guildConfigs: true,
						stays: true,
					},
				});
			}

		if (!bot) {
			return { success: false, error: 'Bot not found' };
		}


		const activeBot = activeBots.find(b => b.childEnv.clientId === bot.clientId);
		const avatarUrl = activeBot?.user?.displayAvatarURL({ extension: 'png', size: 256 });

		return {
			success: true,
			data: {
				...bot,
				name: activeBot?.user?.username || bot.name,
				isOnline: !!activeBot,
				isRunning: !!activeBot,
				guildCount: activeBot?.guilds.cache.size || 0,
				userCount: activeBot?.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0) || 0,
				uptime: activeBot ? process.uptime() : 0,
				ping: activeBot?.ws.ping || 0,
				avatar: avatarUrl || undefined,
			},
		};
	} catch (error) {
		logger.error(`Failed to get bot ${idOrClientId}:`, error);
		return { success: false, error: 'Failed to fetch bot' };
	}
}	// Create new bot
	static async createBot(data: CreateBotDTO) {
		try {
			const bot = await prisma.botConfig.create({
				data: {
					name: data.name,
					token: data.token,
					prefix: data.prefix,
					clientId: data.clientId,
					status: data.status || 'online',
					activity: data.activity || 'Lavamusic',
					activityType: data.activityType || 0,
					active: true,
				},
			});

			logger.success(`Created new bot: ${bot.name} (${bot.clientId})`);
			return { success: true, data: bot };
		} catch (error) {
			logger.error('Failed to create bot:', error);
			return { success: false, error: 'Failed to create bot' };
		}
	}

	// Update bot
	static async updateBot(idOrClientId: string, data: UpdateBotDTO) {
		try {
			// First, find the bot to get its clientId
			let bot = await prisma.botConfig.findUnique({
				where: { clientId: idOrClientId },
			});

			// If not found and it looks like a MongoDB ObjectId, try finding by id
			if (!bot && idOrClientId.match(/^[0-9a-fA-F]{24}$/)) {
				bot = await prisma.botConfig.findUnique({
					where: { id: idOrClientId },
				});
			}

			if (!bot) {
				return { success: false, error: 'Bot not found' };
			}

			// Update using clientId (unique constraint)
			const updatedBot = await prisma.botConfig.update({
				where: { clientId: bot.clientId },
				data,
			});

			logger.success(`Updated bot: ${updatedBot.name} (${updatedBot.clientId})`);
			return { success: true, data: updatedBot };
		} catch (error) {
			logger.error(`Failed to update bot ${idOrClientId}:`, error);
			return { success: false, error: 'Failed to update bot' };
		}
	}

	// Delete bot
	static async deleteBot(idOrClientId: string) {
		try {
			// First, find the bot to get its clientId
			let bot = await prisma.botConfig.findUnique({
				where: { clientId: idOrClientId },
			});

			// If not found and it looks like a MongoDB ObjectId, try finding by id
			if (!bot && idOrClientId.match(/^[0-9a-fA-F]{24}$/)) {
				bot = await prisma.botConfig.findUnique({
					where: { id: idOrClientId },
				});
			}

			if (!bot) {
				return { success: false, error: 'Bot not found' };
			}

			// Delete using clientId (unique constraint)
			await prisma.botConfig.delete({
				where: { clientId: bot.clientId },
			});

			logger.success(`Deleted bot: ${bot.clientId}`);
			return { success: true };
		} catch (error) {
			logger.error(`Failed to delete bot ${idOrClientId}:`, error);
			return { success: false, error: 'Failed to delete bot' };
		}
	}

	// Get bot statistics
	static async getBotStats(idOrClientId: string) {
		try {
			// First, find the bot to get its clientId
			let bot = await prisma.botConfig.findUnique({
				where: { clientId: idOrClientId },
				select: { clientId: true },
			});

			// If not found and it looks like a MongoDB ObjectId, try finding by id
			if (!bot && idOrClientId.match(/^[0-9a-fA-F]{24}$/)) {
				bot = await prisma.botConfig.findUnique({
					where: { id: idOrClientId },
					select: { clientId: true },
				});
			}

			if (!bot) {
				return { success: false, error: 'Bot not found' };
			}

			const activeBot = activeBots.find(b => b.childEnv.clientId === bot.clientId);

			if (!activeBot) {
				return { success: false, error: 'Bot not running' };
			}

			const stats = {
				clientId: bot.clientId,
				guildCount: activeBot.guilds.cache.size,
				userCount: activeBot.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
				channelCount: activeBot.channels.cache.size,
				uptime: process.uptime(),
				ping: activeBot.ws.ping,
				memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
				activePlayers: activeBot.manager?.players.size || 0,
			};

			return { success: true, data: stats };
		} catch (error) {
			logger.error(`Failed to get stats for bot ${idOrClientId}:`, error);
			return { success: false, error: 'Failed to fetch bot stats' };
		}
	}
}
