"use client";

import { Tag, MapPin, AlertCircle, PackageX, ShoppingCart, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import type { BrowseItem } from "./types";
import { useBorrowerPortal } from "./context";

interface BrowseItemCardProps {
  item: BrowseItem;
  viewMode: "grid" | "list";
}

function isItemAvailable(item: BrowseItem): boolean {
  if (item.type === "asset") {
    return item.status === "active";
  }
  return item.status === "available" || item.status === "low_stock";
}

function getStatusBadge(item: BrowseItem) {
  if (item.type === "asset") {
    const map: Record<string, { label: string; className: string }> = {
      active: {
        label: "Available",
        className:
          "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30",
      },
      needs_repair: {
        label: "Under Repair",
        className:
          "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30",
      },
      out_of_service: {
        label: "Out of Service",
        className:
          "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30",
      },
      retired: {
        label: "Retired",
        className:
          "bg-status-retired-bg/20 text-status-retired-text border-status-retired-bg/30",
      },
    };
    return map[item.status] ?? map.active;
  } else {
    const map: Record<string, { label: string; className: string }> = {
      available: {
        label: "In Stock",
        className:
          "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30",
      },
      low_stock: {
        label: `Low Stock (${item.currentQty} ${item.unit}s)`,
        className:
          "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30",
      },
      out_of_stock: {
        label: "Out of Stock",
        className:
          "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30",
      },
    };
    return map[item.status] ?? map.available;
  }
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-border", className)} aria-hidden />
  );
}

export function BrowseItemCardSkeleton({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-24 rounded-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export function BrowseItemCard({ item, viewMode }: BrowseItemCardProps) {
  const { getCategoryStyle } = useCategoryStyleMap();
  const categoryMeta = getCategoryStyle(item.category);
  const statusBadge = getStatusBadge(item);
  const available = isItemAvailable(item);
  const { cart, toggleCartItem } = useBorrowerPortal();
  const inCart = !!cart.find(c => c.id === item.id);

  const code = item.type === "asset" ? item.assetCode : item.itemCode;
  const unavailableReason = item.unavailableReason;

  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "group flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-border transition-colors duration-150",
          available ? "bg-card hover:bg-bg-subtle/60" : "bg-bg-subtle/40 opacity-75"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
            categoryMeta.bg,
            "border-border"
          )}
          aria-hidden
        >
          <Tag className={cn("h-4 w-4", categoryMeta.text)} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-text truncate">{item.name}</h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase border",
                categoryMeta.bg,
                categoryMeta.text,
                "border-transparent"
              )}
            >
              <Tag className="h-2.5 w-2.5" />
              {categoryMeta.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="font-mono">{code}</span>
            <span>·</span>
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        </div>

        {/* Status + Action */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap",
              statusBadge.className
            )}
          >
            {statusBadge.label}
          </span>
          <button
            type="button"
            onClick={() => toggleCartItem(item)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 transition-opacity hover:opacity-90",
              inCart 
                ? "bg-bg-subtle text-text-secondary border border-border focus-visible:ring-text-secondary"
                : available
                  ? "bg-accent text-accent-foreground focus-visible:ring-accent"
                  : "bg-bg-subtle text-text border border-border focus-visible:ring-text-secondary"
            )}
          >
            {inCart ? (
              <>
                <Check className="h-3.5 w-3.5" /> Added
              </>
            ) : available ? "Add to Request" : "Queue Request"}
          </button>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border p-5 transition-all duration-200 h-full",
        available
          ? "bg-card border-border hover:border-text-secondary/30 hover:shadow-md"
          : "bg-bg-subtle/40 border-border opacity-75"
      )}
    >
      {/* Category + Code */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border",
            categoryMeta.bg,
            categoryMeta.text,
            "border-transparent"
          )}
        >
          <Tag className="h-2.5 w-2.5" />
          {categoryMeta.label}
        </span>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap",
            statusBadge.className
          )}
        >
          {statusBadge.label}
        </span>
      </div>

      {/* Name */}
      <h3 className="text-sm font-bold text-text leading-snug mb-1 group-hover:text-accent transition-colors">
        {item.name}
      </h3>

      {/* Meta */}
      <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-1">
        <span className="font-mono font-semibold">{code}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-text-secondary mb-3 truncate">
        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">{item.location}</span>
      </div>

      {/* Notes */}
      {item.notes && (
        <p className="text-xs text-text-secondary/80 leading-relaxed mb-4 line-clamp-2 flex-1">
          {item.notes}
        </p>
      )}
      {!item.notes && <div className="flex-1" />}

      {/* Action */}
      <button
        type="button"
        onClick={() => toggleCartItem(item)}
        className={cn(
          "mt-auto w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 transition-opacity hover:opacity-90 shadow-sm",
          inCart
            ? "bg-bg-subtle text-text-secondary border border-border focus-visible:ring-text-secondary"
            : available
              ? "bg-accent text-accent-foreground focus-visible:ring-accent"
              : "bg-bg-subtle text-text border border-border focus-visible:ring-text-secondary"
        )}
      >
        {inCart ? (
          <>
            <Check className="h-3.5 w-3.5" /> Added to Request
          </>
        ) : available ? "Add to Request" : "Queue Request"}
      </button>

      {/* Unavailable reason tooltip hint */}
      {!available && unavailableReason && (
        <p className="mt-2 text-[11px] text-text-secondary/70 text-center leading-snug">
          {unavailableReason}
        </p>
      )}
    </div>
  );
}
