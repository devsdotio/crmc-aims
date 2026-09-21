"use client";

import Link from "next/link";
import { ChevronRight, PackageCheck, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LowStockItem {
  id: string;
  itemName: string;
  currentQty: number;
  minThreshold: number;
  unit: string;
}

export interface LowStockWidgetProps {
  items: LowStockItem[];
  loading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-border", className)} aria-hidden="true" />;
}

function stockRatio(item: LowStockItem): number {
  if (item.minThreshold === 0) return 1;
  return item.currentQty / item.minThreshold;
}

function barColor(ratio: number): string {
  if (ratio <= 0.25) return "bg-status-outofservice-bg";
  if (ratio <= 0.75) return "bg-status-repair-bg";
  return "bg-status-active-bg";
}

function textColor(ratio: number): string {
  if (ratio <= 0.25) return "text-status-outofservice-bg";
  if (ratio <= 0.75) return "text-status-repair-bg";
  return "text-status-active-bg";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LowStockWidget({ items, loading = false }: LowStockWidgetProps) {
  const sorted = [...items].sort((a, b) => stockRatio(a) - stockRatio(b));

  return (
    <section
      className="flex flex-col rounded-lg border border-border bg-card overflow-hidden shadow-xs"
      aria-labelledby="low-stock-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-status-repair-bg/15 border border-status-repair-bg/30 flex items-center justify-center text-status-repair-text shrink-0">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="low-stock-heading" className="text-sm font-bold text-text leading-none">
              Low Stock
            </h2>
            {!loading && (
              <p className="text-xs text-text-secondary mt-1">
                {items.length === 0
                  ? "All items well-stocked"
                  : `${items.length} item${items.length !== 1 ? "s" : ""} at or near threshold`}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/consumables"
          className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md px-1.5 py-0.5"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Body */}
      <div className="flex-1 divide-y divide-border/60">
        {loading ? (
          <div className="px-5 py-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2.5 py-3.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-5 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-status-active-bg/15 border border-status-active-bg/30 text-status-active-text shadow-xs">
              <PackageCheck className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <div>
              <p className="text-sm font-bold text-text">All inventory well-stocked</p>
              <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                No consumable items are currently at or below their reorder threshold.
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-active-text bg-status-active-bg/10 border border-status-active-bg/25 px-2.5 py-0.5 rounded-full mt-3">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Healthy Inventory
              </span>
            </div>
          </div>
        ) : (
          <ul className="px-5 py-1" aria-label="Low stock consumables">
            {sorted.map((item) => {
              const ratio = stockRatio(item);
              const fillPct = Math.min(ratio * 100, 100);
              return (
                <li key={item.id} className="flex flex-col gap-2 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-text truncate">{item.itemName}</span>
                    <span className={cn("text-xs font-semibold tabular-nums shrink-0", textColor(ratio))}>
                      {item.currentQty} / {item.minThreshold} {item.unit}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full bg-border"
                    role="progressbar"
                    aria-valuenow={item.currentQty}
                    aria-valuemin={0}
                    aria-valuemax={item.minThreshold}
                    aria-label={`${item.itemName} stock level`}
                  >
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-500", barColor(ratio))}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
