/**
 * Report Generator Service
 * Generate PDF/Excel reports for statistics and analytics
 */

import { PrismaClient } from "@prisma/client";
import Logger from "../structures/Logger.js";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ReportConfig {
	type: "pdf" | "csv" | "json";
	dateRange: {
		start: Date;
		end: Date;
	};
	sections: {
		botStats?: boolean;
		guildStats?: boolean;
		playerHistory?: boolean;
		topTracks?: boolean;
		auditLogs?: boolean;
	};
	format?: {
		includeCharts?: boolean;
		includeMetadata?: boolean;
	};
}

export interface ReportData {
	metadata: {
		generated: Date;
		dateRange: {
			start: Date;
			end: Date;
		};
		reportType: string;
	};
	botStats?: {
		totalBots: number;
		activeBots: number;
		totalGuilds: number;
		totalPlayers: number;
		totalPlays: number;
		avgUptime: number;
		avgMemory: number;
		avgCpu: number;
		avgLatency: number;
	};
	guildStats?: {
		totalGuilds: number;
		newGuilds: number;
		leftGuilds: number;
		activeGuilds: number;
	};
	playerHistory?: Array<{
		date: Date;
		plays: number;
		uniqueUsers: number;
		uniqueTracks: number;
	}>;
	topTracks?: Array<{
		title: string;
		url: string;
		plays: number;
	}>;
	auditLogs?: Array<{
		timestamp: Date;
		user: string;
		action: string;
		target: string;
	}>;
}

export class ReportGeneratorService {
	private logger: Logger;
	private prisma: PrismaClient;

	constructor() {
		this.logger = new Logger("ReportGenerator");
		this.prisma = new PrismaClient();
	}

	/**
	 * Generate a report
	 */
	public async generateReport(config: ReportConfig): Promise<string> {
		this.logger.info(
			`[Report Generator] Generating ${config.type.toUpperCase()} report...`,
		);

		// Collect data
		const data = await this.collectReportData(config);

		// Generate report based on type
		let reportPath: string;

		switch (config.type) {
			case "json":
				reportPath = await this.generateJSON(data);
				break;
			case "csv":
				reportPath = await this.generateCSV(data, config);
				break;
			case "pdf":
				// PDF generation would require additional dependencies like pdfkit
				// For now, generate JSON and log that PDF is not yet implemented
				this.logger.warn(
					"[Report Generator] PDF generation not yet implemented, generating JSON instead",
				);
				reportPath = await this.generateJSON(data);
				break;
			default:
				throw new Error(`Unsupported report type: ${config.type}`);
		}

		this.logger.info(
			`[Report Generator] Report generated: ${reportPath}`,
		);

		return reportPath;
	}

	/**
	 * Collect report data
	 */
	private async collectReportData(config: ReportConfig): Promise<ReportData> {
		const data: ReportData = {
			metadata: {
				generated: new Date(),
				dateRange: config.dateRange,
				reportType: config.type,
			},
		};

		// Bot statistics
		if (config.sections.botStats) {
			const stats = await this.prisma.botStats.findMany({
				where: {
					timestamp: {
						gte: config.dateRange.start,
						lte: config.dateRange.end,
					},
				},
			});

			const totalPlays = stats.reduce((sum, s) => sum + s.totalPlays, 0);
			const avgUptime =
				stats.reduce((sum, s) => sum + s.uptime, 0) / (stats.length || 1);
			const avgMemory =
				stats.reduce((sum, s) => sum + s.memory, 0) / (stats.length || 1);
			const avgCpu =
				stats.reduce((sum, s) => sum + s.cpu, 0) / (stats.length || 1);
			const avgLatency =
				stats.reduce((sum, s) => sum + s.latency, 0) / (stats.length || 1);

			const botConfigs = await this.prisma.botConfig.findMany();
			const activeBots = botConfigs.filter((b) => b.active).length;

			data.botStats = {
				totalBots: botConfigs.length,
				activeBots,
				totalGuilds: 0, // Would need to query guilds
				totalPlayers: 0, // Would need to query current players
				totalPlays,
				avgUptime,
				avgMemory,
				avgCpu,
				avgLatency,
			};
		}

		// Player history
		if (config.sections.playerHistory) {
			const history = await this.prisma.playerHistory.findMany({
				where: {
					playedAt: {
						gte: config.dateRange.start,
						lte: config.dateRange.end,
					},
				},
			});

			// Group by date
			const dailyStats = new Map<string, Set<string>>();
			const dailyTracks = new Map<string, Set<string>>();

			for (const play of history) {
				const dateKey = play.playedAt.toISOString().split("T")[0];

				if (!dailyStats.has(dateKey)) {
					dailyStats.set(dateKey, new Set());
					dailyTracks.set(dateKey, new Set());
				}

				dailyStats.get(dateKey)!.add(play.author);
				dailyTracks.get(dateKey)!.add(play.trackUrl);
			}

			data.playerHistory = Array.from(dailyStats.entries()).map(
				([date, users]) => ({
					date: new Date(date),
					plays:
						history.filter(
							(h) => h.playedAt.toISOString().split("T")[0] === date,
						).length,
					uniqueUsers: users.size,
					uniqueTracks: dailyTracks.get(date)?.size || 0,
				}),
			);
		}

		// Top tracks
		if (config.sections.topTracks) {
			const history = await this.prisma.playerHistory.findMany({
				where: {
					playedAt: {
						gte: config.dateRange.start,
						lte: config.dateRange.end,
					},
				},
			});

			// Count plays per track
			const trackCounts = new Map<string, { title: string; count: number }>();

			for (const play of history) {
				const existing = trackCounts.get(play.trackUrl);
				if (existing) {
					existing.count++;
				} else {
					trackCounts.set(play.trackUrl, {
						title: play.trackTitle,
						count: 1,
					});
				}
			}

			// Sort and get top 50
			data.topTracks = Array.from(trackCounts.entries())
				.map(([url, data]) => ({
					title: data.title,
					url,
					plays: data.count,
				}))
				.sort((a, b) => b.plays - a.plays)
				.slice(0, 50);
		}

		// Audit logs
		if (config.sections.auditLogs) {
			const logs = await this.prisma.auditLog.findMany({
				where: {
					timestamp: {
						gte: config.dateRange.start,
						lte: config.dateRange.end,
					},
				},
				include: {
					user: true,
				},
				orderBy: {
					timestamp: "desc",
				},
				take: 1000, // Limit to 1000 most recent
			});

			data.auditLogs = logs.map((log) => ({
				timestamp: log.timestamp,
				user: log.user.username,
				action: log.action,
				target: log.target,
			}));
		}

		return data;
	}

