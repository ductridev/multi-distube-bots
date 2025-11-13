"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard";
import type { Player } from "@/types/api";
import {
  Music,
  Play,
  Pause,
  SkipForward,
  Square,
  Volume2,
  List,
  RefreshCw,
  User,
  Hash,
  Volume,
  Repeat,
  Shuffle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDuration } from "@/lib/utils";
import Image from "next/image";

export default function PlayersPage() {
  const { players } = useDashboardStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: playersData = [], isLoading, refetch } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const response = await api.getPlayers();
      return response || [];
    },
    refetchInterval: 10000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    toast.success("Players refreshed");
    setIsRefreshing(false);
  };

  const handlePlayerControl = async (
    guildId: string,
    action: "play" | "pause" | "skip" | "stop"
  ) => {
    try {
      toast.loading(`${action.charAt(0).toUpperCase() + action.slice(1)}ing...`);
      
      // Map action to PlayerControlAction type
      let controlAction;
      if (action === "play") {
        controlAction = { action: "resume" as const };
      } else if (action === "pause") {
        controlAction = { action: "pause" as const };
      } else if (action === "skip") {
        controlAction = { action: "skip" as const };
      } else {
        controlAction = { action: "stop" as const };
      }
      
      await api.controlPlayer(guildId, controlAction);
      toast.success(`Player ${action}ed successfully`);
      await refetch();
    } catch {
      toast.error(`Failed to ${action} player`);
    }
  };

  const handleVolumeChange = async (guildId: string, volume: number) => {
    try {
      await api.controlPlayer(guildId, { action: "volume", value: volume });
      toast.success(`Volume set to ${volume}%`);
      await refetch();
    } catch {
      toast.error("Failed to change volume");
    }
  };

  const displayPlayers = playersData || players || [];

  if (isLoading && !displayPlayers.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Active Players
          </h1>
          <p className="text-gray-700 mt-1 font-medium">
            Control music playback across all guilds
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 text-gray-900 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm">Active Music Sessions</p>
            <p className="text-4xl font-bold mt-1">{displayPlayers.length}</p>
          </div>
          <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
            <Music className="w-12 h-12" />
          </div>
        </div>
      </div>

      {/* Players List */}
      {displayPlayers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No active players
          </h3>
          <p className="text-gray-600">
            Music players will appear here when bots start playing in guilds
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayPlayers.map((player: Player) => (
            <div
              key={player.guildId}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                {/* Left: Now Playing */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Bot & Guild Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {player.botName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Volume className="w-4 h-4" />
                          {player.voiceChannel.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-4 h-4" />
                          {player.textChannel.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {player.isLooping && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                          <Repeat className="w-3 h-3" />
                          Loop
                        </span>
                      )}
                      {player.isAutoplay && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          <Shuffle className="w-3 h-3" />
                          Autoplay
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Current Track */}
                  {player.currentTrack ? (
                    <div className="flex items-start gap-4">
                      {player.currentTrack.thumbnail ? (
                        <Image
                          src={player.currentTrack.thumbnail}
                          alt={player.currentTrack.title}
                          width={96}
                          height={96}
                          className="w-24 h-24 rounded-lg object-cover shadow"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                          <Music className="w-10 h-10 text-white" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-semibold text-gray-900 truncate">
                          {player.currentTrack.title}
                        </h4>
                        <p className="text-gray-600 truncate">
                          {player.currentTrack.author}
                        </p>

                        {/* Progress Bar */}
                        <div className="mt-3 space-y-1">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-indigo-600 to-purple-600 h-1.5 rounded-full transition-all duration-1000"
                              style={{
                                width: `${
                                  (player.currentTrack.position /
                                    player.currentTrack.duration) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {formatDuration(player.currentTrack.position)}
                            </span>
                            <span>
                              {formatDuration(player.currentTrack.duration)}
                            </span>
                          </div>
                        </div>

                        {/* Requested By */}
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>
                            Requested by {player.currentTrack.requestedBy.username}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No track playing</p>
                    </div>
                  )}

                  {/* Queue Info */}
                  {player.queue && player.queue.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-100">
                      <List className="w-4 h-4" />
                      <span>
                        {player.queue.length} track{player.queue.length !== 1 ? "s" : ""} in queue
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Controls */}
                <div className="space-y-4">
                  {/* Playback Controls */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Playback Controls
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() =>
                          handlePlayerControl(
                            player.guildId,
                            player.isPaused ? "play" : "pause"
                          )
                        }
                        className="flex items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        title={player.isPaused ? "Resume" : "Pause"}
                      >
                        {player.isPaused ? (
                          <Play className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Pause className="w-5 h-5 text-indigo-600" />
                        )}
                      </button>

                      <button
                        onClick={() =>
                          handlePlayerControl(player.guildId, "skip")
                        }
                        disabled={!player.currentTrack}
                        className="flex items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Skip"
                      >
                        <SkipForward className="w-5 h-5 text-indigo-600" />
                      </button>

                      <button
                        onClick={() =>
                          handlePlayerControl(player.guildId, "stop")
                        }
                        className="flex items-center justify-center p-3 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        title="Stop"
                      >
                        <Square className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {/* Volume Control */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700">Volume</p>
                      <span className="text-sm font-semibold text-indigo-600">
                        {player.volume}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-4 h-4 text-gray-400" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={player.volume}
                        onChange={(e) =>
                          handleVolumeChange(
                            player.guildId,
                            parseInt(e.target.value)
                          )
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Filters */}
                  {player.filters && player.filters.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Active Filters
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {player.filters.map((filter) => (
                          <span
                            key={filter}
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium"
                          >
                            {filter}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
