"use client";

import { StatsListCard } from "./StatsListCard";
import type { CommandStats } from "@/types/api";

interface TopCommandsListProps {
  data: CommandStats[];
  loading: boolean;
}

export function TopCommandsList({ data, loading }: TopCommandsListProps) {
  if (!loading && (!data || data.length === 0)) {
    return (
      <StatsListCard title="Top commands" loading={false}>
        <div className="flex items-center justify-center h-[200px] text-gray-500">
          No data available
        </div>
      </StatsListCard>
    );
  }

  return (
    <StatsListCard title="Top commands" loading={loading}>
      <div className="divide-y divide-gray-100">
        {data.map((command, index) => (
          <div
            key={`${command.name ?? "unknown"}-${index}`}
            className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
          >
            {/* Rank */}
            <span className="text-lg font-bold text-gray-900 shrink-0 w-6">
              {index + 1}
            </span>

            {/* Command Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 font-mono" title={command.name ?? "unknown"}>
                {command.name ?? "unknown"}
              </p>
            </div>

            {/* Usage Count */}
            <div className="shrink-0 text-right">
              <span className="text-xs text-gray-600">
                {(command.usageCount ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </StatsListCard>
  );
}
