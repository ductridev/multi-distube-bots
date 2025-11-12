import type { DashboardUser } from '@prisma/client';

declare module 'fastify' {
	interface FastifyRequest {
		dashboardUser?: DashboardUser;
	}
}

export interface BotStatusPayload {
	clientId: string;
	status: 'online' | 'offline' | 'maintenance';
	guilds?: number;
	players?: number;
}

export interface BotStatsPayload {
	clientId: string;
	guilds: number;
	players: number;
	memory: number;
	cpu: number;
	uptime: number;
	latency: number;
}

export interface PlayerStartPayload {
	guildId: string;
	clientId: string;
	track: {
		title: string;
		author: string;
		duration: number;
		uri: string;
	};
	requestedBy: string;
}

export interface PlayerEndPayload {
	guildId: string;
	clientId: string;
}

export interface GuildJoinPayload {
	guildId: string;
	clientId: string;
	name: string;
	memberCount: number;
}

export interface GuildLeavePayload {
	guildId: string;
	clientId: string;
	name: string;
}

export interface ErrorPayload {
	clientId: string;
	error: string;
	stack?: string;
}

export interface CreateBotDTO {
	name: string;
	token: string;
	prefix: string;
	clientId: string;
	status?: string;
	activity?: string;
	activityType?: number;
}

export interface UpdateBotDTO {
	name?: string;
	prefix?: string;
	status?: string;
	activity?: string;
	activityType?: number;
	active?: boolean;
}

export interface UpdateGuildConfigDTO {
	language?: string;
	djMode?: boolean;
	djRoles?: string[];
}

export interface PlayerControlDTO {
	action: 'play' | 'pause' | 'skip' | 'stop' | 'volume' | 'seek';
	query?: string;
	volume?: number;
	position?: number;
}
