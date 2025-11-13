import axios, { type AxiosInstance, type AxiosError } from "axios";
import type {
  ApiResponse,
  Bot,
  Player,
  StatsOverview,
  BotMetrics,
  BotStatsHistory,
  TopGuild,
  TopTrack,
  DashboardUser,
  PlayerControlAction,
} from "@/types/api";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    // Use relative URLs in browser to leverage Next.js proxy
    // Use full URL on server-side (not used in this app, but good practice)
    const baseURL = typeof window !== 'undefined' 
      ? '' // Empty string = relative URLs, will use Next.js proxy
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    
    this.client = axios.create({
      baseURL,
      withCredentials: true, // Important for cookie-based auth
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          this.clearToken();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("dashboard_token");
  }

  private setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboard_token", token);
    }
  }

  private clearToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("dashboard_token");
    }
  }

  // Auth Methods
  async login(code: string): Promise<{ token: string; user: DashboardUser }> {
    const { data } = await this.client.post<{ success: boolean; token: string; user: DashboardUser; csrfToken: string }>(
      "/api/auth/discord",
      { code }
    );
    this.setToken(data.token);
    return { token: data.token, user: data.user };
  }

  async getCurrentUser(): Promise<DashboardUser> {
    const { data } = await this.client.get<{ success: boolean; user: DashboardUser; csrfToken: string }>("/api/auth/me");
    return data.user;
  }

  async logout(): Promise<void> {
    await this.client.post("/api/auth/logout");
    this.clearToken();
  }

  // Bot Methods
  async getBots(): Promise<Bot[]> {
    const { data } = await this.client.get<ApiResponse<Bot[]>>("/api/bots");
    return data.data;
  }

  async getBot(id: string): Promise<Bot> {
    const { data } = await this.client.get<ApiResponse<Bot>>(`/api/bots/${id}`);
    return data.data;
  }

  async createBot(botData: Partial<Bot>): Promise<Bot> {
    const { data } = await this.client.post<ApiResponse<Bot>>("/api/bots", botData);
    return data.data;
  }

  async updateBot(id: string, botData: Partial<Bot>): Promise<Bot> {
    const { data } = await this.client.patch<ApiResponse<Bot>>(`/api/bots/${id}`, botData);
    return data.data;
  }

  async deleteBot(id: string): Promise<void> {
    await this.client.delete(`/api/bots/${id}`);
  }

  async getBotStats(id: string): Promise<{ guildCount: number; playerCount: number }> {
    const { data } = await this.client.get<
      ApiResponse<{ guildCount: number; playerCount: number }>
    >(`/api/bots/${id}/stats`);
    return data.data;
  }

  // Player Methods
  async getPlayers(): Promise<Player[]> {
    const { data } = await this.client.get<ApiResponse<Player[]>>("/api/players");
    return data.data;
  }

  async getPlayer(guildId: string): Promise<Player> {
    const { data } = await this.client.get<ApiResponse<Player>>(`/api/players/${guildId}`);
    return data.data;
  }

  async controlPlayer(guildId: string, action: PlayerControlAction): Promise<void> {
    await this.client.post(`/api/players/${guildId}/control`, action);
  }

  // Stats Methods
  async getStatsOverview(): Promise<StatsOverview> {
    const { data } = await this.client.get<ApiResponse<StatsOverview>>("/api/stats/overview");
    return data.data;
  }

  async getBotMetrics(): Promise<BotMetrics[]> {
    const { data } = await this.client.get<ApiResponse<BotMetrics[]>>("/api/stats/bots");
    return data.data;
  }

  async getStatsHistory(botId?: string, hours?: number): Promise<BotStatsHistory[]> {
    const params = new URLSearchParams();
    if (botId) params.append("botId", botId);
    if (hours) params.append("hours", hours.toString());

    const { data } = await this.client.get<ApiResponse<BotStatsHistory[]>>(
      `/api/stats/history?${params.toString()}`
    );
    return data.data;
  }

  async getTopGuilds(limit = 10): Promise<TopGuild[]> {
    const { data } = await this.client.get<ApiResponse<TopGuild[]>>(
      `/api/stats/top-guilds?limit=${limit}`
    );
    return data.data;
  }

  async getTopTracks(limit = 10): Promise<TopTrack[]> {
    const { data } = await this.client.get<ApiResponse<TopTrack[]>>(
      `/api/stats/top-tracks?limit=${limit}`
    );
    return data.data;
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; uptime: number; bots: number }> {
    const { data } = await this.client.get("/health");
    return data;
  }
}

// Export singleton instance
export const api = new ApiClient();
