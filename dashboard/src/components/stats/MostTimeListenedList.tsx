"use client";

import { StatsListCard } from "./StatsListCard";
import type { MostListenedItem } from "@/types/api";

interface MostTimeListenedListProps {
  data: MostListenedItem[];
  loading: boolean;
}

// Format seconds to human readable duration
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? "s" : ""}`);

  return parts.join(" ");
}

// Generate avatar placeholder based on username
function getAvatarPlaceholder(username: string | undefined | null): string {
  const colors = [
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // emerald
    "#6366f1", // indigo
  ];

  // Handle undefined/null username - return first color as default
  if (!username || username.length === 0) {
    return colors[0];
  }

  // Use username to pick consistent color
  const colorIndex = username.charCodeAt(0) % colors.length;
  return colors[colorIndex];
}

export function MostTimeListenedList({ data, loading }: MostTimeListenedListProps) {
  if (!loading && (!data || data.length === 0)) {
    return (
      <StatsListCard title="Most time listened" loading={false}>
        <div className="flex items-center justify-center h-[200px] text-gray-500">
          No data available
        </div>
      </StatsListCard>
    );
  }

  return (
    <StatsListCard title="Most time listened" loading={loading}>
      <div className="divide-y divide-gray-100">
        {data.map((item, index) => (
          <div
            key={`${item.userId ?? index}-${index}`}
            className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
          >
            {/* Rank */}
            <span className="text-lg font-bold text-gray-900 shrink-0 w-6">
              {index + 1}
            </span>

            {/* Avatar */}
            {item.avatar ? (
              <img
                src={`https://cdn.discordapp.com/avatars/${item.userId}/${item.avatar}.png?size=64`}
                alt={item.username ?? "User"}
                className="w-6 h-6 rounded-full shrink-0 border border-gray-200"
                onError={(e) => {
                  // Fallback to placeholder on error
                  e.currentTarget.style.display = "none";
                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                  if (placeholder) placeholder.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 border border-gray-200 ${item.avatar ? "hidden" : ""}`}
              style={{ backgroundColor: getAvatarPlaceholder(item.username) }}
            >
              {(item.username?.charAt(0) ?? "?").toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate" title={item.username ?? "Unknown"}>
                {item.username ?? "Unknown"}
              </p>
              <span className="text-xs text-gray-600">
                {formatDuration(item.totalDuration)}
              </span>
            </div>

            {/* Session count badge */}
            {item.sessionCount > 0 && (
              <div className="shrink-0 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {item.sessionCount} session{item.sessionCount !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    </StatsListCard>
  );
}
