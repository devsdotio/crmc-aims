"use client";

import { useState, useEffect } from "react";
import { Calendar, CalendarRange, ChevronDown, X } from "lucide-react";
import type { BaseReportFilters } from "@/types/reports";
import { cn } from "@/lib/utils";

export const DATE_PRESETS = [
  { label: "All Time", value: "all" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Week", value: "this_week" },
];

function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(iso: string | undefined): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const m = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
  return `${parts[2]} ${m}`;
}

export function getPresetDates(preset: string): { start: string | undefined; end: string | undefined } {
  const now = new Date();

  if (preset === "all") return { start: undefined, end: undefined };

  if (preset === "this_week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { start: formatDateString(monday), end: formatDateString(sunday) };
  }

  if (preset === "this_month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: formatDateString(firstDay), end: formatDateString(lastDay) };
  }

  if (preset === "last_month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: formatDateString(firstDay), end: formatDateString(lastDay) };
  }

  return { start: undefined, end: undefined };
}

interface ReportTimeframeFilterProps {
  filters: BaseReportFilters;
  onFilterChange: (updated: Partial<BaseReportFilters>) => void;
  className?: string;
}

export function ReportTimeframeFilter({
  filters,
  onFilterChange,
  className,
}: ReportTimeframeFilterProps) {
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [customStart, setCustomStart] = useState(filters.startDate || "");
  const [customEnd, setCustomEnd] = useState(filters.endDate || "");

  // Synchronize internal custom range state when filters change externally
  useEffect(() => {
    setCustomStart(filters.startDate || "");
    setCustomEnd(filters.endDate || "");
  }, [filters.startDate, filters.endDate]);

  const activePreset = DATE_PRESETS.find((p) => {
    const { start, end } = getPresetDates(p.value);
    if (p.value === "all") {
      return !filters.startDate && !filters.endDate;
    }
    return filters.startDate === start && filters.endDate === end;
  });

  const isFullMonth = Boolean(
    filters.startDate &&
    filters.endDate &&
    filters.startDate.slice(0, 7) === filters.endDate.slice(0, 7) &&
    filters.startDate.endsWith("-01")
  );

  const monthValue = isFullMonth && filters.startDate ? filters.startDate.slice(0, 7) : "";
  const isCustomActive = !activePreset && !isFullMonth && Boolean(filters.startDate || filters.endDate);

  let customRangeLabel = "Custom Range";
  if (isCustomActive) {
    if (filters.startDate && filters.endDate) {
      customRangeLabel = `${formatShortDate(filters.startDate)} – ${formatShortDate(filters.endDate)}`;
    } else if (filters.startDate) {
      customRangeLabel = `From ${formatShortDate(filters.startDate)}`;
    } else if (filters.endDate) {
      customRangeLabel = `Until ${formatShortDate(filters.endDate)}`;
    }
  }

  const handleSelectPreset = (presetValue: string) => {
    setIsCustomRangeOpen(false);
    const dates = getPresetDates(presetValue);
    onFilterChange({ startDate: dates.start, endDate: dates.end, page: 1 });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCustomRangeOpen(false);
    if (!e.target.value) {
      onFilterChange({ startDate: undefined, endDate: undefined, page: 1 });
      return;
    }
    const [year, month] = e.target.value.split("-").map(Number);
    const firstDay = formatDateString(new Date(year, month - 1, 1));
    const lastDay = formatDateString(new Date(year, month, 0));
    onFilterChange({ startDate: firstDay, endDate: lastDay, page: 1 });
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCustomRangeOpen(false);
    onFilterChange({
      startDate: customStart || undefined,
      endDate: customEnd || undefined,
      page: 1,
    });
  };

  const handleClearCustomRange = () => {
    setCustomStart("");
    setCustomEnd("");
    setIsCustomRangeOpen(false);
    onFilterChange({ startDate: undefined, endDate: undefined, page: 1 });
  };

  return (
    <div className={cn("relative inline-flex items-center gap-1.5", className)}>
      {/* ── Desktop / Tablet view ─────────────────────────────────── */}
      <div className="hidden sm:flex items-center gap-1 h-9 rounded-xl border border-border bg-card px-2 shadow-2xs">
        <Calendar className="h-3.5 w-3.5 text-accent shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mr-1 hidden xl:inline">
          Timeframe:
        </span>

        {/* Quick Presets */}
        <div className="flex items-center gap-1">
          {DATE_PRESETS.map((p) => {
            const { start, end } = getPresetDates(p.value);
            const isActive =
              (p.value === "all" && !filters.startDate && !filters.endDate) ||
              (filters.startDate === start && filters.endDate === end);

            return (
              <button
                key={p.value}
                type="button"
                onClick={() => handleSelectPreset(p.value)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-text-secondary hover:text-text hover:bg-bg-subtle"
                )}
              >
                {p.label}
              </button>
            );
          })}

          {/* Custom Date Range Trigger */}
          <button
            type="button"
            onClick={() => setIsCustomRangeOpen(!isCustomRangeOpen)}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap",
              isCustomActive
                ? "bg-primary text-primary-foreground shadow-2xs"
                : isCustomRangeOpen
                ? "bg-bg-subtle text-text"
                : "text-text-secondary hover:text-text hover:bg-bg-subtle"
            )}
            title="Choose custom start and end date range"
          >
            <CalendarRange className="h-3 w-3" />
            <span>{customRangeLabel}</span>
            <ChevronDown className="h-2.5 w-2.5 ml-0.5 opacity-70" />
          </button>
        </div>

        {/* Custom Month Picker */}
        <div className="flex items-center gap-1 pl-1.5 border-l border-border/80 ml-0.5">
          <input
            type="month"
            value={monthValue}
            title="Filter by Specific Month"
            aria-label="Filter report by specific month"
            onChange={handleMonthChange}
            className={cn(
              "h-6.5 px-1.5 text-[11px] font-semibold rounded-lg border border-border bg-bg-subtle text-text cursor-pointer focus:outline-hidden hover:border-accent/50 transition-colors",
              isFullMonth && !activePreset && "border-accent/60 bg-accent/10 font-bold"
            )}
          />
        </div>
      </div>

      {/* ── Custom Date Range Popover Dialog ──────────────────────── */}
      {isCustomRangeOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsCustomRangeOpen(false)}
          />
          <div className="absolute right-0 sm:left-auto top-full z-40 mt-1.5 w-76 rounded-xl border border-border/90 bg-card p-3.5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border">
              <div className="flex items-center gap-1.5">
                <CalendarRange className="h-4 w-4 text-accent" />
                <h4 className="text-xs font-bold text-text">Custom Date Range</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomRangeOpen(false)}
                className="text-text-secondary hover:text-text cursor-pointer p-0.5 rounded-md hover:bg-bg-subtle"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={handleApplyCustomRange} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-bg-subtle px-2 text-xs font-medium text-text focus:border-accent focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-bg-subtle px-2 text-xs font-medium text-text focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {(customStart || customEnd || isCustomActive) && (
                  <button
                    type="button"
                    onClick={handleClearCustomRange}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Clear Range
                  </button>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsCustomRangeOpen(false)}
                    className="h-7 px-2.5 text-xs font-semibold rounded-lg border border-border text-text-secondary hover:text-text hover:bg-bg-subtle cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!customStart && !customEnd}
                    className="h-7 px-3 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Mobile view ───────────────────────────────────────────── */}
      <div className="flex sm:hidden items-center gap-1.5 h-9 rounded-xl border border-border bg-card px-2.5 shadow-2xs">
        <Calendar className="h-3.5 w-3.5 text-accent shrink-0" />
        <select
          aria-label="Filter report timeframe"
          value={activePreset ? activePreset.value : isFullMonth ? "month" : "custom"}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "custom") {
              setIsCustomRangeOpen(true);
            } else if (val !== "month") {
              handleSelectPreset(val);
            }
          }}
          className="h-7 text-xs font-semibold bg-transparent text-text focus:outline-hidden cursor-pointer"
        >
          {DATE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
          <option value="month">Specific Month</option>
          <option value="custom">Custom Range…</option>
        </select>

        <input
          type="month"
          value={monthValue}
          title="Filter by Specific Month"
          aria-label="Filter report by specific month"
          onChange={handleMonthChange}
          className="h-6 w-24 px-1 text-[11px] font-medium rounded-lg border border-border bg-bg-subtle text-text cursor-pointer focus:outline-hidden"
        />
      </div>
    </div>
  );
}
