"use client";

import { useMemo, useState } from "react";
import { BarChart3, Layers, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ConsumedSupplyItem } from "@/types/reports";
import {
  ClassificationFilterPills,
  ConsumableClassificationBadge,
} from "@/components/reports/consumable-classification-badge";
import { normalizeConsumableClassification } from "@/lib/consumable-classification";

interface ConsumedItemsLedgerProps {
  sectionId: string;
  scopeLabel: string;
  items: ConsumedSupplyItem[];
  canViewCosts: boolean;
  totalValueOverride?: number | null;
}

export function ConsumedItemsLedger({
  sectionId,
  scopeLabel,
  items,
  canViewCosts,
  totalValueOverride,
}: ConsumedItemsLedgerProps) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<"all" | "supply" | "material">("all");

  const { suppliesCount, materialsCount, suppliesValue, materialsValue } = useMemo(() => {
    let sCount = 0;
    let mCount = 0;
    let sVal = 0;
    let mVal = 0;
    for (const item of items) {
      const cls = normalizeConsumableClassification(item.classification);
      if (cls === "material") {
        mCount += 1;
        mVal += item.totalCost || 0;
      } else {
        sCount += 1;
        sVal += item.totalCost || 0;
      }
    }
    return {
      suppliesCount: sCount,
      materialsCount: mCount,
      suppliesValue: sVal,
      materialsValue: mVal,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const cls = normalizeConsumableClassification(item.classification);
      if (classFilter !== "all" && cls !== classFilter) return false;
      if (!q) return true;
      return (
        item.itemCode.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.purpose && item.purpose.toLowerCase().includes(q)) ||
        (item.referenceCode && item.referenceCode.toLowerCase().includes(q))
      );
    });
  }, [items, search, classFilter]);

  const topChartData = useMemo(() => {
    return [...filteredItems]
      .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
      .slice(0, 6)
      .map((item) => ({
        name: item.name.length > 18 ? `${item.name.slice(0, 18)}…` : item.name,
        cost: item.totalCost || 0,
        qty: item.quantity,
        classification: normalizeConsumableClassification(item.classification),
      }));
  }, [filteredItems]);

  const displayedTotal =
    classFilter === "supply"
      ? suppliesValue
      : classFilter === "material"
      ? materialsValue
      : totalValueOverride ?? suppliesValue + materialsValue;

  return (
    <section id={sectionId} className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">
              Consumable Supplies &amp; Materials Ledger
            </h3>
            <p className="text-xs text-text-secondary">
              Separated inventory Supplies and operational Materials dispatched to {scopeLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search SKU, name, category…"
              aria-label="Search consumed supplies and materials"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-10 sm:min-h-8 pl-8 pr-3 py-1 text-xs rounded-lg border border-border bg-card text-text placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {canViewCosts && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/25">
                Sup: ₱{suppliesValue.toLocaleString()}
              </span>
              <span className="font-bold text-amber-800 dark:text-amber-300 bg-amber-500/12 px-2 py-1 rounded-md border border-amber-500/30">
                Mat: ₱{materialsValue.toLocaleString()}
              </span>
              {displayedTotal > 0 && (
                <span className="font-bold text-text bg-bg-subtle px-2 py-1 rounded-md border border-border">
                  Total: ₱{displayedTotal.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Classification Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ClassificationFilterPills
          size="sm"
          ariaLabel="Filter ledger by Supplies or Materials"
          value={classFilter}
          onChange={(next) =>
            setClassFilter(next === "supply" || next === "material" ? next : "all")
          }
          options={[
            { id: "all", label: "All Items", count: items.length },
            { id: "supply", label: "Supplies", count: suppliesCount },
            { id: "material", label: "Materials", count: materialsCount },
          ]}
        />
        <span className="text-[11px] text-text-secondary font-mono">
          Showing {filteredItems.length} of {items.length} line items
        </span>
      </div>

      {/* Top Consumed Chart */}
      {canViewCosts &&
        topChartData.length > 0 &&
        topChartData.some((d) => d.cost > 0) && (
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary dark:text-blue-300" />
                <span className="text-xs font-bold text-text">
                  Top Consumable Expenses (Supplies vs Materials)
                </span>
              </div>
              <span className="text-[10px] text-text-secondary">By total cost incurred</span>
            </div>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topChartData}
                  margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border, #E5E7EB)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "var(--text-secondary, #5A5F73)",
                      fontWeight: 600,
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "var(--text-secondary, #5A5F73)",
                      fontFamily: "monospace",
                    }}
                    tickFormatter={(v) => `₱${v}`}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(val: unknown) => [
                      `₱${Number(val || 0).toLocaleString()}`,
                      "Expense",
                    ]}
                    contentStyle={{
                      backgroundColor: "var(--card, #ffffff)",
                      borderRadius: "10px",
                      border: "1px solid var(--border, #E5E7EB)",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text, #111827)",
                    }}
                  />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]} cursor="pointer">
                    {topChartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.classification === "material" ? "#D97706" : "#059669"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      {/* Itemized Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border">
          <Layers className="h-10 w-10 text-text-secondary/40 mb-2" />
          <div className="text-sm font-bold text-text">No Consumables Consumed</div>
          <p className="text-xs text-text-secondary max-w-sm mt-1">
            No Supplies or Materials have been dispatched in the recorded timeframe.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-8 text-center text-xs text-text-secondary border border-dashed border-border rounded-xl">
          No consumable items matching the active filter criteria.
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-bg-subtle/80 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                <tr>
                  <th className="px-4 py-3">SKU Code</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Consumable Item</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  {canViewCosts && <th className="px-4 py-3 text-right">Unit Cost</th>}
                  {canViewCosts && <th className="px-4 py-3 text-right">Total Cost</th>}
                  <th className="px-4 py-3">Date / Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.map((item) => {
                  const cls = normalizeConsumableClassification(item.classification);
                  return (
                    <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-text whitespace-nowrap">
                        {item.itemCode}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ConsumableClassificationBadge classification={cls} compact />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text">{item.name}</div>
                        {item.category && (
                          <div className="text-[10px] text-text-secondary capitalize">
                            {item.category.replace(/_/g, " ")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-text whitespace-nowrap">
                        {item.quantity.toLocaleString()}{" "}
                        <span className="font-normal text-text-secondary text-[11px]">
                          {item.unit}
                        </span>
                      </td>
                      {canViewCosts && (
                        <td className="px-4 py-3 text-right font-mono text-text-secondary whitespace-nowrap">
                          {item.unitCost != null ? `₱${item.unitCost.toLocaleString()}` : "—"}
                        </td>
                      )}
                      {canViewCosts && (
                        <td className="px-4 py-3 text-right font-mono font-bold text-text whitespace-nowrap">
                          {item.totalCost != null ? `₱${item.totalCost.toLocaleString()}` : "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-[11px] text-text-secondary">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono">
                          {item.incurredOn && <span>{item.incurredOn}</span>}
                          {item.referenceCode && (
                            <span className="rounded bg-bg-subtle border border-border px-1.5 py-0.2 text-[10px]">
                              {item.referenceCode}
                            </span>
                          )}
                        </div>
                        {item.purpose && (
                          <div className="truncate max-w-xs italic mt-0.5">
                            &ldquo;{item.purpose}&rdquo;
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

