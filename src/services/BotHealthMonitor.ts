/**
 * Bot Health Monitor Service
 * Monitors bot health and automatically restarts failed bots
 */

import type { Lavamusic } from "../structures/index.js";
import Logger from "../structures/Logger.js";

interface HealthCheckResult {
	clientId: string;
	status: "healthy" | "unhealthy" | "critical";
	uptime: number;
	memory: number;
	cpu: number;
	latency: number;
	lastCheck: Date;
	issues: string[];
}

interface HealthCheckConfig {
	interval: number; // ms between checks
	maxMemory: number; // MB
	maxLatency: number; // ms
	maxRestarts: number; // per hour
	restartCooldown: number; // ms between restarts
}

export class BotHealthMonitor {
	private logger: Logger;
	private checkInterval: NodeJS.Timeout | null = null;
	private restartCounts = new Map<string, number[]>();
	private lastRestart = new Map<string, number>();

	private config: HealthCheckConfig = {
		interval: 30000, // 30 seconds
		maxMemory: 512, // 512 MB
		maxLatency: 500, // 500ms
		maxRestarts: 3, // 3 restarts per hour
		restartCooldown: 300000, // 5 minutes
	};

	constructor(private bots: Lavamusic[]) {
		this.logger = new Logger("HealthMonitor");
	}

	/**
	 * Start health monitoring
	 */
	public start(): void {
		this.logger.info("[Health Monitor] Starting bot health checks...");

		this.checkInterval = setInterval(() => {
			this.performHealthChecks();
		}, this.config.interval);

		// Initial check
		this.performHealthChecks();
	}

	/**
	 * Stop health monitoring
	 */
	public stop(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
			this.logger.info("[Health Monitor] Stopped bot health checks");
		}
	}

	/**
	 * Perform health checks on all bots
	 */
	private async performHealthChecks(): Promise<void> {
		for (const bot of this.bots) {
			try {
				const result = await this.checkBotHealth(bot);

				if (result.status === "critical") {
					this.logger.error(
						`[Health Monitor] Bot ${result.clientId} is in CRITICAL state: ${result.issues.join(", ")}`,
					);
					await this.handleCriticalBot(bot, result);
				} else if (result.status === "unhealthy") {
					this.logger.warn(
						`[Health Monitor] Bot ${result.clientId} is UNHEALTHY: ${result.issues.join(", ")}`,
					);
				}
			} catch (error) {
				this.logger.error(
					`[Health Monitor] Error checking bot ${bot.childEnv.clientId}: ${error}`,
				);
			}
		}
	}

	/**
	 * Check health of a single bot
	 */
	private async checkBotHealth(bot: Lavamusic): Promise<HealthCheckResult> {
		const clientId = bot.childEnv.clientId;
		const issues: string[] = [];

		// Check if bot is ready
		if (!bot.isReady()) {
			issues.push("Bot not ready");
		}

		// Check WebSocket connection
		if (bot.ws.status !== 0) {
			// 0 = READY
			issues.push(`WebSocket status: ${bot.ws.status}`);
		}

		// Check memory usage
		const memory = process.memoryUsage().heapUsed / 1024 / 1024;
		if (memory > this.config.maxMemory) {
			issues.push(`High memory: ${memory.toFixed(2)} MB`);
		}

		// Check latency
		const latency = bot.ws.ping;
		if (latency > this.config.maxLatency) {
			issues.push(`High latency: ${latency}ms`);
		}

		// Check uptime
		const uptime = bot.uptime || 0;

		// Determine status
		let status: "healthy" | "unhealthy" | "critical" = "healthy";
		if (issues.length > 0) {
			status = issues.some((i) => i.includes("Bot not ready") || i.includes("WebSocket"))
				? "critical"
				: "unhealthy";
		}

		return {
			clientId,
			status,
			uptime,
			memory,
			cpu: 0, // TODO: Implement CPU tracking
			latency,
			lastCheck: new Date(),
			issues,
		};
	}

	/**
	 * Handle a bot in critical state
	 */
	private async handleCriticalBot(
		bot: Lavamusic,
		result: HealthCheckResult,
	): Promise<void> {
		const clientId = result.clientId;

		// Check if we can restart
		if (!this.canRestart(clientId)) {
			this.logger.error(
				`[Health Monitor] Cannot restart bot ${clientId}: Too many restarts or cooldown active`,
			);
			return;
		}

		this.logger.info(`[Health Monitor] Attempting to restart bot ${clientId}...`);

		try {
			// Record restart attempt
			this.recordRestart(clientId);

			// Destroy current instance
			await bot.destroy();

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 5000));

			// Reinitialize
			await bot.start();

			this.logger.info(`[Health Monitor] Successfully restarted bot ${clientId}`);
		} catch (error) {
			this.logger.error(
				`[Health Monitor] Failed to restart bot ${clientId}: ${error}`,
			);
		}
	}

	/**
	 * Check if bot can be restarted
	 */
	private canRestart(clientId: string): boolean {
		// Check cooldown
		const lastRestart = this.lastRestart.get(clientId);
		if (lastRestart && Date.now() - lastRestart < this.config.restartCooldown) {
			return false;
		}

		// Check restart count
		const restarts = this.restartCounts.get(clientId) || [];
		const oneHourAgo = Date.now() - 3600000;
		const recentRestarts = restarts.filter((time) => time > oneHourAgo);

		return recentRestarts.length < this.config.maxRestarts;
	}

	/**
	 * Record a restart attempt
	 */
	private recordRestart(clientId: string): void {
		const now = Date.now();
		const restarts = this.restartCounts.get(clientId) || [];
		const oneHourAgo = now - 3600000;

		// Clean old restarts and add new one
		const recentRestarts = restarts.filter((time) => time > oneHourAgo);
		recentRestarts.push(now);

		this.restartCounts.set(clientId, recentRestarts);
		this.lastRestart.set(clientId, now);
	}

	/**
	 * Get health status for all bots
	 */
	public async getAllHealthStatus(): Promise<HealthCheckResult[]> {
		const results: HealthCheckResult[] = [];

		for (const bot of this.bots) {
			try {
				const result = await this.checkBotHealth(bot);
				results.push(result);
			} catch (error) {
				this.logger.error(
					`[Health Monitor] Error getting health for bot ${bot.childEnv.clientId}: ${error}`,
				);
			}
		}

		return results;
	}

	/**
	 * Update configuration
	 */
	public updateConfig(config: Partial<HealthCheckConfig>): void {
		this.config = { ...this.config, ...config };
		this.logger.info("[Health Monitor] Configuration updated");
	}
}
