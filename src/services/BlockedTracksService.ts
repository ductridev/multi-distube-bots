/**
 * Blocked Tracks Service
 * Manage blacklisted songs that cannot be played
 */

import Logger from "../structures/Logger.js";
import { PrismaClient } from "@prisma/client";

export interface BlockedTrack {
	id: string;
	uri: string;
	title?: string;
	reason: string;
	blockedBy: string; // User ID who blocked it
	blockedAt: Date;
	scope: "global" | "guild" | "bot";
	scopeId?: string; // Guild ID or Bot Client ID
}

export class BlockedTracksService {
	private logger: Logger;
	private prisma: PrismaClient;
	private cache = new Map<string, BlockedTrack>();

	constructor() {
		this.logger = new Logger("BlockedTracks");
		this.prisma = new PrismaClient();
	}

	/**
	 * Initialize and load blocked tracks into cache
	 */
	public async initialize(): Promise<void> {
		this.logger.info("[Blocked Tracks] Initializing...");

		try {
			const tracks = await this.prisma.blockedTrack.findMany();
			for (const track of tracks) {
				const blockedTrack: BlockedTrack = {
					id: track.id,
					uri: track.uri,
					title: track.title || undefined,
					reason: track.reason,
					blockedBy: track.blockedBy,
					blockedAt: track.blockedAt,
					scope: track.scope as "global" | "guild" | "bot",
					scopeId: track.scopeId || undefined,
				};
				const cacheKey = this.getCacheKey(track.uri, track.scope, track.scopeId);
				this.cache.set(cacheKey, blockedTrack);
			}
			this.logger.info(`[Blocked Tracks] Loaded ${tracks.length} blocked tracks from database`);
		} catch (error) {
			this.logger.error("[Blocked Tracks] Failed to load tracks from database:", error);
		}

		this.logger.info("[Blocked Tracks] Initialized");
	}

	/**
	 * Generate cache key for a blocked track
	 */
	private getCacheKey(uri: string, scope: string, scopeId: string | null | undefined): string {
		return `${scope}-${scopeId || "global"}-${uri}`;
	}

	/**
	 * Block a track
	 */
	public async blockTrack(
		uri: string,
		reason: string,
		blockedBy: string,
		scope: "global" | "guild" | "bot" = "global",
		scopeId?: string,
		title?: string,
	): Promise<BlockedTrack> {
		this.logger.info(`[Blocked Tracks] Blocking track: ${uri}`);

		const cacheKey = this.getCacheKey(uri, scope, scopeId);

		// Save to database
		const dbTrack = await this.prisma.blockedTrack.create({
			data: {
				uri,
				title,
				reason,
				blockedBy,
				scope,
				scopeId,
			},
		});

		const blocked: BlockedTrack = {
			id: dbTrack.id,
			uri: dbTrack.uri,
			title: dbTrack.title || undefined,
			reason: dbTrack.reason,
			blockedBy: dbTrack.blockedBy,
			blockedAt: dbTrack.blockedAt,
			scope: dbTrack.scope as "global" | "guild" | "bot",
			scopeId: dbTrack.scopeId || undefined,
		};

		// Cache it
		this.cache.set(cacheKey, blocked);

		this.logger.info(`[Blocked Tracks] Track blocked: ${uri}`);

		return blocked;
	}

	/**
	 * Unblock a track by ID
	 */
	public async unblockTrack(id: string): Promise<boolean> {
		this.logger.info(`[Blocked Tracks] Unblocking track: ${id}`);

		// Find in cache
		const track = Array.from(this.cache.values()).find(t => t.id === id);
		if (!track) {
			return false;
		}

		const cacheKey = this.getCacheKey(track.uri, track.scope, track.scopeId);
		this.cache.delete(cacheKey);

		// Delete from database
		try {
			await this.prisma.blockedTrack.delete({ where: { id } });
			this.logger.info(`[Blocked Tracks] Track unblocked: ${id}`);
		} catch (error) {
			this.logger.error("[Blocked Tracks] Failed to delete from database:", error);
			return false;
		}

		return true;
	}

