"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  LayoutGrid,
  List,
  Package,
  Boxes,
  Wrench,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowseItemCard, BrowseItemCardSkeleton } from "./browse-item-card";
import type { BrowseConsumableItem, BrowseItem } from "./types";

import { useAssetsQuery } from "@/features/assets/client/use-assets";
import { useConsumableCatalogQuery } from "@/features/consumables/client/use-consumables";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { useBorrowerPortal } from "./context";
import { isAssetAvailableForRequest } from "@/lib/assets-custody";
import { availableQty } from "@/components/consumables/utils";
import { isBrowseItemInStock } from "./browse-availability";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";

type KindFilter = "all" | "asset" | "supply" | "material";

const KIND_FILTERS: Array<{
  key: KindFilter;
  label: string;
  icon: typeof LayoutGrid;
  activeIconClass: string;
}> = [
  { key: "all", label: "All", icon: LayoutGrid, activeIconClass: "text-text" },
  {
    key: "asset",
    label: "Assets",
    icon: Package,
    activeIconClass: "text-blue-700 dark:text-blue-300",
  },
  {
    key: "supply",
    label: "Supplies",
    icon: Boxes,
    activeIconClass: "text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "material",
    label: "Materials",
    icon: Wrench,
    activeIconClass: "text-teal-700 dark:text-teal-300",
  },
];

const BROWSE_PAGE_SIZE = 9;

function matchesItemKind(item: BrowseItem, k: KindFilter): boolean {
  return (
    k === "all" ||
    (k === "asset" && item.type === "asset") ||
    (item.type === "consumable" && item.classification === k)
  );
}

