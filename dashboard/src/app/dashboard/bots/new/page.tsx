"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import Link from "next/link";

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

export default function NewBotPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<{
    token: string;
    name: string;
    prefix: string;
    playing: string;
    playingType: "PLAYING" | "WATCHING" | "LISTENING" | "STREAMING" | "COMPETING";
    streamUrl: string;
    status: "online" | "idle" | "dnd" | "invisible";
    color: number;
  }>({
    token: "",
    name: "",
    prefix: "!",
    playing: "music",
    playingType: "PLAYING",
    streamUrl: "",
    status: "online",
    color: 0x5865f2,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: async () => {
      // Validate
      const newErrors: Record<string, string> = {};
      if (!formData.token.trim()) newErrors.token = "Bot token is required";
      if (!formData.name.trim()) newErrors.name = "Bot name is required";
      if (!formData.prefix.trim()) newErrors.prefix = "Prefix is required";
      if (!formData.playing.trim()) newErrors.playing = "Activity text is required";
      if (formData.playingType === "STREAMING" && !formData.streamUrl.trim()) {
        newErrors.streamUrl = "Stream URL is required for streaming activity";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        throw new Error("Validation failed");
      }

      setErrors({});
      await api.createBot(formData);
    },
    onSuccess: () => {
      toast.success("Bot created successfully");
      router.push("/dashboard/bots");
    },
    onError: (error) => {
      if (error.message !== "Validation failed") {
        toast.error("Failed to create bot");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/bots"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Add New Bot
          </h1>
          <p className="text-gray-700 mt-1 font-medium">
            Configure your Discord music bot
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-bold text-blue-900">Before you start</h3>
          <p className="text-sm text-blue-900 mt-1">
            Make sure you have created a bot application on the{" "}
            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-700 font-medium"
            >
              Discord Developer Portal
            </a>{" "}
            and have copied the bot token. You&apos;ll also need to enable the necessary intents
            (Server Members, Message Content, Presence).
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
        <div className="space-y-4">
          {/* Bot Token */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Bot Token <span className="text-red-600">*</span>
            </label>
            <input
              type="password"
              value={formData.token}
              onChange={(e) => setFormData({ ...formData, token: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-gray-900 ${
                errors.token ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
              placeholder="Your.Bot.Token.Here"
            />
            {errors.token && (
              <p className="text-sm text-red-700 mt-1 font-medium">{errors.token}</p>
            )}
            <p className="text-xs text-gray-700 mt-1">
              Keep this secret! Never share your bot token publicly.
            </p>
          </div>

          {/* Bot Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Bot Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 ${
                errors.name ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
              placeholder="My Music Bot"
            />
            {errors.name && (
              <p className="text-sm text-red-700 mt-1 font-medium">{errors.name}</p>
            )}
          </div>

          {/* Prefix */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Command Prefix <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.prefix}
              onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-gray-900 ${
                errors.prefix ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
              placeholder="!"
            />
            {errors.prefix && (
              <p className="text-sm text-red-700 mt-1 font-medium">{errors.prefix}</p>
            )}
            <p className="text-xs text-gray-700 mt-1">
              The prefix for text commands (e.g., !play, !skip)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activity Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Activity Type <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.playingType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    playingType: e.target.value as typeof formData.playingType,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
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
                Activity Text <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.playing}
                onChange={(e) => setFormData({ ...formData, playing: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 ${
                  errors.playing ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
                placeholder="music"
              />
              {errors.playing && (
                <p className="text-sm text-red-700 mt-1 font-medium">{errors.playing}</p>
              )}
            </div>
          </div>

          {/* Stream URL */}
          {formData.playingType === "STREAMING" && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Stream URL <span className="text-red-600">*</span>
              </label>
              <input
                type="url"
                value={formData.streamUrl}
                onChange={(e) =>
                  setFormData({ ...formData, streamUrl: e.target.value })
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 ${
                  errors.streamUrl ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
                placeholder="https://twitch.tv/..."
              />
              {errors.streamUrl && (
                <p className="text-sm text-red-700 mt-1 font-medium">{errors.streamUrl}</p>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Status
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {statusTypes.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      status: status.value as typeof formData.status,
                    })
                  }
                  className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-all ${
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
                value={`#${formData.color.toString(16).padStart(6, "0")}`}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    color: parseInt(e.target.value.slice(1), 16),
                  })
                }
                className="h-10 w-20 rounded border border-gray-300"
              />
              <input
                type="text"
                value={`#${formData.color.toString(16).padStart(6, "0")}`}
                onChange={(e) => {
                  const hex = e.target.value.replace("#", "");
                  if (/^[0-9A-Fa-f]{0,6}$/.test(hex)) {
                    setFormData({
                      ...formData,
                      color: parseInt(hex || "0", 16),
                    });
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-gray-900"
                placeholder="#5865F2"
              />
            </div>
            <p className="text-xs text-gray-700 mt-1">
              The color used for embed messages
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/bots"
            className="px-6 py-2 bg-white border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending ? "Creating..." : "Create Bot"}
          </button>
        </div>
      </form>
    </div>
  );
}
