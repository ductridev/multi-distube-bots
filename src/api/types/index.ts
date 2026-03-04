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

// Statistics API Types
export type TimePeriod =
  | 'last_4_hours'
  | 'today'
  | 'yesterday'
  | 'last_24_hours'
  | 'last_7_days'
  | 'last_30_days'
  | 'all_time';

export type AggregationMethod = 'average' | 'last' | 'max' | 'min';

export interface StatsQuery {
  period: TimePeriod;
  aggregation?: AggregationMethod;
}

export interface TrackTypePercentages {
  youtube: number;
  spotify: number;
  soundcloud: number;
}

export interface ActivityData {
  label: string;
  value: number;
}

export interface TrackStats {
  name: string;
  url?: string;
  source: string;
  playCount: number;
  totalDuration: number;
}

export interface TopListener {
  userId: string;
  username: string;
  avatar?: string | null;
  totalDuration: number;
  sessionCount: number;
}

export interface CommandStats {
  name: string;
  usageCount: number;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label: string;
}

export interface StatsOverview {
  sessions: number[];
  listeners: number[];
  trackTypes: TrackTypePercentages;
  activityHours: ActivityData[];
  activityWeekdays: ActivityData[];
  mostPlayed: TrackStats[];
  mostListened: TopListener[];
  topCommands: CommandStats[];
}

export interface SessionsChartResponse {
  data: ChartDataPoint[];
  period: TimePeriod;
  aggregation: AggregationMethod;
}

export interface ListenersChartResponse {
  data: ChartDataPoint[];
  period: TimePeriod;
  aggregation: AggregationMethod;
}

export interface TrackTypesChartResponse {
  data: TrackTypePercentages;
  period: TimePeriod;
}

export interface ActivityHoursResponse {
  data: ActivityData[];
  period: TimePeriod;
}

export interface ActivityWeekdaysResponse {
  data: ActivityData[];
  period: TimePeriod;
}

export interface MostPlayedResponse {
  data: TrackStats[];
  period: TimePeriod;
}

export interface MostListenedResponse {
  data: TopListener[];
  period: TimePeriod;
}

export interface TopCommandsResponse {
  data: CommandStats[];
  period: TimePeriod;
}

export interface PremiumStatusResponse {
  isPremium: boolean;
  totalDonated: number;
  currency: string;
}
