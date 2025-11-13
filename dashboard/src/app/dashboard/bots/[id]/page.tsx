"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Trash2,
  Power,
  PowerOff,
  RotateCw,
  Server,
  Users,
  Activity,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatNumber, formatRelativeTime, getBotStatusColor } from "@/lib/utils";

const activityTypes = [
  { value: "PLAYING", label: "Playing" },
  { value: "WATCHING", label: "Watching" },
  { value: "LISTENING", label: "Listening to" },
  { value: "STREAMING", label: "Streaming" },
  { value: "COMPETING", label: "Competing in" },
] as const;

const statusTypes = [
  { value: "online", label: "Online", color: "bg-green-500" },
  { value: "idle", label: "Idle", color: "bg-yellow-500" },
  { value: "dnd", label: "Do Not Disturb", color: "bg-red-500" },
  { value: "invisible", label: "Invisible", color: "bg-gray-500" },
] as const;

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    prefix: string;
    playing: string;
    playingType: "PLAYING" | "WATCHING" | "LISTENING" | "STREAMING" | "COMPETING";
    streamUrl: string;
    status: "online" | "idle" | "dnd" | "invisible";
    color?: number;
  }>({
    name: "",
    prefix: "",
    playing: "",
    playingType: "PLAYING",
    streamUrl: "",
    status: "online",
    color: 0x5865f2,
  });

  const { data: bot, isLoading, refetch } = useQuery({
    queryKey: ["bot", botId],
    queryFn: async () => {
      const response = await api.getBot(botId);
      setFormData({
        name: response.name,
        prefix: response.prefix,
        playing: response.playing,
        playingType: response.playingType,
        streamUrl: response.streamUrl || "",
        status: response.status || "online",
        color: response.color ?? 0x5865f2,
      });
      return response;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await api.updateBot(botId, formData);
    },
    onSuccess: () => {
      toast.success("Bot updated successfully");
      setIsEditing(false);
      refetch();
    },
    onError: () => {
      toast.error("Failed to update bot");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.deleteBot(botId);
    },
    onSuccess: () => {
      toast.success("Bot deleted successfully");
      router.push("/dashboard/bots");
    },
    onError: () => {
      toast.error("Failed to delete bot");
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete "${bot?.name}"? This action cannot be undone.`)) {
      return;
    }
    deleteMutation.mutate();
  };

  const handleBotAction = async (action: "start" | "stop" | "restart") => {
    toast.loading(`${action.charAt(0).toUpperCase() + action.slice(1)}ing bot...`);
    // TODO: Implement bot control API
    toast.success(`Bot ${action}ed successfully`);
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-gray-900">Bot not found</h2>
        <Link
          href="/dashboard/bots"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Bots
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/bots"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {bot.name}
            </h1>
            <p className="text-gray-700 mt-1 font-mono font-medium">{bot.clientId}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {!isEditing ? (
            <>
              <button
                onClick={() => handleBotAction(bot.isOnline ? "restart" : "start")}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {bot.isOnline ? (
                  <>
                    <RotateCw className="w-4 h-4 text-gray-900" />
                    Restart
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4 text-green-600" />
                    Start
                  </>
                )}
              </button>

              {bot.isOnline && (
                <button
                  onClick={() => handleBotAction("stop")}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <PowerOff className="w-4 h-4 text-red-600" />
                  <span className="text-gray-900">Stop</span>
                </button>
              )}

              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                Edit Configuration
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${bot.isOnline ? "bg-green-100" : "bg-red-100"}`}>
              <Activity className={`w-6 h-6 ${bot.isOnline ? "text-green-600" : "text-red-600"}`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-xl font-bold text-gray-900">
                {bot.isOnline ? "Online" : "Offline"}
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
              <p className="text-sm text-gray-600">Guilds</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(bot.guildCount || 0)}
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
              <p className="text-sm text-gray-600">Users</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(bot.userCount || 0)}
              </p>
            </div>
          </div>
        </div>

        {bot.uptime !== undefined && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatRelativeTime(new Date(Date.now() - bot.uptime * 1000))}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bot Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Bot Information</h3>

            <div className="flex flex-col items-center space-y-4">
              {bot.avatar ? (
                <Image
                  src={bot.avatar}
                  alt={bot.name}
                  width={128}
                  height={128}
                  className="w-32 h-32 rounded-full"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                  {bot.name.charAt(0)}
                </div>
              )}

              <div className="text-center">
                <h4 className="text-xl font-bold text-gray-900">{bot.name}</h4>
                <p className="text-sm text-gray-500 font-mono mt-1">{bot.clientId}</p>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                    bot.isOnline
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${getBotStatusColor(bot.isOnline ? "online" : "offline")}`} />
                  {bot.isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatRelativeTime(new Date(bot.createdAt))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatRelativeTime(new Date(bot.updatedAt))}
                </p>
              </div>
            </div>

            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleteMutation.isPending ? "Deleting..." : "Delete Bot"}
            </button>
          </div>
        </div>

        {/* Configuration */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>

            <div className="space-y-4">
              {/* Bot Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Bot Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 text-gray-900"
                  placeholder="My Music Bot"
                />
              </div>

              {/* Prefix */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Command Prefix
                </label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 font-mono text-gray-900"
                  placeholder="!"
                />
              </div>

              {/* Activity Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Activity Type
                </label>
                <select
                  value={formData.playingType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      playingType: e.target.value as typeof formData.playingType,
                    })
                  }
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 text-gray-900"
                >
                  {activityTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Text */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Activity Text
                </label>
                <input
                  type="text"
                  value={formData.playing}
                  onChange={(e) => setFormData({ ...formData, playing: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 text-gray-900"
                  placeholder="music"
                />
              </div>

              {/* Stream URL */}
              {formData.playingType === "STREAMING" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Stream URL
                  </label>
                  <input
                    type="url"
                    value={formData.streamUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, streamUrl: e.target.value })
                    }
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 text-gray-900"
                    placeholder="https://twitch.tv/..."
                  />
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {statusTypes.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() =>
                        isEditing &&
                        setFormData({
                          ...formData,
                          status: status.value as typeof formData.status,
                        })
                      }
                      disabled={!isEditing}
                      className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-all disabled:opacity-50 ${
                        formData.status === status.value
                          ? "border-indigo-600 bg-indigo-50 font-medium"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${status.color}`} />
                      <span className="text-sm font-medium text-gray-900">{status.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Embed Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={`#${(formData.color ?? 0x5865f2).toString(16).padStart(6, "0")}`}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        color: parseInt(e.target.value.slice(1), 16),
                      })
                    }
                    disabled={!isEditing}
                    className="h-10 w-20 rounded border border-gray-300 disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={`#${(formData.color ?? 0x5865f2).toString(16).padStart(6, "0")}`}
                    onChange={(e) => {
                      const hex = e.target.value.replace("#", "");
                      if (/^[0-9A-Fa-f]{0,6}$/.test(hex)) {
                        setFormData({
                          ...formData,
                          color: parseInt(hex || "0", 16),
                        });
                      }
                    }}
                    disabled={!isEditing}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 font-mono text-gray-900"
                    placeholder="#5865F2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
