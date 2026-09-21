"use client";

import { PackageSearch } from "lucide-react";
import type { ConsumableItem } from "@/types/inventory";
import { ConsumableTableRow } from "./consumable-table-row";

export interface ConsumableTableProps {
  items: ConsumableItem[];
  loading?: boolean;
  onSelect: (item: ConsumableItem) => void;
  onAdjust?: (item: ConsumableItem) => void;
  onDelete?: (item: ConsumableItem) => void;
}

// ─── Matched Skeleton Row for Consumables Table ─────────────────────────────

function SkeletonTableRow() {
  return (
    <tr className="border-b border-border bg-bg animate-pulse">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-border rounded" />
          <div className="h-4 w-48 bg-border rounded" />
        </div>
      </td>
      <td className="px-3 py-4">
        <div className="h-5 w-24 bg-border rounded-full" />
      </td>
      <td className="px-3 py-4">
        <div className="h-3.5 w-full bg-border rounded mb-1" />
        <div className="h-2 w-full bg-border rounded-full" />
      </td>
      <td className="px-3 py-4 hidden md:table-cell">
        <div className="h-3 w-20 bg-border rounded" />
      </td>
      <td className="px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <div className="h-7 w-16 bg-border rounded" />
        </div>
      </td>
    </tr>
  );
}

export function ConsumableTable({
  items,
  loading = false,
  onSelect,
  onAdjust,
  onDelete,
}: ConsumableTableProps) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label="Consumables stock inventory table">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              <th scope="col" className="px-5 py-3">Consumable Item</th>
              <th scope="col" className="px-3 py-3">Category</th>
              <th scope="col" className="px-3 py-3">Stock Level & Severity</th>
              <th scope="col" className="px-3 py-3 hidden md:table-cell">Last Restocked</th>
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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/25 text-status-repair-text shadow-xs">
          <PackageSearch className="h-7 w-7" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="text-base font-bold text-text">No consumable supplies found</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
            No inventory stock items match your current search query, category, or stock-level filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" aria-label="Consumable inventory items table">
        <thead>
          <tr className="border-b border-border bg-bg-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary sticky top-0 z-10 shadow-2xs">
            <th scope="col" className="px-5 py-3">Consumable Item</th>
            <th scope="col" className="px-3 py-3">Category</th>
            <th scope="col" className="px-3 py-3">Stock Level & Severity</th>
            <th scope="col" className="px-3 py-3 hidden md:table-cell">Last Restocked</th>
            <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <ConsumableTableRow
              key={item.id}
              item={item}
              onSelect={onSelect}
              onAdjust={onAdjust}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
