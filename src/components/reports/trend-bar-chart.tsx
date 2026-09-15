"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3 as DefaultBarIcon, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrendBarSeries {
  key: string;
  name: string;
  color?: string;
}

export interface TrendBarChartProps {
  title: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<Record<string, any>>;
  xAxisKey?: string;
  series: TrendBarSeries[];
  stacked?: boolean;
  sublabel?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  valueFormatter?: (value: number) => string;
  loading?: boolean;
  canViewCosts?: boolean;
  className?: string;
}

export function TrendBarChart({
  title,
  description,
  data,
  xAxisKey = "name",
  series,
  stacked = false,
  sublabel,
  icon: Icon = DefaultBarIcon,
  valueFormatter = (v) => v.toLocaleString(),
  loading = false,
  canViewCosts = true,
  className,
}: TrendBarChartProps) {
  if (!canViewCosts) {
    return (
      <div
        className={cn(
          "flex h-60 items-center justify-center rounded-2xl border border-dashed border-border bg-card p-4 text-xs text-text-secondary",
          className
        )}
      >
        Financial metrics are restricted to administrative roles.
      </div>
    );
  }

  const hasData = data && data.length > 0;

  // Default colors: Deep tone vs lighter shade of harmonious color
  const defaultColors = [
    "#2A3260", // Deep primary
    "#5E6DB0", // Lighter primary shade
    "#FF4E45", // Accent coral
    "#FFA09B", // Lighter accent shade
  ];

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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-2xs">
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
          COMPARISON
        </span>
      </div>

      {description && (
        <p className="text-[11px] text-text-secondary -mt-1 mb-2 line-clamp-1">
          {description}
        </p>
      )}

      {/* ── Main Chart ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col justify-end space-y-2 h-52 py-4 animate-pulse">
          <div className="flex items-end justify-between gap-4 h-40 px-6">
            {[40, 75, 55, 90, 65, 80].map((h, i) => (
              <div key={i} className="flex-1 flex gap-1.5 items-end justify-center">
                <div
                  className="w-4 bg-border/50 rounded-t"
                  style={{ height: `${h}%` }}
                />
                <div
                  className="w-4 bg-border/30 rounded-t"
                  style={{ height: `${Math.round(h * 0.7)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="h-3 w-full bg-border/40 rounded" />
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center h-52 text-center gap-2">
          <BarChart2 className="h-8 w-8 text-text-secondary/40" />
          <p className="text-xs text-text-secondary">
            No comparative records available for current filter.
          </p>
        </div>
      ) : (
        <div className="h-56 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border, #E5E7EB)"
                vertical={false}
                opacity={0.6}
              />
              <XAxis
                dataKey={xAxisKey}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#5A5F73", fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#5A5F73", fontFamily: "monospace" }}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="rounded-xl border border-border bg-card p-2.5 shadow-lg text-xs min-w-36">
                      <div className="font-bold text-text mb-1.5 capitalize">
                        {String(label).replace(/_/g, " ")}
                      </div>
                      <div className="space-y-1">
                        {payload.map((entry, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 text-[11px]"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-text-secondary">
                                {entry.name}:
                              </span>
                            </div>
                            <span className="font-mono font-bold text-text">
                              {valueFormatter(Number(entry.value || 0))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{
                  fontSize: "11px",
                  fontWeight: 600,
                  paddingBottom: "8px",
                }}
              />
              {series.map((s, idx) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color || defaultColors[idx % defaultColors.length]}
                  stackId={stacked ? "a" : undefined}
                  radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  maxBarSize={32}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
