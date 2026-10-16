"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, LayoutGrid, List, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowseItemCard, BrowseItemCardSkeleton } from "./browse-item-card";
import type { BrowseConsumableItem, BrowseItem } from "./types";

import { useAssetsQuery } from "@/features/assets/client/use-assets";
import { useConsumableCatalogQuery } from "@/features/consumables/client/use-consumables";
import { useBorrowerPortal } from "./context";
import { isAssetAvailableForRequest } from "@/lib/assets-custody";
import { availableQty } from "@/components/consumables/utils";

type KindFilter = "all" | "asset" | "supply" | "material";

const KIND_FILTERS: Array<{ key: KindFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "asset", label: "Assets" },
  { key: "supply", label: "Supplies" },
  { key: "material", label: "Materials" },
];

const BROWSE_PAGE_SIZE = 9;

export function BrowseTab() {
  const { cart, openWizard } = useBorrowerPortal();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const { data: assets = [], isLoading: assetsLoading } = useAssetsQuery(
    undefined,
    { catalog: true }
  );
  const { data: paginatedData, isLoading: consumablesLoading } =
    useConsumableCatalogQuery({ catalog: true });
  const consumables = useMemo(() => paginatedData?.data ?? [], [paginatedData?.data]);
  const loading = assetsLoading || consumablesLoading;

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
        .filter((a) => a.assignmentType === "borrowable")
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

  const categoryOptions = useMemo(() => {
    const scoped = items.filter((item) => {
      if (kind === "all") return true;
      if (kind === "asset") return item.type === "asset";
      if (item.type !== "consumable") return false;
      return item.classification === kind;
    });
    const set = new Set<string>();
    for (const item of scoped) {
      if (item.category?.trim()) set.add(item.category.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items, kind]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.type === "asset" ? item.assetCode : item.itemCode)
          ?.toLowerCase()
          .includes(search.toLowerCase());
      const matchesKind =
        kind === "all" ||
        (kind === "asset" && item.type === "asset") ||
        (item.type === "consumable" && item.classification === kind);
      const matchesCategory =
        category === "all" ||
        item.category.trim().toLowerCase() === category.toLowerCase();
      const matchesAvailable =
        !availableOnly ||
        (item.type === "asset"
          ? item.status === "active"
          : item.status !== "out_of_stock");
      return matchesSearch && matchesKind && matchesCategory && matchesAvailable;
    });
  }, [items, search, kind, category, availableOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / BROWSE_PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * BROWSE_PAGE_SIZE;
    return filtered.slice(start, start + BROWSE_PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-text placeholder:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Search browse items"
          />
        </div>

        {/* Available toggle */}
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
          <div
            role="checkbox"
            aria-checked={availableOnly}
            tabIndex={0}
            onClick={() => setAvailableOnly((p) => !p)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setAvailableOnly((p) => !p);
              }
            }}
            className={cn(
              "w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent relative cursor-pointer",
              availableOnly ? "bg-accent" : "bg-border"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                availableOnly ? "translate-x-4" : "translate-x-0"
              )}
            />
          </div>
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Available only
        </label>

        {/* View mode toggle */}
        <div className="flex items-center rounded-lg border border-border bg-card overflow-hidden self-start">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            className={cn(
              "p-2 transition-colors",
              viewMode === "grid"
                ? "bg-accent text-accent-foreground"
                : "text-text-secondary hover:text-text hover:bg-bg-subtle"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            className={cn(
              "p-2 transition-colors",
              viewMode === "list"
                ? "bg-accent text-accent-foreground"
                : "text-text-secondary hover:text-text hover:bg-bg-subtle"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Kind filter chips */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by item type"
      >
        {KIND_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setKind(f.key)}
            aria-pressed={kind === f.key}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer",
              kind === f.key
                ? "bg-accent/15 text-accent border-accent/40 font-bold shadow-2xs"
                : "bg-white border-border text-text-secondary hover:border-accent/40 hover:text-text hover:bg-bg-subtle"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Category filter chips — built from live catalog categories */}
      {categoryOptions.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by category"
        >
          <button
            type="button"
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer",
              category === "all"
                ? "bg-accent/15 text-accent border-accent/40 font-bold shadow-2xs"
                : "bg-white border-border text-text-secondary hover:border-accent/40 hover:text-text hover:bg-bg-subtle"
            )}
          >
            All categories
          </button>
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category.toLowerCase() === cat.toLowerCase()}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer",
                category.toLowerCase() === cat.toLowerCase()
                  ? "bg-accent/15 text-accent border-accent/40 font-bold shadow-2xs"
                  : "bg-white border-border text-text-secondary hover:border-accent/40 hover:text-text hover:bg-bg-subtle"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Results count & Pagination status */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <p>
            Showing{" "}
            <span className="font-semibold text-text">
              {filtered.length > 0 ? (page - 1) * BROWSE_PAGE_SIZE + 1 : 0}
            </span>{" "}
            –{" "}
            <span className="font-semibold text-text">
              {Math.min(page * BROWSE_PAGE_SIZE, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-text">{filtered.length}</span>
            {cart.length > 0 && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => openWizard()}
                  className="font-semibold text-accent hover:underline"
                >
                  {cart.length} in request cart
                </button>
              </>
            )}
          </p>
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
            Try clearing filters or search — supplies and materials from warehouse
            inventory appear here alongside borrowable assets.
          </p>
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

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:text-text disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-text-secondary tabular-nums">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:text-text disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
