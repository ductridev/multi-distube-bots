/**
 * Bot Bulk Operations Service
 * Handle bulk operations on multiple bots
 */

import type { Lavamusic } from "../structures/index.js";
import Logger from "../structures/Logger.js";
import { PrismaClient } from "@prisma/client";
import { RateLimitTracker } from "./RateLimitTracker.js";

const prisma = new PrismaClient();

export interface BulkOperationResult {
	total: number;
	successful: number;
	failed: number;
	results: {
		clientId: string;
		success: boolean;
		error?: string;
	}[];
}

export class BotBulkOperations {
	private logger: Logger;
	private rateLimiter: RateLimitTracker;

	constructor(private bots: Lavamusic[]) {
		this.logger = new Logger("BulkOperations");
		this.rateLimiter = RateLimitTracker.getInstance();
	}

	/**
	 * Start multiple bots
	 */
	public async startBots(clientIds: string[]): Promise<BulkOperationResult> {
		this.logger.info(`[Bulk Operations] Starting ${clientIds.length} bots...`);

		const results: BulkOperationResult = {
			total: clientIds.length,
			successful: 0,
			failed: 0,
			results: [],
		};

		for (const clientId of clientIds) {
			try {
				const bot = this.bots.find((b) => b.childEnv.clientId === clientId);
				if (!bot) {
					results.results.push({
						clientId,
						success: false,
						error: "Bot not found",
					});
					results.failed++;
					continue;
				}

				if (bot.isReady()) {
					results.results.push({
						clientId,
						success: true,
					});
					results.successful++;
					continue;
				}

				await bot.start();

				results.results.push({
					clientId,
					success: true,
				});
				results.successful++;

				this.logger.info(`[Bulk Operations] Started bot ${clientId}`);
			} catch (error) {
				results.results.push({
					clientId,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
				results.failed++;

				this.logger.error(`[Bulk Operations] Failed to start bot ${clientId}: ${error}`);
			}

			// Small delay between operations
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		this.logger.info(
			`[Bulk Operations] Start complete: ${results.successful}/${results.total} successful`,
		);

		return results;
	}

	/**
	 * Stop multiple bots
	 */
	public async stopBots(clientIds: string[]): Promise<BulkOperationResult> {
		this.logger.info(`[Bulk Operations] Stopping ${clientIds.length} bots...`);

		const results: BulkOperationResult = {
			total: clientIds.length,
			successful: 0,
			failed: 0,
			results: [],
		};

		for (const clientId of clientIds) {
			try {
				const bot = this.bots.find((b) => b.childEnv.clientId === clientId);
				if (!bot) {
					results.results.push({
						clientId,
						success: false,
						error: "Bot not found",
					});
					results.failed++;
					continue;
				}

				await bot.destroy();

				results.results.push({
					clientId,
					success: true,
				});
				results.successful++;

				this.logger.info(`[Bulk Operations] Stopped bot ${clientId}`);
			} catch (error) {
				results.results.push({
					clientId,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
				results.failed++;

				this.logger.error(`[Bulk Operations] Failed to stop bot ${clientId}: ${error}`);
			}

			// Small delay between operations
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		this.logger.info(
			`[Bulk Operations] Stop complete: ${results.successful}/${results.total} successful`,
		);

		return results;
	}

	/**
	 * Restart multiple bots
	 */
	public async restartBots(clientIds: string[]): Promise<BulkOperationResult> {
		this.logger.info(`[Bulk Operations] Restarting ${clientIds.length} bots...`);

		const results: BulkOperationResult = {
			total: clientIds.length,
			successful: 0,
			failed: 0,
			results: [],
		};

		for (const clientId of clientIds) {
			try {
				const bot = this.bots.find((b) => b.childEnv.clientId === clientId);
				if (!bot) {
					results.results.push({
						clientId,
						success: false,
						error: "Bot not found",
					});
					results.failed++;
					continue;
				}

				// Stop
				await bot.destroy();

				// Wait
				await new Promise((resolve) => setTimeout(resolve, 3000));

				// Start
				await bot.start();

				results.results.push({
					clientId,
					success: true,
				});
				results.successful++;

				this.logger.info(`[Bulk Operations] Restarted bot ${clientId}`);
			} catch (error) {
				results.results.push({
					clientId,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
				results.failed++;

				this.logger.error(
					`[Bulk Operations] Failed to restart bot ${clientId}: ${error}`,
				);
			}

			// Small delay between operations
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}

		this.logger.info(
			`[Bulk Operations] Restart complete: ${results.successful}/${results.total} successful`,
		);

		return results;
	}

	/**
	 * Update activity for multiple bots
	 */
	public async updateActivity(
		clientIds: string[],
		activity: {
			name: string;
			type: number;
			status: string;
		},
	): Promise<BulkOperationResult> {
		this.logger.info(`[Bulk Operations] Updating activity for ${clientIds.length} bots...`);

		const results: BulkOperationResult = {
			total: clientIds.length,
			successful: 0,
			failed: 0,
			results: [],
		};

		for (const clientId of clientIds) {
			try {
				const bot = this.bots.find((b) => b.childEnv.clientId === clientId);
				if (!bot) {
					results.results.push({
						clientId,
						success: false,
						error: "Bot not found",
					});
					results.failed++;
					continue;
				}

				if (!bot.isReady()) {
					results.results.push({
						clientId,
						success: false,
						error: "Bot not ready",
					});
					results.failed++;
					continue;
				}

				bot.user?.setPresence({
					activities: [
						{
							name: activity.name,
							type: activity.type,
						},
					],
					status: activity.status as any,
				});

				results.results.push({
					clientId,
					success: true,
				});
				results.successful++;

				this.logger.info(`[Bulk Operations] Updated activity for bot ${clientId}`);
			} catch (error) {
				results.results.push({
					clientId,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
				results.failed++;

				this.logger.error(
					`[Bulk Operations] Failed to update activity for bot ${clientId}: ${error}`,
				);
			}
		}

		this.logger.info(
			`[Bulk Operations] Activity update complete: ${results.successful}/${results.total} successful`,
		);

		return results;
	}

	/**
	 * Broadcast message to all guilds across selected bots
	 * Uses rate limiting to avoid hitting Discord's 50 req/sec global limit
	 */
	public async broadcastMessage(
		clientIds: string[],
		channelType: "system" | "setup",
		message: string,
	): Promise<BulkOperationResult> {
		this.logger.info(
			`[Bulk Operations] Broadcasting message to ${channelType} channels across ${clientIds.length} bots...`,
		);

		const results: BulkOperationResult = {
			total: clientIds.length,
			successful: 0,
			failed: 0,
			results: [],
		};

		for (const clientId of clientIds) {
			try {
				const bot = this.bots.find((b) => b.childEnv.clientId === clientId);
				if (!bot) {
					results.results.push({
						clientId,
						success: false,
						error: "Bot not found",
					});
					results.failed++;
					continue;
				}

				if (!bot.isReady()) {
					results.results.push({
						clientId,
						success: false,
						error: "Bot not ready",
					});
					results.failed++;
					continue;
				}

				let sentCount = 0;
				let failedCount = 0;

				for (const guild of bot.guilds.cache.values()) {
					try {
						// Get setup channel if type is setup
						if (channelType === "setup") {
							const setupChannel = await prisma.setup.findFirst({
								where: { guildId: guild.id },
							});

							if (setupChannel?.textId) {
								const channel = guild.channels.cache.get(setupChannel.textId);
								if (channel?.isTextBased()) {
									// Use rate-limited send
									await this.rateLimiter.throttled(async () => {
										await channel.send(message);
									});
									sentCount++;
								}
							}
						} else {
							// Find system channel
							const systemChannel = guild.systemChannel;
							if (systemChannel) {
								// Use rate-limited send
								await this.rateLimiter.throttled(async () => {
									await systemChannel.send(message);
								});
								sentCount++;
							}
						}
					} catch (error: any) {
						failedCount++;

						// Handle rate limit errors specifically
						if (error.code === 429 || error.status === 429) {
							const info = this.rateLimiter.handleRateLimitError(error);
							this.logger.warn(
								`[BROADCAST] Rate limited during broadcast to guild ${guild.id}. ` +
								`Scope: ${info.scope}, Retry after: ${info.retryAfterMs}ms`,
							);
						} else {
							this.logger.error(
								`[BROADCAST] Failed to send to guild ${guild.id}: ${error instanceof Error ? error.message : String(error)}`,
							);
						}
					}
				}

				results.results.push({
					clientId,
					success: true,
				});
				results.successful++;

				this.logger.info(
					`[Bulk Operations] Broadcast to bot ${clientId}: ${sentCount} guilds sent, ${failedCount} failed`,
				);
			} catch (error) {
				results.results.push({
					clientId,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
				results.failed++;

				this.logger.error(
					`[Bulk Operations] Failed to broadcast for bot ${clientId}: ${error}`,
				);
			}
		}

		this.logger.info(
			`[Bulk Operations] Broadcast complete: ${results.successful}/${results.total} successful`,
		);

		return results;
	}
}
