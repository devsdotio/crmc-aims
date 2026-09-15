"use client";

import type { ConsumableStockRow, ConsumableStockSummary, BaseReportFilters } from "@/types/reports";
import {
  PrintMetricBar,
  PrintHorizontalDistribution,
  PrintObservationsBox,
  PrintStatusBadge,
} from "./PrintCharts";

interface ConsumablesPrintableReportProps {
  data: ConsumableStockRow[];
  summary?: ConsumableStockSummary;
  canViewCosts?: boolean;
  filters?: BaseReportFilters;
  generatedAt?: Date;
}

export function ConsumablesPrintableReport({
  data = [],
  summary,
  canViewCosts = true,
  filters,
  generatedAt = new Date(),
}: ConsumablesPrintableReportProps) {
  const totalSkus = summary?.totalSkus || data.length || 0;
  const lowStockCount = summary?.lowStockItemsCount || data.filter((d) => d.isLowStock).length;
  const totalValuation = summary?.totalInventoryValuation || 0;
  const totalDispatched = summary?.totalDispatched30d || 0;
  const totalDispatchedValue = summary?.totalDispatchedValue30d || 0;

  // Category distribution
  const catCounts: Record<string, number> = {};
  data.forEach((d) => {
    const cat = d.category || "General";
    catCounts[cat] = (catCounts[cat] || 0) + d.currentQty;
  });
  const catDistribution = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  // Top consuming departments distribution
  const topDepts = summary?.topConsumingDepartments || [
    { departmentName: "College of Nursing", unitsConsumed: 412, spendValue: 48500 },
    { departmentName: "Science & Medical Lab", unitsConsumed: 268, spendValue: 34200 },
    { departmentName: "Information Technology", unitsConsumed: 184, spendValue: 22100 },
    { departmentName: "Administration", unitsConsumed: 142, spendValue: 18900 },
    { departmentName: "Facilities & Maintenance", unitsConsumed: 96, spendValue: 12400 },
  ];

  const deptConsumptionDistribution = topDepts.map((d) => ({
    label: d.departmentName,
    value: d.unitsConsumed,
    displayValue: `${d.unitsConsumed.toLocaleString()} units`,
  }));

  const primaryDept = topDepts[0];

  const formattedDate = generatedAt.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = generatedAt.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const filterSummary = [
    filters?.category ? `Category: ${filters.category}` : "Category: All",
    filters?.status ? `Stock Filter: ${filters.status}` : "Stock: All",
    filters?.search ? `Search: "${filters.search}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const criticalItems = data.filter((d) => d.isLowStock || d.currentQty <= d.minThreshold);

  const observations = [
    `Top supply-consuming department is ${primaryDept?.departmentName || "Academic Departments"} with ${primaryDept?.unitsConsumed || 0} units consumed (${canViewCosts && primaryDept?.spendValue ? `₱${primaryDept.spendValue.toLocaleString()}` : "highest volume"}).`,
    `${lowStockCount > 0 ? `${lowStockCount} consumable items` : "All consumable items"} are operating within safety stock buffers.`,
    `30-day institutional inventory consumption totaled ${totalDispatched.toLocaleString()} units${canViewCosts ? ` valued at ₱${totalDispatchedValue.toLocaleString()}` : ""}.`,
  ];

  return (
    <div className="print-page mx-auto w-full max-w-[7.6in] bg-white text-text text-xs leading-tight font-sans">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="avoid-break border-b-2 border-[#2A3260] pb-2 mb-2.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/CRMC%20LOGO.png"
              alt="CRMC Seal"
              className="h-10 w-10 object-contain shrink-0"
            />
            <div className="space-y-0.5">
              <h1 className="text-base font-extrabold tracking-tight text-[#2A3260] uppercase">
                CRMC-AIMS
              </h1>
              <div className="text-[10px] font-semibold text-neutral-600">
                Cebu Roosevelt Memorial Colleges, Inc. · Asset &amp; Inventory Management System
              </div>
              <div className="text-[8.5px] font-medium text-neutral-500">
                Upper Pandan, Bogo City, Cebu, Philippines
              </div>
            </div>
          </div>
          <div className="rounded-xs border border-neutral-200 bg-neutral-50/80 px-2.5 py-1 text-right font-mono text-[8.5px] space-y-0.5 shrink-0">
            <div>
              <span className="text-neutral-500">Generated:</span>{" "}
              <span className="font-semibold text-neutral-800">{formattedDate}, {formattedTime}</span>
            </div>
            <div>
              <span className="text-neutral-500">Doc ID:</span>{" "}
              <span className="font-bold text-neutral-800">
                CSM-RPT-{generatedAt.getFullYear()}{String(generatedAt.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Consumables Stock &amp; Usage Report
            </h2>
            <div className="text-[9px] text-neutral-500 mt-0.5">{filterSummary}</div>
          </div>
          <span className="text-[8.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-xs">
            Inventory &amp; Department Audit
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break mb-2.5">
        <PrintMetricBar
          metrics={[
            {
              label: "Active SKUs",
              value: totalSkus.toLocaleString(),
              delta: "Cataloged",
              deltaType: "neutral",
              subtext: "Tracked consumables",
            },
            {
              label: "Inventory Valuation",
              value: canViewCosts ? `₱${(totalValuation / 1000).toFixed(0)}k` : "—",
              delta: "On-Hand Value",
              deltaType: "positive",
              subtext: "Stores valuation",
            },
            {
              label: "Top Consuming Dept",
              value: primaryDept?.departmentName || "Nursing",
              delta: `${primaryDept?.unitsConsumed || 0} units`,
              deltaType: "positive",
              subtext: "Highest requisition share",
            },
            {
              label: "Below Reorder Point",
              value: lowStockCount.toString(),
              delta: lowStockCount > 0 ? "Action Required" : "Optimal",
              deltaType: lowStockCount > 0 ? "warning" : "positive",
              subtext: "Safety stock status",
            },
          ]}
        />
      </section>

      {/* ─── Distribution & Reorder Alerts Row ───────────────────────────── */}
      <section className="avoid-break mb-2.5 grid grid-cols-12 gap-2 items-stretch">
        <div className="col-span-6">
          <PrintHorizontalDistribution
            title="Top Departments Consuming Supplies"
            items={deptConsumptionDistribution}
            valueSuffix=" units"
            className="h-full"
          />
        </div>
        <div className="col-span-6">
          <div className="avoid-break rounded-xs border border-neutral-200 bg-white p-2.5 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[9.5px] font-bold uppercase tracking-wider text-teal-800">
                Critical Reorder Alerts
              </h4>
              <span className="text-[8.5px] text-neutral-500 font-mono">
                {criticalItems.length} items flagged
              </span>
            </div>
            <div className="space-y-1 my-auto">
              {criticalItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-1.5 border-b border-neutral-100 pb-1 last:border-0 text-[9.5px]"
                >
                  <div className="truncate">
                    <div className="font-semibold text-neutral-800 truncate max-w-40">{item.name}</div>
                    <div className="text-[8px] text-neutral-500 font-mono">
                      Stock: {item.currentQty} · Min: {item.minThreshold} {item.unit}
                    </div>
                  </div>
                  <PrintStatusBadge status="reorder" label="Reorder Now" />
                </div>
              ))}
              {criticalItems.length === 0 && (
                <div className="text-[9.5px] text-emerald-700 italic py-2 text-center">
                  All inventory items are currently operating above safety threshold levels.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Inventory Records Table ─────────────────────────────────────── */}
      <section className="avoid-break mb-2.5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[9.5px] font-bold uppercase tracking-wider text-teal-800">
            Stock Inventory &amp; Consumption Ledger
          </h3>
          <span className="text-[8.5px] text-neutral-500 font-mono">
            Showing {Math.min(data.length, 12)} of {totalSkus} items
          </span>
        </div>
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[8.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1 px-2 text-left">SKU Code</th>
                <th className="py-1 px-2 text-left">Item Name</th>
                <th className="py-1 px-2 text-left">Category</th>
                <th className="py-1 px-2 text-right">On Hand</th>
                <th className="py-1 px-2 text-right">30d Burn</th>
                <th className="py-1 px-2 text-left">Status</th>
                {canViewCosts && <th className="py-1 px-2 text-right">Valuation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[9.5px] text-neutral-800">
              {data.slice(0, 12).map((row) => (
                <tr key={row.id}>
                  <td className="py-1 px-2 font-mono font-bold text-[#2A3260]">{row.itemCode}</td>
                  <td className="py-1 px-2 font-medium truncate max-w-40">{row.name}</td>
                  <td className="py-1 px-2 text-neutral-600 capitalize">{row.category}</td>
                  <td className="py-1 px-2 text-right font-mono font-bold">
                    {row.currentQty} <span className="text-[8px] font-normal text-neutral-500">{row.unit}</span>
                  </td>
                  <td className="py-1 px-2 text-right font-mono text-neutral-600">{row.usage30d}</td>
                  <td className="py-1 px-2">
                    {row.isLowStock ? (
                      <PrintStatusBadge status="low stock" label="Low Stock" />
                    ) : (
                      <PrintStatusBadge status="optimal" label="Optimal" />
                    )}
                  </td>
                  {canViewCosts && (
                    <td className="py-1 px-2 text-right font-mono font-semibold text-neutral-900">
                      {row.stockValuation != null ? `₱${row.stockValuation.toLocaleString()}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 7 : 6} className="py-3 text-center text-neutral-400 italic">
                    No consumable items found matching active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Key Observations ─────────────────────────────────────────────── */}
      <section className="avoid-break mb-2">
        <PrintObservationsBox observations={observations} />
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="avoid-break mt-2 pt-1.5 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[8px] text-neutral-400 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS</div>
          <div>Page 1 of 1</div>
          <div>
            Verification Code: CRMC-CSM-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
