"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  FilterX,
  ArrowUpDown,
  Tag,
  AlertCircle,
  ChevronDown,
  Check,
  Calendar,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MaintenanceLogFilterState,
  ConditionState,
} from "@/types/maintenance-logs";
import type { AssetCategory } from "@/types/shared";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import { getCategoryStyle } from "@/constants/categories";

export interface MaintenanceLogFiltersProps {
  filters: MaintenanceLogFilterState;
  onFilterChange: (updated: Partial<MaintenanceLogFilterState>) => void;
  onResetFilters: () => void;
  openCount: number;
}

const CONDITIONS: {
  id: ConditionState;
  label: string;
  dotBg: string;
}[] = [
  {
    id: "needs_maintenance",
    label: "Needs Maintenance",
    dotBg: "bg-status-repair-bg",
  },
  {
    id: "damaged",
    label: "Damaged",
    dotBg: "bg-status-outofservice-bg",
  },
  {
    id: "resolved",
    label: "Resolved",
    dotBg: "bg-status-retired-bg",
  },
  {
    id: "good",
    label: "Good",
    dotBg: "bg-status-active-bg",
  },
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
              <p className="p-2 text-xs text-text-secondary text-center">
                No options available
              </p>
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
                      <span
                        className={cn(
                          "truncate",
                          isSelected
                            ? "font-bold text-text"
                            : "text-text-secondary"
                        )}
                      >
                        {opt.label}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    )}
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

export function MaintenanceLogFilters({
  filters,
  onFilterChange,
  onResetFilters,
  openCount,
}: MaintenanceLogFiltersProps) {
  const [wantCategories, setWantCategories] = useState(false);
  const { data: allCategories } = useCategoriesQuery({
    enabled: wantCategories || filters.categories.length > 0,
  });
  const assetCategories =
    allCategories?.filter((c) => c.type === "asset") || [];

  const activeCount =
    (filters.searchQuery ? 1 : 0) +
    filters.categories.length +
    filters.conditions.length +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0) +
    (filters.openItemsOnly ? 1 : 0) +
    (filters.sortBy !== "open_first" ? 1 : 0);

  const toggleCategory = (catId: string) => {
    const cat = catId as AssetCategory;
    const exists = filters.categories.includes(cat);
    const updated = exists
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onFilterChange({ categories: updated });
  };

  const toggleCondition = (condId: string) => {
    const cond = condId as ConditionState;
    const exists = filters.conditions.includes(cond);
    const updated = exists
      ? filters.conditions.filter((c) => c !== cond)
      : [...filters.conditions, cond];
    onFilterChange({ conditions: updated });
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:px-6 bg-bg border-b border-border shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-70 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search by asset name, code, or MNT log ID…"
            className={cn(
              "w-full h-9 pl-9 pr-3 text-xs bg-bg-subtle border border-border rounded-lg text-text placeholder:text-text-secondary/60",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <MultiSelectDropdown
              label="Categories"
              icon={Tag}
              options={assetCategories.map((c) => {
                const categoryStyle = getCategoryStyle(
                  c.name,
                  c.name,
                  c.colorToken
                );
                return {
                  id: c.name,
                  label: c.name,
                  renderDot: () => (
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        categoryStyle.bg
                      )}
                    />
                  ),
                };
              })}
              selectedIds={filters.categories}
              onToggle={toggleCategory}
              onOpen={() => setWantCategories(true)}
            />

            <MultiSelectDropdown
              label="Condition"
              icon={AlertCircle}
              options={CONDITIONS.map((c) => ({
                id: c.id,
                label: c.label,
                renderDot: () => (
                  <span className={cn("h-2.5 w-2.5 rounded-full", c.dotBg)} />
                ),
              }))}
              selectedIds={filters.conditions}
              onToggle={toggleCondition}
            />

            <button
              type="button"
              onClick={() =>
                onFilterChange({ openItemsOnly: !filters.openItemsOnly })
              }
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
                filters.openItemsOnly
                  ? "border-accent/50 bg-accent/5 text-text"
                  : "border-border bg-bg-subtle text-text-secondary hover:bg-border/60 hover:text-text"
              )}
            >
              <Wrench className="h-3.5 w-3.5" />
              Open only
              {openCount > 0 && (
                <span
                  className={cn(
                    "tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    filters.openItemsOnly
                      ? "bg-accent/10 text-accent"
                      : "bg-border/60 text-text-secondary"
                  )}
                >
                  {openCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5 bg-bg-subtle border border-border rounded-lg px-2 py-1">
              <Calendar className="h-3.5 w-3.5 text-text-secondary shrink-0" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  onFilterChange({ startDate: e.target.value })
                }
                aria-label="Start date"
                className="h-7 bg-transparent text-xs text-text focus:outline-none max-w-28"
              />
              <span className="text-xs text-text-secondary/60">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => onFilterChange({ endDate: e.target.value })}
                aria-label="End date"
                className="h-7 bg-transparent text-xs text-text focus:outline-none max-w-28"
              />
            </div>
          </div>

          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-text-secondary" />
            <select
              id="mnt-sort"
              value={filters.sortBy}
              onChange={(e) =>
                onFilterChange({
                  sortBy: e.target.value as MaintenanceLogFilterState["sortBy"],
                })
              }
              className="h-8 px-2.5 text-xs bg-bg-subtle border border-border rounded-lg text-text font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="open_first">Open Items First</option>
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
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
