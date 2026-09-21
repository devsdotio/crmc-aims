"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

import { useStockVolumeQuery } from "@/features/dashboard/client/use-dashboard";

interface StockVolumeAreaChartProps {
  loading?: boolean;
}

type Timeframe = "weekly" | "monthly" | "yearly";
type CategoryFilter = string;

interface DataPoint {
  period: string;
  stockVolume: number;
  consumeRate: number;
}

const CATEGORIES: Array<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "All Categories" },
  { id: "medical", label: "Medical" },
  { id: "office", label: "Office Supplies" },
  { id: "cleaning", label: "Cleaning" },
  { id: "laboratory", label: "Laboratory" },
  { id: "it", label: "IT / Computing" },
];

export function StockVolumeAreaChart({ loading: parentLoading = false }: StockVolumeAreaChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const { data: liveData, isLoading: queryLoading } = useStockVolumeQuery({
    timeframe,
    category: category === "all" ? undefined : category,
  });

  const isLoading = parentLoading || queryLoading;

  const chartData: DataPoint[] = liveData?.points?.map((p) => ({
    period: p.bucket ?? p.period,
    stockVolume: p.inflow ?? p.stockVolume,
    consumeRate: p.outflow ?? p.consumeRate,
  })) ?? [];

  // True when every bucket has 0 for both series — no data to plot
  const isEmpty =
    chartData.length > 0 &&
    chartData.every((p) => p.stockVolume === 0 && p.consumeRate === 0);

  return (
    <div className="h-full min-h-105 rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Header with Title, Legends & Timeframe tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-text">
            Supplies Restocked vs Used
          </h3>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-text-secondary">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs" />
              <span className="font-medium text-text">Restocked (In)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-xs" />
              <span className="font-medium text-text">Used (Out)</span>
            </div>
          </div>
        </div>

        {/* Timeframe Chips */}
        <div className="inline-flex items-center rounded-xl bg-bg-subtle p-1 border border-border/60">
          {(["weekly", "monthly", "yearly"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-all duration-150 cursor-pointer",
                timeframe === tf
                  ? "bg-card text-text shadow-xs font-bold"
                  : "text-text-secondary hover:text-text"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 min-h-64 w-full">
        {isLoading ? (
          <div className="h-64 flex flex-col justify-between py-2 animate-pulse">
            <div className="h-full w-full rounded-xl bg-border/40" />
          </div>
        ) : isEmpty ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 rounded-xl bg-bg-subtle/50 border border-border/40">
            <svg className="h-10 w-10 text-text-secondary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm font-medium text-text-secondary">
              No stock movements recorded for this period
            </p>
            <p className="text-xs text-text-secondary/60">
              Data will appear once purchase lots or consumable releases are logged.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
            >
            <defs>
              <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorConsume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#FBBF24" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E3E5EC"
              strokeOpacity={0.6}
            />
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#5A5F73", fontSize: 11, fontWeight: 500 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#5A5F73", fontSize: 11, fontWeight: 500 }}
              tickFormatter={(val: number) =>
                val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
              }
              dx={-4}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const stockVal = payload[0]?.value as number;
                const consumeVal = payload[1]?.value as number;

                return (
                  <div className="rounded-xl border border-border/80 bg-primary px-3.5 py-2.5 shadow-xl text-white min-w-36 animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {label} Breakdown
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span>Stock In:</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-300">
                        {stockVal?.toLocaleString()} units
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span>Consumed:</span>
                      </div>
                      <span className="text-xs font-bold text-amber-300">
                        {consumeVal?.toLocaleString()} units
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="stockVolume"
              stroke="#10B981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorStock)"
              dot={{ r: 3, fill: "#10B981", strokeWidth: 2, stroke: "#FFFFFF" }}
              activeDot={{ r: 5, fill: "#10B981", stroke: "#FFFFFF", strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="consumeRate"
              stroke="#F59E0B"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorConsume)"
              dot={{ r: 3, fill: "#F59E0B", strokeWidth: 2, stroke: "#FFFFFF" }}
              activeDot={{ r: 5, fill: "#F59E0B", stroke: "#FFFFFF", strokeWidth: 2 }}
            />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category Filter Chips at Bottom */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <SlidersHorizontal className="h-3 w-3" /> Category:
        </span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer",
              category === cat.id
                ? "bg-primary text-white shadow-xs"
                : "bg-bg-subtle text-text-secondary hover:text-text hover:bg-border/60"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
