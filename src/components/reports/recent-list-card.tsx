"use client";

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ListOrdered, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecentItemStatusVariant =
  | "green"
  | "emerald"
  | "amber"
  | "rose"
  | "red"
  | "blue"
  | "neutral";

export interface RecentListItem {
  id: string | number;
  title: string;
  subtitle?: string;
  tag?: string;
  date?: string;
  status: {
    label: string;
    variant?: RecentItemStatusVariant;
  };
  onClick?: () => void;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
}

export interface RecentListCardProps {
  title: string;
  description?: string;
  sublabel?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  items: RecentListItem[];
  maxItems?: number;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

const BADGE_STYLES: Record<RecentItemStatusVariant, string> = {
  green:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  emerald:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  amber:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  rose:
    "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  red:
    "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  blue:
    "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  neutral:
    "bg-bg-subtle text-text-secondary border-border",
};

export function RecentListCard({
  title,
  description,
  sublabel,
  icon: HeaderIcon = ListOrdered,
  items,
  maxItems = 5,
  actionText,
  actionHref,
  onActionClick,
  emptyMessage = "No recent entries recorded.",
  loading = false,
  className,
}: RecentListCardProps) {
  const displayItems = items.slice(0, maxItems);

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-md",
        className
      )}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-2xs">
            <HeaderIcon className="h-4 w-4" />
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

        {actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-accent transition-colors"
          >
            <span>{actionText || "View All"}</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        ) : onActionClick ? (
          <button
            type="button"
            onClick={onActionClick}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-accent transition-colors cursor-pointer"
          >
            <span>{actionText || "View All"}</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        ) : (
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border bg-bg-subtle text-text-secondary border-border shrink-0">
            RECENT
          </span>
        )}
      </div>

      {description && (
        <p className="text-[11px] text-text-secondary -mt-1 mb-2 line-clamp-1">
          {description}
        </p>
      )}

      {/* ── List Content ──────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col space-y-2.5 my-auto py-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 p-2 rounded-xl bg-bg-subtle/40 animate-pulse"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-7 w-7 rounded-lg bg-border/60 shrink-0" />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="h-3 w-28 bg-border/60 rounded" />
                  <div className="h-2.5 w-40 bg-border/40 rounded" />
                </div>
              </div>
              <div className="h-5 w-16 bg-border/50 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 my-auto text-center gap-2">
          <Inbox className="h-7 w-7 text-text-secondary/40" />
          <p className="text-xs text-text-secondary">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col space-y-1.5 my-auto py-1">
          {displayItems.map((item) => {
            const ItemIcon = item.icon;
            const badgeCls =
              BADGE_STYLES[item.status.variant || "neutral"] ||
              BADGE_STYLES.neutral;

            const isClickable = Boolean(item.onClick);

            return (
              <div
                key={item.id}
                onClick={item.onClick}
                className={cn(
                  "group flex items-center justify-between gap-2.5 p-2 rounded-xl border border-transparent transition-all",
                  isClickable
                    ? "hover:bg-bg-subtle hover:border-border/60 cursor-pointer"
                    : "bg-bg-subtle/30"
                )}
              >
                {/* Left: Icon / Avatar + Titles */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {ItemIcon ? (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card text-text-secondary group-hover:text-text shadow-2xs">
                      <ItemIcon className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-bg-subtle font-mono text-[10px] font-bold text-text-secondary">
                      {String(item.title).slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-text truncate group-hover:text-accent transition-colors">
                        {item.title}
                      </span>
                      {item.tag && (
                        <span className="font-mono text-[9px] text-text-secondary/80 shrink-0">
                          ({item.tag})
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <div className="text-[11px] text-text-secondary truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Date (if any) + Status Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.date && (
                    <span className="font-mono text-[10px] text-text-secondary hidden sm:inline-block">
                      {item.date}
                    </span>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize whitespace-nowrap",
                      badgeCls
                    )}
                  >
                    {item.status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
