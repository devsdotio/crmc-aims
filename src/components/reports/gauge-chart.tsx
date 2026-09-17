"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { Gauge as DefaultGaugeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GaugeChartProps {
  title: string;
  description?: string;
  value?: number; // 0 to 100
  total?: number;
  completedCount?: number;
  pendingCount?: number;
  completedLabel?: string;
  pendingLabel?: string;
  sublabel?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  tone?: "blue" | "emerald" | "amber" | "indigo" | "accent";
  loading?: boolean;
  className?: string;
}

const GAUGE_COLORS = {
  emerald: {
    bar: "#10B981",
    track: "var(--border, #E2E8F0)",
    icon: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  blue: {
    bar: "#2563EB",
    track: "var(--border, #E2E8F0)",
    icon: "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400",
  },
  indigo: {
    bar: "#6366F1",
    track: "var(--border, #E2E8F0)",
    icon: "border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  amber: {
    bar: "#F59E0B",
    track: "var(--border, #E2E8F0)",
    icon: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
  },
  accent: {
    bar: "var(--color-accent, #FF4E45)",
    track: "var(--border, #E2E8F0)",
    icon: "border-accent/25 bg-accent/10 text-accent",
    text: "text-accent",
  },
};

export function GaugeChart({
  title,
  description,
  value,
  total,
  completedCount,
  pendingCount,
  completedLabel = "Completed",
  pendingLabel = "Pending",
  sublabel,
  icon: Icon = DefaultGaugeIcon,
  tone = "emerald",
  loading = false,
  className,
}: GaugeChartProps) {
  const colors = GAUGE_COLORS[tone] || GAUGE_COLORS.emerald;

  // Calculate percentage
  const percentage = React.useMemo(() => {
    if (typeof value === "number") {
      return Math.min(100, Math.max(0, Math.round(value)));
    }
    if (typeof completedCount === "number" && typeof total === "number" && total > 0) {
      return Math.min(100, Math.max(0, Math.round((completedCount / total) * 100)));
    }
    if (
      typeof completedCount === "number" &&
      typeof pendingCount === "number" &&
      completedCount + pendingCount > 0
    ) {
      const sum = completedCount + pendingCount;
      return Math.min(100, Math.max(0, Math.round((completedCount / sum) * 100)));
    }
    return 0;
  }, [value, completedCount, pendingCount, total]);

  const chartData = [{ name: "Rate", value: percentage, fill: colors.bar }];

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
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs",
              colors.icon
            )}
          >
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
          COMPLETION
        </span>
      </div>

      {description && (
        <p className="text-[11px] text-text-secondary -mt-1 mb-2 line-clamp-1">
          {description}
        </p>
      )}

      {/* ── Gauge Body ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-4 my-auto">
          <div className="h-32 w-32 rounded-full border-4 border-border/40 border-t-accent animate-spin" />
        </div>
      ) : (
        <div className="relative flex items-center justify-center h-38 my-auto">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="72%"
              outerRadius="98%"
              barSize={12}
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: colors.track, opacity: 0.35 }}
                dataKey="value"
                cornerRadius={8}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Centered Metric Number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-text leading-none">
              {percentage}%
            </span>
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mt-1">
              Resolution
            </span>
          </div>
        </div>
      )}

      {/* ── Bottom Legend: Completed vs Upcoming / Pending ────── */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60 mt-1">
        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-bg-subtle/50">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: colors.bar }}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-medium text-text-secondary truncate">
              {completedLabel}
            </span>
            <span className="font-mono text-xs font-bold text-text tabular-nums">
              {typeof completedCount === "number"
                ? `${completedCount.toLocaleString()} units`
                : `${percentage}%`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-bg-subtle/50">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-medium text-text-secondary truncate">
              {pendingLabel}
            </span>
            <span className="font-mono text-xs font-bold text-text tabular-nums">
              {typeof pendingCount === "number"
                ? `${pendingCount.toLocaleString()} units`
                : `${Math.max(0, 100 - percentage)}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
