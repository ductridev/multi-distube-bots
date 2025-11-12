/**
 * Lavalink Monitor Service
 * Monitor all Lavalink nodes health and status
 */

import type { LavalinkManager, LavalinkNode } from "lavalink-client";
import Logger from "../structures/Logger.js";

export interface LavalinkNodeStatus {
	host: string;
	identifier: string;
	connected: boolean;
	reconnecting: boolean;
	uptime: number;
	stats?: {
		players: number;
		playingPlayers: number;
		memory: {
			used: number;
			free: number;
			allocated: number;
		};
		cpu: {
			cores: number;
			systemLoad: number;
			lavalinkLoad: number;
		};
		frameStats?: {
			sent: number;
			nulled: number;
			deficit: number;
		};
	};
	lastCheck: Date;
}

export class LavalinkMonitorService {
	private logger: Logger;
	private checkInterval: NodeJS.Timeout | null = null;
	private monitoringInterval = 30000; // 30 seconds
	private nodeStatuses = new Map<string, LavalinkNodeStatus>();

	constructor(private manager: LavalinkManager) {
		this.logger = new Logger("LavalinkMonitor");
	}

	/**
	 * Start monitoring Lavalink nodes
	 */
	public start(): void {
		this.logger.info("[Lavalink Monitor] Starting node monitoring...");

		this.checkInterval = setInterval(() => {
			this.checkNodes();
		}, this.monitoringInterval);

		// Initial check
		this.checkNodes();
	}

	/**
	 * Stop monitoring
	 */
	public stop(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
			this.logger.info("[Lavalink Monitor] Stopped node monitoring");
		}
	}

	/**
	 * Check all Lavalink nodes
	 */
	private checkNodes(): void {
		const nodes = this.manager.nodeManager.nodes;

		for (const [identifier, node] of nodes) {
			try {
				const status = this.getNodeStatus(node);
				this.nodeStatuses.set(identifier, status);

				// Log warnings for unhealthy nodes
				if (!status.connected) {
					this.logger.warn(
						`[Lavalink Monitor] Node ${identifier} is disconnected`,
					);
				} else if (status.stats) {
					// Check for high load
					if (status.stats.cpu.lavalinkLoad > 0.8) {
						this.logger.warn(
							`[Lavalink Monitor] Node ${identifier} has high CPU load: ${(status.stats.cpu.lavalinkLoad * 100).toFixed(1)}%`,
						);
					}

					// Check for memory issues
					const memoryUsagePercent =
						(status.stats.memory.used / status.stats.memory.allocated) * 100;
					if (memoryUsagePercent > 90) {
						this.logger.warn(
							`[Lavalink Monitor] Node ${identifier} has high memory usage: ${memoryUsagePercent.toFixed(1)}%`,
						);
					}
				}
			} catch (error) {
				this.logger.error(
					`[Lavalink Monitor] Error checking node ${identifier}: ${error}`,
				);
			}
		}
	}

	/**
	 * Get status of a single node
	 */
	private getNodeStatus(node: LavalinkNode): LavalinkNodeStatus {
		const stats = node.stats;

		return {
			host: node.options.host,
			identifier: (node.options as any).identifier || node.options.host,
			connected: node.connected,
			reconnecting: (node as any).reconnecting ?? false,
			uptime: node.sessionId ? Date.now() - ((node as any).connectedTimestamp || 0) : 0,
			stats: stats
				? {
						players: stats.players,
						playingPlayers: stats.playingPlayers,
						memory: {
							used: stats.memory.used,
							free: stats.memory.free,
							allocated: stats.memory.allocated,
						},
						cpu: {
							cores: stats.cpu.cores,
							systemLoad: stats.cpu.systemLoad,
							lavalinkLoad: stats.cpu.lavalinkLoad,
						},
						frameStats:
							stats.frameStats && typeof stats.frameStats.sent === "number"
								? {
										sent: stats.frameStats.sent,
										nulled: stats.frameStats.nulled || 0,
										deficit: stats.frameStats.deficit || 0,
									}
								: undefined,
					}
				: undefined,
			lastCheck: new Date(),
		};
	}

	/**
	 * Get all node statuses
	 */
	public getAllStatuses(): LavalinkNodeStatus[] {
		return Array.from(this.nodeStatuses.values());
	}

	/**
	 * Get status for specific node
	 */
	public getNodeStatusById(identifier: string): LavalinkNodeStatus | undefined {
		return this.nodeStatuses.get(identifier);
	}

	/**
	 * Get healthy nodes
	 */
	public getHealthyNodes(): LavalinkNodeStatus[] {
		return this.getAllStatuses().filter(
			(status) =>
				status.connected &&
				!status.reconnecting &&
				(!status.stats ||
					(status.stats.cpu.lavalinkLoad < 0.8 &&
						status.stats.memory.used / status.stats.memory.allocated < 0.9)),
		);
	}

	/**
	 * Get total statistics across all nodes
	 */
	public getTotalStats(): {
		totalPlayers: number;
		totalPlayingPlayers: number;
		totalNodes: number;
		healthyNodes: number;
		totalMemory: number;
		avgCpuLoad: number;
	} {
		const statuses = this.getAllStatuses();
		const healthyStatuses = this.getHealthyNodes();

		let totalPlayers = 0;
		let totalPlayingPlayers = 0;
		let totalMemory = 0;
		let totalCpuLoad = 0;
		let nodeCount = 0;

		for (const status of statuses) {
			if (status.stats) {
				totalPlayers += status.stats.players;
				totalPlayingPlayers += status.stats.playingPlayers;
				totalMemory += status.stats.memory.used;
				totalCpuLoad += status.stats.cpu.lavalinkLoad;
				nodeCount++;
			}
		}

		return {
			totalPlayers,
			totalPlayingPlayers,
			totalNodes: statuses.length,
			healthyNodes: healthyStatuses.length,
			totalMemory,
			avgCpuLoad: nodeCount > 0 ? totalCpuLoad / nodeCount : 0,
		};
	}

	/**
	 * Update monitoring interval
	 */
	public setInterval(intervalMs: number): void {
		this.monitoringInterval = intervalMs;

		if (this.checkInterval) {
			this.stop();
			this.start();
		}

		this.logger.info(
			`[Lavalink Monitor] Monitoring interval updated to ${intervalMs}ms`,
		);
	}
}
