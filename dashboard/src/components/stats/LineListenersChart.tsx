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
import type { ChartDataPoint } from "@/types/api";

interface LineListenersChartProps {
  data: ChartDataPoint[];
  loading: boolean;
  period: string;
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
          {payload[0].value.toLocaleString()} listeners
        </p>
      </div>
    );
  }
  return null;
}

// Deterministic heights for skeleton bars (prevents layout shift)
const SKELETON_HEIGHTS = [45, 62, 38, 75, 52, 88, 41, 67, 55, 72, 48, 83, 36, 59, 78, 44, 69, 51, 85, 47];

// Skeleton loader
function ChartSkeleton() {
  return (
    <div className="w-full h-[200px] flex items-center justify-center">
      <div className="animate-pulse flex flex-col w-full h-full gap-2">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="flex-1 flex items-end gap-1">
          {SKELETON_HEIGHTS.map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 rounded-t"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LineListenersChart({ data, loading, period }: LineListenersChartProps) {
  // Generate accessible description for screen readers
  const getChartDescription = () => {
    if (!data || data.length === 0) {
      return "No listener data available";
    }
    const total = data.reduce((sum, point) => sum + point.value, 0);
    const average = Math.round(total / data.length);
    const max = Math.max(...data.map(d => d.value));
    const min = Math.min(...data.map(d => d.value));
    return `Listeners chart for ${period} period. Average: ${average.toLocaleString()}, Peak: ${max.toLocaleString()}, Lowest: ${min.toLocaleString()}. ${data.length} data points.`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Listeners</h3>
        <ChartSkeleton />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Listeners</h3>
        <div 
          className="h-[200px] flex items-center justify-center text-gray-500"
          role="img"
          aria-label="No listener data available for this period"
        >
          No data available for this period
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
      role="img"
      aria-label={getChartDescription()}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Listeners</h3>
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