	/**
	 * Generate JSON report
	 */
	private async generateJSON(data: ReportData): Promise<string> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const reportPath = join("./reports", `report-${timestamp}.json`);

		await writeFile(reportPath, JSON.stringify(data, null, 2), "utf-8");

		return reportPath;
	}

	/**
	 * Generate CSV report
	 */
	private async generateCSV(
		data: ReportData,
		config: ReportConfig,
	): Promise<string> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const reportPath = join("./reports", `report-${timestamp}.csv`);

		let csv = "";

		// Add metadata
		if (config.format?.includeMetadata) {
			csv += "Report Metadata\n";
			csv += `Generated,${data.metadata.generated}\n`;
			csv += `Date Range Start,${data.metadata.dateRange.start}\n`;
			csv += `Date Range End,${data.metadata.dateRange.end}\n`;
			csv += "\n";
		}

		// Add bot stats
		if (data.botStats) {
			csv += "Bot Statistics\n";
			csv += "Metric,Value\n";
			csv += `Total Bots,${data.botStats.totalBots}\n`;
			csv += `Active Bots,${data.botStats.activeBots}\n`;
			csv += `Total Guilds,${data.botStats.totalGuilds}\n`;
			csv += `Total Plays,${data.botStats.totalPlays}\n`;
			csv += `Average Uptime,${data.botStats.avgUptime}\n`;
			csv += `Average Memory,${data.botStats.avgMemory}\n`;
			csv += `Average CPU,${data.botStats.avgCpu}\n`;
			csv += `Average Latency,${data.botStats.avgLatency}\n`;
			csv += "\n";
		}

		// Add top tracks
		if (data.topTracks) {
			csv += "Top Tracks\n";
			csv += "Title,URL,Plays\n";
			for (const track of data.topTracks) {
				csv += `"${track.title}","${track.url}",${track.plays}\n`;
			}
			csv += "\n";
		}

		// Add player history
		if (data.playerHistory) {
			csv += "Daily Statistics\n";
			csv += "Date,Plays,Unique Users,Unique Tracks\n";
			for (const day of data.playerHistory) {
				csv += `${day.date.toISOString().split("T")[0]},${day.plays},${day.uniqueUsers},${day.uniqueTracks}\n`;
			}
			csv += "\n";
		}

		// Add audit logs
		if (data.auditLogs) {
			csv += "Audit Logs\n";
			csv += "Timestamp,User,Action,Target\n";
			for (const log of data.auditLogs) {
				csv += `${log.timestamp.toISOString()},"${log.user}","${log.action}","${log.target}"\n`;
			}
		}

		await writeFile(reportPath, csv, "utf-8");

		return reportPath;
	}

	/**
	 * Schedule automated reports
	 */
	public scheduleReport(
		config: ReportConfig,
		intervalMs: number,
	): NodeJS.Timeout {
		this.logger.info(
			`[Report Generator] Scheduling automated reports every ${intervalMs}ms`,
		);

		return setInterval(async () => {
			try {
				await this.generateReport(config);
			} catch (error) {
				this.logger.error(
					`[Report Generator] Failed to generate scheduled report: ${error}`,
				);
			}
		}, intervalMs);
	}
}
