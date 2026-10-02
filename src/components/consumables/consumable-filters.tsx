"use client";

import { useMemo, useState } from "react";
import { Search, FilterX, ArrowUpDown, Layers, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsumableFilterState } from "@/types/inventory";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import {
  CONSUMABLE_CLASSIFICATIONS,
  CONSUMABLE_CLASSIFICATION_LABELS,
} from "@/lib/consumable-classification";
import { getCategoryStyle } from "@/constants/categories";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";

export interface ConsumableFiltersProps {
  filters: ConsumableFilterState;
  onFilterChange: (updated: Partial<ConsumableFilterState>) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  hideClassificationFilter?: boolean;
}

export function ConsumableFilters({
  filters,
  onFilterChange,
  onResetFilters,
  hideClassificationFilter,
}: ConsumableFiltersProps) {
  const [wantCategories, setWantCategories] = useState(false);
  const { data: allCategories = [] } = useCategoriesQuery({
    enabled:
      wantCategories ||
      filters.categoryClasses.length > 0 ||
      (Boolean(filters.category) && filters.category !== "all"),
  });

  const consumableClasses = useMemo(
    () => allCategories.filter((c) => c.type === "consumable_class"),
    [allCategories]
  );

  const categoryOptions = useMemo(() => {
    const names = allCategories
      .filter((c) => c.type === "consumable")
      .map((c) => ({
        id: c.name,
        label: c.parentName ? `${c.name} (${c.parentName})` : c.name,
      }));
    return [{ id: "all", label: "All Categories" }, ...names];
  }, [allCategories]);

  const isFiltered =
    Boolean(filters.searchQuery) ||
    (Boolean(filters.category) && filters.category !== "all") ||
    filters.categoryClasses.length > 0 ||
    (!hideClassificationFilter && filters.classification !== "all") ||
    filters.stockLevel !== "all";

  const toggleCategoryClass = (className: string) => {
    const exists = filters.categoryClasses.includes(className);
    const updated = exists
      ? filters.categoryClasses.filter((c) => c !== className)
      : [...filters.categoryClasses, className];
    onFilterChange({ categoryClasses: updated });
  };

  return (
    <div className="flex flex-col gap-3 p-4 md:px-6 bg-bg border-b border-border shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-60 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search by name, item code, category, or class…"
            className={cn(
              "w-full h-9 pl-9 pr-3 text-xs bg-bg-subtle border border-border rounded-lg text-text placeholder:text-text-secondary/60",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!hideClassificationFilter && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="consumable-classification-filter" className="sr-only">
                Filter by supply or material
              </label>
              <select
                id="consumable-classification-filter"
                value={filters.classification}
                onChange={(e) =>
                  onFilterChange({
                    classification: e.target
                      .value as ConsumableFilterState["classification"],
                  })
                }
                className="h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
              >
                <option value="all">All Types</option>
                {CONSUMABLE_CLASSIFICATIONS.map((id) => (
                  <option key={id} value={id}>
                    {CONSUMABLE_CLASSIFICATION_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <MultiSelectDropdown
            label="Class"
            icon={Layers}
            options={consumableClasses.map((c) => {
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
                    className={cn("h-2.5 w-2.5 rounded-full", categoryStyle.bg)}
                  />
                ),
              };
            })}
            selectedIds={filters.categoryClasses}
            onToggle={(id) => toggleCategoryClass(id)}
            onOpen={() => setWantCategories(true)}
            searchable
          />

          <div className="flex items-center gap-1.5">
            <label htmlFor="consumable-category-filter" className="sr-only">
              Filter by category
            </label>
            <select
              id="consumable-category-filter"
              value={filters.category}
              onChange={(e) => onFilterChange({ category: e.target.value })}
              onFocus={() => setWantCategories(true)}
              className="h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
            >
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="stock-level-filter" className="sr-only">
              Filter by stock level
            </label>
            <select
              id="stock-level-filter"
              value={filters.stockLevel}
              onChange={(e) =>
                onFilterChange({
                  stockLevel: e.target
                    .value as ConsumableFilterState["stockLevel"],
                })
              }
              className="h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
            >
              <option value="all">All Stock Levels</option>
              <option value="healthy">Healthy</option>
              <option value="low">Low</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-text-secondary" />
            <select
              id="consumable-sort"
              value={filters.sortBy}
              onChange={(e) =>
                onFilterChange({
                  sortBy: e.target.value as ConsumableFilterState["sortBy"],
                })
              }
              className="h-8 px-2.5 text-xs bg-bg-subtle border border-border rounded-lg text-text font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="qty">Qty (Low → High)</option>
              <option value="qty_desc">Qty (High → Low)</option>
              <option value="critical">Most Critical</option>
              <option value="name">Name (A–Z)</option>
              <option value="updated">Recently Restocked</option>
            </select>
          </div>

          {isFiltered && (
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

      {filters.categoryClasses.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
          <Tag className="h-3 w-3 shrink-0" />
          <span>
            Filtering by class
            {filters.categoryClasses.length === 1 ? "" : "es"}:
          </span>
          {filters.categoryClasses.map((name) => (
            <span
              key={name}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-bg-subtle border border-border font-medium text-text"
            >
              {name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
