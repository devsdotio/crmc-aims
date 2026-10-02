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
  Cell,
} from "recharts";
import { BarChart3 as DefaultBarIcon, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/ui/category-icon";

export interface TrendBarSeries {
  key: string;
  name: string;
  color?: string;
  iconToken?: string;
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
  layout?: "horizontal" | "vertical";
  barKeys?: string[];
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
  layout = "horizontal",
  barKeys,
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

  const renderBarKeys = barKeys || series.map(s => s.key);
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
        <div className="flex flex-col md:flex-row gap-4 mt-2 flex-1 min-h-[200px]">
          <div className="flex-1 w-full min-h-[200px] md:min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout={layout}
                margin={
                  layout === "vertical"
                    ? { top: 10, right: 10, left: 30, bottom: 0 }
                    : { top: 10, right: 10, left: -20, bottom: 0 }
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border, #E5E7EB)"
                  vertical={layout === "vertical"}
                  horizontal={layout !== "vertical"}
                  opacity={0.6}
                />
                <XAxis
                  dataKey={layout === "horizontal" ? xAxisKey : undefined}
                  type={layout === "vertical" ? "number" : "category"}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#5A5F73", fontWeight: layout === "horizontal" ? 600 : 400 }}
                  tickFormatter={
                    layout === "vertical"
                      ? (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))
                      : undefined
                  }
                />
                <YAxis
                  dataKey={layout === "vertical" ? xAxisKey : undefined}
                  type={layout === "vertical" ? "category" : "number"}
                  tickLine={false}
                  axisLine={false}
                  width={layout === "vertical" ? 80 : undefined}
                  tick={{ fontSize: 10, fill: "#5A5F73", fontFamily: layout === "horizontal" ? "monospace" : undefined, fontWeight: layout === "vertical" ? 600 : 400 }}
                  tickFormatter={
                    layout === "horizontal"
                      ? (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))
                      : undefined
                  }
                />
                <Tooltip
                  cursor={{ fill: "var(--bg-subtle, #F8FAFC)", opacity: 0.4 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    return (
                      <div className="rounded-xl border border-border bg-card p-2.5 shadow-lg text-xs min-w-44 z-50">
                        <div className="font-bold text-text mb-1.5 capitalize pb-1 border-b border-border/50">
                          {String(label).replace(/_/g, " ")}
                        </div>
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                          {payload
                            .filter((entry) => entry.value !== undefined && entry.value !== null && Number(entry.value) > 0)
                            .map((entry, idx) => {
                              const dataKey = entry.dataKey as string;
                              const realName = entry.payload[`${dataKey}_name`] || entry.name;
                              const realColor = entry.payload[`${dataKey}_color`] || entry.color;
                              const seriesItem = series.find((s) => s.name === realName);
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-4 text-[11px]"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="flex items-center justify-center shrink-0 h-4 w-4 rounded shadow-2xs"
                                      style={{ backgroundColor: realColor, color: "white" }}
                                    >
                                      {seriesItem?.iconToken ? (
                                        <CategoryIcon
                                          iconToken={seriesItem.iconToken}
                                          className="h-2.5 w-2.5 stroke-3"
                                        />
                                      ) : (
                                        <span className="h-1.5 w-1.5 bg-white rounded-full" />
                                      )}
                                    </span>
                                    <span className="text-text-secondary font-medium truncate max-w-[100px]">
                                      {realName}
                                    </span>
                                  </div>
                                  <span className="font-mono font-bold text-text">
                                    {valueFormatter(Number(entry.value || 0))}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  }}
                />
                {renderBarKeys.map((key, idx) => {
                  const s = series.find(sItem => sItem.key === key);
                  const fallbackColor = s?.color || defaultColors[idx % defaultColors.length];
                  const fallbackName = s?.name || key;
                  return (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={fallbackName}
                      fill={fallbackColor}
                      stackId={stacked ? "a" : undefined}
                      radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                      maxBarSize={48}
                    >
                      {data.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry[`${key}_color`] || fallbackColor} 
                        />
                      ))}
                    </Bar>
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="md:w-48 shrink-0 flex flex-col gap-1.5 bg-bg-subtle/30 rounded-lg border border-border p-2 max-h-[120px] md:max-h-full overflow-y-auto">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1 mb-1">Legend</span>
            {series.map((s, idx) => (
              <div key={s.key} className="flex items-center gap-2 text-[11px] px-1 py-0.5">
                <span
                  className="flex items-center justify-center shrink-0 h-5 w-5 rounded-md shadow-2xs"
                  style={{ backgroundColor: s.color || defaultColors[idx % defaultColors.length], color: "white" }}
                >
                  {s.iconToken ? (
                    <CategoryIcon iconToken={s.iconToken} className="h-3 w-3 stroke-3" />
                  ) : (
                    <span className="h-1.5 w-1.5 bg-white rounded-full" />
                  )}
                </span>
                <span className="text-text font-medium truncate flex-1" title={s.name}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
