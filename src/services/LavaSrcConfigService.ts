/**
 * LavaSrc Config Service
 * Manages LavaSrc plugin configuration via HTTP requests to Lavalink nodes.
 *
 * This service communicates with Lavalink's HTTP API endpoint `/v4/lavasrc/config`
 * to retrieve and update LavaSrc plugin settings at runtime.
 */

import type { LavalinkManager } from "lavalink-client";
import Logger from "../structures/Logger.js";
import type { LavaSrcConfig, NodeInfo } from "../types/lavasrc.js";

/**
 * Internal structure for HTTP connection information to a Lavalink node.
 */
interface NodeHttpInfo {
	/** Base URL for HTTP requests (e.g., "http://localhost:2333") */
	baseUrl: string;
	/** HTTP headers including Authorization */
	headers: Record<string, string>;
}

/**
 * Service for managing LavaSrc plugin configuration on Lavalink nodes.
 * Provides methods to retrieve and update LavaSrc settings via HTTP API.
 *
 * @example
 * ```typescript
 * const service = new LavaSrcConfigService(lavalinkManager);
 *
 * // Get current config
 * const config = await service.getConfig('node-1');
 *
 * // Update config
 * await service.updateConfig('node-1', {
 *   spotify: { clientId: 'xxx', clientSecret: 'yyy' }
 * });
 * ```
 */
export class LavaSrcConfigService {
	private logger: Logger;

	constructor(private manager: LavalinkManager) {
		this.logger = new Logger("LavaSrcConfig");
	}

	/**
	 * Get HTTP connection information for a specific Lavalink node.
	 * Extracts host, port, and authorization from node options.
	 *
	 * @param nodeId - The unique identifier of the Lavalink node
	 * @returns Object containing baseUrl and headers for HTTP requests
	 * @throws Error if the node is not found
	 */
	private getNodeHttpInfo(nodeId: string): NodeHttpInfo {
		const nodes = this.manager.nodeManager.nodes;
		const node = nodes.get(nodeId);

		if (!node) {
			throw new Error(`Node with ID "${nodeId}" not found`);
		}

		const options = node.options;
		const host = options.host || "localhost";
		const port = options.port || 2333;
		const authorization = options.authorization || "";

		// Build base URL - use http by default, https if secure is true
		const protocol = (options as any).secure ? "https" : "http";
		const baseUrl = `${protocol}://${host}:${port}`;

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Authorization: authorization,
		};

		return { baseUrl, headers };
	}

	/**
	 * Remove undefined values from an object recursively.
	 * Used to clean config objects before sending to the API.
	 *
	 * @param obj - The object to clean
	 * @returns A new object with undefined values removed
	 */
	private removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
		const result: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(obj)) {
			if (value !== undefined) {
				if (value && typeof value === "object" && !Array.isArray(value)) {
					// Recursively clean nested objects
					const cleaned = this.removeUndefined(value as Record<string, unknown>);
					if (Object.keys(cleaned).length > 0) {
						result[key] = cleaned;
					}
				} else {
					result[key] = value;
				}
			}
		}

		return result as Partial<T>;
	}

	/**
	 * Update LavaSrc configuration on a specific Lavalink node.
	 * Sends a PATCH request to the `/v4/lavasrc/config` endpoint.
	 *
	 * @param nodeId - The unique identifier of the Lavalink node
	 * @param config - Partial LavaSrc configuration to update
	 * @returns The updated configuration from the server
	 * @throws Error if the request fails or the node is not found
	 *
	 * @example
	 * ```typescript
	 * await service.updateConfig('node-1', {
	 *   spotify: {
	 *     clientId: 'your-client-id',
	 *     clientSecret: 'your-client-secret'
	 *   }
	 * });
	 * ```
	 */
	public async updateConfig(
		nodeId: string,
		config: Partial<LavaSrcConfig>,
	): Promise<LavaSrcConfig> {
		this.logger.info(`[LavaSrc Config] Updating config for node: ${nodeId}`);

		try {
			const { baseUrl, headers } = this.getNodeHttpInfo(nodeId);

			// Clean the config object by removing undefined values
			const cleanedConfig = this.removeUndefined(config as Record<string, unknown>);

			const response = await fetch(`${baseUrl}/v4/lavasrc/config`, {
				method: "PATCH",
				headers,
				body: JSON.stringify(cleanedConfig),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP ${response.status}: ${errorText || response.statusText}`,
				);
			}
	
			// Handle 204 No Content or empty response
			const contentLength = response.headers.get("content-length");
			const status = response.status;
	
			if (status === 204 || contentLength === "0") {
				this.logger.success(
					`[LavaSrc Config] Successfully updated config for node: ${nodeId}`,
				);
				return cleanedConfig as LavaSrcConfig;
			}
	
			const result = (await response.json()) as LavaSrcConfig;
			this.logger.success(
				`[LavaSrc Config] Successfully updated config for node: ${nodeId}`,
			);
	
			return result;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.logger.error(
				`[LavaSrc Config] Failed to update config for node ${nodeId}: ${errorMessage}`,
			);
			throw new Error(
				`Failed to update LavaSrc config for node ${nodeId}: ${errorMessage}`,
			);
		}
	}

	/**
	 * Retrieve the current LavaSrc configuration from a specific Lavalink node.
	 * Sends a GET request to the `/v4/lavasrc/config` endpoint.
	 *
	 * @param nodeId - The unique identifier of the Lavalink node
	 * @returns The current LavaSrc configuration
	 * @throws Error if the request fails or the node is not found
	 *
	 * @example
	 * ```typescript
	 * const config = await service.getConfig('node-1');
	 * console.log(config.spotify?.clientId);
	 * ```
	 */
	public async getConfig(nodeId: string): Promise<LavaSrcConfig> {
		this.logger.info(`[LavaSrc Config] Fetching config for node: ${nodeId}`);

		try {
			const { baseUrl, headers } = this.getNodeHttpInfo(nodeId);

			const response = await fetch(`${baseUrl}/v4/lavasrc/config`, {
				method: "GET",
				headers,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP ${response.status}: ${errorText || response.statusText}`,
				);
			}

			const config = (await response.json()) as LavaSrcConfig;
			this.logger.success(
				`[LavaSrc Config] Successfully fetched config for node: ${nodeId}`,
			);

			return config;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.logger.error(
				`[LavaSrc Config] Failed to fetch config for node ${nodeId}: ${errorMessage}`,
			);
			throw new Error(
				`Failed to fetch LavaSrc config for node ${nodeId}: ${errorMessage}`,
			);
		}
	}

	/**
	 * Get a list of all connected Lavalink nodes with their connection status.
	 * Useful for displaying available nodes to configure.
	 *
	 * @returns Array of NodeInfo objects containing node details
	 *
	 * @example
	 * ```typescript
	 * const nodes = service.getNodesList();
	 * nodes.forEach(node => {
	 *   console.log(`${node.id}: ${node.host} (${node.connected ? 'connected' : 'disconnected'})`);
	 * });
	 * ```
	 */
	public getNodesList(): NodeInfo[] {
		const nodes = this.manager.nodeManager.nodes;
		const nodeList: NodeInfo[] = [];

		for (const [id, node] of nodes) {
			const options = node.options;
			const host = options.host || "localhost";
			const port = options.port || 2333;
			const protocol = (options as any).secure ? "https" : "http";

			nodeList.push({
				id,
				host: `${protocol}://${host}:${port}`,
				connected: node.connected,
			});
		}

		this.logger.info(
			`[LavaSrc Config] Retrieved nodes list: ${nodeList.length} node(s)`,
		);

		return nodeList;
	}
}
