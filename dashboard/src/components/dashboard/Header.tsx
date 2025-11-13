"use client";

import { useDashboardStore } from "@/store/dashboard";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import Image from "next/image";

export function Header() {
  const router = useRouter();
  const { user, setUser, toggleSidebar } = useDashboardStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "moderator":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left side - Mobile menu button */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Right side - User menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
        >
          {user?.avatar ? (
            <Image
              src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=64`}
              alt={user.username || "User"}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          )}
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-900">{user?.username}</p>
            <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
          </div>
        </button>

        {/* Dropdown menu */}
        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-700 font-medium">ID: {user?.discordId}</p>
                <span
                  className={`inline-block mt-2 px-2 py-1 rounded-md text-xs font-medium ${getRoleBadgeColor(
                    user?.role || "user"
                  )}`}
                >
                  {(user?.role || "user").toUpperCase()}
                </span>
              </div>

              {/* Managed bots */}
              {user?.managedBots && user.managedBots.length > 0 && (
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Managed Bots</p>
                  <p className="text-sm text-gray-600">{user.managedBots.length} bot(s)</p>
                </div>
              )}

              {/* Menu items */}
              <div className="py-2">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/dashboard/profile");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
