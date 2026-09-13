"use client";

import Link from "next/link";
import { BarChart3, ExternalLink, PackageX } from "lucide-react";
import type { DashboardCategoryCount } from "@/server/modules/dashboard/dashboard.service";
import { cn } from "@/lib/utils";

import { useTopCategoriesQuery } from "@/features/dashboard/client/use-dashboard";

interface TopRankedBarCardProps {
  categoryDistribution?: DashboardCategoryCount[];
  loading?: boolean;
}

interface RankedRow {
  name: string;
  count: number;
  percentage: number;
  assetUnits?: number;
  consumableUnits?: number;
}

export function TopRankedBarCard({
  categoryDistribution,
  loading = false,
}: TopRankedBarCardProps) {
  const { data: fetchedCategories, isLoading: queryLoading } = useTopCategoriesQuery({
    limit: 5,
    enabled: !categoryDistribution || categoryDistribution.length === 0,
  });

  const activeCategories =
    categoryDistribution && categoryDistribution.length > 0
      ? categoryDistribution
      : fetchedCategories;

  const isLoading = loading || (!categoryDistribution && queryLoading);

  let items: RankedRow[] = [];

  if (activeCategories && activeCategories.length > 0) {
    const maxVal = Math.max(...activeCategories.map((c) => c.count), 1);
    items = activeCategories
      .slice(0, 5)
      .map((c) => ({
        name: c.label || c.category,
        count: c.count,
        percentage: Math.min(100, Math.round((c.count / maxVal) * 100)),
        assetUnits: c.assetUnits,
        consumableUnits: c.consumableUnits,
      }));
  }

  return (
    <div className="flex-1 min-h-[140px] rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Static Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <BarChart3 className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-bold text-text">Top Categories by Stock</h4>
        </div>
        <Link
          href="/categories"
          className="text-[11px] font-semibold text-text-secondary hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
        >
          <span>All</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col justify-center space-y-3 my-auto animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="h-3 w-28 rounded bg-border/50" />
              <div className="h-2 flex-1 rounded-full bg-border/40" />
              <div className="h-3 w-12 rounded bg-border/50" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4">
          <PackageX className="h-8 w-8 text-text-secondary/40" />
          <p className="text-xs text-text-secondary text-center">
            No category stock recorded yet.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center space-y-3 my-auto">
          {items.map((row, idx) => {
            const hasBreakdown =
              (row.assetUnits ?? 0) > 0 || (row.consumableUnits ?? 0) > 0;
            return (
              <Link
                key={idx}
                href={`/categories`}
                className="group flex flex-col gap-1 cursor-pointer"
                title={
                  hasBreakdown
                    ? `Assets: ${row.assetUnits ?? 0} · Consumables: ${row.consumableUnits ?? 0}`
                    : undefined
                }
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text truncate flex-1 min-w-0 mr-2 group-hover:text-primary transition-colors">
                    {row.name}
                  </span>
                  <span className="font-bold text-text-secondary tabular-nums text-[11px]">
                    {row.count.toLocaleString()} units
                  </span>
                </div>

                {/* Thin rounded horizontal bar */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-subtle border border-border/40">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out",
                      idx === 0
                        ? "bg-primary"
                        : idx === 1
                        ? "bg-primary/80"
                        : idx === 2
                        ? "bg-primary/60"
                        : "bg-primary/40"
                    )}
                    style={{ width: `${Math.max(row.percentage, 8)}%` }}
                  />
                </div>

                {/* Asset vs Consumable breakdown subtitle */}
                {hasBreakdown && (
                  <p className="text-[10px] text-text-secondary/70 leading-none">
                    {(row.assetUnits ?? 0) > 0 && `${row.assetUnits} assets`}
                    {(row.assetUnits ?? 0) > 0 && (row.consumableUnits ?? 0) > 0 && " · "}
                    {(row.consumableUnits ?? 0) > 0 && `${row.consumableUnits} consumables`}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
