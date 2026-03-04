"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ActivityDataPoint } from "@/types/api";

interface LineActivityHoursBySecondsProps {
  data: ActivityDataPoint[];
  loading: boolean;
}

// Format seconds to HH:MM:SS
function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Format seconds to human readable
function formatSecondsHuman(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? "s" : ""}`);

  return parts.join(" ");
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-gray-600 text-xs mb-1">{label}</p>
        <p className="text-gray-900 font-semibold">
          {formatSecondsHuman(payload[0].value)}
        </p>
        <p className="text-gray-500 text-xs">
          ({payload[0].value.toLocaleString()} seconds)
        </p>
      </div>
    );
  }
  return null;
}

// Skeleton loader
function ChartSkeleton() {
  return (
    <div className="w-full h-[200px] flex items-center justify-center">
      <div className="animate-pulse flex flex-col w-full h-full gap-2">
        <div className="flex-1 flex items-end gap-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 rounded-t"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LineActivityHoursBySeconds({ data, loading }: LineActivityHoursBySecondsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-medium text-gray-600 mb-4">
          Total listening time by hour (seconds)
        </h3>
        <ChartSkeleton />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-medium text-gray-600 mb-4">
          Total listening time by hour (seconds)
        </h3>
        <div className="h-[200px] flex items-center justify-center text-gray-500">
          No data available for this period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-medium text-gray-600 mb-4">
        Total listening time by hour (seconds)
      </h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (value >= 3600) return `${Math.floor(value / 3600)}h`;
                if (value >= 60) return `${Math.floor(value / 60)}m`;
                return `${value}s`;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
