"use client";

import React from "react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tone Definitions ────────────────────────────────────────────────────────

export type StatCardTone =
  | "accent"
  | "purple"
  | "emerald"
  | "blue"
  | "amber"
  | "rose"
  | "indigo"
  | "neutral";

interface ToneStyleConfig {
  iconContainer: string;
  hoverBorder: string;
  glowGradient: string;
  badge: string;
  progressBar: string;
  valueColor: string;
  pulseDot: string;
}

const TONE_STYLES: Record<StatCardTone, ToneStyleConfig> = {
  accent: {
    iconContainer:
      "border-accent/25 bg-accent/10 text-accent",
    hoverBorder: "hover:border-accent/35",
    glowGradient: "from-accent/5",
    badge: "bg-accent/10 text-accent border-accent/20",
    progressBar: "bg-accent",
    valueColor: "text-accent",
    pulseDot: "bg-accent",
  },
  purple: {
    iconContainer:
      "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    hoverBorder: "hover:border-purple-500/30",
    glowGradient: "from-purple-500/5",
    badge:
      "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25",
    progressBar: "bg-purple-500",
    valueColor: "text-purple-600 dark:text-purple-400",
    pulseDot: "bg-purple-500",
  },
  emerald: {
    iconContainer:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-500/30",
    glowGradient: "from-emerald-500/5",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    progressBar: "bg-emerald-500",
    valueColor: "text-emerald-600 dark:text-emerald-400",
    pulseDot: "bg-emerald-500",
  },
  blue: {
    iconContainer:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    hoverBorder: "hover:border-blue-500/30",
    glowGradient: "from-blue-500/5",
    badge:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
    progressBar: "bg-blue-500",
    valueColor: "text-blue-600 dark:text-blue-400",
    pulseDot: "bg-blue-500",
  },
  amber: {
    iconContainer:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-500/30",
    glowGradient: "from-amber-500/5",
    badge:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
    progressBar: "bg-amber-500",
    valueColor: "text-amber-600 dark:text-amber-400",
    pulseDot: "bg-amber-500",
  },
  rose: {
    iconContainer:
      "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    hoverBorder: "hover:border-rose-500/30",
    glowGradient: "from-rose-500/5",
    badge:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
    progressBar: "bg-rose-500",
    valueColor: "text-rose-600 dark:text-rose-400",
    pulseDot: "bg-rose-500",
  },
  indigo: {
    iconContainer:
      "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    hoverBorder: "hover:border-indigo-500/30",
    glowGradient: "from-indigo-500/5",
    badge:
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
    progressBar: "bg-indigo-500",
    valueColor: "text-indigo-600 dark:text-indigo-400",
    pulseDot: "bg-indigo-500",
  },
  neutral: {
    iconContainer:
      "border-border bg-bg-subtle text-text-secondary group-hover:text-text",
    hoverBorder: "hover:border-text-secondary/30",
    glowGradient: "from-text-secondary/5",
    badge: "bg-bg-subtle text-text-secondary border-border",
    progressBar: "bg-text-secondary/50",
    valueColor: "text-text",
    pulseDot: "bg-text-secondary",
  },
};

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface StatCardBadgeConfig {
  text: string;
  tone?: StatCardTone;
  pulse?: boolean;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
}

export interface StatCardProgressConfig {
  /** Percentage (0 - 100) or current value if max is provided */
  value: number;
  /** Optional maximum value to compute ratio from */
  max?: number;
  /** Custom progress bar class or gradient */
  colorClass?: string;
}

export interface StatCardProps {
  /** Primary label / title of the card, e.g. "Total Orders" */
  title: string;
  /** Primary metric value to display */
  value: React.ReactNode;
  /** Optional telemetry mono micro-label above the title, e.g. "VOLUME // ORDERS" */
  sublabel?: string;
  /** Optional Lucide icon or custom icon component */
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  /** Color theme tone */
  tone?: StatCardTone;
  /** Top-right badge or pill. Can be a string, config object, or ReactNode */
  badge?: string | StatCardBadgeConfig | React.ReactNode;
  /** Optional secondary detail or summary line below the value */
  subtitle?: React.ReactNode;
  /** Whether the primary value should take the tone's color rather than default text */
  toneValue?: boolean;
  /** Custom class for the value text */
  valueClassName?: string;
  /** Optional visual progress bar */
  progress?: StatCardProgressConfig;
  /** Optional click destination (wraps the card in Next.js Link) */
  href?: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Loading skeleton state */
  loading?: boolean;
  /** Optional additional slot content at the bottom */
  children?: React.ReactNode;
  /** Container custom classes */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StatCard({
  title,
  value,
  sublabel,
  icon: Icon,
  tone = "accent",
  badge,
  subtitle,
  toneValue = false,
  valueClassName,
  progress,
  href,
  onClick,
  loading = false,
  children,
  className,
}: StatCardProps) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral;

