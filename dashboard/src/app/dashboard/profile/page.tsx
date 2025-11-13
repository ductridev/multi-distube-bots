"use client";

import { useDashboardStore } from "@/store/dashboard";
import { User, Shield, Calendar, Bot, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Bot as BotType } from "@/types/api";

export default function ProfilePage() {
  const { user } = useDashboardStore();

  // Fetch all bots to filter managed ones
  const { data: allBots = [] } = useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const response = await api.getBots();
      return response || [];
    },
    enabled: !!user,
  });

  // Filter bots that the user manages
  // For owners, show all bots. For admins, show only their managed bots
  const managedBots = user?.role === "owner" 
    ? allBots 
    : allBots.filter((bot: BotType) => 
        user?.managedBots?.includes(bot.clientId)
      );

  console.log("User managed bots array:", user?.managedBots);
  console.log("All bots:", allBots.map((b: BotType) => ({ id: b.id, clientId: b.clientId, name: b.name })));
  console.log("Filtered managed bots:", managedBots.map((b: BotType) => ({ id: b.id, clientId: b.clientId, name: b.name })));

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "admin":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "moderator":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Profile Settings
        </h1>
        <p className="text-gray-700 mt-1 font-medium">
          Manage your account information
        </p>
      </div>

      {/* Info Notice */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-blue-900">Account Information</h3>
            <p className="text-sm text-blue-900 mt-1">
              Your profile information is synchronized from Discord and cannot be edited here. 
              To update your username or avatar, please change them in Discord.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header with gradient */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600"></div>

        {/* Profile Content */}
        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-start gap-6 -mt-16 mb-6">
            <div className="relative">
              {user.avatar ? (
                <Image
                  src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`}
                  alt={user.username}
                  width={128}
                  height={128}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-5xl font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 mt-16">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.username}</h2>
                  <p className="text-sm text-gray-700 font-medium mt-1">
                    Discord ID: <span className="font-mono text-gray-900">{user.discordId}</span>
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {user.role.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="space-y-4">
            {/* Discord ID */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700 uppercase">User ID</p>
                <p className="text-sm font-mono font-semibold text-gray-900">{user.discordId}</p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700 uppercase">Role</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{user.role}</p>
              </div>
            </div>

            {/* Managed Bots */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bot className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700 uppercase">Managed Bots</p>
                <p className="text-sm font-semibold text-gray-900">
                  {managedBots.length} bot{managedBots.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Account Created */}
            {user.createdAt && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Account Created</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Managed Bots List */}
          {managedBots.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Your Managed Bots</h3>
              <div className="space-y-2">
                {managedBots.map((bot: BotType) => (
                  <div
                    key={bot.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {bot.avatar ? (
                        <Image
                          src={bot.avatar}
                          alt={bot.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                          {bot.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{bot.name}</p>
                        <p className="text-xs font-mono text-gray-700">{bot.clientId}</p>
                      </div>
                    </div>
                    <a
                      href={`/dashboard/bots/${bot.id}`}
                      className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-1"
                    >
                      View Bot
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Links */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <a
              href={`https://discord.com/users/${user.discordId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              View Discord Profile
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
