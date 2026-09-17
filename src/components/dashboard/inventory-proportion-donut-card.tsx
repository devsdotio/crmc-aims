"use client";

import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon, ExternalLink } from "lucide-react";
import type { DashboardSummaryDTO } from "@/server/modules/dashboard/dashboard.service";
import { cn } from "@/lib/utils";

interface InventoryProportionDonutCardProps {
  summary?: DashboardSummaryDTO | null;
  loading?: boolean;
}

export function InventoryProportionDonutCard({
  summary,
  loading = false,
}: InventoryProportionDonutCardProps) {
  const activeBorrows = summary?.activeBorrows ?? 0;
  const activeAssignments = summary?.activeAssignments ?? 0;
  const inCustodyUnits = activeBorrows + activeAssignments;

  const totalAssignable = summary?.totalAssignable ?? 0;
  const totalBorrowable = summary?.totalBorrowable ?? 0;
  const totalUnits = (totalAssignable + totalBorrowable) || 0;
  const availableUnits = Math.max(0, totalUnits - inCustodyUnits);
  const displayCustody = inCustodyUnits;
  const grandTotal = displayCustody + availableUnits;

  const custodyPct =
    grandTotal > 0 ? Math.round((displayCustody / grandTotal) * 100) : 0;
  const availablePct = grandTotal > 0 ? 100 - custodyPct : 0;

  const data = [
    { name: "Currently In Use", value: displayCustody, color: "#2A3260" },
    { name: "Available In Stock", value: availableUnits, color: "#10B981" },
  ];

  return (
    <div className="shrink-0 rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Static Header with Title & Action Link */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <PieChartIcon className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-bold text-text">Asset Availability</h4>
        </div>
        <Link
          href="/borrow-log"
          className="text-[11px] font-semibold text-text-secondary hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
        >
          {loading ? (
            <span className="h-3 w-16 bg-border/50 rounded animate-pulse" />
          ) : (
            <span>Total: {grandTotal.toLocaleString()}</span>
          )}
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Center Donut Area */}
      <div className="relative flex items-center justify-center my-1 h-32">
        {loading ? (
          <div className="flex items-center justify-center animate-pulse">
            <div className="h-24 w-24 rounded-full border-6 border-border/40 border-t-emerald-500/40" />
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0];
                    return (
                      <div className="rounded-xl border border-border/80 bg-primary px-3 py-1.5 shadow-xl text-white text-xs">
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="text-sm font-bold text-emerald-300">
                          {(item.value as number).toLocaleString()} units (
                          {grandTotal > 0
                            ? Math.round(((item.value as number) / grandTotal) * 100)
                            : 0}
                          %)
                        </div>
                      </div>
                    );
                  }}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={56}
                  strokeWidth={2}
                  stroke="#FFFFFF"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center percentage indicator */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base font-extrabold text-text tabular-nums leading-none">
                {custodyPct}%
              </span>
              <span className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold">
                On Loan
              </span>
            </div>
          </>
        )}
      </div>

      {/* Static Legend & stats row */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
        <Link
          href="/borrow-log?filter=active"
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-subtle transition-colors cursor-pointer group"
        >
          <span className="h-3 w-3 rounded-sm bg-primary shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-text-secondary leading-tight group-hover:text-primary transition-colors">
              In Use
            </span>
            {loading ? (
              <span className="h-3.5 w-14 bg-border/50 rounded animate-pulse mt-0.5" />
            ) : (
              <span className="text-xs font-bold text-text tabular-nums">
                {custodyPct}% ({displayCustody.toLocaleString()})
              </span>
            )}
          </div>
        </Link>

        <Link
          href="/assets"
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-subtle transition-colors cursor-pointer group"
        >
          <span className="h-3 w-3 rounded-sm bg-emerald-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-text-secondary leading-tight group-hover:text-primary transition-colors">
              In Stock
            </span>
            {loading ? (
              <span className="h-3.5 w-14 bg-border/50 rounded animate-pulse mt-0.5" />
            ) : (
              <span className="text-xs font-bold text-text tabular-nums">
                {availablePct}% ({availableUnits.toLocaleString()})
              </span>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
