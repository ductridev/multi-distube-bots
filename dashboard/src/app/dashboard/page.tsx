"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard";
import { Music2, Users, Server, Activity } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const { setStats, setBots, setPlayers } = useDashboardStore();

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const data = await api.getStatsOverview();
      setStats(data);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch bots
  const { data: bots = [], isLoading: botsLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const data = await api.getBots();
      setBots(data || []);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch players
  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const data = await api.getPlayers();
      setPlayers(data || []);
      return data || [];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const isLoading = statsLoading || botsLoading || playersLoading;

  const statCards = [
    {
      label: "Total Guilds",
      value: stats?.totalGuilds || 0,
      icon: Server,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
    },
    {
      label: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      label: "Active Players",
      value: stats?.totalPlayers || 0,
      icon: Music2,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
    },
    {
      label: "Total Tracks Played",
      value: stats?.totalTracks || 0,
      icon: Activity,
      color: "bg-pink-500",
      bgColor: "bg-pink-50",
      textColor: "text-pink-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your Discord music bot system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {isLoading ? "..." : formatNumber(stat.value)}
                  </p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bots Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Active Bots</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {botsLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (bots && bots.length > 0) ? (
            bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {bot.avatar ? (
                    <Image
                      src={bot.avatar}
                      alt={bot.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {bot.name?.charAt(0).toUpperCase() || "B"}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          bot.isOnline ? "bg-green-500" : "bg-gray-400"
                        }`}
                      ></span>
                      <span className="text-sm text-gray-600">
                        {bot.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Guilds</p>
                    <p className="font-semibold text-gray-900">{bot.guildCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Users</p>
                    <p className="font-semibold text-gray-900">
                      {bot.userCount ? formatNumber(bot.userCount) : 0}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">No bots found</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Players */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Active Players</h2>
        {playersLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (players && players.length > 0) ? (
          <div className="space-y-4">
            {players.slice(0, 5).map((player) => (
              <div
                key={player.guildId}
                className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{player.botName}</p>
                    <p className="text-sm text-gray-600">
                      {player.voiceChannel.name} • {player.textChannel.name}
                    </p>
                  </div>
                  {player.currentTrack && (
                    <div className="flex-1 max-w-md">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {player.currentTrack.title}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {player.currentTrack.author}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {player.queue?.length || 0} in queue
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
            <Music2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No active players</p>
          </div>
        )}
      </div>
    </div>
  );
}
