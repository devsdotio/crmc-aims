"use client";

import React, { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  PieChart as PieIcon,
  Table as TableIcon,
  Layers,
  Coins,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryDistributionItem {
  name: string;
  count: number;
  value: number;
  kind?: "asset" | "supply" | "material";
}

interface CategoryValuationChartProps {
  categories?: CategoryDistributionItem[];
  isLoading?: boolean;
  canViewCosts?: boolean;
  topCount?: number;
}

// Crisp, high-contrast palette aligned with CRMC AIMS theme
const SLICE_PALETTE = [
  "#2563EB", // Primary Fleet Blue (Top 1)
  "#10B981", // Emerald (Top 2)
  "#F59E0B", // Amber (Top 3)
  "#6366F1", // Indigo (Top 4)
  "#EC4899", // Rose/Pink (Top 5)
  "#64748B", // Slate/Muted Neutral ("Others" compiled slice)
];

const OTHERS_COLOR = "#64748B";

export function CategoryValuationChart({
  categories = [],
  isLoading = false,
  canViewCosts = true,
  topCount = 5,
}: CategoryValuationChartProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [metric, setMetric] = useState<"valuation" | "units">("valuation");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Compute portfolio totals
  const totalValuation = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.value > 0 ? c.value : 0), 0);
  }, [categories]);

  const totalUnits = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.count > 0 ? c.count : 0), 0);
  }, [categories]);

  // Determine active metric: if costs are restricted or 0, fallback to units
  const activeMetric = canViewCosts && (metric === "valuation" && totalValuation > 0)
    ? "valuation"
    : "units";

  // Build Top N + "Others" compiled data
  const { chartData, othersCount } = useMemo(() => {
    if (!categories || categories.length === 0) {
      return { chartData: [], othersCount: 0 };
    }

    // Sort descending by active metric
    const sorted = [...categories].sort((a, b) => {
      const aVal = activeMetric === "valuation" ? a.value : a.count;
      const bVal = activeMetric === "valuation" ? b.value : b.count;
      if (bVal !== aVal) return bVal - aVal;
      return b.count - a.count;
    });

    const activeTotal = activeMetric === "valuation" ? totalValuation : totalUnits;

    // Filter items that have a positive value for active metric
    const positiveItems = sorted.filter((c) =>
      activeMetric === "valuation" ? c.value > 0 : c.count > 0
    );

    if (positiveItems.length <= topCount) {
      const data = positiveItems.map((c, i) => {
        const val = activeMetric === "valuation" ? c.value : c.count;
        const pct = activeTotal > 0 ? Math.round((val / activeTotal) * 100) : 0;
        return {
          name: c.name,
          value: val,
          actualValue: c.value,
          count: c.count,
          percentage: pct,
          color: SLICE_PALETTE[i % SLICE_PALETTE.length],
          isOthers: false,
        };
      });
      return { chartData: data, othersCount: 0 };
    }

    // Slice top categories
    const top = positiveItems.slice(0, topCount);
    const rest = positiveItems.slice(topCount);

    const compiledVal = rest.reduce((s, c) => s + (activeMetric === "valuation" ? c.value : c.count), 0);
    const compiledUnits = rest.reduce((s, c) => s + c.count, 0);
    const compiledValuation = rest.reduce((s, c) => s + c.value, 0);
    const othersPct = activeTotal > 0 ? Math.round((compiledVal / activeTotal) * 100) : 0;

    const data = top.map((c, i) => {
      const val = activeMetric === "valuation" ? c.value : c.count;
      const pct = activeTotal > 0 ? Math.round((val / activeTotal) * 100) : 0;
      return {
        name: c.name,
        value: val,
        actualValue: c.value,
        count: c.count,
        percentage: pct,
        color: SLICE_PALETTE[i % (SLICE_PALETTE.length - 1)],
        isOthers: false,
      };
    });

    // Add compiled "Others" slice
    if (compiledVal > 0) {
      data.push({
        name: `Others (${rest.length} categories)`,
        value: compiledVal,
        actualValue: compiledValuation,
        count: compiledUnits,
        percentage: othersPct,
        color: OTHERS_COLOR,
        isOthers: true,
      });
    }

    return { chartData: data, othersCount: rest.length };
  }, [categories, activeMetric, topCount, totalValuation, totalUnits]);

  // Center display metric
  const centerValue = useMemo(() => {
    if (activeIndex !== null && chartData[activeIndex]) {
      const item = chartData[activeIndex];
      return activeMetric === "valuation"
        ? `₱${item.actualValue.toLocaleString()}`
        : `${item.count.toLocaleString()}`;
    }
    return activeMetric === "valuation"
      ? `₱${totalValuation.toLocaleString()}`
      : `${totalUnits.toLocaleString()}`;
  }, [activeIndex, chartData, activeMetric, totalValuation, totalUnits]);

  const centerSublabel = useMemo(() => {
    if (activeIndex !== null && chartData[activeIndex]) {
      return chartData[activeIndex].name;
    }
    return activeMetric === "valuation" ? "TOTAL VALUATION" : "TOTAL UNITS";
  }, [activeIndex, chartData, activeMetric]);

  return (
    <div className="lg:col-span-6 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col">
      {/* ── Card Header ── */}
      <div className="border-b border-border px-4 sm:px-5 py-3 bg-bg-subtle/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <PieIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
              Category Valuation &amp; Distribution
            </h3>
            <p className="text-[10px] text-text-secondary mt-0.5">
              Top portfolio categories with compiled remaining balance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Metric Toggle: Valuation (₱) vs Volume (Units) */}
          {canViewCosts && totalValuation > 0 && viewMode === "chart" && (
            <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setMetric("valuation")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1",
                  activeMetric === "valuation"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-text-secondary hover:text-text"
                )}
              >
                <Coins className="h-3 w-3" />
                <span>₱ Value</span>
              </button>
              <button
                type="button"
                onClick={() => setMetric("units")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1",
                  activeMetric === "units"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-text-secondary hover:text-text"
                )}
              >
                <Package className="h-3 w-3" />
                <span>Units</span>
              </button>
            </div>
          )}

          {/* View Toggle: Chart vs Ledger Table */}
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1",
                viewMode === "chart"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-text-secondary hover:text-text"
              )}
              title="Interactive Pie Chart"
            >
              <PieIcon className="h-3 w-3" />
              <span>Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-text-secondary hover:text-text"
              )}
              title="Full Itemized Ledger Table"
            >
              <TableIcon className="h-3 w-3" />
              <span>Ledger</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-text-secondary bg-bg-subtle px-2 py-0.5 rounded border border-border shrink-0">
            {categories.length} Categories
          </span>
        </div>
      </div>

      {/* ── Card Body ── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
            <span className="text-xs text-text-secondary font-medium">Loading category distribution…</span>
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-text-secondary">
          <Layers className="h-8 w-8 text-text-secondary/40 mb-2" />
          <p className="text-xs">No category distribution recorded.</p>
        </div>
      ) : viewMode === "chart" ? (
        /* ── CHART VIEW (Donut Chart + Side Legend Breakdown) ── */
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Donut Chart with Centered Metric */}
            <div className="sm:col-span-5 relative flex items-center justify-center min-h-[190px]">
              <div className="w-44 h-44 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md px-3.5 py-2 shadow-xl text-xs z-50">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-bold text-text truncate max-w-[180px]">
                                {item.name}
                              </span>
                            </div>
                            <div className="mt-1 pt-1 border-t border-border/60 flex items-center justify-between gap-4 font-mono text-[11px]">
                              <span className="text-text-secondary">
                                {item.count.toLocaleString()} unit{item.count !== 1 ? "s" : ""}
                              </span>
                              <span className="font-bold text-text">
                                {canViewCosts && item.actualValue > 0
                                  ? `₱${item.actualValue.toLocaleString()}`
                                  : `${item.percentage}% share`}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={74}
                      paddingAngle={chartData.length > 1 ? 2.5 : 0}
                      strokeWidth={2}
                      stroke="var(--color-card, #FFFFFF)"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cat-slice-${index}`}
                          fill={entry.color}
                          className="cursor-pointer transition-all duration-200"
                          opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                          onMouseEnter={() => setActiveIndex(index)}
                          onMouseLeave={() => setActiveIndex(null)}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Hover Value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-3 text-center">
                  <span className="font-mono text-sm sm:text-base font-extrabold text-text tabular-nums leading-tight truncate max-w-full">
                    {centerValue}
                  </span>
                  <span className="text-[8.5px] uppercase tracking-wider text-text-secondary font-bold mt-0.5 line-clamp-1">
                    {centerSublabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Side Legend & Top Breakdown */}
            <div className="sm:col-span-7 flex flex-col justify-center space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-secondary border-b border-border/60 pb-1.5">
                <span>Top Categories</span>
                <span>Share &amp; Volume</span>
              </div>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {chartData.map((item, idx) => {
                  const isHovered = activeIndex === idx;
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseLeave={() => setActiveIndex(null)}
                      className={cn(
                        "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer",
                        isHovered
                          ? "bg-bg-subtle/80 border-border shadow-2xs"
                          : "border-transparent hover:bg-bg-subtle/40"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-text truncate max-w-[160px] sm:max-w-[190px]">
                            {item.name}
                          </div>
                          <div className="text-[10px] font-mono text-text-secondary">
                            {item.count.toLocaleString()} unit{item.count !== 1 ? "s" : ""}
                            {canViewCosts && item.actualValue > 0 && (
                              <span> · ₱{item.actualValue.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-12 h-1.5 rounded-full bg-border/60 overflow-hidden hidden sm:block">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(item.percentage, 100)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10.5px] font-extrabold text-text w-8 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {othersCount > 0 && (
                <div className="pt-1.5 border-t border-border/50 text-[10px] text-text-secondary flex items-center justify-between">
                  <span>Compiled {othersCount} lower-volume categories</span>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className="font-semibold text-primary dark:text-blue-300 hover:underline cursor-pointer"
                  >
                    View all {categories.length} →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── TABLE VIEW (Full 65-Category Itemized Ledger) ── */
        <div className="overflow-x-auto overflow-y-auto max-h-[320px] flex-1">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-bg-subtle/90 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                <th className="py-2 px-4 sm:px-5">Category Name</th>
                <th className="py-2 px-3 text-right">Units</th>
                <th className="py-2 px-3 text-right">Valuation (₱)</th>
                <th className="py-2 px-4 text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-text">
              {categories.map((cat, idx) => {
                const itemMetric = canViewCosts && cat.value > 0 ? cat.value : cat.count;
                const totalMetric = canViewCosts && totalValuation > 0 ? totalValuation : totalUnits;
                const sharePct = totalMetric > 0 ? Math.round((itemMetric / totalMetric) * 100) : 0;

                return (
                  <tr key={idx} className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-2 px-4 sm:px-5 font-semibold text-text truncate max-w-[220px]">
                      {cat.name}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-text-secondary">
                      {cat.count.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-text">
                      {canViewCosts ? `₱${cat.value.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-[11px] text-text-secondary">
                      {sharePct}%
                    </td>
                  </tr>
                );
              })}
              {/* Rollup Totals Row */}
              <tr className="sticky bottom-0 border-t-2 border-border bg-bg-subtle/95 backdrop-blur-xs font-bold text-text">
                <td className="py-2 px-4 sm:px-5">Total Rollup ({categories.length})</td>
                <td className="py-2 px-3 text-right font-mono text-text">
                  {totalUnits.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right font-mono text-text">
                  {canViewCosts ? `₱${totalValuation.toLocaleString()}` : "—"}
                </td>
                <td className="py-2 px-4 text-right font-mono text-text">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
