"use client";

import { Lock } from "lucide-react";
import type { TimePeriod, AggregationMethod } from "@/types/api";
import { cn } from "@/lib/utils";

interface TimeFilterSelectorProps {
  selectedPeriod: TimePeriod;
  selectedAggregation: AggregationMethod;
  onPeriodChange: (period: TimePeriod) => void;
  onAggregationChange: (aggregation: AggregationMethod) => void;
  isPremium: boolean;
}

const TIME_PERIODS: { value: TimePeriod; label: string; isPremium: boolean }[] = [
  { value: "last_4_hours", label: "Last 4 Hours", isPremium: false },
  { value: "today", label: "Today", isPremium: false },
  { value: "yesterday", label: "Yesterday", isPremium: false },
  { value: "last_24_hours", label: "Last 24 Hours", isPremium: false },
  { value: "last_7_days", label: "Last 7 Days", isPremium: false },
  { value: "last_30_days", label: "Last 30 Days", isPremium: true },
  { value: "all_time", label: "All Time", isPremium: true },
];

const AGGREGATION_METHODS: { value: AggregationMethod; label: string }[] = [
  { value: "average", label: "Average" },
  { value: "last", label: "Last Value" },
  { value: "max", label: "Max Value" },
  { value: "min", label: "Min Value" },
];

export function TimeFilterSelector({
  selectedPeriod,
  selectedAggregation,
  onPeriodChange,
  onAggregationChange,
  isPremium,
}: TimeFilterSelectorProps) {
  const handlePeriodClick = (period: TimePeriod, isPremiumPeriod: boolean) => {
    if (isPremiumPeriod && !isPremium) {
      // Don't allow selection of premium periods for non-premium users
      return;
    }
    onPeriodChange(period);
  };

  return (
    <div className="space-y-4">
      {/* Time Period Selector */}
      <div className="flex flex-wrap gap-3">
        {TIME_PERIODS.map((period) => {
          const isDisabled = period.isPremium && !isPremium;
          const isSelected = selectedPeriod === period.value;

          return (
            <button
              key={period.value}
              type="button"
              onClick={() => handlePeriodClick(period.value, period.isPremium)}
              disabled={isDisabled}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all",
                "focus:outline-none focus:ring-2 focus:ring-indigo-200",
                isSelected
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-600 shadow-sm"
                  : isDisabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
              )}
              title={isDisabled ? "Premium feature - Donate to unlock" : undefined}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
            >
              {period.label}
              {isDisabled && (
                <Lock className="w-3 h-3 ml-1" aria-label="Premium only" />
              )}
            </button>
          );
        })}
      </div>

      {/* Aggregation Method Selector */}
      <div className="flex flex-wrap gap-3">
        {AGGREGATION_METHODS.map((method) => {
          const isSelected = selectedAggregation === method.value;

          return (
            <button
              key={method.value}
              type="button"
              onClick={() => onAggregationChange(method.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                "focus:outline-none focus:ring-2 focus:ring-indigo-200",
                isSelected
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-600 shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
              )}
              aria-pressed={isSelected}
            >
              {method.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
