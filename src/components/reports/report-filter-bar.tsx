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
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "Fiscal Qtr", value: "fiscal_quarter" },
];

function getPresetDates(preset: string): { start: string | undefined; end: string | undefined } {
  const now = new Date();
  
  if (preset === "all") return { start: undefined, end: undefined };
  
  if (preset === "today") {
    const today = now.toISOString().split("T")[0];
    return { start: today, end: today };
  }
  
  if (preset === "this_week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const start = monday.toISOString().split("T")[0];
    
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { start, end: sunday.toISOString().split("T")[0] };
  }
  
  if (preset === "this_month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: firstDay.toISOString().split("T")[0], end: lastDay.toISOString().split("T")[0] };
  }
  
  if (preset === "fiscal_quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    const firstDate = new Date(now.getFullYear(), quarter * 3, 1);
    const lastDate = new Date(now.getFullYear(), firstDate.getMonth() + 3, 0);
    return { start: firstDate.toISOString().split("T")[0], end: lastDate.toISOString().split("T")[0] };
  }
  
  return { start: undefined, end: undefined };
}

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
    const { start, end } = getPresetDates(preset);
    onFilterChange({ startDate: start, endDate: end, page: 1 });
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
        <div className="relative min-w-55 flex-1 max-w-md">
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
              const { start, end } = getPresetDates(p.value);
              const isActive =
                (p.value === "all" && !filters.startDate) ||
                (filters.startDate === start && filters.endDate === end);

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
