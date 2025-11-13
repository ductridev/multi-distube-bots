import { create } from "zustand";
import type { Bot, Player, StatsOverview, DashboardUser } from "@/types/api";

interface DashboardStore {
  // User state
  user: DashboardUser | null;
  setUser: (user: DashboardUser | null) => void;

  // Bots state
  bots: Bot[];
  setBots: (bots: Bot[]) => void;
  updateBot: (id: string, bot: Partial<Bot>) => void;
  removeBot: (id: string) => void;

  // Players state
  players: Player[];
  setPlayers: (players: Player[]) => void;
  updatePlayer: (guildId: string, player: Partial<Player>) => void;
  removePlayer: (guildId: string) => void;

  // Stats state
  stats: StatsOverview | null;
  setStats: (stats: StatsOverview) => void;

  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // WebSocket connection state
  socketConnected: boolean;
  setSocketConnected: (connected: boolean) => void;

  // Loading states
  loading: {
    bots: boolean;
    players: boolean;
    stats: boolean;
  };
  setLoading: (key: keyof DashboardStore["loading"], value: boolean) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // User state
  user: null,
  setUser: (user) => set({ user }),

  // Bots state
  bots: [],
  setBots: (bots) => set({ bots }),
  updateBot: (id, updatedBot) =>
    set((state) => ({
      bots: state.bots.map((bot) => (bot.id === id ? { ...bot, ...updatedBot } : bot)),
    })),
  removeBot: (id) =>
    set((state) => ({
      bots: state.bots.filter((bot) => bot.id !== id),
    })),

  // Players state
  players: [],
  setPlayers: (players) => set({ players }),
  updatePlayer: (guildId, updatedPlayer) =>
    set((state) => ({
      players: state.players.map((player) =>
        player.guildId === guildId ? { ...player, ...updatedPlayer } : player
      ),
    })),
  removePlayer: (guildId) =>
    set((state) => ({
      players: state.players.filter((player) => player.guildId !== guildId),
    })),

  // Stats state
  stats: null,
  setStats: (stats) => set({ stats }),

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // WebSocket connection state
  socketConnected: false,
  setSocketConnected: (connected) => set({ socketConnected: connected }),

  // Loading states
  loading: {
    bots: false,
    players: false,
    stats: false,
  },
  setLoading: (key, value) =>
    set((state) => ({
      loading: { ...state.loading, [key]: value },
    })),
}));
