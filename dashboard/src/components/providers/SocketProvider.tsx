"use client";

import { useEffect } from "react";
import { dashboardSocket } from "@/lib/socket";
import { useDashboardStore } from "@/store/dashboard";
import { toast } from "sonner";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { setSocketConnected, updateBot, updatePlayer, removePlayer } = useDashboardStore();

  useEffect(() => {
    // Get token from localStorage
    const token = typeof window !== "undefined" ? localStorage.getItem("dashboard_token") : null;

    // Connect to WebSocket
    dashboardSocket.connect(token || undefined);

    // Update connection status
    const checkConnection = () => {
      setSocketConnected(dashboardSocket.isConnected());
    };

    const interval = setInterval(checkConnection, 1000);
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

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      unsubBotStatus();
      unsubBotStats();
      unsubPlayerStart();
      unsubPlayerEnd();
      unsubGuildJoin();
      unsubGuildLeave();
      unsubError();
      dashboardSocket.disconnect();
    };
  }, [setSocketConnected, updateBot, updatePlayer, removePlayer]);

  return <>{children}</>;
}
