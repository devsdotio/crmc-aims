"use client";

import { useState, useRef, useEffect } from "react";
import { Search, FilterX, ArrowUpDown, Tag, AlertCircle, ChevronDown, Check, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetFilterState, AssetStatus } from "@/types/assets";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import { getCategoryStyle } from "@/constants/categories";
import { ASSIGNMENT_TYPE_FILTER_OPTIONS } from "@/lib/asset-assignment-type";

export interface AssetFiltersProps {
  filters: AssetFilterState;
  onFilterChange: (updated: Partial<AssetFilterState>) => void;
  onResetFilters: () => void;
  totalAssetsCount: number;
  filteredAssetsCount: number;
  assignmentTypeCounts?: Record<AssetFilterState["assignmentType"], number>;
}

const STATUSES: { id: AssetStatus; label: string; bg: string; text: string; dotBg: string }[] = [
  { id: "active",         label: "Active",         bg: "bg-status-active-bg/20",     text: "text-status-active-text",       dotBg: "bg-status-active-bg" },
  { id: "needs_repair",   label: "Needs Repair",   bg: "bg-status-repair-bg/20",     text: "text-status-repair-text",       dotBg: "bg-status-repair-bg" },
  { id: "out_of_service", label: "Out of Service", bg: "bg-status-outofservice-bg/20", text: "text-status-outofservice-text", dotBg: "bg-status-outofservice-bg" },
  { id: "retired",        label: "Retired",        bg: "bg-status-retired-bg/20",    text: "text-status-retired-text",      dotBg: "bg-status-retired-bg" },
  { id: "missing",        label: "Missing",        bg: "bg-status-outofservice-bg/20", text: "text-status-outofservice-text", dotBg: "bg-status-outofservice-bg" },
];

function MultiSelectDropdown({
  label,
  icon: Icon,
  options,
  selectedIds,
  onToggle,
  onOpen,
}: {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  options: { id: string; label: string; renderDot?: () => React.ReactNode }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onOpen?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next) onOpen?.();
            return next;
          });
        }}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
          selectedIds.length > 0
            ? "border-accent/50 bg-accent/5 text-text"
            : "border-border bg-bg-subtle text-text-secondary hover:bg-border/60 hover:text-text"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
        {selectedIds.length > 0 && (
          <span className="inline-flex items-center justify-center bg-accent text-accent-foreground text-[10px] h-4 w-4 rounded-full ml-1">
            {selectedIds.length}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-56 bg-bg border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {options.length === 0 ? (
              <p className="p-2 text-xs text-text-secondary text-center">No options available</p>
            ) : (
              options.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onToggle(opt.id)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-bg-subtle transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {opt.renderDot && opt.renderDot()}
                      <span className={cn("truncate", isSelected ? "font-bold text-text" : "text-text-secondary")}>
                        {opt.label}
                      </span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AssetFilters({
  filters,
  onFilterChange,
  onResetFilters,
  assignmentTypeCounts,
}: AssetFiltersProps) {
  // Only needed for labels / category multi-select — defer until first dropdown open
  // so list /api/assets is not competing with another DB round-trip on paint.
  const [wantCategories, setWantCategories] = useState(false);
  const { data: allCategories } = useCategoriesQuery({
    enabled: wantCategories || filters.categories.length > 0,
  });
  const assetCategories = allCategories?.filter((c) => c.type === "asset") || [];
  const activeCount =
    (filters.searchQuery ? 1 : 0) +
    filters.categories.length +
    filters.statuses.length +
    (filters.availability === "available" ? 1 : 0) +
    (filters.assignmentType !== "all" ? 1 : 0);

  const toggleCategory = (catId: string) => {
    const exists = filters.categories.includes(catId);
    const updated = exists
      ? filters.categories.filter((c) => c !== catId)
      : [...filters.categories, catId];
    onFilterChange({ categories: updated });
  };

  const toggleStatus = (statusId: AssetStatus) => {
    const exists = filters.statuses.includes(statusId);
    const updated = exists
      ? filters.statuses.filter((s) => s !== statusId)
      : [...filters.statuses, statusId];
    onFilterChange({ statuses: updated });
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:px-6 bg-bg border-b border-border shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-70 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search by asset name, code, or serial number…"
            className={cn(
              "w-full h-9 pl-9 pr-3 text-xs bg-bg-subtle border border-border rounded-lg text-text placeholder:text-text-secondary/60",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
            )}
          />
        </div>

        {/* Right-side Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown Filters */}
          <div className="flex items-center gap-2">
            <MultiSelectDropdown
              label="Categories"
              icon={Tag}
              options={assetCategories.map((c) => {
                const categoryStyle = getCategoryStyle(c.name, c.name, c.colorToken);
                return {
                  id: c.name,
                  label: c.name,
                  renderDot: () => (
                    <span className={cn("h-2.5 w-2.5 rounded-full", categoryStyle.bg)} />
                  ),
                };
              })}
              selectedIds={filters.categories}
              onToggle={(id) => toggleCategory(id)}
              onOpen={() => setWantCategories(true)}
            />

            <MultiSelectDropdown
              label="Status"
              icon={AlertCircle}
              options={STATUSES.map((s) => ({
                id: s.id,
                label: s.label,
                renderDot: () => (
                  <span className={cn("h-2.5 w-2.5 rounded-full", s.dotBg)} />
                ),
              }))}
              selectedIds={filters.statuses}
              onToggle={(id) => toggleStatus(id as AssetStatus)}
            />

            <button
              type="button"
              onClick={() =>
                onFilterChange({
                  availability:
                    filters.availability === "available" ? "all" : "available",
                })
              }
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
                filters.availability === "available"
                  ? "border-accent/50 bg-accent/5 text-text"
                  : "border-border bg-bg-subtle text-text-secondary hover:bg-border/60 hover:text-text"
              )}
            >
              <PackageCheck className="h-3.5 w-3.5" />
              Available only
            </button>

            <div className="inline-flex items-center rounded-lg border border-border bg-bg-subtle p-0.5">
              {ASSIGNMENT_TYPE_FILTER_OPTIONS.map((opt) => {
                const isActive = filters.assignmentType === opt.id;
                const count = assignmentTypeCounts?.[opt.id];
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onFilterChange({ assignmentType: opt.id })}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-bg text-text shadow-xs"
                        : "text-text-secondary hover:text-text"
                    )}
                  >
                    {opt.label}
                    {count !== undefined && (
                      <span
                        className={cn(
                          "tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          isActive
                            ? "bg-accent/10 text-accent"
                            : "bg-border/60 text-text-secondary"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

          {/* Sort */}
          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-text-secondary" />
            <select
              id="asset-sort"
              value={filters.sortBy}
              onChange={(e) =>
                onFilterChange({ sortBy: e.target.value as AssetFilterState["sortBy"] })
              }
              className="h-8 px-2.5 text-xs bg-bg-subtle border border-border rounded-lg text-text font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="name">Name (A-Z)</option>
              <option value="code">Asset Code</option>
              <option value="date">Recently Updated</option>
            </select>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-status-outofservice-text bg-status-outofservice-bg/10 hover:bg-status-outofservice-bg/20 transition-colors cursor-pointer"
              title="Clear all filters"
            >
              <FilterX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
