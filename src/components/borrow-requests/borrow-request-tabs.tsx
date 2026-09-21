"use client";

import { useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TabFilter } from "@/types/borrow-requests";

export interface BorrowRequestTabsProps {
  activeTab: TabFilter;
  onTabChange: (tab: TabFilter) => void;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  cancelledCount?: number;
  releasedCount: number;
  returnedCount: number;
  totalCount: number;
}

interface TabItem {
  id: TabFilter;
  label: string;
  count: number;
  showBadge?: boolean;
}

const STATUS_THEMES: Record<
  TabFilter,
  { dot: string; badge: string; activeBadge: string }
> = {
  pending: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    activeBadge: "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30",
  },
  approved: {
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    activeBadge: "bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/30",
  },
  rejected: {
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border border-destructive/20",
    activeBadge: "bg-destructive/20 text-destructive font-bold border border-destructive/30",
  },
  cancelled: {
    dot: "bg-orange-500",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20",
    activeBadge: "bg-orange-500/20 text-orange-800 dark:text-orange-300 font-bold border border-orange-500/30",
  },
  released: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    activeBadge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30",
  },
  returned: {
    dot: "bg-teal-500",
    badge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
    activeBadge: "bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/30",
  },
  all: {
    dot: "bg-text-secondary/70",
    badge: "bg-bg-subtle text-text-secondary border border-border",
    activeBadge: "bg-bg-subtle text-text font-bold border border-border/80",
  },
};

export function BorrowRequestTabs({
  activeTab,
  onTabChange,
  pendingCount,
  approvedCount,
  rejectedCount,
  cancelledCount = 0,
  releasedCount,
  returnedCount,
  totalCount,
}: BorrowRequestTabsProps) {
  const tabRefs = useRef<Record<TabFilter, HTMLButtonElement | null>>({
    pending: null,
    approved: null,
    rejected: null,
    cancelled: null,
    released: null,
    returned: null,
    all: null,
  });

  const tabs: TabItem[] = [
    { id: "pending", label: "Pending", count: pendingCount, showBadge: true },
    { id: "approved", label: "Approved", count: approvedCount },
    { id: "rejected", label: "Rejected", count: rejectedCount },
    { id: "cancelled", label: "Cancelled", count: cancelledCount },
    { id: "released", label: "Released", count: releasedCount },
    { id: "returned", label: "Returned", count: returnedCount },
    { id: "all", label: "All Requests", count: totalCount },
  ];

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentId: TabFilter) => {
    const tabOrder: TabFilter[] = [
      "pending",
      "approved",
      "rejected",
      "cancelled",
      "released",
      "returned",
      "all",
    ];
    const currentIndex = tabOrder.indexOf(currentId);
    let nextIndex = -1;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % tabOrder.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = tabOrder.length - 1;
    }

    if (nextIndex !== -1) {
      const nextTabId = tabOrder[nextIndex];
      onTabChange(nextTabId);
      tabRefs.current[nextTabId]?.focus();
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider shrink-0">
        Status:
      </span>
      <nav
        role="tablist"
        aria-label="Borrow request status filters"
        className="flex gap-1 rounded-xl border border-border p-1 bg-bg-subtle shrink-0 overflow-x-auto scrollbar-none relative"
      >
        {tabs.map((item) => {
          const isSelected = activeTab === item.id;
          const theme = STATUS_THEMES[item.id];

          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[item.id] = el;
              }}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`panel-${item.id}`}
              id={`tab-${item.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onTabChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              className={cn(
                "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap select-none",
                isSelected
                  ? "text-text"
                  : "text-text-secondary hover:text-text"
              )}
            >
              {isSelected && (
                <motion.span
                  layoutId="borrow-requests-active-tab"
                  className="absolute inset-0 rounded-lg bg-bg shadow-xs border border-border/80"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span
                className={cn("h-1.5 w-1.5 rounded-full relative z-10 shrink-0", theme.dot)}
                aria-hidden="true"
              />
              <span className="relative z-10">{item.label}</span>
              <span
                className={cn(
                  "relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold transition-colors duration-150",
                  isSelected ? theme.activeBadge : theme.badge
                )}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
