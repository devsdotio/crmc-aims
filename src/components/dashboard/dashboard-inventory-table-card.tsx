import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Laptop,
  Printer,
  Headphones,
  Armchair,
  HardDrive,
  Monitor,
  ExternalLink,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardAssetsQuery } from "@/features/dashboard/client/use-dashboard";
import type { DashboardAssetRow } from "@/features/dashboard/client/dashboard-api";
import { getAssetStatusBadge } from "@/constants/asset-statuses";

interface DashboardInventoryTableCardProps {
  loading?: boolean;
}

type FilterTag = "all" | "assignable" | "borrowable" | "custody" | "low-stock";

const FILTER_TAGS: Array<{ id: FilterTag; label: string }> = [
  { id: "all", label: "All Items" },
  { id: "assignable", label: "Assignable Assets" },
  { id: "borrowable", label: "Borrowable Units" },
  { id: "custody", label: "Active Custody" },
  { id: "low-stock", label: "Low Stock Items" },
];

function getCategoryIcon(category: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("comp") || cat.includes("it") || cat.includes("laptop")) {
    return { icon: Laptop, bg: "bg-blue-50 dark:bg-blue-950/40", color: "text-blue-600 dark:text-blue-400" };
  }
  if (cat.includes("monitor") || cat.includes("display")) {
    return { icon: Monitor, bg: "bg-indigo-50 dark:bg-indigo-950/40", color: "text-indigo-600 dark:text-indigo-400" };
  }
  if (cat.includes("furn") || cat.includes("chair") || cat.includes("desk")) {
    return { icon: Armchair, bg: "bg-amber-50 dark:bg-amber-950/40", color: "text-amber-600 dark:text-amber-400" };
  }
  if (cat.includes("audio") || cat.includes("video") || cat.includes("av") || cat.includes("headphone")) {
    return { icon: Headphones, bg: "bg-emerald-50 dark:bg-emerald-950/40", color: "text-emerald-600 dark:text-emerald-400" };
  }
  if (cat.includes("print") || cat.includes("ink") || cat.includes("paper")) {
    return { icon: Printer, bg: "bg-cyan-50 dark:bg-cyan-950/40", color: "text-cyan-600 dark:text-cyan-400" };
  }
  if (cat.includes("storage") || cat.includes("consumable")) {
    return { icon: HardDrive, bg: "bg-purple-50 dark:bg-purple-950/40", color: "text-purple-600 dark:text-purple-400" };
  }
  return { icon: Package, bg: "bg-slate-50 dark:bg-slate-800/60", color: "text-slate-600 dark:text-slate-300" };
}

export function DashboardInventoryTableCard({
  loading: parentLoading = false,
}: DashboardInventoryTableCardProps) {
  const router = useRouter();
  const [activeTag, setActiveTag] = useState<FilterTag>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: items, isLoading: queryLoading } = useDashboardAssetsQuery({
    limit: 5,
    search: debouncedSearch || undefined,
    tag: activeTag === "all" ? undefined : activeTag,
  });

  const isLoading = parentLoading || queryLoading;

  if (isLoading) {
    return (
      <div className="h-115 rounded-2xl border border-border/80 bg-card p-6 shadow-xs animate-pulse flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded bg-border/60" />
          <div className="h-8 w-60 rounded-xl bg-border/50" />
        </div>
        <div className="space-y-4 my-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="h-10 w-10 rounded-xl bg-border/50" />
              <div className="h-4 flex-1 rounded bg-border/40" />
              <div className="h-4 w-16 rounded bg-border/40" />
              <div className="h-4 w-20 rounded-full bg-border/50" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rows: DashboardAssetRow[] = items ?? [];

  return (
    <div className="h-115 rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Header with Title & Search / Sort controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60 shrink-0">
        <div>
          <h3 className="text-base font-bold text-text">
            Asset &amp; Inventory Fleet Status
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Live equipment assignment, holder custody, and inventory valuation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search assets, holders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-40 sm:w-52 rounded-xl border border-border bg-bg-subtle pl-8 pr-3 text-xs text-text placeholder:text-text-secondary/70 focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <Link
            href="/assets"
            className="flex h-8 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            <span>All Assets</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Filter Tag Chips */}
      <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar shrink-0">
        {FILTER_TAGS.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => setActiveTag(tag.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer",
              activeTag === tag.id
                ? "bg-primary text-white shadow-xs"
                : "bg-bg-subtle text-text-secondary hover:text-text hover:bg-border/60"
            )}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/60 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              <th className="pb-2.5 pl-1 font-semibold">Asset Details</th>
              <th className="pb-2.5 font-semibold text-center">Type</th>
              <th className="pb-2.5 font-semibold">Current Custody</th>
              <th className="pb-2.5 font-semibold text-center">In Stock</th>
              <th className="pb-2.5 font-semibold text-right">Valuation</th>
              <th className="pb-2.5 font-semibold text-center">Status</th>
              <th className="pb-2.5 pr-1 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-text-secondary">
                  No matching equipment found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const { icon: Icon, bg: iconBg, color: iconColor } = getCategoryIcon(row.category);
                const formattedValuation =
                  row.valuation > 0 ? `₱${row.valuation.toLocaleString()}` : "—";

                return (
                  <tr
                    key={row.id}
                    onClick={() => router.push(row.href)}
                    className="group hover:bg-bg-subtle/80 transition-colors cursor-pointer"
                  >
                    {/* Thumbnail & Item Name */}
                    <td className="py-3 pl-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            iconBg,
                            iconColor
                          )}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={row.href}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-text hover:underline truncate block cursor-pointer group-hover:text-primary transition-colors"
                          >
                            {row.name}
                          </Link>
                          <span className="text-[11px] text-text-secondary font-mono">
                            {row.sku}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Asset Type */}
                    <td className="py-3 text-center">
                      <span className="inline-flex rounded-md bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                        {row.type}
                      </span>
                    </td>

                    {/* Custody Holder & Department */}
                    <td className="py-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-text truncate max-w-40">
                          {row.custody.holder}
                        </p>
                        <p className="text-[10px] text-text-secondary truncate">
                          {row.custody.department}
                        </p>
                      </div>
                    </td>

                    {/* In Stock Qty */}
                    <td className="py-3 text-center font-bold text-text tabular-nums">
                      {row.stockIn} / {row.totalQty}
                    </td>

                    {/* Valuation */}
                    <td className="py-3 text-right font-bold text-text tabular-nums">
                      {formattedValuation}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 text-center">
                      {(() => {
                        const badge = getAssetStatusBadge(row.condition);
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap",
                              badge.badgeClass
                            )}
                          >
                            <span
                              className={cn(
                                "mr-1.5 h-1.5 w-1.5 rounded-full",
                                badge.dotClass
                              )}
                            />
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 pr-1 text-right">
                      <Link
                        href={row.href}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-card hover:text-text hover:shadow-xs transition-all cursor-pointer"
                        title="View Details"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
