"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { TrackTypePercentages } from "@/types/api";

interface CirclePercentTrackTypesProps {
  data: TrackTypePercentages | null;
  loading: boolean;
}

// Colors for each source (keeping brand colors)
const COLORS = {
  youtube: "#ff0000",     // YouTube red
  spotify: "#1db954",     // Spotify green
  soundcloud: "#ff5500",  // SoundCloud orange
  another: "#6b7280",     // Gray for other sources
};

// Source labels for legend
const SOURCE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  another: "Another",
};

// Custom tooltip - receives the chart data with calculated percentages
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ 
    name: string; 
    value: number; 
    payload: { name: string; value: number; percent?: number; total?: number } 
  }>;
}) {
  if (active && payload && payload.length) {
    const item = payload[0];
    // The value is already a percentage (0-100), so display it directly
    const percentage = typeof item.value === 'number' && !isNaN(item.value)
      ? item.value.toFixed(1)
      : "0.0";
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-gray-900 font-semibold capitalize">{item.name}</p>
        <p className="text-gray-600 text-sm">
          {percentage}%
        </p>
      </div>
    );
  }
  return null;
}

// Custom legend
function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string; type: string }> }) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// Skeleton loader
function ChartSkeleton() {
  return (
    <div className="w-full h-[500px] flex items-center justify-center">
      <div className="animate-pulse">
        <div className="w-56 h-56 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

export function CirclePercentTrackTypes({ data, loading }: CirclePercentTrackTypesProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Track Types</h3>
        <ChartSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Track Types</h3>
        <div className="h-[500px] flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Ensure values are numbers (handle potential string values from API)
  const youtubeValue = typeof data.youtube === 'number' ? data.youtube : parseFloat(data.youtube) || 0;
  const spotifyValue = typeof data.spotify === 'number' ? data.spotify : parseFloat(data.spotify) || 0;
  const soundcloudValue = typeof data.soundcloud === 'number' ? data.soundcloud : parseFloat(data.soundcloud) || 0;

  // Calculate "Another" as remaining percentage
  const knownTotal = youtubeValue + spotifyValue + soundcloudValue;
  const anotherValue = Math.max(0,100 - knownTotal);

  // Convert percentages to chart data - always include "Another" if there's any data
  const chartData = [
    { name: SOURCE_LABELS.youtube, value: youtubeValue },
    { name: SOURCE_LABELS.spotify, value: spotifyValue },
    { name: SOURCE_LABELS.soundcloud, value: soundcloudValue },
    { name: SOURCE_LABELS.another, value: anotherValue },
  ].filter(item => item.value > 0); // Filter out zero values

  // Calculate total for percentage validation
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // If no data, show empty state
  if (total === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Track Types</h3>
        <div className="h-[500px] flex items-center justify-center text-gray-500">
          No track data available
        </div>
      </div>
    );
  }

  // Get color for each segment
  const getColor = (name: string): string => {
    const key = name.toLowerCase() as keyof typeof COLORS;
    return COLORS[key] || "#6b7280";
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Track Types</h3>
      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="40%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(entry.name)}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