export function BrowseTab() {
  const { cart, clearCart, openWizard } = useBorrowerPortal();
  const { getCategoryStyle } = useCategoryStyleMap();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const {
    data: assets = [],
    isLoading: assetsLoading,
    isError: assetsError,
    error: assetsErr,
    refetch: refetchAssets,
  } = useAssetsQuery(undefined, { catalog: true });
  const {
    data: paginatedData,
    isLoading: consumablesLoading,
    isError: consumablesError,
    error: consumablesErr,
    refetch: refetchConsumables,
  } = useConsumableCatalogQuery({ catalog: true });
  const consumables = useMemo(() => paginatedData?.data ?? [], [paginatedData?.data]);
  const loading = assetsLoading || consumablesLoading;
  const hasError = assetsError || consumablesError;
  const errorMessage =
    assetsErr?.message || consumablesErr?.message || "Failed to load catalog items.";

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, kind, category, availableOnly]);

  // Reset category when kind changes (category list is kind-scoped).
  useEffect(() => {
    setCategory("all");
  }, [kind]);

  const items = useMemo(() => {
    return [
      ...assets
        .filter(
          (a) =>
            a.assignmentType === "borrowable" || a.assignmentType === "assignable"
        )
        .filter((a) => isAssetAvailableForRequest(a))
        .map((a) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          type: "asset" as const,
          status: a.status,
          assignmentType: a.assignmentType,
          assetCode: a.assetCode,
          location: a.location,
        })),
      ...consumables.map((c) => {
        const free = c.availableQty ?? availableQty(c);
        return {
          id: c.id,
          name: c.name,
          category: c.category,
          classification: c.classification,
          type: "consumable" as const,
          status:
            free <= 0
              ? ("out_of_stock" as const)
              : free <= c.minThreshold
                ? ("low_stock" as const)
                : ("available" as const),
          itemCode: c.itemCode,
          currentQty: free,
          unit: c.unit,
          location: c.location,
        } satisfies BrowseConsumableItem;
      }),
    ] as BrowseItem[];
  }, [assets, consumables]);

  const cartCounts = useMemo(() => {
    let assetCount = 0;
    let supplyCount = 0;
    let materialCount = 0;
    for (const item of cart) {
      if (item.type === "asset") assetCount += 1;
      else if (item.classification === "material") materialCount += 1;
      else supplyCount += 1;
    }
    return { assetCount, supplyCount, materialCount };
  }, [cart]);

  const matchesSearchAndStock = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (item: BrowseItem) => {
      const code = item.type === "asset" ? item.assetCode : item.itemCode;
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        code?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchesAvailable = !availableOnly || isBrowseItemInStock(item);
      return matchesSearch && matchesAvailable;
    };
  }, [search, availableOnly]);

  const kindCounts = useMemo(() => {
    const counts: Record<KindFilter, number> = {
      all: 0,
      asset: 0,
      supply: 0,
      material: 0,
    };
    for (const item of items) {
      if (!matchesSearchAndStock(item)) continue;
      counts.all += 1;
      if (item.type === "asset") counts.asset += 1;
      else if (item.classification === "material") counts.material += 1;
      else counts.supply += 1;
    }
    return counts;
  }, [items, matchesSearchAndStock]);

  const categoryEntries = useMemo(() => {
    const countsByKey = new Map<string, { name: string; count: number }>();
    let total = 0;
    for (const item of items) {
      if (!matchesItemKind(item, kind)) continue;
      const trimmed = item.category?.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!countsByKey.has(key)) {
        countsByKey.set(key, { name: trimmed, count: 0 });
      }
      if (matchesSearchAndStock(item)) {
        countsByKey.get(key)!.count += 1;
        total += 1;
      }
    }
    return {
      total,
      entries: Array.from(countsByKey.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    };
  }, [items, kind, matchesSearchAndStock]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!matchesSearchAndStock(item)) return false;
      if (!matchesItemKind(item, kind)) return false;
      const matchesCategory =
        category === "all" ||
        item.category.trim().toLowerCase() === category.toLowerCase();
      return matchesCategory;
    });
  }, [items, matchesSearchAndStock, kind, category]);

  const hasActiveFilters = Boolean(
    search.trim() || kind !== "all" || category !== "all" || availableOnly
  );

  const resetFilters = () => {
    setSearch("");
    setKind("all");
    setCategory("all");
    setAvailableOnly(false);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / BROWSE_PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * BROWSE_PAGE_SIZE;
    return filtered.slice(start, start + BROWSE_PAGE_SIZE);
  }, [filtered, page]);
  const startItem = filtered.length > 0 ? (page - 1) * BROWSE_PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * BROWSE_PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-4">
      {hasError && (
        <QueryErrorBanner
          message={errorMessage}
          onRetry={() => {
            if (assetsError) void refetchAssets();
            if (consumablesError) void refetchConsumables();
          }}
        />
      )}

      {/* 3-Tier Common Region Toolbar Card */}
      <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Row 1: Search + Right-Aligned Utility Cluster */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <label htmlFor="browse-catalog-search" className="sr-only">
              Search catalog by name, code, or category
            </label>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none"
              aria-hidden
            />
            <input
              id="browse-catalog-search"
              type="text"
              placeholder="Search by name, code, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 sm:h-9 rounded-lg border border-border bg-bg pl-9 pr-10 text-sm sm:text-xs text-text placeholder:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-7 sm:w-7 inline-flex items-center justify-center rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer transition-colors"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={availableOnly}
              onClick={() => setAvailableOnly((p) => !p)}
              className={cn(
                "inline-flex items-center gap-2.5 h-11 sm:h-9 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                availableOnly
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "w-8 h-4.5 rounded-full transition-colors duration-200 relative shrink-0",
                  availableOnly ? "bg-primary" : "bg-border"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-2xs transition-transform duration-200",
                    availableOnly ? "translate-x-3.5" : "translate-x-0"
                  )}
                />
              </span>
              <span>In stock only</span>
            </button>

            <div
              role="group"
              aria-label="View mode"
              className="inline-flex items-center p-1 rounded-lg border border-border bg-bg-subtle gap-1"
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 min-h-9 min-w-9 sm:min-h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-text-secondary hover:text-text hover:bg-bg"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden md:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 min-h-9 min-w-9 sm:min-h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-text-secondary hover:text-text hover:bg-bg"
                )}
              >
                <List className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden md:inline">List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Tier 1 — Primary Item Type Segmented Rail */}
        <div
          className="flex items-center gap-1.5 rounded-xl border border-border bg-bg-subtle p-1 overflow-x-auto scrollbar-none"
          role="tablist"
          aria-label="Filter by item type"
        >
          {KIND_FILTERS.map((f) => {
            const Icon = f.icon;
            const active = kind === f.key;
            const count = kindCounts[f.key];
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setKind(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 min-h-11 sm:min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary border",
                  active
                    ? "bg-card text-text border-border/80 shadow-xs font-bold"
                    : "border-transparent text-text-secondary hover:text-text hover:bg-bg/70"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    active ? f.activeIconClass : "text-text-secondary"
                  )}
                  aria-hidden
                />
                <span>{f.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold tabular-nums border",
                    active
                      ? "bg-bg-subtle text-text border-border"
                      : "bg-card text-text-secondary border-border/60"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Tier 2 — Category Sub-Filter + Conditional Reset */}
        {(categoryEntries.entries.length > 0 || hasActiveFilters) && (
          <div className="pt-2.5 border-t border-border/70 flex flex-wrap items-center justify-between gap-2">
            {categoryEntries.entries.length > 0 ? (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary shrink-0">
                  Category
                </span>
                {categoryEntries.entries.length > 7 ? (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    aria-label="Filter by category"
                    className="h-10 sm:h-8 rounded-lg border border-border bg-bg px-2.5 text-xs font-medium text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="all">
                      All categories ({categoryEntries.total})
                    </option>
                    {categoryEntries.entries.map((entry) => (
                      <option key={entry.name} value={entry.name}>
                        {entry.name} ({entry.count})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    className="flex items-center gap-2 overflow-x-auto scrollbar-none sm:flex-wrap py-0.5"
                    role="group"
                    aria-label="Filter by category"
                  >
                    <button
                      type="button"
                      onClick={() => setCategory("all")}
                      aria-pressed={category === "all"}
                      className={cn(
                        "inline-flex items-center gap-1.5 min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg text-xs border whitespace-nowrap shrink-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        category === "all"
                          ? "bg-primary/10 border-primary/40 text-primary font-bold"
                          : "bg-bg border-border text-text-secondary font-medium hover:text-text hover:bg-bg-subtle"
                      )}
                    >
                      <span>All categories</span>
                      <span className="text-[11px] font-mono opacity-80 tabular-nums">
                        {categoryEntries.total}
                      </span>
                    </button>
                    {categoryEntries.entries.map((entry) => {
                      const active =
                        category.toLowerCase() === entry.name.toLowerCase();
                      const catStyle = getCategoryStyle(entry.name);
                      return (
                        <button
                          key={entry.name}
                          type="button"
                          onClick={() => setCategory(active ? "all" : entry.name)}
                          aria-pressed={active}
                          className={cn(
                            "inline-flex items-center gap-1.5 min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg text-xs border whitespace-nowrap shrink-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            active
                              ? "bg-primary/10 border-primary/40 text-primary font-bold"
                              : "bg-bg border-border text-text-secondary font-medium hover:text-text hover:bg-bg-subtle"
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              catStyle.bg
                            )}
                            aria-hidden
                          />
                          <span>{entry.name}</span>
                          <span className="text-[11px] font-mono opacity-80 tabular-nums">
                            {entry.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-8 px-2.5 rounded-lg border border-border bg-bg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                <span>Reset filters</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count & Quick Pager */}
      {!loading && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 text-xs text-text-secondary">
          <p className="tabular-nums">
            Showing{" "}
            <span className="font-semibold text-text">{startItem}</span>
            –
            <span className="font-semibold text-text">{endItem}</span> of{" "}
            <span className="font-semibold text-text">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "item" : "items"}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="tabular-nums">
                Page <span className="font-semibold text-text">{page}</span> of{" "}
                <span className="font-semibold text-text">{totalPages}</span>
              </span>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:text-text hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
                className="inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:text-text hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid / list */}
      {loading ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "rounded-xl border border-border overflow-hidden bg-card"
          )}
        >
          {Array.from({ length: BROWSE_PAGE_SIZE }).map((_, i) => (
            <BrowseItemCardSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-semibold text-text">No items found</p>
          <p className="mt-1 text-xs text-text-secondary">
            Try resetting your filters or search — supplies and materials from
            warehouse inventory appear here alongside available assets.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 min-h-11 sm:min-h-9 rounded-lg border border-border bg-bg text-xs font-semibold text-text hover:bg-bg-subtle transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedItems.map((item) => (
            <BrowseItemCard key={item.id} item={item} viewMode="grid" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {paginatedItems.map((item) => (
            <BrowseItemCard key={item.id} item={item} viewMode="list" />
          ))}
        </div>
      )}

      {/* Bottom Pagination Footer */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xs text-xs text-text-secondary">
          <p className="tabular-nums">
            Showing <span className="font-semibold text-text">{startItem}</span>
            –<span className="font-semibold text-text">{endItem}</span> of{" "}
            <span className="font-semibold text-text">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "item" : "items"}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 min-h-11 sm:min-h-9 px-3 rounded-lg border border-border bg-bg text-xs font-semibold text-text hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              <span>Previous</span>
            </button>
            <span className="text-xs text-text-secondary tabular-nums px-1">
              Page <span className="font-semibold text-text">{page}</span> of{" "}
              <span className="font-semibold text-text">{totalPages}</span>
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 min-h-11 sm:min-h-9 px-3 rounded-lg border border-border bg-bg text-xs font-semibold text-text hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* Persistent Request Cart Bar */}
      {cart.length > 0 && (
        <div className="sticky bottom-2 z-20 rounded-xl border border-primary/25 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text">
                {cart.length} item{cart.length === 1 ? "" : "s"} in request cart
              </p>
              <p className="text-xs text-text-secondary flex flex-wrap gap-x-2">
                {cartCounts.assetCount > 0 && <span>Assets: {cartCounts.assetCount}</span>}
                {cartCounts.supplyCount > 0 && <span>Supplies: {cartCounts.supplyCount}</span>}
                {cartCounts.materialCount > 0 && (
                  <span>Materials: {cartCounts.materialCount}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-9 rounded-lg border border-border bg-bg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Clear
            </button>
            <button
              type="button"
              onClick={() => openWizard(cart)}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            >
              Review &amp; Send Request
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
