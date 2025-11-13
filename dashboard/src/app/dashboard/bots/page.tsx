"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard";
import type { Bot } from "@/types/api";
import {
  Plus,
  RefreshCw,
  Server,
  Users,
  Clock,
  Activity,
  Trash2,
  Edit,
  Power,
  PowerOff,
  RotateCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatNumber, formatRelativeTime, getBotStatusColor } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export default function BotsPage() {
  const { bots, removeBot } = useDashboardStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: botsData = [], isLoading, refetch } = useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const response = await api.getBots();
      return response || [];
    },
    refetchInterval: 30000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    toast.success("Bots refreshed");
    setIsRefreshing(false);
  };

  const handleBotAction = async (
    botId: string,
    action: "start" | "stop" | "restart"
  ) => {
    try {
      toast.loading(`${action.charAt(0).toUpperCase() + action.slice(1)}ing bot...`);
      // TODO: Implement bot control API endpoints
      // await api.controlBot(botId, action);
      toast.success(`Bot ${action}ed successfully`);
      await refetch();
    } catch {
      toast.error(`Failed to ${action} bot`);
    }
  };

  const handleDeleteBot = async (botId: string, botName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${botName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      toast.loading("Deleting bot...");
      await api.deleteBot(botId);
      removeBot(botId);
      toast.success("Bot deleted successfully");
      await refetch();
    } catch {
      toast.error("Failed to delete bot");
    }
  };

  const displayBots = botsData || bots || [];

  if (isLoading && !displayBots.length) {
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
            Bot Management
          </h1>
          <p className="text-gray-700 mt-1 font-medium">
            Manage all your Discord music bots
          </p>
        </div>

        <div className="flex gap-3">
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

          <Link
            href="/dashboard/bots/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add Bot
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Online Bots</p>
              <p className="text-2xl font-bold text-gray-900">
                {displayBots.filter((b: Bot) => b.isOnline).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <PowerOff className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Offline Bots</p>
              <p className="text-2xl font-bold text-gray-900">
                {displayBots.filter((b: Bot) => !b.isOnline).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Server className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Guilds</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(
                  displayBots.reduce((acc: number, b: Bot) => acc + (b.guildCount || 0), 0)
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(
                  displayBots.reduce((acc: number, b: Bot) => acc + (b.userCount || 0), 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bots Grid */}
      {displayBots.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No bots found
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by adding your first Discord bot
          </p>
          <Link
            href="/dashboard/bots/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add Your First Bot
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayBots.map((bot: Bot) => (
            <div
              key={bot.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
            >
              {/* Bot Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    {bot.avatar ? (
                      <Image
                        src={bot.avatar}
                        alt={bot.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                        {bot.name.charAt(0)}
                      </div>
                    )}
                    {/* Status indicator */}
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${getBotStatusColor(
                        bot.isOnline ? "online" : "offline"
                      )}`}
                    />
                  </div>

                  {/* Bot info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {bot.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono truncate">
                      {bot.clientId}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          bot.isOnline
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            bot.isOnline ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        {bot.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bot Stats */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium flex items-center gap-2">
                    <Server className="w-4 h-4 text-gray-700" />
                    Guilds
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatNumber(bot.guildCount || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-700" />
                    Users
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatNumber(bot.userCount || 0)}
                  </span>
                </div>

                {bot.uptime !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-700" />
                      Uptime
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatRelativeTime(new Date(Date.now() - bot.uptime * 1000))}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-700 font-medium">
                    Prefix: <span className="font-mono font-semibold text-gray-900">{bot.prefix}</span>
                  </div>
                  <div className="text-xs text-gray-700 font-medium mt-1 truncate">
                    Activity: <span className="text-gray-900">{bot.playing}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                <Link
                  href={`/dashboard/bots/${bot.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900"
                >
                  <Edit className="w-4 h-4 text-gray-900" />
                  Edit
                </Link>

                <button
                  onClick={() =>
                    handleBotAction(bot.id, bot.isOnline ? "restart" : "start")
                  }
                  className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={bot.isOnline ? "Restart" : "Start"}
                >
                  {bot.isOnline ? (
                    <RotateCw className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <Power className="w-4 h-4 text-green-600" />
                  )}
                </button>

                <button
                  onClick={() => handleDeleteBot(bot.id, bot.name)}
                  className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
