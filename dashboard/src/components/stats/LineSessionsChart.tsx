"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartDataPoint, TimePeriod } from "@/types/api";

interface LineSessionsChartProps {
  data: ChartDataPoint[];
  loading: boolean;
  period: TimePeriod;
}

// Format timestamp based on period
function formatXAxisLabel(label: string, _period: TimePeriod): string {
  // The label is already formatted from the backend
  // Just return it as-is or do minor adjustments
  return label;
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
          {payload[0].value.toLocaleString()} sessions
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
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="flex-1 flex items-end gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
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

export function LineSessionsChart({ data, loading, period }: LineSessionsChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessions</h3>
        <ChartSkeleton />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessions</h3>
        <div className="h-[200px] flex items-center justify-center text-gray-500">
          No data available for this period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessions</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
              tickFormatter={(value) => formatXAxisLabel(value, period)}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: "#6366f1",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
