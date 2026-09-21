"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OverdueBadgeProps {
  daysOverdue: number;
  className?: string;
  showIcon?: boolean;
}

export function OverdueBadge({
  daysOverdue,
  className,
  showIcon = true,
}: OverdueBadgeProps) {
  const isCritical = daysOverdue >= 4;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums whitespace-nowrap",
        isCritical
          ? "bg-status-outofservice-bg/10 text-status-outofservice-bg dark:text-status-outofservice-text border border-status-outofservice-bg/30"
          : "bg-status-repair-bg/20 text-status-repair-text border border-status-repair-bg/30",
        className
      )}
    >
      {showIcon &&
        (isCritical ? (
          <AlertTriangle className="h-3 w-3 shrink-0" />
        ) : (
          <Clock className="h-3 w-3 shrink-0" />
        ))}
      <span>{daysOverdue}d overdue</span>
    </span>
  );
}
