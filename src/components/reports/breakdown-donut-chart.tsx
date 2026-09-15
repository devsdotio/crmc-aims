"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PieChart as DefaultPieIcon, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DonutSegment {
  name: string;
  value: number;
  color?: string;
  count?: number;
  badge?: string;
}

export interface BreakdownDonutChartProps {
  title: string;
  description?: string;
  data: DonutSegment[];
  sublabel?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  valueFormatter?: (val: number) => string;
  unitLabel?: string;
  loading?: boolean;
  className?: string;
}

const DEFAULT_PALETTE = [
  "#2A3260", // Primary navy
  "#FF4E45", // Accent coral
  "#10B981", // Emerald
  "#6366F1", // Indigo
  "#F59E0B", // Amber
  "#0284C7", // Sky blue
  "#7C3AED", // Violet
  "#64748B", // Slate
];

export function BreakdownDonutChart({
  title,
  description,
  data,
  sublabel,
  icon: Icon = DefaultPieIcon,
  valueFormatter,
  unitLabel = "units",
  loading = false,
  className,
}: BreakdownDonutChartProps) {
  // Filter out non-positive entries for pie geometry
  const validData = React.useMemo(() => {
    return (data || []).filter((item) => (item.value ?? item.count ?? 0) > 0);
  }, [data]);

  const totalValue = React.useMemo(() => {
    return validData.reduce((acc, item) => acc + (item.value ?? item.count ?? 0), 0);
  }, [validData]);

  const segments = React.useMemo(() => {
    return validData.map((item, index) => {
      const val = item.value ?? item.count ?? 0;
      const pct = totalValue > 0 ? Math.round((val / totalValue) * 100) : 0;
      const color = item.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
      return {
        ...item,
        actualValue: val,
        percentage: pct,
        segmentColor: color,
      };
    });
  }, [validData, totalValue]);

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-xs transition-shadow hover:shadow-md",
        className
      )}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-2xs">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            {sublabel && (
              <span className="block font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-text-secondary truncate">
                {sublabel}
              </span>
            )}
            <h3 className="text-xs sm:text-sm font-bold tracking-tight text-text truncate">
              {title}
            </h3>
          </div>
        </div>

        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border bg-bg-subtle text-text-secondary border-border shrink-0">
          BREAKDOWN
        </span>
      </div>

      {description && (
        <p className="text-[11px] text-text-secondary -mt-1 mb-2 line-clamp-1">
          {description}
        </p>
      )}

      {/* ── Main Content: Donut + Tight Side Legend ─────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-8 my-auto">
          <div className="h-28 w-28 rounded-full border-4 border-border/40 border-t-primary animate-spin" />
        </div>
      ) : segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 my-auto text-center gap-2">
          <PackageOpen className="h-8 w-8 text-text-secondary/40" />
          <p className="text-xs text-text-secondary">
            No segment data available for the current filter.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center my-auto">
          <div className="flex items-center justify-between gap-4 py-1">
            {/* Donut Chart with Centered Total */}
            <div className="relative shrink-0 flex items-center justify-center w-40 h-40 sm:w-44 sm:h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-1.5 shadow-lg text-xs">
                          <div className="font-bold text-text capitalize">
                            {item.name.replace(/_/g, " ")}
                          </div>
                          <div className="font-mono font-bold text-text-secondary mt-0.5">
                            {valueFormatter
                              ? valueFormatter(item.actualValue)
                              : `${item.actualValue.toLocaleString()} ${unitLabel}`}{" "}
                            ({item.percentage}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={segments}
                    dataKey="actualValue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={70}
                    paddingAngle={segments.length > 1 ? 3 : 0}
                    strokeWidth={2}
                    stroke="var(--card, #FFFFFF)"
                  >
                    {segments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.segmentColor} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-mono text-base sm:text-lg font-extrabold text-text tabular-nums leading-none">
                  {totalValue >= 1000000
                    ? `₱${(totalValue / 1000000).toFixed(1)}M`
                    : totalValue >= 1000
                    ? `₱${(totalValue / 1000).toFixed(0)}k`
                    : totalValue.toLocaleString()}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-text-secondary font-bold mt-1">
                  TOTAL
                </span>
              </div>
            </div>

            {/* Side Legend List - Clean & Structured */}
            <div className="flex-1 flex flex-col justify-center space-y-1.5 min-w-0 pr-1 max-h-36 overflow-y-auto no-scrollbar">
              {segments.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-lg bg-bg-subtle/60 border border-border/40"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span
                      className="h-2.5 w-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: item.segmentColor }}
                    />
                    <span className="font-semibold text-text truncate capitalize text-[11px]">
                      {item.name.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono font-bold text-text text-[11px] tabular-nums">
                      {valueFormatter
                        ? valueFormatter(item.actualValue)
                        : item.actualValue.toLocaleString()}
                    </span>
                    <span
                      className="font-mono text-[9.5px] font-bold px-1.5 py-0.2 rounded-xs border"
                      style={{
                        backgroundColor: `${item.segmentColor}15`,
                        borderColor: `${item.segmentColor}30`,
                        color: item.segmentColor,
                      }}
                    >
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
