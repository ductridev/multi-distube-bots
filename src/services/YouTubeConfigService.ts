/**
 * YouTube Source Config Service
 * Manages youtube-source plugin configuration via HTTP requests to Lavalink nodes.
 *
 * This service communicates with Lavalink's HTTP API endpoints:
 * - POST /youtube - Update YouTube source config
 * - GET /youtube - Get current config
 * - GET /youtube/oauth/{refreshToken} - Refresh OAuth token
 */

import type { LavalinkManager } from "lavalink-client";
import Logger from "../structures/Logger.js";
import type {
	YouTubeSourceConfig,
	YouTubeSourceConfigResponse,
	YouTubeOAuthTokenResponse,
} from "../types/youtube-source.js";
import type { NodeInfo } from "../types/lavasrc.js";

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
 * Service for managing youtube-source plugin configuration on Lavalink nodes.
 * Provides methods to retrieve and update YouTube source settings via HTTP API.
 *
 * @example
 * ```typescript
 * const service = new YouTubeConfigService(lavalinkManager);
 *
 * // Get current config
 * const config = await service.getConfig('node-1');
 *
 * // Update OAuth config
 * await service.updateConfig('node-1', {
 *   refreshToken: 'xxx',
 *   skipInitialization: true
 * });
 *
 * // Update poToken config
 * await service.updateConfig('node-1', {
 *   poToken: 'xxx',
 *   visitorData: 'yyy'
 * });
 * ```
 */
export class YouTubeConfigService {
	private logger: Logger;

	constructor(private manager: LavalinkManager) {
		this.logger = new Logger("YouTubeConfig");
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
				result[key] = value;
			}
		}

		return result as Partial<T>;
	}

	/**
	 * Update YouTube source configuration on a specific Lavalink node.
	 * Sends a POST request to the /youtube endpoint.
	 *
	 * @param nodeId - The unique identifier of the Lavalink node
	 * @param config - YouTube source configuration to update
	 * @throws Error if the request fails or the node is not found
	 *
	 * @example
	 * ```typescript
	 * // Update OAuth configuration
	 * await service.updateConfig('node-1', {
	 *   refreshToken: 'your-refresh-token',
	 *   skipInitialization: true
	 * });
	 *
	 * // Update poToken configuration
	 * await service.updateConfig('node-1', {
	 *   poToken: 'your-po-token',
	 *   visitorData: 'your-visitor-data'
	 * });
	 * ```
	 */
	public async updateConfig(
		nodeId: string,
		config: YouTubeSourceConfig,
	): Promise<void> {
		this.logger.info(`[YouTube Config] Updating config for node: ${nodeId}`);

		try {
			const { baseUrl, headers } = this.getNodeHttpInfo(nodeId);

			// Clean the config object by removing undefined values
			const cleanedConfig = this.removeUndefined(config as Record<string, unknown>);

			const response = await fetch(`${baseUrl}/youtube`, {
				method: "POST",
				headers,
				body: JSON.stringify(cleanedConfig),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP ${response.status}: ${errorText || response.statusText}`,
				);
			}

			this.logger.success(
				`[YouTube Config] Successfully updated config for node: ${nodeId}`,
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.logger.error(
				`[YouTube Config] Failed to update config for node ${nodeId}: ${errorMessage}`,
			);
			throw new Error(
				`Failed to update YouTube config for node ${nodeId}: ${errorMessage}`,
			);
		}
	}

	/**
	 * Retrieve the current YouTube source configuration from a specific Lavalink node.
	 * Sends a GET request to the /youtube endpoint.
	 *
	 * @param nodeId - The unique identifier of the Lavalink node
	 * @returns The current YouTube source configuration
	 * @throws Error if the request fails or the node is not found
	 *
	 * @example
	 * ```typescript
	 * const config = await service.getConfig('node-1');
	 * console.log(config.refreshToken);
	 * ```
	 */
	public async getConfig(nodeId: string): Promise<YouTubeSourceConfigResponse> {
		this.logger.info(`[YouTube Config] Fetching config for node: ${nodeId}`);

		try {
			const { baseUrl, headers } = this.getNodeHttpInfo(nodeId);

			const response = await fetch(`${baseUrl}/youtube`, {
				method: "GET",
				headers,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP ${response.status}: ${errorText || response.statusText}`,
				);
			}

			const config = (await response.json()) as YouTubeSourceConfigResponse;
			this.logger.success(
				`[YouTube Config] Successfully fetched config for node: ${nodeId}`,
			);

			return config;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.logger.error(
				`[YouTube Config] Failed to fetch config for node ${nodeId}: ${errorMessage}`,
			);
			throw new Error(
				`Failed to fetch YouTube config for node ${nodeId}: ${errorMessage}`,
			);
		}
	}

	/**
	 * Refresh an OAuth token using a refresh token.
	 * Sends a GET request to the /youtube/oauth/{refreshToken} endpoint.
	 *
	 * @param nodeId - The unique identifier of the Lavalink node
	 * @param refreshToken - The refresh token to use
	 * @returns The new OAuth token response
	 * @throws Error if the request fails or the node is not found
	 *
	 * @example
	 * ```typescript
	 * const tokenResponse = await service.refreshOAuthToken('node-1', 'your-refresh-token');
	 * console.log(tokenResponse.access_token);
	 * ```
	 */
	public async refreshOAuthToken(
		nodeId: string,
		refreshToken: string,
	): Promise<YouTubeOAuthTokenResponse> {
		this.logger.info(`[YouTube Config] Refreshing OAuth token for node: ${nodeId}`);

		try {
			const { baseUrl, headers } = this.getNodeHttpInfo(nodeId);

			const response = await fetch(`${baseUrl}/youtube/oauth/${encodeURIComponent(refreshToken)}`, {
				method: "GET",
				headers,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP ${response.status}: ${errorText || response.statusText}`,
				);
			}

			const tokenResponse = (await response.json()) as YouTubeOAuthTokenResponse;
			this.logger.success(
				`[YouTube Config] Successfully refreshed OAuth token for node: ${nodeId}`,
			);

			return tokenResponse;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.logger.error(
				`[YouTube Config] Failed to refresh OAuth token for node ${nodeId}: ${errorMessage}`,
			);
			throw new Error(
				`Failed to refresh OAuth token for node ${nodeId}: ${errorMessage}`,
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
			`[YouTube Config] Retrieved nodes list: ${nodeList.length} node(s)`,
		);

		return nodeList;
	}
}
