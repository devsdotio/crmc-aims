"use client";

import React from "react";
import {
  Search,
  X,
  Calendar,
  Download,
  RotateCcw,
  ListFilter,
  Columns,
  GitCommitVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuditLogFilterValues {
  search: string;
  action: string;
  categoryOrDept: string;
  startDate: string;
  endDate: string;
  viewMode: "timeline" | "table";
}

interface AuditLogFiltersProps {
  filters: AuditLogFilterValues;
  onFilterChange: (updated: Partial<AuditLogFilterValues>) => void;
  onReset: () => void;
  onExport: () => void;
  actionOptions?: { value: string; label: string }[];
  actionLabel?: string;
  categoryOptions?: { value: string; label: string }[];
  categoryLabel?: string;
  totalCount: number;
  filteredCount: number;
}

export function AuditLogFilters({
  filters,
  onFilterChange,
  onReset,
  onExport,
  actionOptions = [],
  actionLabel = "Action",
  categoryOptions = [],
  categoryLabel = "Department",
  totalCount,
  filteredCount,
}: AuditLogFiltersProps) {
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.action ||
      filters.categoryOrDept ||
      filters.startDate ||
      filters.endDate
  );

  return (
    <div className="bg-bg border-b border-border p-4 space-y-3 shrink-0">
      {/* Top row: Search, secondary filter, view switcher, and export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-60 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search code, actor, notes, department..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-9 pr-8 py-2 bg-bg-subtle text-xs text-text rounded-lg border border-border focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: "" })}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text cursor-pointer p-0.5 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right Controls: View Switcher, Export, and Results Counter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-bg-subtle border border-border rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: "timeline" })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer",
                filters.viewMode === "timeline"
                  ? "bg-bg text-text shadow-xs"
                  : "text-text-secondary hover:text-text"
              )}
              title="Visual Timeline View"
            >
              <GitCommitVertical className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: "table" })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer",
                filters.viewMode === "table"
                  ? "bg-bg text-text shadow-xs"
                  : "text-text-secondary hover:text-text"
              )}
              title="Data Ledger View"
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={onExport}
            disabled={filteredCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            title="Export filtered records to CSV"
          >
            <Download className="h-3.5 w-3.5 text-text-secondary" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Bottom Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action / Status Filter */}
          {actionOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-text-secondary font-medium">{actionLabel || "Action"}:</span>
              <select
                value={filters.action}
                onChange={(e) => onFilterChange({ action: e.target.value })}
                className="bg-bg-subtle text-text border border-border rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-hidden focus:border-accent cursor-pointer"
              >
                <option value="">All {actionLabel || "Actions"}</option>
                {actionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Secondary Category / Dept / Entity Filter */}
          {categoryOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-text-secondary font-medium">{categoryLabel}:</span>
              <select
                value={filters.categoryOrDept}
                onChange={(e) => onFilterChange({ categoryOrDept: e.target.value })}
                className="bg-bg-subtle text-text border border-border rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-hidden focus:border-accent cursor-pointer"
              >
                <option value="">All {categoryLabel}s</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div className="flex items-center gap-1.5 bg-bg-subtle border border-border rounded-md px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-text-secondary shrink-0" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="bg-transparent text-xs text-text border-none focus:outline-hidden cursor-pointer"
              title="Start Date"
            />
            <span className="text-text-secondary">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              className="bg-transparent text-xs text-text border-none focus:outline-hidden cursor-pointer"
              title="End Date"
            />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-text-secondary hover:text-accent hover:bg-bg-subtle transition-colors cursor-pointer font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Count summary indicator */}
        <div className="text-text-secondary text-xs">
          Showing <strong className="text-text font-bold">{filteredCount}</strong> of{" "}
          <strong className="text-text font-bold">{totalCount}</strong> events
        </div>
      </div>
    </div>
  );
}
