"use client";

import { PackageSearch } from "lucide-react";
import type { Asset } from "@/types/assets";
import { AssetTableRow } from "./asset-table-row";

export interface AssetTableProps {
  assets: Asset[];
  loading?: boolean;
  onSelect: (asset: Asset) => void;
}

// ─── Matched Skeleton Row for Table View ─────────────────────────────────────

function SkeletonTableRow() {
  return (
    <tr className="border-b border-border bg-bg animate-pulse">
      <td className="px-5 py-4">
        <div className="h-4 w-16 bg-border rounded" />
      </td>
      <td className="px-3 py-4">
        <div className="h-4 w-40 bg-border rounded mb-1" />
        <div className="h-3 w-24 bg-border rounded" />
      </td>
      <td className="px-3 py-4">
        <div className="h-5 w-20 bg-border rounded-full" />
      </td>
      <td className="px-3 py-4">
        <div className="h-5 w-20 bg-border rounded-full" />
      </td>
      <td className="px-3 py-4">
        <div className="h-5 w-24 bg-border rounded-full" />
      </td>
      <td className="px-3 py-4">
        <div className="h-3.5 w-32 bg-border rounded mb-1" />
        <div className="h-3 w-20 bg-border rounded" />
      </td>
      <td className="px-3 py-4 hidden sm:table-cell">
        <div className="h-3 w-20 bg-border rounded" />
      </td>
      <td className="px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <div className="h-7 w-7 bg-border rounded" />
          <div className="h-7 w-14 bg-border rounded" />
        </div>
      </td>
    </tr>
  );
}

export function AssetTable({
  assets,
  loading = false,
  onSelect,
}: AssetTableProps) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label="Institutional assets loading table">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              <th scope="col" className="px-5 py-3">Code</th>
              <th scope="col" className="px-3 py-3">Asset Name</th>
              <th scope="col" className="px-3 py-3">Category</th>
              <th scope="col" className="px-3 py-3">Type</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3">Holder / Location</th>
              <th scope="col" className="px-3 py-3 hidden sm:table-cell">Updated</th>
              <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
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
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" aria-label="Institutional assets inventory registry">
        <thead>
          <tr className="border-b border-border bg-bg-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary sticky top-0 z-10 shadow-2xs">
            <th scope="col" className="px-5 py-3">Code</th>
            <th scope="col" className="px-3 py-3">Asset Name</th>
            <th scope="col" className="px-3 py-3">Category</th>
            <th scope="col" className="px-3 py-3">Type</th>
            <th scope="col" className="px-3 py-3">Status</th>
            <th scope="col" className="px-3 py-3">Holder / Location</th>
            <th scope="col" className="px-3 py-3 hidden sm:table-cell">Updated</th>
            <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {assets.map((asset) => (
            <AssetTableRow
              key={asset.id}
              asset={asset}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
