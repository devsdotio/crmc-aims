"use client";

import {
  TrendingUp,
  TrendingDown,
  Package,
  Layers,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type {
  DashboardSummaryDTO,
  StatDeltaDTO,
} from "@/server/modules/dashboard/dashboard.service";

interface CompactStatCardsProps {
  summary?: DashboardSummaryDTO | null;
  loading?: boolean;
}

function buildSubtitle(
  delta?: StatDeltaDTO,
  fallback = ""
): React.ReactNode {
  if (!delta || delta.percentChange === null) {
    return <span className="text-text-secondary truncate block">{fallback}</span>;
  }

  const isUp = delta.direction === "up";
  const isDown = delta.direction === "down";

  return (
    <div className="flex items-center justify-between gap-1.5 min-w-0">
      <span className="text-text-secondary truncate">{fallback}</span>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[10px] font-semibold font-mono shrink-0 ml-auto",
          isUp
            ? "text-emerald-600 dark:text-emerald-400"
            : isDown
            ? "text-rose-600 dark:text-rose-400"
            : "text-text-secondary"
        )}
      >
        {isUp && <TrendingUp className="h-2.5 w-2.5 shrink-0" />}
        {isDown && <TrendingDown className="h-2.5 w-2.5 shrink-0" />}
        {`${delta.percentChange}%`}
      </span>
    </div>
  );
}

export function CompactStatCards({
  summary,
  loading = false,
}: CompactStatCardsProps) {
  const activeBorrows = summary?.activeBorrows ?? 0;
  const activeAssignments = summary?.activeAssignments ?? 0;
  const totalActiveOps = activeBorrows + activeAssignments;

  const totalAssignable = summary?.totalAssignable ?? 0;
  const totalBorrowable = summary?.totalBorrowable ?? 0;
  const totalStockAssets = totalAssignable + totalBorrowable;

  const lowStockCount = summary?.lowStockItems ?? 0;
  const pendingApprovals = summary?.pendingApprovals ?? 0;
  const overdueCount = summary?.overdueAssets ?? 0;

  const custodyRatio =
    totalStockAssets > 0
      ? Math.min(100, Math.round((totalActiveOps / totalStockAssets) * 100))
      : 0;

  const assignableRatio =
    totalStockAssets > 0
      ? Math.min(100, Math.round((totalAssignable / totalStockAssets) * 100))
      : 0;

  return (
    <StatCardGrid className="gap-3">
      {/* 1. Items in Use */}
      <StatCard
        title="Items in Use"
        sublabel="BORROWED & ASSIGNED"
        value={totalActiveOps.toLocaleString()}
        icon={Package}
        tone="emerald"
        toneValue={true}
        badge={
          totalActiveOps > 0
            ? { text: "In Use", pulse: true, tone: "emerald" }
            : "None in Use"
        }
        href="/borrow-log?custody=borrow&filter=active"
        loading={loading}
        subtitle={buildSubtitle(
          summary?.deltas?.activeOps,
          `${activeBorrows} on loan · ${activeAssignments} assigned`
        )}
        progress={{
          value: custodyRatio,
        }}
      />

      {/* 2. Total Assets */}
      <StatCard
        title="Total Assets"
        sublabel="ALL INVENTORY ITEMS"
        value={totalStockAssets.toLocaleString()}
        icon={Layers}
        tone="blue"
        toneValue={true}
        badge={{ text: "In Inventory", pulse: false, tone: "blue" }}
        href="/assets"
        loading={loading}
        subtitle={buildSubtitle(
          summary?.deltas?.totalStock,
          totalAssignable > 0
            ? `${totalAssignable} assignable · ${totalBorrowable} borrowable`
            : "Active in circulation"
        )}
        progress={{
          value: assignableRatio,
        }}
      />

      {/* 3. Overdue Returns */}
      <StatCard
        title="Overdue Returns"
        sublabel="PAST RETURN DATE"
        value={overdueCount.toLocaleString()}
        icon={Clock}
        tone={overdueCount > 0 ? "rose" : "emerald"}
        toneValue={true}
        badge={
          overdueCount > 0
            ? { text: "Past Due", pulse: true, tone: "rose" }
            : "On Schedule"
        }
        href="/borrow-log?filter=overdue"
        loading={loading}
        subtitle={buildSubtitle(
          summary?.deltas?.overdueAssets,
          overdueCount > 0
            ? `${overdueCount} require return follow-up`
            : "All items within return window"
        )}
        progress={
          overdueCount > 0
            ? {
                value: overdueCount,
                max: Math.max(activeBorrows, overdueCount, 1),
              }
            : undefined
        }
      />

      {/* 4. Low Stock & Requests */}
      <StatCard
        title="Low Stock & Requests"
        sublabel="RESTOCK & APPROVALS"
        value={(lowStockCount + pendingApprovals).toLocaleString()}
        icon={AlertTriangle}
        tone={lowStockCount + pendingApprovals > 0 ? "amber" : "emerald"}
        toneValue={true}
        badge={
          lowStockCount + pendingApprovals > 0
            ? { text: "Needs Attention", pulse: true, tone: "amber" }
            : "Optimal Stock"
        }
        href="/consumables"
        loading={loading}
        subtitle={buildSubtitle(
          summary?.deltas?.lowStock,
          `${lowStockCount} low stock · ${pendingApprovals} pending requests`
        )}
        progress={
          lowStockCount + pendingApprovals > 0
            ? {
                value: lowStockCount + pendingApprovals,
                max: Math.max(lowStockCount + pendingApprovals + 10, 20),
              }
            : undefined
        }
      />
    </StatCardGrid>
  );
}
