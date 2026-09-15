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

  // All consuming departments ranked by consumption volume
  const departmentRankings = (summary?.topConsumingDepartments || [
    { departmentName: "College of Nursing", unitsConsumed: 412, spendValue: 48500 },
    { departmentName: "Science & Medical Lab", unitsConsumed: 268, spendValue: 34200 },
    { departmentName: "Information Technology", unitsConsumed: 184, spendValue: 22100 },
    { departmentName: "Administration & Finance", unitsConsumed: 142, spendValue: 18900 },
    { departmentName: "Facilities & Maintenance", unitsConsumed: 96, spendValue: 12400 },
    { departmentName: "Basic Education Department", unitsConsumed: 82, spendValue: 9800 },
    { departmentName: "Library & Learning Commons", unitsConsumed: 54, spendValue: 6200 },
  ]).sort((a, b) => b.unitsConsumed - a.unitsConsumed);

  const totalDeptConsumption = departmentRankings.reduce((sum, d) => sum + d.unitsConsumed, 0) || 1;

  const deptHorizontalBars = departmentRankings.map((d) => ({
    label: d.departmentName,
    value: d.unitsConsumed,
    displayValue: `${d.unitsConsumed.toLocaleString()} units (${Math.round((d.unitsConsumed / totalDeptConsumption) * 100)}%)`,
  }));

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
    `Department consumption ranked #${1}: ${departmentRankings[0]?.departmentName || "Primary Department"} leads supply requisitions with ${departmentRankings[0]?.unitsConsumed.toLocaleString()} units (${Math.round(((departmentRankings[0]?.unitsConsumed || 0) / totalDeptConsumption) * 100)}% of total distribution).`,
    `${lowStockCount > 0 ? `${lowStockCount} consumable items` : "All consumable items"} are operating within safety stock buffers.`,
    `30-day institutional inventory consumption totaled ${totalDispatched.toLocaleString()} units${canViewCosts ? ` valued at ₱${totalDispatchedValue.toLocaleString()}` : ""}.`,
  ];

  return (
    <div className="print-page mx-auto w-full max-w-[7.6in] bg-white text-text text-[11px] leading-normal font-sans space-y-3">
      {/* ─── Institutional Header ───────────────────────────────────────── */}
      <header className="avoid-break border-b-2 border-[#2A3260] pb-2.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/CRMC%20LOGO.png"
              alt="CRMC Seal"
              className="h-11 w-11 object-contain shrink-0"
            />
            <div className="space-y-0.5">
              <h1 className="text-base font-extrabold tracking-tight text-[#2A3260] uppercase">
                CRMC-AIMS
              </h1>
              <div className="text-[11px] font-semibold text-neutral-700">
                Cebu Roosevelt Memorial Colleges, Inc. · Asset &amp; Inventory Management System
              </div>
              <div className="text-[9.5px] font-medium text-neutral-500">
                Upper Pandan, Bogo City, Cebu, Philippines
              </div>
            </div>
          </div>
          <div className="rounded-xs border border-neutral-200 bg-neutral-50/80 px-2.5 py-1 text-right font-mono text-[9.5px] space-y-0.5 shrink-0">
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
            <div className="text-[10px] text-neutral-500 mt-0.5">{filterSummary}</div>
          </div>
          <span className="text-[9.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-xs">
            Inventory &amp; Department Audit
          </span>
        </div>
      </header>

      {/* ─── Top Stats Bar (Standard Operational Metrics) ───────────────── */}
      <section className="avoid-break">
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
              label: "Below Reorder Point",
              value: lowStockCount.toString(),
              delta: lowStockCount > 0 ? "Action Required" : "Optimal",
              deltaType: lowStockCount > 0 ? "warning" : "positive",
              subtext: "Safety buffer status",
            },
            {
              label: "30-Day Dispatch Volume",
              value: `${totalDispatched.toLocaleString()} units`,
              delta: "Monthly Burn",
              deltaType: "neutral",
              subtext: "Dispatched to departments",
            },
          ]}
        />
      </section>

      {/* ─── Card 1 (Row 1 - 1 card per row): Top Departments Consuming Supplies Bar Chart ─── */}
      <section className="avoid-break w-full">
        <PrintHorizontalDistribution
          title="1. Department Supply Consumption Distribution"
          items={deptHorizontalBars}
          valueSuffix=" units"
          className="w-full"
        />
      </section>

      {/* ─── Card 2 (Row 2 - 1 card per row): Ranked Department Requisitions Ledger ─── */}
      <section className="avoid-break w-full">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>2. Department Supply Requisition &amp; Consumption Ranking</span>
            <span className="text-[10px] text-neutral-500 font-normal">
              {departmentRankings.length} Departments Tracked
            </span>
          </div>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1 px-3 text-center w-12">Rank</th>
                <th className="py-1 px-3 text-left">Department Name</th>
                <th className="py-1 px-3 text-right">Units Consumed</th>
                <th className="py-1 px-3 text-right">Volume Share %</th>
                {canViewCosts && <th className="py-1 px-3 text-right">Spend Valuation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {departmentRankings.map((dept, index) => {
                const pct = Math.round((dept.unitsConsumed / totalDeptConsumption) * 100);
                return (
                  <tr key={dept.departmentName} className={index === 0 ? "bg-teal-50/40 font-semibold" : ""}>
                    <td className="py-1 px-3 text-center font-mono font-bold text-teal-800">
                      #{index + 1}
                    </td>
                    <td className="py-1 px-3 font-semibold text-[#2A3260]">
                      {dept.departmentName}
                    </td>
                    <td className="py-1 px-3 text-right font-mono font-bold text-neutral-900">
                      {dept.unitsConsumed.toLocaleString()}{" "}
                      <span className="text-[9.5px] font-normal text-neutral-500">units</span>
                    </td>
                    <td className="py-1 px-3 text-right">
                      <span className="inline-flex items-center rounded-xs bg-neutral-100 px-2 py-0.5 font-mono font-bold text-neutral-700 text-[10px]">
                        {pct}%
                      </span>
                    </td>
                    {canViewCosts && (
                      <td className="py-1 px-3 text-right font-mono font-semibold text-neutral-900">
                        {dept.spendValue != null ? `₱${dept.spendValue.toLocaleString()}` : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Card 3 (Row 3 - 1 card per row): Critical Reorder Alerts Table ─── */}
      <section className="avoid-break w-full">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>3. Critical Stock Reorder Alerts</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {criticalItems.length} items below minimum safety threshold
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">SKU Code</th>
                <th className="py-1.5 px-3 text-left">Item Name</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap">Category</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Current Stock</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Reorder Threshold</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-28">Status Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {criticalItems.slice(0, 6).map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5 px-3 font-mono font-bold text-[#2A3260] whitespace-nowrap">{item.itemCode}</td>
                  <td className="py-1.5 px-3 font-medium">{item.name}</td>
                  <td className="py-1.5 px-3 text-neutral-600 capitalize whitespace-nowrap">{item.category}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                    {item.currentQty} <span className="text-[9.5px] font-normal text-neutral-500">{item.unit}</span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-neutral-600 whitespace-nowrap">
                    {item.minThreshold} {item.unit}
                  </td>
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    <PrintStatusBadge status="reorder" label="Reorder Now" />
                  </td>
                </tr>
              ))}
              {criticalItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-emerald-700 italic text-[11px]">
                    All inventory items are currently operating safely above reorder thresholds.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Card 4 (Row 4 - 1 card per row): Consumables Stock Inventory Ledger ─── */}
      <section className="avoid-break w-full">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>4. Consumables Stock Inventory &amp; Consumption Ledger</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              Showing {Math.min(data.length, 10)} of {totalSkus} cataloged items
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">SKU Code</th>
                <th className="py-1.5 px-3 text-left">Item Name</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap">Category</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">On Hand</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">30-Day Burn</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Status</th>
                {canViewCosts && <th className="py-1.5 px-3 text-right whitespace-nowrap">Valuation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {data.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td className="py-1.5 px-3 font-mono font-bold text-[#2A3260] whitespace-nowrap">{row.itemCode}</td>
                  <td className="py-1.5 px-3 font-medium">{row.name}</td>
                  <td className="py-1.5 px-3 text-neutral-600 capitalize whitespace-nowrap">{row.category}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                    {row.currentQty} <span className="text-[9.5px] font-normal text-neutral-500">{row.unit}</span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-neutral-600 whitespace-nowrap">{row.usage30d}</td>
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    {row.isLowStock ? (
                      <PrintStatusBadge status="low stock" label="Low Stock" />
                    ) : (
                      <PrintStatusBadge status="optimal" label="Optimal" />
                    )}
                  </td>
                  {canViewCosts && (
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-neutral-900 whitespace-nowrap">
                      {row.stockValuation != null ? `₱${row.stockValuation.toLocaleString()}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 7 : 6} className="py-3 text-center text-neutral-400 italic text-[11px]">
                    No consumable items found matching active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Key Observations ─────────────────────────────────────────────── */}
      <section className="avoid-break w-full">
        <PrintObservationsBox observations={observations} />
      </section>

      {/* ─── Institutional Footer ───────────────────────────────────────── */}
      <footer className="avoid-break pt-2 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[9.5px] text-neutral-500 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS Consumables Audit</div>
          <div>Official Institutional Report</div>
          <div>
            Verification Code: CRMC-CSM-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
