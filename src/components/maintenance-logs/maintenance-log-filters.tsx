"use client";

import { Search, FilterX, Calendar, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceLogFilterState, ConditionState } from "@/types/maintenance-logs";
import type { AssetCategory } from "@/types/shared";

export interface MaintenanceLogFiltersProps {
  filters: MaintenanceLogFilterState;
  onFilterChange: (updated: Partial<MaintenanceLogFilterState>) => void;
  onResetFilters: () => void;
  openCount: number;
}

const CATEGORIES: { id: AssetCategory; label: string }[] = [
  { id: "computing", label: "Computing" },
  { id: "av", label: "AV Equipment" },
  { id: "transport", label: "Transport" },
  { id: "furniture", label: "Furniture" },
];

const CONDITIONS: { id: ConditionState; label: string }[] = [
  { id: "needs_maintenance", label: "Needs Maintenance" },
  { id: "damaged", label: "Damaged" },
  { id: "resolved", label: "Resolved" },
  { id: "good", label: "Good" },
];

export function MaintenanceLogFilters({
  filters,
  onFilterChange,
  onResetFilters,
  openCount,
}: MaintenanceLogFiltersProps) {
  const isFiltered =
    Boolean(filters.searchQuery) ||
    filters.categories.length > 0 ||
    filters.conditions.length > 0 ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    filters.openItemsOnly;

  const toggleCategory = (cat: AssetCategory) => {
    const exists = filters.categories.includes(cat);
    const updated = exists
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onFilterChange({ categories: updated });
  };

  const toggleCondition = (cond: ConditionState) => {
    const exists = filters.conditions.includes(cond);
    const updated = exists
      ? filters.conditions.filter((c) => c !== cond)
      : [...filters.conditions, cond];
    onFilterChange({ conditions: updated });
  };

  return (
    <div className="flex flex-col gap-3.5 p-4 md:px-6 bg-bg border-b border-border shrink-0">
      {/* Row 1: Search, Open Only Chip, & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-60 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search by asset name, code, or MNT log ID…"
            className={cn(
              "w-full h-9 pl-9 pr-8 text-xs bg-bg-subtle border border-border rounded-lg text-text placeholder:text-text-secondary/60",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
            )}
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ searchQuery: "" })}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-text-secondary hover:text-text cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick "Open items only" toggle chip */}
          <button
            type="button"
            onClick={() => onFilterChange({ openItemsOnly: !filters.openItemsOnly })}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer",
              filters.openItemsOnly
                ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg shadow-2xs ring-1 ring-status-repair-bg/30"
                : "bg-bg-subtle text-text-secondary border-border hover:bg-border/60"
            )}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Open Attention Needed</span>
            {openCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-status-repair-bg text-status-repair-text">
                {openCount}
              </span>
            )}
          </button>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5 bg-bg-subtle border border-border rounded-lg px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-text-secondary shrink-0" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              aria-label="Start date"
              className="h-7 bg-transparent text-xs text-text focus:outline-none"
            />
            <span className="text-xs text-text-secondary/60">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              aria-label="End date"
              className="h-7 bg-transparent text-xs text-text focus:outline-none"
            />
          </div>

          {/* Sort Select */}
          <select
            value={filters.sortBy}
            onChange={(e) =>
              onFilterChange({ sortBy: e.target.value as MaintenanceLogFilterState["sortBy"] })
            }
            className="h-9 px-2.5 text-xs bg-bg-subtle border border-border rounded-lg text-text font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="date_desc">Newest First</option>
            <option value="open_first">Open Items First</option>
            <option value="date_asc">Oldest First</option>
          </select>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 h-9 px-3 text-xs font-semibold text-accent hover:bg-bg-subtle rounded-lg border border-border transition-colors cursor-pointer"
            >
              <FilterX className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Multi-select Filter Pills */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        {/* Categories */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-text-secondary mr-1">Category:</span>
          {CATEGORIES.map((cat) => {
            const isSelected = filters.categories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                    : "bg-bg-subtle text-text-secondary border-border hover:bg-border/60"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Conditions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-text-secondary mr-1">Condition:</span>
          {CONDITIONS.map((cond) => {
            const isSelected = filters.conditions.includes(cond.id);
            return (
              <button
                key={cond.id}
                type="button"
                onClick={() => toggleCondition(cond.id)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer border",
                  isSelected
                    ? "bg-accent text-accent-foreground border-accent font-bold shadow-2xs"
                    : "bg-bg-subtle text-text-secondary border-border hover:bg-border/60"
                )}
              >
                {cond.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
