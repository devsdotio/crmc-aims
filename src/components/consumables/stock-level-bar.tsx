"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStockSeverity } from "./utils";

export interface StockLevelBarProps {
  currentQty: number;
  minThreshold: number;
  unit: string;
  className?: string;
  showTextReadout?: boolean;
}

export function StockLevelBar({
  currentQty,
  minThreshold,
  unit,
  className,
  showTextReadout = true,
}: StockLevelBarProps) {
  const severity = getStockSeverity(currentQty, minThreshold);

  // Fill percentage relative to 2x threshold for bar scaling
  const maxScale = Math.max(minThreshold * 2, currentQty, 1);
  const percentage = Math.min(Math.round((currentQty / maxScale) * 100), 100);

  const meta = {
    healthy: {
      barFill: "bg-status-active-bg",
      badgeBg: "bg-status-active-bg/20",
      badgeText: "text-status-active-text",
      label: "Healthy Stock",
      Icon: CheckCircle2,
    },
    low: {
      barFill: "bg-status-repair-bg",
      badgeBg: "bg-status-repair-bg/20",
      badgeText: "text-status-repair-text",
      label: "Low Stock",
      Icon: AlertTriangle,
    },
    critical: {
      barFill: "bg-status-outofservice-bg",
      badgeBg: "bg-status-outofservice-bg/20",
      badgeText: "text-status-outofservice-text font-bold",
      label: currentQty === 0 ? "Out of Stock" : "Critical Stock",
      Icon: AlertOctagon,
    },
  }[severity];

  const Icon = meta.Icon;

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Top Header: Readout & Severity Badge */}
      {showTextReadout && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-text">
            <span className="font-bold text-sm tabular-nums">
              {currentQty.toLocaleString()} {unit}
            </span>
            <span className="text-[11px] text-text-secondary/70">
              (min: {minThreshold} {unit})
            </span>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums whitespace-nowrap",
              meta.badgeBg,
              meta.badgeText
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {meta.label}
          </span>
        </div>
      )}

      {/* Progress Bar Container */}
      <div className="relative h-2 w-full rounded-full bg-border/60 overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300 rounded-full", meta.barFill)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
