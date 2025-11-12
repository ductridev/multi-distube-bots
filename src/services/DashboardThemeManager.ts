/**
 * Dashboard Theme Manager
 * Manage user preferences for dashboard theme and settings
 */

import { PrismaClient } from "@prisma/client";
import Logger from "../structures/Logger.js";

export interface UserPreferences {
	userId: string;
	theme: "light" | "dark" | "auto";
	language: string;
	timezone: string;
	notificationsEnabled: boolean;
	dashboardLayout?: string; // JSON string of layout config
}

export class DashboardThemeManager {
	private logger: Logger;
	private prisma: PrismaClient;
	private cache = new Map<string, UserPreferences>();

	constructor() {
		this.logger = new Logger("ThemeManager");
		this.prisma = new PrismaClient();
	}

	/**
	 * Get user preferences
	 */
	public async getUserPreferences(userId: string): Promise<UserPreferences> {
		// Check cache first
		const cached = this.cache.get(userId);
		if (cached) {
			return cached;
		}

		// Get from database
		const user = await this.prisma.dashboardUser.findUnique({
			where: { id: userId },
		});

		if (!user) {
			// Return defaults
			return this.getDefaultPreferences(userId);
		}

		// Extract preferences from user metadata (assuming we store in a metadata field)
		const preferences: UserPreferences = {
			userId,
			theme: (user as any).theme || "auto",
			language: (user as any).language || "EnglishUS",
			timezone: (user as any).timezone || "UTC",
			notificationsEnabled: (user as any).notificationsEnabled ?? true,
			dashboardLayout: (user as any).dashboardLayout,
		};

		// Cache it
		this.cache.set(userId, preferences);

		return preferences;
	}

	/**
	 * Update user preferences
	 */
	public async updateUserPreferences(
		userId: string,
		preferences: Partial<Omit<UserPreferences, "userId">>,
	): Promise<UserPreferences> {
		this.logger.info(`[Theme Manager] Updating preferences for user ${userId}`);

		// Note: This requires updating the schema to include these fields
		// For now, we'll just cache them
		const current = await this.getUserPreferences(userId);
		const updated = { ...current, ...preferences, userId };

		// Cache the updated preferences
		this.cache.set(userId, updated);

		this.logger.info(
			`[Theme Manager] Updated preferences for user ${userId}`,
		);

		return updated;
	}

	/**
	 * Get default preferences
	 */
	private getDefaultPreferences(userId: string): UserPreferences {
		return {
			userId,
			theme: "auto",
			language: "EnglishUS",
			timezone: "UTC",
			notificationsEnabled: true,
		};
	}

	/**
	 * Clear cache
	 */
	public clearCache(userId?: string): void {
		if (userId) {
			this.cache.delete(userId);
			this.logger.info(`[Theme Manager] Cleared cache for user ${userId}`);
		} else {
			this.cache.clear();
			this.logger.info("[Theme Manager] Cleared all cache");
		}
	}

	/**
	 * Get all supported themes
	 */
	public getSupportedThemes(): string[] {
		return ["light", "dark", "auto"];
	}

	/**
	 * Get all supported languages
	 */
	public getSupportedLanguages(): string[] {
		return [
			"EnglishUS",
			"Vietnamese",
			"ChineseCN",
			"ChineseTW",
			"Dutch",
			"French",
			"German",
			"Hindi",
			"Indonesian",
			"Italian",
			"Japanese",
			"Korean",
			"Norwegian",
			"Polish",
			"PortuguesePT",
			"Russian",
			"SpanishES",
			"Thai",
			"Turkish",
		];
	}
}
