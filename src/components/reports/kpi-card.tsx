"use client";

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatCardTone } from "@/components/ui/stat-card";

export interface KpiCardDelta {
  value: string;
  isPositive?: boolean;
}

export interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  sublabel?: string;
  subtitle?: React.ReactNode;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  tone?: StatCardTone;
  toneValue?: boolean;
  delta?: string | KpiCardDelta;
  sparkline?: unknown; // Deprecated/ignored
  badge?: string;
  loading?: boolean;
  href?: string;
  className?: string;
  onClick?: () => void;
}

const TONE_CONFIG: Record<
  StatCardTone,
  {
    iconBox: string;
    valueColor: string;
    deltaBgPositive: string;
    deltaBgNegative: string;
  }
> = {
  blue: {
    iconBox: "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    valueColor: "text-blue-600 dark:text-blue-400",
    deltaBgPositive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    deltaBgNegative: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  emerald: {
    iconBox: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    valueColor: "text-emerald-600 dark:text-emerald-400",
    deltaBgPositive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    deltaBgNegative: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  amber: {
    iconBox: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    valueColor: "text-amber-600 dark:text-amber-400",
    deltaBgPositive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    deltaBgNegative: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  rose: {
    iconBox: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    valueColor: "text-rose-600 dark:text-rose-400",
    deltaBgPositive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    deltaBgNegative: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  indigo: {
    iconBox: "border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    valueColor: "text-indigo-600 dark:text-indigo-400",
    deltaBgPositive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    deltaBgNegative: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  accent: {
    iconBox: "border-accent/25 bg-accent/10 text-accent",
    valueColor: "text-accent",
    deltaBgPositive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    deltaBgNegative: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  purple: {
    iconBox: "border-purple-500/25 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    valueColor: "text-purple-600 dark:text-purple-400",
    deltaBgPositive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    deltaBgNegative: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  neutral: {
    iconBox: "border-border bg-bg-subtle text-text-secondary",
    valueColor: "text-text",
    deltaBgPositive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    deltaBgNegative: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

export function KpiCard({
  title,
  value,
  sublabel,
  subtitle,
  icon: Icon,
  tone = "blue",
  toneValue = false,
  delta,
  badge,
  loading = false,
  href,
  className,
  onClick,
}: KpiCardProps) {
  const toneCfg = TONE_CONFIG[tone] || TONE_CONFIG.neutral;

  // Delta parsing
  const deltaObj = React.useMemo(() => {
    if (!delta) return null;
    if (typeof delta === "string") {
      const isNegative = delta.trim().startsWith("-");
      return { value: delta, isPositive: !isNegative };
    }
    return delta;
  }, [delta]);

  const cardInner = (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-border select-none min-h-30",
        (href || onClick) && "cursor-pointer active:scale-[0.99]",
        className
      )}
      onClick={onClick}
    >
      {/* ── Top Row: Icon + Label (sublabel) + Badge ───────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105 shadow-2xs",
              toneCfg.iconBox
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
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-text truncate">
              {title}
            </h2>
          </div>
        </div>

        {/* Optional top-right badge */}
        {badge && (
          <span className="inline-flex items-center text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border bg-bg-subtle text-text-secondary border-border shrink-0">
            {badge}
          </span>
        )}
      </div>

      {/* ── Metric Row: Big Value + Delta Pill ───────────────────── */}
      <div className="flex items-end justify-between gap-2 mt-3 mb-1">
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="h-7 w-24 rounded-md bg-border/60 animate-pulse" />
          ) : (
            <div className="flex items-baseline flex-wrap gap-1.5 sm:gap-2">
              <span
                className={cn(
                  "font-mono text-xl sm:text-2xl font-bold tracking-tight",
                  toneValue ? toneCfg.valueColor : "text-text"
                )}
              >
                {value}
              </span>

              {deltaObj && (
                <span
                  className={cn(
                    "inline-flex items-center text-[10px] sm:text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-md border shrink-0",
                    deltaObj.isPositive
                      ? toneCfg.deltaBgPositive
                      : toneCfg.deltaBgNegative
                  )}
                >
                  {deltaObj.value}
                </span>
              )}
            </div>
          )}

          {/* Subtitle context line */}
          {subtitle && (
            <div className="text-[11px] text-text-secondary mt-1 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-2xl"
      >
        {cardInner}
      </Link>
    );
  }

  return cardInner;
}
