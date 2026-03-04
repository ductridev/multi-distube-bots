// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// User roles
export type UserRole = "owner" | "admin" | "moderator" | "user";

// Dashboard User
export interface DashboardUser {
  id: string;
  discordId: string;
  username: string;
  discriminator: string;
  avatar?: string;
  role: UserRole;
  managedBots: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Bot Configuration
export interface Bot {
  id: string;
  clientId: string;
  token: string;
  name: string;
  prefix: string;
  color?: number;
  emoji: {
    success: string;
    error: string;
    warning: string;
    info: string;
    loading: string;
  };
  playing: string;
  playingType: "PLAYING" | "WATCHING" | "LISTENING" | "STREAMING" | "COMPETING";
  streamUrl?: string;
  avatar?: string;
  status?: "online" | "idle" | "dnd" | "invisible";
  createdAt: Date;
  updatedAt: Date;
  // Runtime status (not in DB)
  isOnline?: boolean;
  uptime?: number;
  guildCount?: number;
  userCount?: number;
}

// Player state
export interface Player {
  guildId: string;
  clientId: string;
  botName: string;
  voiceChannel: {
    id: string;
    name: string;
  };
  textChannel: {
    id: string;
    name: string;
  };
  currentTrack?: {
    title: string;
    author: string;
    uri: string;
    duration: number;
    position: number;
    thumbnail?: string;
    requestedBy: {
      id: string;
      username: string;
      avatar?: string;
    };
  };
  queue: Array<{
    title: string;
    author: string;
    uri: string;
    duration: number;
    thumbnail?: string;
    requestedBy: {
      id: string;
      username: string;
      avatar?: string;
    };
  }>;
  volume: number;
  isPaused: boolean;
  isLooping: boolean;
  isAutoplay: boolean;
  filters: string[];
}

// Player control actions
export type PlayerControlAction =
  | { action: "pause" }
  | { action: "resume" }
  | { action: "skip" }
  | { action: "stop" }
  | { action: "volume"; value: number }
  | { action: "seek"; position: number };

// Statistics
export interface StatsOverview {
  totalBots: number;
  totalGuilds: number;
  totalUsers: number;
  totalPlayers: number;
  totalPlays: number;
  uptime: number;
  memory: number;
  cpu: number;
}

export interface BotMetrics {
  clientId: string;
  name: string; // Backend returns 'name', not 'botName'
  guildCount: number;
  userCount: number; // Added missing field
  playerCount: number;
  memoryUsage?: number; // Made optional as backend might not always send
  cpuUsage?: number; // Made optional as backend might not always send
  latency?: number; // Made optional
  ping?: number; // Backend sends 'ping'
  uptime: number;
}

export interface BotStatsHistory {
  id: string;
  clientId: string;
  timestamp: Date;
  guildCount: number;
  userCount: number;
  playerCount: number;
  memoryUsage: number;
  cpuUsage: number;
  latency: number;
}

export interface TopGuild {
  guildId: string;
  guildName: string;
  playCount: number;
  totalDuration: number;
  lastPlayed: Date;
}

export interface TopTrack {
  url: string;
  title: string;
  author: string;
  playCount: number;
  totalDuration: number;
  lastPlayed: Date;
}

// Audit Log
export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

// Player History
export interface PlayerHistory {
  id: string;
  guildId: string;
  clientId: string;
  trackUrl: string;
  trackTitle: string;
  author: string;
  duration: number;
  requestedById: string;
  requestedByUsername: string;
  playedAt: Date;
}

// ============================================
// Statistics API Types
// ============================================

// Time period and aggregation types
export type TimePeriod =
  | 'last_4_hours'
  | 'today'
  | 'yesterday'
  | 'last_24_hours'
  | 'last_7_days'
  | 'last_30_days'
  | 'all_time';

export type AggregationMethod = 'average' | 'last' | 'max' | 'min';

// User server for filtering
export interface UserServer {
  guildId: string;
  guildName: string;
  guildIcon?: string;
  memberCount: number;
  botClientId: string;
  botName: string;
}

// Chart data point
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label: string;
}

// Track type percentages for pie chart
export interface TrackTypePercentages {
  youtube: number;
  spotify: number;
  soundcloud: number;
}

// Activity data for bar charts
export interface ActivityData {
  label: string;
  value: number;
}

// Alias for consistency
export type ActivityDataPoint = ActivityData;

// Track stats for lists
export interface TrackStats {
  name: string;
  url?: string;
  source: string;
  playCount: number;
  totalDuration: number;
}

// Alias for most played items
export type MostPlayedItem = TrackStats;

// Most listened user item
export interface MostListenedItem {
  userId: string;
  username: string;
  avatar?: string | null;
  totalDuration: number;
  sessionCount: number;
}

// Command stats
export interface CommandStats {
  name: string;
  usageCount: number;
}

// Alias for top command items
export type TopCommandItem = CommandStats;

// API response types for charts
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
  data: MostListenedItem[];
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

// Combined stats overview for the new stats page
export interface StatsOverviewData {
  sessions: ChartDataPoint[];
  listeners: ChartDataPoint[];
  trackTypes: TrackTypePercentages;
  activityHours: ActivityData[];
  activityWeekdays: ActivityData[];
  mostPlayed: TrackStats[];
  mostListened: MostListenedItem[];
  topCommands: CommandStats[];
}
