"use client";

import { useMemo } from "react";
import { Search, FilterX, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BorrowRequestFilterState } from "@/types/borrow-requests";
import { useDepartmentsQuery } from "@/features/departments/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

const ALL_DEPARTMENTS = "All Departments";

export interface RequestSearchAndDeptProps {
  filters: BorrowRequestFilterState;
  onFilterChange: (updated: Partial<BorrowRequestFilterState>) => void;
}

export function RequestSearchAndDept({
  filters,
  onFilterChange,
}: RequestSearchAndDeptProps) {
  const { data: departments = [], isLoading, isError } = useDepartmentsQuery();

  const departmentOptions = useMemo(() => {
    const options = departments
      .map((d) => ({
        value: d.name.trim(),
        label: d.name.trim(),
        keywords: `${d.code ?? ""} ${d.name}`,
      }))
      .filter((o) => Boolean(o.value))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Keep a selected legacy/custom name visible even if it left the catalog.
    if (
      filters.department &&
      filters.department !== ALL_DEPARTMENTS &&
      !options.some((o) => o.value === filters.department)
    ) {
      return [
        {
          value: filters.department,
          label: filters.department,
          keywords: filters.department,
        },
        ...options,
      ];
    }
    return options;
  }, [departments, filters.department]);

  const selectedDepartment =
    filters.department && filters.department !== ALL_DEPARTMENTS
      ? filters.department
      : "";

  return (
    <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-72 justify-end">
      {/* Search Input */}
      <div className="relative flex-1 min-w-44 max-w-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
          <Search className="h-3.5 w-3.5" />
        </span>
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
          placeholder="Search requester, item, or REQ…"
          className={cn(
            "w-full h-9 pl-8.5 pr-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60",
            "focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
          )}
        />
      </div>

      {/* Department Filter with visible label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <label htmlFor="department-filter" className="text-xs font-semibold text-text-secondary shrink-0">
          Dept:
        </label>
        <SearchableSelect
          id="department-filter"
          value={selectedDepartment}
          onValueChange={(value) =>
            onFilterChange({ department: value || ALL_DEPARTMENTS })
          }
          options={departmentOptions}
          placeholder={
            isLoading
              ? "Loading departments…"
              : isError
                ? "Could not load departments"
                : "Search department…"
          }
          clearLabel={ALL_DEPARTMENTS}
          emptyMessage="No departments match your search"
          disabled={isLoading}
          className="w-48 sm:w-56"
          inputClassName="h-9 px-2.5 text-xs font-semibold rounded-lg border-border"
        />
      </div>
    </div>
  );
}

export interface RequestDateFilterProps {
  filters: BorrowRequestFilterState;
  onFilterChange: (updated: Partial<BorrowRequestFilterState>) => void;
  onResetFilters: () => void;
}

export function RequestDateFilter({
  filters,
  onFilterChange,
  onResetFilters,
}: RequestDateFilterProps) {
  const isFiltered =
    Boolean(filters.searchQuery) ||
    (Boolean(filters.department) && filters.department !== "All Departments") ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  return (
    <div className="flex items-center gap-2.5 shrink-0 justify-end">
      {/* Date range inputs with visible label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-semibold text-text-secondary shrink-0">
          Date:
        </span>
        <div className="flex items-center gap-1.5 bg-bg border border-border rounded-lg px-2 py-1">
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
      </div>

      {/* Reset Filters */}
      {isFiltered && (
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1 h-9 px-3 text-xs font-semibold text-accent hover:bg-bg-subtle rounded-lg border border-border transition-colors cursor-pointer shrink-0"
        >
          <FilterX className="h-3.5 w-3.5" />
          Reset
        </button>
      )}
    </div>
  );
}

export interface RequestFiltersProps {
  filters: BorrowRequestFilterState;
  onFilterChange: (updated: Partial<BorrowRequestFilterState>) => void;
  onResetFilters: () => void;
}

export function RequestFilters({
  filters,
  onFilterChange,
  onResetFilters,
}: RequestFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
      <RequestSearchAndDept
        filters={filters}
        onFilterChange={onFilterChange}
      />
      <RequestDateFilter
        filters={filters}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
      />
    </div>
  );
}
