"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  TimePeriod,
  AggregationMethod,
  UserServer,
  BotMetrics,
  TopGuild,
  TopTrack,
} from "@/types/api";
import {
  BarChart3,
  Server,
  Users,
  Music,
  Activity,
  Trophy,
  ChevronDown,
  Crown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import {
  TimeFilterSelector,
  LineSessionsChart,
  LineListenersChart,
  CirclePercentTrackTypes,
  LineActivityHoursBySeconds,
  LineActivityWeekdaysBySeconds,
  MostTimePlayedList,
  MostTimeListenedList,
  TopCommandsList,
} from "@/components/stats";

// Premium status type with error tracking
type PremiumStatusState = {
  isPremium: boolean;
  isLoading: boolean;
  error: boolean;
};

export default function StatsPage() {
  // Filter state
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("last_24_hours");
  const [selectedAggregation, setSelectedAggregation] = useState<AggregationMethod>("average");
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);

  // Premium periods
  const premiumPeriods: TimePeriod[] = ["last_30_days", "all_time"];

  // Fetch premium status with error tracking
  const { data: premiumStatus, isLoading: premiumLoading, error: premiumError } = useQuery({
    queryKey: ["stats", "premium"],
    queryFn: () => api.checkPremiumStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Track premium status with error state
  const premiumState: PremiumStatusState = {
    isPremium: premiumStatus?.isPremium ?? false,
    isLoading: premiumLoading,
    error: !!premiumError,
  };

  // Show warning if premium check failed (distinguish from "not premium")
  useEffect(() => {
    if (premiumError) {
      toast.warning("Unable to verify premium status. Some features may be limited.");
    }
  }, [premiumError]);

  // Fetch user servers with error handling
  const { data: userServers = [], isLoading: serversLoading, error: serversError } = useQuery({
    queryKey: ["stats", "servers"],
    queryFn: () => api.getUserServers(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Log server fetch errors (non-blocking warning)
  useEffect(() => {
    if (serversError) {
      toast.warning("Could not load server list. Server filter may be unavailable.");
    }
  }, [serversError]);

  // Fetch chart data with error handling
  const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ["stats", "sessions", selectedServer, selectedPeriod, selectedAggregation],
    queryFn: () => api.getSessionsChart(selectedServer, selectedPeriod, selectedAggregation),
    enabled: !premiumPeriods.includes(selectedPeriod) || premiumState.isPremium,
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: listenersData, isLoading: listenersLoading, error: listenersError } = useQuery({
    queryKey: ["stats", "listeners", selectedServer, selectedPeriod, selectedAggregation],
    queryFn: () => api.getListenersChart(selectedServer, selectedPeriod, selectedAggregation),
    enabled: !premiumPeriods.includes(selectedPeriod) || premiumState.isPremium,
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: trackTypesData, isLoading: trackTypesLoading, error: trackTypesError } = useQuery({
    queryKey: ["stats", "trackTypes", selectedServer, selectedPeriod],
    queryFn: () => api.getTrackTypesChart(selectedServer, selectedPeriod),
    enabled: !premiumPeriods.includes(selectedPeriod) || premiumState.isPremium,
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: activityHoursData, isLoading: activityHoursLoading, error: activityHoursError } = useQuery({
    queryKey: ["stats", "activityHours", selectedServer, selectedPeriod],
    queryFn: () => api.getActivityHoursChart(selectedServer, selectedPeriod),
    enabled: !premiumPeriods.includes(selectedPeriod) || premiumState.isPremium,
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: activityWeekdaysData, isLoading: activityWeekdaysLoading, error: activityWeekdaysError } = useQuery({
    queryKey: ["stats", "activityWeekdays", selectedServer, selectedPeriod],
    queryFn: () => api.getActivityWeekdaysChart(selectedServer, selectedPeriod),
    enabled: !premiumPeriods.includes(selectedPeriod) || premiumState.isPremium,
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: mostPlayedData, isLoading: mostPlayedLoading, error: mostPlayedError } = useQuery({
    queryKey: ["stats", "mostPlayed", selectedServer, selectedPeriod],
    queryFn: () => api.getMostPlayedList(selectedServer, selectedPeriod),
    enabled: !premiumPeriods.includes(selectedPeriod) || premiumState.isPremium,
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: mostListenedData, isLoading: mostListenedLoading, error: mostListenedError } = useQuery({
    queryKey: ["stats", "mostListened", selectedServer, selectedPeriod],
    queryFn: () => api.getMostListenedList(selectedServer, selectedPeriod),
    enabled: !premiumPeriods.includes(selectedPeriod) || premiumState.isPremium,
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: topCommandsData, isLoading: topCommandsLoading, error: topCommandsError } = useQuery({
    queryKey: ["stats", "topCommands", selectedServer, selectedPeriod],
    queryFn: () => api.getTopCommandsList(selectedServer, selectedPeriod),
    enabled: !premiumPeriods.includes(selectedPeriod) || premiumState.isPremium,
    refetchInterval: 60000,
    retry: 1,
  });

  // Legacy overview data with error handling
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: () => api.getStatsOverview(),
    refetchInterval: 30000,
    retry: 1,
  });

  const { data: botMetrics = [], isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ["stats", "botMetrics"],
    queryFn: () => api.getBotMetrics(),
    refetchInterval: 30000,
    retry: 1,
  });

  const { data: topGuilds = [], isLoading: guildsLoading, error: guildsError } = useQuery({
    queryKey: ["stats", "topGuilds"],
    queryFn: () => api.getTopGuilds(10),
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: topTracks = [], isLoading: tracksLoading, error: tracksError } = useQuery({
    queryKey: ["stats", "topTracks"],
    queryFn: () => api.getTopTracks(10),
    refetchInterval: 60000,
    retry: 1,
  });

  // Track query errors
  const chartErrors = [
    sessionsError, listenersError, trackTypesError, activityHoursError,
    activityWeekdaysError, mostPlayedError, mostListenedError, topCommandsError
  ].filter(Boolean);

  // Log all chart errors once
  useEffect(() => {
    if (chartErrors.length > 0) {
      console.error("Chart data fetch errors:", chartErrors);
    }
  }, [chartErrors.length]);

  // Handle period change with premium check
  const handlePeriodChange = (period: TimePeriod) => {
    if (premiumPeriods.includes(period) && !premiumState.isPremium) {
      // Distinguish between "not premium" and "check failed"
      if (premiumState.error) {
        toast.error("Premium check failed", {
          description: "Unable to verify premium status. Please try again later.",
        });
      } else {
        toast.error("Premium required", {
          description: "This time period requires a premium subscription. Donate $1 or more to unlock.",
        });
      }
      return;
    }
    setSelectedPeriod(period);
  };

  // Get selected server name with defensive fallback
  const selectedServerName = selectedServer
    ? (userServers.find((s) => s.guildId === selectedServer)?.guildName || "Unknown Server")
    : "All Servers";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsServerDropdownOpen(false);
    if (isServerDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isServerDropdownOpen]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Statistics</h1>
          <p className="text-gray-600 mt-1">
            Detailed analytics and performance metrics
          </p>
        </div>

        {/* Premium Badge */}
        {premiumState.isPremium && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="text-amber-700 font-medium">Premium</span>
          </div>
        )}
        {/* Premium Check Error Warning */}
        {premiumState.error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="text-yellow-700 font-medium">Unable to verify premium status</span>
          </div>
        )}
      </div>

      {/* Server Selector & Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
        {/* Server Dropdown */}
        <div className="relative inline-block">
          {serversLoading ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              <span className="text-gray-500">Loading servers...</span>
            </div>
          ) : userServers.length > 0 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsServerDropdownOpen(!isServerDropdownOpen);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                <Server className="w-4 h-4 text-gray-500" />
                <span className="text-gray-900">{selectedServerName}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {isServerDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServer(null);
                      setIsServerDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                      !selectedServer ? "text-indigo-600 bg-indigo-50" : "text-gray-700"
                    }`}
                  >
                    All Servers
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  {userServers.map((server) => (
                    <button
                      key={server.guildId}
                      type="button"
                      onClick={() => {
                        setSelectedServer(server.guildId);
                        setIsServerDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        selectedServer === server.guildId
                          ? "text-indigo-600 bg-indigo-50"
                          : "text-gray-700"
                      }`}
                    >
                      {server.guildIcon ? (
                        <img
                          src={`https://cdn.discordapp.com/icons/${server.guildId}/${server.guildIcon}.png`}
                          alt=""
                          className="w-5 h-5 rounded"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                          {(server.guildName ?? "?").charAt(0)}
                        </div>
                      )}
                      <span className="truncate">{server.guildName ?? "Unknown Server"}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <Server className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">No shared servers found</span>
            </div>
          )}
        </div>

        {/* Time Period & Aggregation Filters */}
        <TimeFilterSelector
          selectedPeriod={selectedPeriod}
          selectedAggregation={selectedAggregation}
          onPeriodChange={handlePeriodChange}
          onAggregationChange={setSelectedAggregation}
          isPremium={premiumState.isPremium}
        />
      </div>

      {/* Charts: Sessions, Track Types (spanning 2 rows), and Listeners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LineSessionsChart
            data={sessionsData?.data ?? []}
            loading={sessionsLoading}
            period={selectedPeriod}
          />
        </div>
        <div className="lg:row-span-2">
          <CirclePercentTrackTypes
            data={trackTypesData?.data ?? null}
            loading={trackTypesLoading}
          />
        </div>
        <div className="lg:col-span-2">
          <LineListenersChart
            data={listenersData?.data ?? []}
            loading={listenersLoading}
            period={selectedPeriod}
          />
        </div>
      </div>

      {/* Charts Row 3: Activity Hours & Weekdays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineActivityHoursBySeconds
          data={activityHoursData?.data ?? []}
          loading={activityHoursLoading}
        />
        <LineActivityWeekdaysBySeconds
          data={activityWeekdaysData?.data ?? []}
          loading={activityWeekdaysLoading}
        />
      </div>

      {/* Lists Row: Most Played, Most Listened, Top Commands */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MostTimePlayedList
          data={mostPlayedData?.data ?? []}
          loading={mostPlayedLoading}
        />
        <MostTimeListenedList
          data={mostListenedData?.data ?? []}
          loading={mostListenedLoading}
        />
        <TopCommandsList
          data={topCommandsData?.data ?? []}
          loading={topCommandsLoading}
        />
      </div>

      {/* Legacy Overview Cards */}
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Overview</h2>
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
            value={overview?.totalPlays || 0}
            icon={Activity}
            color="pink"
            loading={overviewLoading}
          />
        </div>
      </div>

      {/* Bot Performance Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-lg">
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
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Bot Name</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Guilds</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Users</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Players</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Uptime</th>
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
                        {bot.uptime ? formatUptime(bot.uptime) : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {botMetrics.map((bot: BotMetrics) => (
                <div key={bot.clientId} className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="font-medium text-gray-900">{bot.name}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Guilds:</span>
                      <span className="font-medium text-gray-900">{formatNumber(bot.guildCount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Users:</span>
                      <span className="font-medium text-gray-900">{formatNumber(bot.userCount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Players:</span>
                      <span className="font-medium text-gray-900">{bot.playerCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uptime:</span>
                      <span className="font-medium text-gray-900">{bot.uptime ? formatUptime(bot.uptime) : "N/A"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No bot metrics available
          </div>
        )}
      </div>

      {/* Top Guilds & Top Tracks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Guilds */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
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
                  key={`${track.url}-${index}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  {/* Source Icon */}
                  <div className="shrink-0">
                    {getSourceIcon(track.url)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={track.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 truncate hover:underline block"
                      title={track.title}
                    >
                      {track.title}
                    </a>
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
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

// Helper function to detect source from URL
function getSourceFromUrl(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('deezer.com')) return 'deezer';
  if (url.includes('bandlab.com')) return 'bandlab';
  return 'unknown';
}

// YouTube Icon SVG
function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

// Spotify Icon SVG
function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

// SoundCloud Icon SVG
function SoundCloudIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899 1.02c-.051 0-.094.044-.102.098l-.154 1.134.154 1.107c.008.057.051.098.102.098.05 0 .09-.04.099-.098l.194-1.107-.194-1.134c-.009-.058-.05-.098-.099-.098zm1.83-1.229c-.056 0-.104.053-.108.109l-.21 2.362.21 2.301c.004.058.052.109.108.109.056 0 .104-.051.108-.109l.244-2.301-.244-2.362c-.004-.056-.052-.109-.108-.109zm.887-.182c-.061 0-.109.053-.117.112l-.198 2.544.198 2.463c.008.061.056.112.117.112.061 0 .109-.051.117-.112l.229-2.463-.229-2.544c-.008-.059-.056-.112-.117-.112zm.893-.09c-.066 0-.12.054-.126.117l-.18 2.634.18 2.55c.006.066.06.117.126.117.066 0 .12-.051.126-.117l.209-2.55-.209-2.634c-.006-.063-.06-.117-.126-.117zm.907-.06c-.069 0-.127.057-.132.123l-.165 2.694.165 2.613c.005.069.063.123.132.123.069 0 .127-.054.132-.123l.192-2.613-.192-2.694c-.005-.066-.063-.123-.132-.123zm.922-.045c-.074 0-.134.06-.14.126l-.15 2.739.15 2.655c.006.074.066.126.14.126.074 0 .134-.052.14-.126l.174-2.655-.174-2.739c-.006-.066-.066-.126-.14-.126zm.914-.029c-.079 0-.139.063-.147.135l-.135 2.768.135 2.682c.008.079.068.135.147.135.079 0 .139-.056.147-.135l.159-2.682-.159-2.768c-.008-.072-.068-.135-.147-.135zm1.797.029c-.084 0-.149.066-.155.141l-.12 2.739.12 2.64c.006.079.071.141.155.141.084 0 .149-.062.155-.141l.141-2.64-.141-2.739c-.006-.075-.071-.141-.155-.141zm-.887.016c-.081 0-.144.065-.15.138l-.132 2.723.132 2.658c.006.078.069.138.15.138.081 0 .144-.06.15-.138l.15-2.658-.15-2.723c-.006-.073-.069-.138-.15-.138zm1.799-.182c-.089 0-.156.069-.162.147l-.105 2.905.105 2.793c.006.087.073.147.162.147.089 0 .156-.06.162-.147l.123-2.793-.123-2.905c-.006-.078-.073-.147-.162-.147zm.907-.029c-.093 0-.163.073-.168.153l-.09 2.934.09 2.819c.005.087.075.153.168.153.093 0 .163-.066.168-.153l.108-2.819-.108-2.934c-.005-.08-.075-.153-.168-.153zm.922-.045c-.098 0-.168.075-.174.159l-.075 2.979.075 2.849c.006.09.076.159.174.159.098 0 .168-.069.174-.159l.093-2.849-.093-2.979c-.006-.084-.076-.159-.174-.159zm4.242 2.466c-.281 0-.55.058-.797.154-.165-1.861-1.733-3.318-3.631-3.318-.471 0-.93.089-1.354.258-.158.063-.199.126-.199.251v6.445c0 .129.104.236.232.244l5.749.001c1.023 0 1.852-.827 1.852-1.851s-.829-1.851-1.852-1.851v-.333z"/>
    </svg>
  );
}

// Get source icon based on URL
function getSourceIcon(url: string): React.ReactNode {
  const source = getSourceFromUrl(url);

  if (source === 'spotify') {
    return (
      <span title="Spotify" className="flex items-center">
        <SpotifyIcon className="w-4 h-4 text-[#1db954]" />
        <span className="sr-only">Spotify</span>
      </span>
    );
  }

  if (source === 'soundcloud') {
    return (
      <span title="SoundCloud" className="flex items-center">
        <SoundCloudIcon className="w-4 h-4 text-[#ff5500]" />
        <span className="sr-only">SoundCloud</span>
      </span>
    );
  }

  if (source === 'youtube') {
    return (
      <span title="YouTube" className="flex items-center">
        <YouTubeIcon className="w-4 h-4 text-[#ff0000]" />
        <span className="sr-only">YouTube</span>
      </span>
    );
  }

  // Default/other
  return (
    <div
      className="w-4 h-4 rounded-full flex items-center justify-center"
      style={{ backgroundColor: "#6366f1" }}
      title="Other"
    >
      <span className="sr-only">Other</span>
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
