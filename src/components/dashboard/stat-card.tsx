"use client";

import Link from "next/link";
import { type LucideIcon, ArrowUpRight, AlertCircle, Clock, CheckCircle2, ShieldAlert, Building2, Box } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export type StatCardVariant = "default" | "warning" | "danger";

export interface StatCardProps {
  label: string;
  value: number | null;
  contextLine?: string;
  icon: LucideIcon;
  variant?: StatCardVariant;
  href?: string;
  loading?: boolean;
}

// ─── Telemetry Signal Bar Component ──────────────────────────────────────────

function TelemetrySignalBar({ variant }: { variant: StatCardVariant }) {
  const activeBars = variant === "danger" ? 4 : variant === "warning" ? 3 : 2;

  const activeColorClass =
    variant === "danger"
      ? "bg-status-outofservice-bg shadow-[0_0_8px_var(--status-outofservice-bg)]"
      : variant === "warning"
      ? "bg-status-repair-bg shadow-[0_0_8px_var(--status-repair-bg)]"
      : "bg-status-active-bg shadow-[0_0_6px_var(--status-active-bg)]";

  return (
    <div
      className="flex items-center gap-1 bg-bg-subtle p-1 rounded border border-border"
      title="Telemetry Signal Meter"
      aria-hidden="true"
    >
      {[1, 2, 3, 4].map((bar) => {
        const isActive = bar <= activeBars;
        return (
          <span
            key={bar}
            className={cn(
              "w-1 rounded-full transition-all duration-300",
              bar === 1 && "h-2",
              bar === 2 && "h-3",
              bar === 3 && "h-4",
              bar === 4 && "h-5",
              isActive
                ? activeColorClass
                : "bg-text-secondary/20"
            )}
          />
        );
      })}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-border", className)}
      aria-hidden="true"
    />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  contextLine,
  icon: Icon,
  variant = "default",
  href,
  loading = false,
}: StatCardProps) {
  // Only `loading` prop drives skeleton — never treat null value as eternal load.
  const isLoading = loading;
  const displayValue = value ?? 0;

  // Determine structural urgency tier based on label and variant
  const isOverdue = label.toLowerCase().includes("overdue") || variant === "danger";
  const isLowStock = label.toLowerCase().includes("low stock") || label.toLowerCase().includes("low-stock") || variant === "warning";
  const isPending = label.toLowerCase().includes("pending");
  const isAssignable = label.toLowerCase().includes("assign");
  const isBorrow = label.toLowerCase().includes("borrow");

  const cardContent = (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all duration-200 select-none",
        "h-full min-h-36 bg-card text-text hover:shadow-md",
        // Uniform card background with distinct operational borders & accents
        isOverdue
          ? "border-status-outofservice-bg/40 hover:border-status-outofservice-bg/80"
          : isLowStock
          ? "border-status-repair-bg/40 hover:border-status-repair-bg/80"
          : isPending
          ? "border-category-computing-bg/40 hover:border-category-computing-bg/80"
          : isAssignable
          ? "border-amber-500/35 hover:border-amber-500/80"
          : isBorrow
          ? "border-primary/35 hover:border-primary/80"
          : "border-border hover:border-text-secondary/40"
      )}
      aria-label={`${label}: ${isLoading ? "loading" : displayValue}`}
    >
      {/* PO Ambient Glow Gradient on Hover */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          isOverdue
            ? "from-rose-500/5"
            : isLowStock
            ? "from-amber-500/5"
            : isPending
            ? "from-purple-500/5"
            : isAssignable
            ? "from-blue-500/5"
            : isBorrow
            ? "from-accent/5"
            : "from-text-secondary/5"
        )}
      />

      {/* Top Header Row */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-105",
              isOverdue
                ? "bg-status-outofservice-bg/15 border-status-outofservice-bg/40 text-status-outofservice-bg"
                : isLowStock
                ? "bg-status-repair-bg/15 border-status-repair-bg/40 text-status-repair-bg"
                : isPending
                ? "bg-category-computing-bg/15 border-category-computing-bg/40 text-category-computing-bg"
                : isAssignable
                ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                : isBorrow
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-bg-subtle border-border text-text-secondary group-hover:text-text"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
                {isOverdue
                  ? "CRIT // ALERT"
                  : isLowStock
                  ? "WARN // INVENTORY"
                  : isPending
                  ? "QUEUE // ACTION"
                  : isAssignable
                  ? "CUSTODY // ASSIGNABLE"
                  : isBorrow
                  ? "LOAN // BORROWABLE"
                  : "TELEMETRY"}
              </span>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-text">
              {label}
            </p>
          </div>
        </div>

        {/* Telemetry Signal Indicator */}
        <TelemetrySignalBar variant={variant} />
      </div>

      {/* Metric Display Area */}
      <div className="relative z-10 my-3 flex items-baseline justify-between gap-2">
        {isLoading ? (
          <Skeleton className="h-10 w-24" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-mono text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums transition-transform duration-300 group-hover:-translate-y-0.5",
                isOverdue
                  ? "text-status-outofservice-bg drop-shadow-[0_0_12px_var(--status-outofservice-bg)]"
                  : isLowStock
                  ? "text-status-repair-bg"
                  : isPending
                  ? "text-category-computing-bg"
                  : isAssignable
                  ? "text-amber-600 dark:text-amber-400"
                  : isBorrow
                  ? "text-primary dark:text-blue-400"
                  : "text-text"
              )}
            >
              {(displayValue as number).toLocaleString()}
            </span>
            <span className="font-mono text-xs text-text-secondary uppercase">
              {isOverdue
                ? "units"
                : isLowStock
                ? "items"
                : isPending
                ? "reqs"
                : isAssignable
                ? "assigned"
                : isBorrow
                ? "borrowed"
                : "active"}
            </span>
          </div>
        )}

        {/* Hover Action Badge */}
        {href && !isLoading && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all duration-200 border shadow-2xs",
              isOverdue
                ? "bg-status-outofservice-bg text-white border-status-outofservice-bg group-hover:bg-status-outofservice-bg/90 group-hover:scale-105"
                : isLowStock
                ? "bg-status-repair-bg/15 text-status-repair-text border-status-repair-bg/30 group-hover:bg-status-repair-bg group-hover:text-white"
                : isPending
                ? "bg-category-computing-bg/15 text-category-computing-bg border-category-computing-bg/30 group-hover:bg-category-computing-bg group-hover:text-white"
                : isAssignable
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 group-hover:bg-amber-600 group-hover:text-white"
                : isBorrow
                ? "bg-primary/10 text-primary border-primary/25 group-hover:bg-primary group-hover:text-white"
                : "bg-bg-subtle text-text-secondary border-border group-hover:text-text group-hover:bg-border"
            )}
          >
            <span>View</span>
            <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        )}
      </div>

      {/* Context Line & Operational Status Tag */}
      <div className="relative z-10 flex items-center justify-between gap-2 border-t border-border pt-2.5">
        {isLoading ? (
          <Skeleton className="h-3.5 w-36" />
        ) : (
          contextLine && (
            <div className="flex items-center gap-1.5 overflow-hidden">
              {isOverdue ? (
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-status-outofservice-bg animate-pulse" />
              ) : isLowStock ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-status-repair-bg" />
              ) : isPending ? (
                <Clock className="h-3.5 w-3.5 shrink-0 text-category-computing-bg" />
              ) : isAssignable ? (
                <Building2 className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : isBorrow ? (
                <Box className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-status-active-bg" />
              )}
              <span
                className={cn(
                  "text-xs truncate font-medium",
                  isOverdue ? "text-text font-semibold" : "text-text-secondary"
                )}
              >
                {contextLine}
              </span>
            </div>
          )
        )}

        {/* Pulsing Urgency Indicator Dot */}
        {isOverdue && !isLoading && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-outofservice-bg opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-status-outofservice-bg" />
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-status-outofservice-bg rounded-xl h-full"
      >
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

// ─── Grid Wrapper ────────────────────────────────────────────────────────────

export interface StatCardsGridProps {
  stats: StatCardProps[];
}

export function StatCardsGrid({ stats }: StatCardsGridProps) {
  return (
    <section aria-label="Key operational telemetry metrics">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>
    </section>
  );
}
