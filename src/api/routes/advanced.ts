/**
 * Advanced Features API Routes
 * Phase 6 feature routes
 */

import type { FastifyInstance } from "fastify";
import type { Lavamusic } from "../../structures/index.js";
import {
	BotHealthMonitor,
	BotBulkOperations,
	GlobalQueueService,
	BlockedTracksService,
	ReportGeneratorService,
	ApiKeyManager,
} from "../../services/index.js";

export async function advancedRoutes(
	fastify: FastifyInstance,
	bots: Lavamusic[],
): Promise<void> {
	// Initialize services
	const healthMonitor = new BotHealthMonitor(bots);
	const bulkOps = new BotBulkOperations(bots);
	const globalQueue = new GlobalQueueService(bots);
	const blockedTracks = new BlockedTracksService();
	const reportGen = new ReportGeneratorService();
	const apiKeyMgr = new ApiKeyManager();

	// Start monitoring
	healthMonitor.start();
	await blockedTracks.initialize();

	// Health Monitor Routes
	fastify.get("/api/advanced/health", async (_request, reply) => {
		const statuses = await healthMonitor.getAllHealthStatus();
		return reply.send({
			success: true,
			data: statuses,
		});
	});

	// Bulk Operations Routes
	fastify.post<{
		Body: { clientIds: string[] };
	}>("/api/advanced/bulk/start", async (request, reply) => {
		const { clientIds } = request.body;
		const result = await bulkOps.startBots(clientIds);
		return reply.send({
			success: true,
			data: result,
		});
	});

	fastify.post<{
		Body: { clientIds: string[] };
	}>("/api/advanced/bulk/stop", async (request, reply) => {
		const { clientIds } = request.body;
		const result = await bulkOps.stopBots(clientIds);
		return reply.send({
			success: true,
			data: result,
		});
	});

	fastify.post<{
		Body: { clientIds: string[] };
	}>("/api/advanced/bulk/restart", async (request, reply) => {
		const { clientIds } = request.body;
		const result = await bulkOps.restartBots(clientIds);
		return reply.send({
			success: true,
			data: result,
		});
	});

	fastify.post<{
		Body: {
			clientIds: string[];
			activity: { name: string; type: number; status: string };
		};
	}>("/api/advanced/bulk/activity", async (request, reply) => {
		const { clientIds, activity } = request.body;
		const result = await bulkOps.updateActivity(clientIds, activity);
		return reply.send({
			success: true,
			data: result,
		});
	});

	fastify.post<{
		Body: {
			clientIds: string[];
			channelType: "system" | "setup";
			message: string;
		};
	}>("/api/advanced/bulk/broadcast", async (request, reply) => {
		const { clientIds, channelType, message } = request.body;
		const result = await bulkOps.broadcastMessage(clientIds, channelType, message);
		return reply.send({
			success: true,
			data: result,
		});
	});

	// Global Queue Routes
	fastify.get("/api/advanced/queue/all", async (_request, reply) => {
		const tracks = globalQueue.getAllPlaying();
		return reply.send({
			success: true,
			data: tracks,
		});
	});

	fastify.get("/api/advanced/queue/stats", async (_request, reply) => {
		const stats = globalQueue.getStats();
		return reply.send({
			success: true,
			data: stats,
		});
	});

	fastify.get("/api/advanced/queue/popular", async (_request, reply) => {
		const popular = globalQueue.getPopularTracks(20);
		return reply.send({
			success: true,
			data: popular,
		});
	});

	fastify.get<{
		Querystring: { q: string };
	}>("/api/advanced/queue/search", async (request, reply) => {
		const { q } = request.query;
		const results = globalQueue.searchTracks(q);
		return reply.send({
			success: true,
			data: results,
		});
	});

	// Blocked Tracks Routes
	fastify.get("/api/advanced/blocked", async (_request, reply) => {
		const blocked = blockedTracks.getAllBlocked();
		return reply.send({
			success: true,
			data: blocked,
		});
	});

	fastify.post<{
		Body: {
			uri: string;
			reason: string;
			blockedBy: string;
			scope?: "global" | "guild" | "bot";
			scopeId?: string;
			title?: string;
		};
	}>("/api/advanced/blocked", async (request, reply) => {
		const { uri, reason, blockedBy, scope, scopeId, title } = request.body;
		const blocked = await blockedTracks.blockTrack(
			uri,
			reason,
			blockedBy,
			scope,
			scopeId,
			title,
		);
		return reply.send({
			success: true,
			data: blocked,
		});
	});

	fastify.delete<{
		Params: { id: string };
	}>("/api/advanced/blocked/:id", async (request, reply) => {
		const { id } = request.params;
		const success = await blockedTracks.unblockTrack(id);
		return reply.send({
			success,
		});
	});

	fastify.get<{
		Querystring: { uri: string; guildId?: string; botClientId?: string };
	}>("/api/advanced/blocked/check", async (request, reply) => {
		const { uri, guildId, botClientId } = request.query;
		const result = blockedTracks.isBlocked(uri, guildId, botClientId);
		return reply.send({
			success: true,
			data: result,
		});
	});

	// Report Generation Routes
	fastify.post<{
		Body: {
			type: "pdf" | "csv" | "json";
			dateRange: { start: string; end: string };
			sections: any;
		};
	}>("/api/advanced/reports/generate", async (request, reply) => {
		const { type, dateRange, sections } = request.body;
		const reportPath = await reportGen.generateReport({
			type,
			dateRange: {
				start: new Date(dateRange.start),
				end: new Date(dateRange.end),
			},
			sections,
		});
		return reply.send({
			success: true,
			data: { path: reportPath },
		});
	});

	// API Key Management Routes
	fastify.post<{
		Body: {
			userId: string;
			name: string;
			permissions: string[];
			rateLimit?: number;
			expiresInDays?: number;
		};
	}>("/api/advanced/apikeys", async (request, reply) => {
		const { userId, name, permissions, rateLimit, expiresInDays } = request.body;
		const apiKey = await apiKeyMgr.createApiKey(
			userId,
			name,
			permissions,
			rateLimit,
			expiresInDays,
		);
		return reply.send({
			success: true,
			data: apiKey,
		});
	});

	fastify.get<{
		Querystring: { userId: string };
	}>("/api/advanced/apikeys", async (request, reply) => {
		const { userId } = request.query;
		const keys = await apiKeyMgr.getUserKeys(userId);
		return reply.send({
			success: true,
			data: keys,
		});
	});

	fastify.delete<{
		Params: { key: string };
	}>("/api/advanced/apikeys/:key", async (request, reply) => {
		const { key } = request.params;
		const success = await apiKeyMgr.revokeKey(key);
		return reply.send({
			success,
		});
	});

	fastify.get<{
		Params: { key: string };
	}>("/api/advanced/apikeys/:key/stats", async (request, reply) => {
		const { key } = request.params;
		const stats = apiKeyMgr.getKeyStats(key);
		return reply.send({
			success: true,
			data: stats,
		});
	});

	fastify.get("/api/advanced/apikeys/permissions", async (_request, reply) => {
		const permissions = apiKeyMgr.getAvailablePermissions();
		return reply.send({
			success: true,
			data: permissions,
		});
	});
}
