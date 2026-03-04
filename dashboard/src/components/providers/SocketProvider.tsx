"use client";

import { useEffect, useState } from "react";
import { dashboardSocket } from "@/lib/socket";
import { useDashboardStore } from "@/store/dashboard";
import { toast } from "sonner";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { setSocketConnected, updateBot, updatePlayer, removePlayer } = useDashboardStore();
  const [token, setToken] = useState<string | null>(null);

  // Get token from localStorage on mount and listen for changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateToken = () => {
      const storedToken = localStorage.getItem("dashboard_token");
      setToken(storedToken);
    };

    // Initial token fetch
    updateToken();

    // Listen for storage events (in case token changes in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "dashboard_token") {
        updateToken();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Also poll for token changes (for same-tab updates)
    const interval = setInterval(updateToken, 5000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Connect/update socket when token changes
  useEffect(() => {
    if (!token) {
      // No token - disconnect if connected
      if (dashboardSocket.isConnected()) {
        dashboardSocket.disconnect();
      }
      return;
    }

    // If already connected, update the auth token
    if (dashboardSocket.isConnected()) {
      dashboardSocket.updateAuthToken(token);
    } else {
      // Not connected - establish new connection
      dashboardSocket.connect(token);
    }

    // Update connection status
    const checkConnection = () => {
      setSocketConnected(dashboardSocket.isConnected());
    };

    const connInterval = setInterval(checkConnection, 1000);
    checkConnection();

    // Listen to bot status events
    const unsubBotStatus = dashboardSocket.onBotStatus((data) => {
      updateBot(data.clientId, {
        isOnline: data.status === "online",
        guildCount: data.guilds,
        userCount: data.users,
      });
    });

    // Listen to bot stats events
    const unsubBotStats = dashboardSocket.onBotStats((data) => {
      updateBot(data.clientId, {
        guildCount: data.guildCount,
      });
    });

    // Listen to player start events
    const unsubPlayerStart = dashboardSocket.onPlayerStart((data) => {
      toast.success(`🎵 Now playing: ${data.track.title}`, {
        description: `In ${data.guildId}`,
      });
    });

    // Listen to player end events
    const unsubPlayerEnd = dashboardSocket.onPlayerEnd((data) => {
      removePlayer(data.guildId);
    });

    // Listen to guild join events
    const unsubGuildJoin = dashboardSocket.onGuildJoin((data) => {
      toast.info(`✨ Joined guild: ${data.guildName}`, {
        description: `${data.memberCount} members`,
      });
    });

    // Listen to guild leave events
    const unsubGuildLeave = dashboardSocket.onGuildLeave((data) => {
      toast.warning(`👋 Left guild: ${data.guildName}`, {
        description: `Bot ${data.clientId}`,
      });
    });

    // Listen to error events
    const unsubError = dashboardSocket.onError((data) => {
      toast.error("Error", {
        description: data.error,
      });
    });

    // Cleanup on unmount or when token changes
    return () => {
      clearInterval(connInterval);
      unsubBotStatus();
      unsubBotStats();
      unsubPlayerStart();
      unsubPlayerEnd();
      unsubGuildJoin();
      unsubGuildLeave();
      unsubError();
    };
  }, [token, setSocketConnected, updateBot, updatePlayer, removePlayer]);

  return <>{children}</>;
}
