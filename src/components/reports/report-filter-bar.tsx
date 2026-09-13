import { useEffect, useState } from "react";
import { Search, X, RotateCcw } from "lucide-react";
import type { BaseReportFilters } from "@/types/reports";
import { cn } from "@/lib/utils";

interface FilterOption {
  label: string;
  value: string;
}

interface ReportFilterBarProps {
  filters: BaseReportFilters;
  onFilterChange: (updated: Partial<BaseReportFilters>) => void;
  onReset: () => void;
  categories?: FilterOption[];
  statuses?: FilterOption[];
  showDatePresets?: boolean;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
}

const DATE_PRESETS = [
  { label: "All Time", value: "all" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "YTD", value: "ytd" },
];

export function ReportFilterBar({
  filters,
  onFilterChange,
  onReset,
  categories,
  statuses,
  showDatePresets = true,
  searchPlaceholder = "Search records…",
  actions,
}: ReportFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || "");

  useEffect(() => {
    setLocalSearch(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (filters.search || "")) {
        onFilterChange({ search: localSearch, page: 1 });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search, onFilterChange]);

  const handleDatePreset = (preset: string) => {
    const now = new Date();
    let startDate: string | undefined = undefined;
    const endDate = now.toISOString().split("T")[0];

    if (preset === "7d") {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = d.toISOString().split("T")[0];
    } else if (preset === "30d") {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = d.toISOString().split("T")[0];
    } else if (preset === "90d") {
      const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startDate = d.toISOString().split("T")[0];
    } else if (preset === "ytd") {
      startDate = `${now.getFullYear()}-01-01`;
    }

    onFilterChange({ startDate, endDate: startDate ? endDate : undefined, page: 1 });
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.category ||
      filters.status ||
      filters.startDate ||
      filters.endDate
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-xl border border-border bg-bg-subtle pl-9 pr-8 text-xs text-text placeholder:text-text-secondary focus:border-accent focus:bg-card focus:outline-hidden transition-colors"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch("");
                onFilterChange({ search: "", page: 1 });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text-secondary hover:bg-bg-subtle hover:text-text transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
          {actions}
        </div>
      </div>

      {/* Dropdown Filters & Period Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
        {/* Category selector */}
        {categories && categories.length > 0 && (
          <select
            value={filters.category || ""}
            onChange={(e) => onFilterChange({ category: e.target.value || undefined, page: 1 })}
            aria-label="Filter by category"
            className="h-8.5 rounded-xl border border-border bg-bg-subtle px-3 text-xs font-medium text-text focus:border-accent focus:bg-card focus:outline-hidden cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}

        {/* Status selector */}
        {statuses && statuses.length > 0 && (
          <select
            value={filters.status || ""}
            onChange={(e) => onFilterChange({ status: e.target.value || undefined, page: 1 })}
            aria-label="Filter by status"
            className="h-8.5 rounded-xl border border-border bg-bg-subtle px-3 text-xs font-medium text-text focus:border-accent focus:bg-card focus:outline-hidden cursor-pointer"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        {/* Date presets */}
        {showDatePresets && (
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mr-1">
              Timeframe:
            </span>
            {DATE_PRESETS.map((p) => {
              const isActive =
                (p.value === "all" && !filters.startDate) ||
                (p.value === "30d" && filters.startDate?.includes("-"));

              return (
                <button
                  key={p.value}
                  onClick={() => handleDatePreset(p.value)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-bg-subtle text-text-secondary hover:text-text hover:bg-border/60"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
