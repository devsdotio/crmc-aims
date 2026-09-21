"use client";

import { PackageSearch } from "lucide-react";
import type { Asset } from "@/types/assets";
import { AssetCard } from "./asset-card";

export interface AssetGridProps {
  assets: Asset[];
  loading?: boolean;
  onSelect: (asset: Asset) => void;
}

// ─── Matched Skeleton Card for Grid View ─────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-bg overflow-hidden animate-pulse">
      <div className="flex items-center justify-between p-3.5 border-b border-border bg-bg-subtle/50">
        <div className="h-4 w-16 bg-border rounded" />
        <div className="h-4 w-20 bg-border rounded-full" />
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="h-4 w-24 bg-border rounded-full" />
        <div className="h-5 w-full bg-border rounded" />
        <div className="h-4 w-3/4 bg-border rounded" />
        <div className="mt-auto space-y-2 pt-3 border-t border-border/60">
          <div className="h-3 w-32 bg-border rounded" />
          <div className="h-3 w-28 bg-border rounded" />
        </div>
      </div>
      <div className="px-4 py-2.5 bg-bg-subtle border-t border-border flex items-center justify-between">
        <div className="h-3 w-20 bg-border rounded" />
        <div className="h-4 w-4 bg-border rounded" />
      </div>
    </div>
  );
}

export function AssetGrid({
  assets,
  loading = false,
  onSelect,
}: AssetGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-category-computing-bg/10 border border-category-computing-bg/25 text-category-computing-bg shadow-xs">
          <PackageSearch className="h-7 w-7" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="text-base font-bold text-text">No assets found</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
            No institutional fixed assets match your current search query, category, or status filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
