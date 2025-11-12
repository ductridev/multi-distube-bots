/**
 * Performance Alerts Service
 * Monitor performance and send alerts via Discord/Email
 */

import type { Lavamusic } from "../structures/index.js";
import Logger from "../structures/Logger.js";
import { WebhookClient, EmbedBuilder } from "discord.js";

export interface AlertConfig {
	enabled: boolean;
	webhookUrl?: string; // Discord webhook for alerts
	thresholds: {
		memory: number; // MB
		cpu: number; // percentage
		latency: number; // ms
		errorRate: number; // errors per minute
	};
	cooldown: number; // ms between same alerts
}

export interface Alert {
	type: "memory" | "cpu" | "latency" | "error" | "offline";
	clientId: string;
	botName: string;
	severity: "low" | "medium" | "high" | "critical";
	message: string;
	value: number;
	threshold: number;
	timestamp: Date;
}

export class PerformanceAlertsService {
	private logger: Logger;
	private webhook?: WebhookClient;
	private lastAlerts = new Map<string, number>();
	private errorCounts = new Map<string, number[]>();

	private config: AlertConfig = {
		enabled: true,
		thresholds: {
			memory: 512, // 512 MB
			cpu: 80, // 80%
			latency: 500, // 500ms
			errorRate: 10, // 10 errors per minute
		},
		cooldown: 300000, // 5 minutes
	};

	constructor(config?: Partial<AlertConfig>) {
		this.logger = new Logger("PerformanceAlerts");
		if (config) {
			this.config = { ...this.config, ...config };
		}

		if (this.config.webhookUrl) {
			try {
				this.webhook = new WebhookClient({ url: this.config.webhookUrl });
				this.logger.info(
					"[Performance Alerts] Discord webhook configured",
				);
			} catch (error) {
				this.logger.error(
					`[Performance Alerts] Failed to create webhook: ${error}`,
				);
			}
		}
	}

	/**
	 * Check bot performance and send alerts if needed
	 */
	public async checkPerformance(bot: Lavamusic): Promise<void> {
		const clientId = bot.childEnv.clientId;
		const botName = bot.childEnv.name;

		// Check memory
		const memory = process.memoryUsage().heapUsed / 1024 / 1024;
		if (memory > this.config.thresholds.memory) {
			await this.sendAlert({
				type: "memory",
				clientId,
				botName,
				severity: this.getSeverity(memory, this.config.thresholds.memory),
				message: `High memory usage detected`,
				value: memory,
				threshold: this.config.thresholds.memory,
				timestamp: new Date(),
			});
		}

		// Check latency
		const latency = bot.ws.ping;
		if (latency > this.config.thresholds.latency) {
			await this.sendAlert({
				type: "latency",
				clientId,
				botName,
				severity: this.getSeverity(latency, this.config.thresholds.latency),
				message: `High latency detected`,
				value: latency,
				threshold: this.config.thresholds.latency,
				timestamp: new Date(),
			});
		}

		// Check if bot is offline
		if (!bot.isReady()) {
			await this.sendAlert({
				type: "offline",
				clientId,
				botName,
				severity: "critical",
				message: `Bot is offline or not ready`,
				value: 0,
				threshold: 0,
				timestamp: new Date(),
			});
		}

		// Check error rate
		const errorRate = this.getErrorRate(clientId);
		if (errorRate > this.config.thresholds.errorRate) {
			await this.sendAlert({
				type: "error",
				clientId,
				botName,
				severity: this.getSeverity(errorRate, this.config.thresholds.errorRate),
				message: `High error rate detected`,
				value: errorRate,
				threshold: this.config.thresholds.errorRate,
				timestamp: new Date(),
			});
		}
	}

	/**
	 * Record an error for error rate tracking
	 */
	public recordError(clientId: string): void {
		const now = Date.now();
		const errors = this.errorCounts.get(clientId) || [];

		// Remove errors older than 1 minute
		const recentErrors = errors.filter((time) => now - time < 60000);
		recentErrors.push(now);

		this.errorCounts.set(clientId, recentErrors);
	}

