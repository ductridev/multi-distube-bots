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
  totalGuilds: number;
  totalUsers: number;
  totalPlayers: number;
  totalTracks: number;
  uptimeAvg: number;
  memoryUsageAvg: number;
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
  trackUrl: string;
  trackTitle: string;
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
