"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BotMetrics, TopGuild, TopTrack } from "@/types/api";
import {
  BarChart3,
  Server,
  Users,
  Music,
  Activity,
  Trophy,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function StatsPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: () => api.getStatsOverview(),
    refetchInterval: 30000,
  });

  const { data: botMetrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ["stats", "botMetrics"],
    queryFn: () => api.getBotMetrics(),
    refetchInterval: 30000,
  });

  const { data: topGuilds = [], isLoading: guildsLoading } = useQuery({
    queryKey: ["stats", "topGuilds"],
    queryFn: () => api.getTopGuilds(10),
    refetchInterval: 60000,
  });

  const { data: topTracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["stats", "topTracks"],
    queryFn: () => api.getTopTracks(10),
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Statistics
        </h1>
        <p className="text-gray-600 mt-1">
          Detailed analytics and performance metrics
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Guilds"
          value={overview?.totalGuilds || 0}
          icon={Server}
          color="blue"
          loading={overviewLoading}
        />
        <StatCard
          title="Total Users"
          value={overview?.totalUsers || 0}
          icon={Users}
          color="green"
          loading={overviewLoading}
        />
        <StatCard
          title="Active Players"
          value={overview?.totalPlayers || 0}
          icon={Music}
          color="purple"
          loading={overviewLoading}
        />
        <StatCard
          title="Total Tracks"
          value={overview?.totalTracks || 0}
          icon={Activity}
          color="pink"
          loading={overviewLoading}
        />
      </div>

      {/* Bot Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bot Performance</h2>
            <p className="text-sm text-gray-600">Metrics for each bot instance</p>
          </div>
        </div>

        {metricsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : botMetrics && botMetrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bot Name</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Guilds</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Users</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Players</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Uptime</th>
                </tr>
              </thead>
              <tbody>
                {botMetrics.map((bot: BotMetrics) => (
                  <tr key={bot.clientId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{bot.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{formatNumber(bot.guildCount)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{formatNumber(bot.userCount)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{bot.playerCount}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">
                      {bot.uptime ? formatUptime(bot.uptime) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No bot metrics available
          </div>
        )}
      </div>

      {/* Top Guilds & Top Tracks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Guilds */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Trophy className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Top Guilds</h2>
              <p className="text-sm text-gray-600">Most active servers</p>
            </div>
          </div>

          {guildsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : topGuilds && topGuilds.length > 0 ? (
            <div className="space-y-3">
              {topGuilds.map((guild: TopGuild, index: number) => (
                <div
                  key={guild.guildId}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{guild.guildName}</p>
                    <p className="text-sm text-gray-600">{formatNumber(guild.playCount)} tracks played</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No guild data available
            </div>
          )}
        </div>

        {/* Top Tracks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Music className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Top Tracks</h2>
              <p className="text-sm text-gray-600">Most played songs</p>
            </div>
          </div>

          {tracksLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : topTracks && topTracks.length > 0 ? (
            <div className="space-y-3">
              {topTracks.map((track: TopTrack, index: number) => (
                <div
                  key={`${track.trackUrl}-${index}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{track.trackTitle}</p>
                    <p className="text-sm text-gray-600">Played {track.playCount} times</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No track data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "purple" | "pink";
  loading?: boolean;
}

function StatCard({ title, value, icon: Icon, color, loading }: StatCardProps) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    pink: "from-pink-500 to-pink-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {loading ? "..." : formatNumber(value)}
          </p>
        </div>
        <div
          className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-xl flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}
