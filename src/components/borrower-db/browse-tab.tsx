"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, LayoutGrid, List, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowseItemCard, BrowseItemCardSkeleton } from "./browse-item-card";
import type { BrowseItem } from "./types";

import { useAssetsQuery } from "@/features/assets/client/use-assets";
import { useConsumablesQuery } from "@/features/consumables/client/use-consumables";
import { useBorrowerPortal } from "./context";
import { isAssetAvailableForRequest } from "@/lib/assets-custody";
import { availableQty } from "@/components/consumables/utils";

const CATEGORY_FILTERS = [
  { key: "all", label: "All" },
  { key: "transport", label: "Transport" },
  { key: "computing", label: "Computing" },
  { key: "av", label: "AV Equipment" },
  { key: "furniture", label: "Furniture" },
  { key: "paper", label: "Paper" },
  { key: "ink_toner", label: "Ink & Toner" },
  { key: "medical", label: "Medical" },
] as const;

type CategoryKey = (typeof CATEGORY_FILTERS)[number]["key"];

const BROWSE_PAGE_SIZE = 9;

export function BrowseTab() {
  const { cart, openWizard } = useBorrowerPortal();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const { data: assets = [], isLoading: assetsLoading } = useAssetsQuery();
  const { data: paginatedData, isLoading: consumablesLoading } = useConsumablesQuery();
  const consumables = useMemo(() => paginatedData?.data ?? [], [paginatedData?.data]);
  const loading = assetsLoading || consumablesLoading;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, category, availableOnly]);

  const items = useMemo(() => {
    return [
      ...assets
        .filter(a => a.assignmentType === "borrowable")
        .filter(a => isAssetAvailableForRequest(a))
        .map(a => ({
        id: a.id,
        name: a.name,
        category: a.category,
        type: "asset" as const,
        status: a.status,
        assetCode: a.assetCode,
        location: a.location,
      })),
      ...consumables.map(c => {
        const free = c.availableQty ?? availableQty(c);
        return {
        id: c.id,
        name: c.name,
        category: c.category,
        type: "consumable" as const,
        status: free <= 0 ? "out_of_stock" : free <= c.minThreshold ? "low_stock" : "available",
        itemCode: c.itemCode,
        currentQty: free,
        unit: c.unit,
        location: c.location,
      };
      })
    ] as BrowseItem[];
  }, [assets, consumables]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.type === "asset" ? item.assetCode : item.itemCode)
          ?.toLowerCase()
          .includes(search.toLowerCase());
      const matchesCategory = category === "all" || item.category === category;
      const matchesAvailable =
        !availableOnly ||
        (item.type === "asset"
          ? item.status === "active"
          : item.status !== "out_of_stock");
      return matchesSearch && matchesCategory && matchesAvailable;
    });
  }, [items, search, category, availableOnly]);

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

      {/* Category filter chips */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by category"
      >
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setCategory(f.key)}
            aria-pressed={category === f.key}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer",
              category === f.key
                ? "bg-accent/15 text-accent border-accent/40 font-bold shadow-2xs"
                : "bg-white border-border text-text-secondary hover:border-accent/40 hover:text-text hover:bg-bg-subtle"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results count & Pagination status */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <p>
            Showing{" "}
            <span className="font-semibold text-text">
              {filtered.length > 0 ? (page - 1) * BROWSE_PAGE_SIZE + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-text">
              {Math.min(page * BROWSE_PAGE_SIZE, filtered.length)}
            </span>{" "}
            of <span className="font-semibold text-text">{filtered.length}</span> items
          </p>
        </div>
      )}

      {/* Grid/List */}
      {loading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <BrowseItemCardSkeleton key={i} viewMode="grid" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <BrowseItemCardSkeleton key={i} viewMode="list" />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border bg-card">
          <div className="h-12 w-12 rounded-full bg-bg-subtle flex items-center justify-center mb-4">
            <Search className="h-5 w-5 text-text-secondary" aria-hidden />
          </div>
          <h3 className="text-sm font-semibold text-text">No items found</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-xs">
            Try adjusting your search terms or filters to find what you&apos;re
            looking for.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("all");
              setAvailableOnly(false);
            }}
            className="mt-4 text-xs text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedItems.map((item) => (
            <BrowseItemCard
              key={item.id}
              item={item}
              viewMode="grid"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {paginatedItems.map((item) => (
            <BrowseItemCard
              key={item.id}
              item={item}
              viewMode="list"
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-text-secondary">
            Page <span className="font-semibold text-text">{page}</span> of{" "}
            <span className="font-semibold text-text">{totalPages}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border shadow-2xl rounded-full px-4 py-3 flex items-center gap-4 z-40">
          <div className="text-sm font-semibold text-text">
            {cart.length} item{cart.length !== 1 ? "s" : ""} selected
          </div>
          <button
            type="button"
            onClick={() => openWizard(cart)}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-full text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
          >
            Checkout Request
          </button>
        </div>
      )}
    </div>
  );
}
