"use client";

import { ReactNode } from "react";

interface StatsListCardProps {
  title: string;
  children: ReactNode;
  loading?: boolean;
  className?: string;
}

// Skeleton item for loading state
function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-6 h-6 bg-gray-200 rounded" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-2 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

export function StatsListCard({ title, children, loading, className }: StatsListCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col ${className || ""}`}
    >
      {/* Fixed Header */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Scrollable Content - subtle scrollbar for accessibility */}
      <div
        className="flex-1 overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
        role="region"
        aria-label={`${title} list`}
      >
        {loading ? (
          <div className="p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
