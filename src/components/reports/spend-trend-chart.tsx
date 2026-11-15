"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  Table as TableIcon,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MonthlySpendItem {
  month: string;
  procurement: number;
  maintenance: number;
}

interface SpendTrendChartProps {
  trend?: MonthlySpendItem[];
  isLoading?: boolean;
  canViewCosts?: boolean;
}

const PROCUREMENT_COLOR = "#6366F1"; // Indigo
const MAINTENANCE_COLOR = "#F43F5E"; // Rose

export function SpendTrendChart({
  trend = [],
  isLoading = false,
  canViewCosts = true,
}: SpendTrendChartProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  // Rollup totals
  const { totalProcurement, totalMaintenance, totalCombined } = useMemo(() => {
    const totalProc = trend.reduce((s, m) => s + m.procurement, 0);
    const totalMaint = trend.reduce((s, m) => s + m.maintenance, 0);
    return {
      totalProcurement: totalProc,
      totalMaintenance: totalMaint,
      totalCombined: totalProc + totalMaint,
    };
  }, [trend]);

  const procShare = totalCombined > 0 ? Math.round((totalProcurement / totalCombined) * 100) : 0;
  const maintShare = totalCombined > 0 ? Math.round((totalMaintenance / totalCombined) * 100) : 0;

  return (
    <div className="lg:col-span-6 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col">
      {/* ── Card Header ── */}
      <div className="border-b border-border px-4 sm:px-5 py-3 bg-bg-subtle/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
              6-Month Spend &amp; Financial Trend
            </h3>
            <p className="text-[10px] text-text-secondary mt-0.5">
              Comparative disbursement: Procurement vs Maintenance spend.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
              title="Comparative Bar Chart"
            >
              <BarChart3 className="h-3 w-3" />
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
              title="Full Spend Ledger Table"
            >
              <TableIcon className="h-3 w-3" />
              <span>Ledger</span>
            </button>
          </div>

          <span className="text-[10px] font-mono font-bold text-text bg-bg-subtle px-2 py-0.5 rounded border border-border shrink-0">
            {canViewCosts ? `₱${totalCombined.toLocaleString()}` : "Semi-Annual Window"}
          </span>
        </div>
      </div>

      {/* ── Card Body ── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
            <span className="text-xs text-text-secondary font-medium">Loading spend trend…</span>
          </div>
        </div>
      ) : !trend || trend.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-text-secondary">
          <BarChart3 className="h-8 w-8 text-text-secondary/40 mb-2" />
          <p className="text-xs">No historical spend data recorded.</p>
        </div>
      ) : viewMode === "chart" ? (
        /* ── CHART VIEW (Comparative Bar Chart + Summary Strip) ── */
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trend}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                barGap={3}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border, #E5E7EB)"
                  opacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "var(--color-text-secondary, #64748B)",
                    fontWeight: 600,
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 10,
                    fill: "var(--color-text-secondary, #64748B)",
                    fontFamily: "monospace",
                  }}
                  tickFormatter={(val) => {
                    if (!canViewCosts) return "";
                    if (val >= 1_000_000) return `₱${(val / 1_000_000).toFixed(1)}M`;
                    if (val >= 1_000) return `₱${(val / 1_000).toFixed(0)}k`;
                    return `₱${val}`;
                  }}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-bg-subtle, #F8FAFC)", opacity: 0.5 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload as MonthlySpendItem;
                    const monthCombined = row.procurement + row.maintenance;

                    return (
                      <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md p-3 shadow-xl text-xs z-50 min-w-44">
                        <div className="font-bold text-text border-b border-border/60 pb-1.5 mb-1.5 flex items-center justify-between">
                          <span>{label}</span>
                          <span className="font-mono text-primary font-extrabold">
                            {canViewCosts ? `₱${monthCombined.toLocaleString()}` : "Audited Month"}
                          </span>
                        </div>
                        <div className="space-y-1.5 font-mono text-[11px]">
                          <div className="flex items-center justify-between gap-3 text-indigo-600 dark:text-indigo-400">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-indigo-500" />
                              Procurement
                            </span>
                            <span className="font-bold">
                              {canViewCosts ? `₱${row.procurement.toLocaleString()}` : "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-rose-600 dark:text-rose-400">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-rose-500" />
                              Maintenance
                            </span>
                            <span className="font-bold">
                              {canViewCosts ? `₱${row.maintenance.toLocaleString()}` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="procurement"
                  name="Procurement Spend"
                  fill={PROCUREMENT_COLOR}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="maintenance"
                  name="Maintenance Spend"
                  fill={MAINTENANCE_COLOR}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Summary & Legend Strip ── */}
          <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
            {/* Procurement Summary */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="h-6 w-6 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 truncate">
                    Procurement ({procShare}%)
                  </div>
                  <div className="font-mono text-[11px] font-extrabold text-text truncate">
                    {canViewCosts ? `₱${totalProcurement.toLocaleString()}` : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Maintenance Summary */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="h-6 w-6 rounded-md bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <Wrench className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 truncate">
                    Maintenance ({maintShare}%)
                  </div>
                  <div className="font-mono text-[11px] font-extrabold text-text truncate">
                    {canViewCosts ? `₱${totalMaintenance.toLocaleString()}` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── TABLE VIEW (Full 6-Month Spend Ledger) ── */
        <div className="overflow-x-auto overflow-y-auto max-h-[320px] flex-1">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-bg-subtle/90 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                <th className="py-2 px-4 sm:px-5">Month Period</th>
                <th className="py-2 px-3 text-right">Procurement Spend</th>
                <th className="py-2 px-3 text-right">Maintenance Spend</th>
                <th className="py-2 px-4 text-right">Combined Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-text">
              {trend.map((row, idx) => {
                const monthTotal = row.procurement + row.maintenance;
                return (
                  <tr key={idx} className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-2.5 px-4 sm:px-5 font-semibold text-text">
                      {row.month}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-text">
                      {canViewCosts ? `₱${row.procurement.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                      {canViewCosts ? `₱${row.maintenance.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-primary dark:text-blue-300">
                      {canViewCosts ? `₱${monthTotal.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                );
              })}
              {/* Rollup Totals Row */}
              <tr className="sticky bottom-0 border-t-2 border-border bg-bg-subtle/95 backdrop-blur-xs font-bold text-text">
                <td className="py-2.5 px-4 sm:px-5">6-Month Total</td>
                <td className="py-2.5 px-3 text-right font-mono text-text">
                  {canViewCosts ? `₱${totalProcurement.toLocaleString()}` : "—"}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-700 dark:text-rose-400">
                  {canViewCosts ? `₱${totalMaintenance.toLocaleString()}` : "—"}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-primary dark:text-blue-300 font-extrabold">
                  {canViewCosts ? `₱${totalCombined.toLocaleString()}` : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