	/**
	 * Check if a track is blocked
	 */
	public isBlocked(
		uri: string,
		guildId?: string,
		botClientId?: string,
	): { blocked: boolean; reason?: string; scope?: string } {
		// Check global blocks
		const globalBlock = Array.from(this.cache.values()).find(
			(b) => b.uri === uri && b.scope === "global",
		);
		if (globalBlock) {
			return {
				blocked: true,
				reason: globalBlock.reason,
				scope: "global",
			};
		}

		// Check guild-specific blocks
		if (guildId) {
			const guildBlock = Array.from(this.cache.values()).find(
				(b) => b.uri === uri && b.scope === "guild" && b.scopeId === guildId,
			);
			if (guildBlock) {
				return {
					blocked: true,
					reason: guildBlock.reason,
					scope: `guild:${guildId}`,
				};
			}
		}

		// Check bot-specific blocks
		if (botClientId) {
			const botBlock = Array.from(this.cache.values()).find(
				(b) => b.uri === uri && b.scope === "bot" && b.scopeId === botClientId,
			);
			if (botBlock) {
				return {
					blocked: true,
					reason: botBlock.reason,
					scope: `bot:${botClientId}`,
				};
			}
		}

		return { blocked: false };
	}

	/**
	 * Get all blocked tracks
	 */
	public getAllBlocked(
		scope?: "global" | "guild" | "bot",
		scopeId?: string,
	): BlockedTrack[] {
		let tracks = Array.from(this.cache.values());

		if (scope) {
			tracks = tracks.filter((t) => t.scope === scope);
		}

		if (scopeId) {
			tracks = tracks.filter((t) => t.scopeId === scopeId);
		}

		return tracks;
	}

	/**
	 * Get blocked tracks count
	 */
	public getBlockedCount(
		scope?: "global" | "guild" | "bot",
		scopeId?: string,
	): number {
		return this.getAllBlocked(scope, scopeId).length;
	}

	/**
	 * Search blocked tracks
	 */
	public searchBlocked(query: string): BlockedTrack[] {
		const lowerQuery = query.toLowerCase();
		return Array.from(this.cache.values()).filter(
			(t) =>
				t.uri.toLowerCase().includes(lowerQuery) ||
				t.title?.toLowerCase().includes(lowerQuery) ||
				t.reason.toLowerCase().includes(lowerQuery),
		);
	}

	/**
	 * Import blocked tracks from array
	 */
	public async importBlocks(tracks: Omit<BlockedTrack, "id">[]): Promise<number> {
		this.logger.info(`[Blocked Tracks] Importing ${tracks.length} tracks...`);

		let imported = 0;

		for (const track of tracks) {
			try {
				await this.blockTrack(
					track.uri,
					track.reason,
					track.blockedBy,
					track.scope,
					track.scopeId,
					track.title,
				);
				imported++;
			} catch (error) {
				this.logger.error(
					`[Blocked Tracks] Failed to import track ${track.uri}: ${error}`,
				);
			}
		}

		this.logger.info(`[Blocked Tracks] Imported ${imported}/${tracks.length} tracks`);

		return imported;
	}

	/**
	 * Export blocked tracks
	 */
	public exportBlocks(
		scope?: "global" | "guild" | "bot",
		scopeId?: string,
	): BlockedTrack[] {
		return this.getAllBlocked(scope, scopeId);
	}

	/**
	 * Clear all blocked tracks
	 */
	public clearAll(scope?: "global" | "guild" | "bot", scopeId?: string): number {
		const tracks = this.getAllBlocked(scope, scopeId);

		for (const track of tracks) {
			this.cache.delete(track.id);
		}

		this.logger.info(`[Blocked Tracks] Cleared ${tracks.length} tracks`);

		return tracks.length;
	}
}
