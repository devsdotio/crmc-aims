"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, AlertCircle, PackageCheck, ArrowRight } from "lucide-react";
import type {
  DashboardPendingRequest,
  DashboardOverdueAsset,
} from "@/server/modules/dashboard/dashboard.service";
import { cn } from "@/lib/utils";

interface PendingDeliveriesCardProps {
  pendingRequests?: DashboardPendingRequest[];
  overdueAssets?: DashboardOverdueAsset[];
  totalPendingRequests?: number;
  loading?: boolean;
}

interface PendingItemRow {
  id: string;
  name: string;
  code: string;
  delayText: string;
  isOverdue: boolean;
  href: string;
}

export function PendingDeliveriesCard({
  pendingRequests,
  overdueAssets,
  totalPendingRequests,
  loading = false,
}: PendingDeliveriesCardProps) {
  const router = useRouter();

  // Combine real overdue and pending requests
  const items: PendingItemRow[] = [];

  if (overdueAssets && overdueAssets.length > 0) {
    overdueAssets.slice(0, 3).forEach((a) => {
      items.push({
        id: `overdue-${a.id}`,
        name: a.assetName,
        code: `${a.assetCode} · ${a.borrowerName}`,
        delayText: `${a.daysOverdue}d overdue`,
        isOverdue: true,
        href: `/borrow-log?filter=overdue`,
      });
    });
  }

  if (pendingRequests && pendingRequests.length > 0) {
    pendingRequests.slice(0, 4).forEach((r) => {
      items.push({
        id: `pending-${r.id}`,
        name: r.itemDescription,
        code: `${r.requesterName} (${r.department})`,
        delayText: r.relativeTime || "Pending",
        isOverdue: false,
        href: r.kind === "supply" ? `/consumable-requests` : `/borrow-requests?status=pending`,
      });
    });
  }

  const effectiveTotalPending =
    totalPendingRequests !== undefined
      ? totalPendingRequests
      : pendingRequests?.length ?? 0;

  return (
    <div className="flex-1 min-h-[210px] lg:min-h-0 rounded-2xl border border-border/80 bg-card p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-text">Pending Requests</h4>
        </div>
        {loading ? (
          <span className="h-4 w-24 bg-border/50 rounded-full animate-pulse" />
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            {effectiveTotalPending > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
            {effectiveTotalPending} Total Pending
          </span>
        )}
      </div>

      {/* Row items, Skeleton, or Empty State */}
      {loading ? (
        <div className="space-y-2.5 my-auto animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-1.5 py-1.5">
              <div className="h-7 w-7 rounded-full bg-border/50 shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="h-3 w-3/4 rounded bg-border/50" />
                <div className="h-2.5 w-1/2 rounded bg-border/40" />
              </div>
              <div className="h-5 w-14 rounded-full bg-border/40 shrink-0" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <PackageCheck className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-text">No Pending Requests</p>
          <p className="text-[10px] text-text-secondary max-w-[200px]">
            All requests and asset returns are currently up to date.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/50 my-0.5 pr-1">
          {items.map((row) => (
            <div
              key={row.id}
              onClick={() => router.push(row.href)}
              className="group flex items-center justify-between py-2 hover:bg-bg-subtle/70 px-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    row.isOverdue
                      ? "bg-rose-50 text-rose-600 border border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40"
                      : "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40"
                  )}
                >
                  {row.isOverdue ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text truncate group-hover:text-primary transition-colors">
                    {row.name}
                  </p>
                  <p className="text-[10px] text-text-secondary truncate">
                    {row.code}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-bold whitespace-nowrap",
                    row.isOverdue
                      ? "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40"
                      : "bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40"
                  )}
                >
                  {row.delayText}
                </span>

                <Link
                  href={row.href}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg border border-border/80 bg-card px-2 py-0.5 text-[10px] font-bold text-text hover:bg-bg-subtle hover:border-border transition-colors cursor-pointer"
                >
                  Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="pt-1.5 border-t border-border/60">
        <Link
          href="/borrow-requests?status=pending"
          className="flex h-7.5 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-[11px] font-bold text-white hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
        >
          <span>
            See All Pending Requests{effectiveTotalPending > 0 ? ` (${effectiveTotalPending})` : ""}
          </span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