  // Calculate percentage for progress bar if configured
  const progressPercent = React.useMemo(() => {
    if (!progress) return null;
    const { value: val, max } = progress;
    if (typeof max === "number" && max > 0) {
      return Math.min(100, Math.max(0, Math.round((val / max) * 100)));
    }
    return Math.min(100, Math.max(0, Math.round(val)));
  }, [progress]);

  // Render top-right badge if provided
  const renderBadge = () => {
    if (!badge) return null;

    if (React.isValidElement(badge)) {
      return badge;
    }

    if (typeof badge === "object" && badge !== null && "text" in badge) {
      const bConfig = badge as StatCardBadgeConfig;
      const bToneStyles = bConfig.tone ? TONE_STYLES[bConfig.tone] : styles;
      const BadgeIcon = bConfig.icon;

      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs shrink-0 select-none",
            bToneStyles.badge
          )}
        >
          {bConfig.pulse && (
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                bToneStyles.pulseDot
              )}
            />
          )}
          {BadgeIcon && <BadgeIcon className="w-3 h-3 shrink-0" />}
          <span className="truncate">{bConfig.text}</span>
        </span>
      );
    }

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs shrink-0 select-none",
          styles.badge
        )}
      >
        <span className="truncate">{String(badge)}</span>
      </span>
    );
  };

  const cardInner = (
    <div
      role="region"
      aria-label={`${title}: ${loading ? "loading" : typeof value === "string" || typeof value === "number" ? value : ""}`}
      className={cn(
        "group relative p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between select-none",
        styles.hoverBorder,
        (href || onClick) && "cursor-pointer active:scale-[0.99]",
        className
      )}
      onClick={onClick}
    >
      {/* Ambient Gradient Glow on Hover */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          styles.glowGradient
        )}
      />

      {/* Top Header Row */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-105 shadow-2xs",
                styles.iconContainer
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </div>
          )}
          <div className="min-w-0">
            {sublabel && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-secondary block truncate">
                {sublabel}
              </span>
            )}
            <h2 className="text-xs font-bold uppercase tracking-wider text-text truncate">
              {title}
            </h2>
          </div>
        </div>

        {/* Top-Right Badge / Pill */}
        {renderBadge()}
      </div>

      {/* Metric Display Row */}
      <div className="relative z-10 mt-3 mb-2 min-w-0">
        {loading ? (
          <div className="h-8 w-24 bg-border/60 rounded-md animate-pulse" />
        ) : (
          <div
            className={cn(
              "text-2xl sm:text-3xl font-extrabold font-mono tracking-tight truncate",
              toneValue ? styles.valueColor : "text-text",
              valueClassName
            )}
          >
            {value}
          </div>
        )}

        {/* Secondary Detail / Context Line */}
        {subtitle && (
          <div className="text-[11px] text-text-secondary mt-1 min-w-0">
            {subtitle}
          </div>
        )}
      </div>

      {/* Optional Progress Bar */}
      {progressPercent !== null && (
        <div className="relative z-10 w-full bg-border/60 rounded-full h-1.5 overflow-hidden mt-auto">
          <div
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              progress?.colorClass || styles.progressBar
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Custom Children Slot */}
      {children && <div className="relative z-10 mt-2">{children}</div>}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
      >
        {cardInner}
      </Link>
    );
  }

  return cardInner;
}

// ─── Grid Container ─────────────────────────────────────────────────────────

export interface StatCardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5;
}

export function StatCardGrid({
  children,
  className,
  columns = 4,
}: StatCardGridProps) {
  const colClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      : columns === 5
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-3.5", colClass, className)}>
      {children}
    </div>
  );
}
