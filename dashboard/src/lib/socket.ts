import { io, type Socket } from "socket.io-client";

export interface BotStatusEvent {
  clientId: string;
  status: "online" | "offline" | "connecting";
  username: string;
  guilds: number;
  users: number;
  timestamp: Date;
}

export interface BotStatsEvent {
  clientId: string;
  guildCount: number;
  playerCount: number;
  memoryUsage: number;
  cpuUsage: number;
  latency: number;
  timestamp: Date;
}

export interface PlayerStartEvent {
  guildId: string;
  clientId: string;
  track: {
    title: string;
    author: string;
    uri: string;
    duration: number;
    thumbnail?: string;
  };
  requestedBy: {
    id: string;
    username: string;
    avatar?: string;
  };
  timestamp: Date;
}

export interface PlayerEndEvent {
  guildId: string;
  clientId: string;
  track: {
    title: string;
    uri: string;
  };
  timestamp: Date;
}

export interface GuildJoinEvent {
  guildId: string;
  guildName: string;
  clientId: string;
  memberCount: number;
  timestamp: Date;
}

export interface GuildLeaveEvent {
  guildId: string;
  guildName: string;
  clientId: string;
  timestamp: Date;
}

export interface ErrorEvent {
  error: string;
  clientId?: string;
  guildId?: string;
  timestamp: Date;
}

export interface StatsUpdateEvent {
  totalGuilds: number;
  totalUsers: number;
  totalPlayers: number;
  timestamp: Date;
}

type EventCallback<T> = (data: T) => void;

class DashboardSocketClient {
  private socket: Socket | null = null;
  private connected = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners = new Map<string, Set<EventCallback<any>>>();

  connect(token?: string): void {
    if (this.socket?.connected) {
      return;
    }

    // Determine the API URL based on environment
    let apiUrl: string;
    
    if (typeof window !== 'undefined') {
      // Client-side: Check if we have a public WebSocket URL, otherwise use current origin
      apiUrl = process.env.NEXT_PUBLIC_WS_URL || window.location.origin;
    } else {
      // Server-side: Use internal API URL
      apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
    }

    console.log(`[Socket] Connecting to: ${apiUrl}`);

    this.socket = io(apiUrl, {
      auth: { token },
      path: '/socket.io',
      transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket if possible
      upgrade: true, // Allow upgrade to websocket after successful polling connection
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000, // Connection timeout
      forceNew: false, // Reuse existing connection if available
    });

    this.socket.on("connect", () => {
      this.connected = true;
      console.log("[Socket] ✅ Connected to dashboard server");
      console.log("[Socket] Transport:", this.socket?.io.engine.transport.name);
    });

    this.socket.on("disconnect", () => {
      this.connected = false;
      console.log("[Socket] ❌ Disconnected from dashboard server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("[Socket] ⚠️ Connection error:", error.message);
      console.error("[Socket] Attempted URL:", apiUrl);
    });

    // Monitor transport upgrades
    this.socket.io.engine.on("upgrade", (transport) => {
      console.log("[Socket] 🚀 Transport upgraded to:", transport.name);
    });

    // Register all event listeners
    this.socket.on("bot:status", (data: BotStatusEvent) => {
      this.emit("bot:status", data);
    });

    this.socket.on("bot:stats", (data: BotStatsEvent) => {
      this.emit("bot:stats", data);
    });

    this.socket.on("player:start", (data: PlayerStartEvent) => {
      this.emit("player:start", data);
    });

    this.socket.on("player:end", (data: PlayerEndEvent) => {
      this.emit("player:end", data);
    });

    this.socket.on("guild:join", (data: GuildJoinEvent) => {
      this.emit("guild:join", data);
    });

    this.socket.on("guild:leave", (data: GuildLeaveEvent) => {
      this.emit("guild:leave", data);
    });

    this.socket.on("error", (data: ErrorEvent) => {
      this.emit("error", data);
    });

    this.socket.on("stats:update", (data: StatsUpdateEvent) => {
      this.emit("stats:update", data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  private emit<T>(event: string, data: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  // Typed event listeners
  onBotStatus(callback: EventCallback<BotStatusEvent>): () => void {
    return this.on("bot:status", callback);
  }

  onBotStats(callback: EventCallback<BotStatsEvent>): () => void {
    return this.on("bot:stats", callback);
  }

  onPlayerStart(callback: EventCallback<PlayerStartEvent>): () => void {
    return this.on("player:start", callback);
  }

  onPlayerEnd(callback: EventCallback<PlayerEndEvent>): () => void {
    return this.on("player:end", callback);
  }

  onGuildJoin(callback: EventCallback<GuildJoinEvent>): () => void {
    return this.on("guild:join", callback);
  }

  onGuildLeave(callback: EventCallback<GuildLeaveEvent>): () => void {
    return this.on("guild:leave", callback);
  }

  onError(callback: EventCallback<ErrorEvent>): () => void {
    return this.on("error", callback);
  }

  onStatsUpdate(callback: EventCallback<StatsUpdateEvent>): () => void {
    return this.on("stats:update", callback);
  }
}

// Export singleton instance
export const dashboardSocket = new DashboardSocketClient();