	/**
	 * Get current error rate (errors per minute)
	 */
	private getErrorRate(clientId: string): number {
		const errors = this.errorCounts.get(clientId) || [];
		return errors.length;
	}

	/**
	 * Send an alert
	 */
	private async sendAlert(alert: Alert): Promise<void> {
		if (!this.config.enabled) {
			return;
		}

		// Check cooldown
		const alertKey = `${alert.clientId}-${alert.type}`;
		const lastAlert = this.lastAlerts.get(alertKey);

		if (lastAlert && Date.now() - lastAlert < this.config.cooldown) {
			return; // Skip alert due to cooldown
		}

		// Log alert
		this.logger.warn(
			`[Alert] [${alert.severity.toUpperCase()}] ${alert.botName}: ${alert.message} (${alert.value}/${alert.threshold})`,
		);

		// Send to Discord if webhook configured
		if (this.webhook) {
			await this.sendDiscordAlert(alert);
		}

		// Update last alert time
		this.lastAlerts.set(alertKey, Date.now());
	}

	/**
	 * Send alert to Discord webhook
	 */
	private async sendDiscordAlert(alert: Alert): Promise<void> {
		if (!this.webhook) {
			return;
		}

		const color =
			alert.severity === "critical"
				? 0xff0000 // Red
				: alert.severity === "high"
					? 0xff6600 // Orange
					: alert.severity === "medium"
						? 0xffcc00 // Yellow
						: 0x00ffff; // Cyan

		const embed = new EmbedBuilder()
			.setTitle(`⚠️ Performance Alert - ${alert.botName}`)
			.setDescription(alert.message)
			.setColor(color)
			.addFields(
				{ name: "Type", value: alert.type.toUpperCase(), inline: true },
				{ name: "Severity", value: alert.severity.toUpperCase(), inline: true },
				{ name: "Bot ID", value: alert.clientId, inline: true },
			)
			.setTimestamp(alert.timestamp);

		if (alert.type !== "offline") {
			embed.addFields(
				{
					name: "Current Value",
					value: this.formatValue(alert.value, alert.type),
					inline: true,
				},
				{
					name: "Threshold",
					value: this.formatValue(alert.threshold, alert.type),
					inline: true,
				},
			);
		}

		try {
			await this.webhook.send({
				embeds: [embed],
				username: "Performance Monitor",
			});
		} catch (error) {
			this.logger.error(
				`[Performance Alerts] Failed to send Discord alert: ${error}`,
			);
		}
	}

	/**
	 * Format alert value based on type
	 */
	private formatValue(value: number, type: string): string {
		switch (type) {
			case "memory":
				return `${value.toFixed(2)} MB`;
			case "cpu":
				return `${value.toFixed(1)}%`;
			case "latency":
				return `${value.toFixed(0)}ms`;
			case "error":
				return `${value.toFixed(0)} errors/min`;
			default:
				return value.toString();
		}
	}

	/**
	 * Determine severity based on how much threshold is exceeded
	 */
	private getSeverity(value: number, threshold: number): "low" | "medium" | "high" | "critical" {
		const ratio = value / threshold;

		if (ratio >= 2) {
			return "critical";
		}
		if (ratio >= 1.5) {
			return "high";
		}
		if (ratio >= 1.2) {
			return "medium";
		}
		return "low";
	}

	/**
	 * Update configuration
	 */
	public updateConfig(config: Partial<AlertConfig>): void {
		this.config = { ...this.config, ...config };

		// Update webhook if URL changed
		if (config.webhookUrl) {
			try {
				this.webhook = new WebhookClient({ url: config.webhookUrl });
				this.logger.info(
					"[Performance Alerts] Discord webhook updated",
				);
			} catch (error) {
				this.logger.error(
					`[Performance Alerts] Failed to update webhook: ${error}`,
				);
			}
		}

		this.logger.info("[Performance Alerts] Configuration updated");
	}

	/**
	 * Clear alert history
	 */
	public clearAlerts(): void {
		this.lastAlerts.clear();
		this.errorCounts.clear();
		this.logger.info("[Performance Alerts] Alert history cleared");
	}
}
