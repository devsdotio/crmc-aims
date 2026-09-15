"use client";

import type { ConsumableItem } from "@/types/inventory";
import type { PurchaseLot } from "@/types/purchase-lots";
import type { StockMovement } from "@/features/stock-movements/client";
import {
  PrintMetricBar,
  PrintHorizontalDistribution,
  PrintStatusBadge,
  PrintSignatories,
} from "../PrintCharts";

export interface IndividualConsumablePrintableReportProps {
  item: {
    id: string;
    itemCode?: string | null;
    name: string;
    category?: string | null;
    unit?: string | null;
    currentQty?: number | null;
    reservedQty?: number | null;
    availableQty?: number | null;
    minThreshold?: number | null;
    location?: string | null;
    supplier?: string | null;
    unitCost?: number | string | null;
    stockValuation?: number | null;
    lastRestocked?: string | null;
  };
  lots?: PurchaseLot[];
  movements?: StockMovement[];
  generatedAt?: Date;
  canViewCosts?: boolean;
}

export function IndividualConsumablePrintableReport({
  item,
  lots = [],
  movements = [],
  generatedAt = new Date(),
  canViewCosts = true,
}: IndividualConsumablePrintableReportProps) {
  const formattedDate = generatedAt.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = generatedAt.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const skuCode = item.itemCode || `CON-${item.id}`;
  const totalStock = item.currentQty ?? 0;
  const minThreshold = item.minThreshold ?? 10;
  const unitPrice =
    item.unitCost != null
      ? Number(item.unitCost)
      : lots[0]?.unitCost
      ? Number(lots[0].unitCost)
      : 0;
  const totalValuation = item.stockValuation ?? totalStock * unitPrice;
  const isLow = totalStock <= minThreshold;

  // Aggregate department consumption from movements
  const deptConsumptionMap: Record<string, number> = {};
  for (const m of movements) {
    const isOut = m.direction === "out";
    const dept = m.destinationLabel;
    if (isOut && dept) {
      deptConsumptionMap[dept] = (deptConsumptionMap[dept] || 0) + Math.abs(m.qty ?? 0);
    }
  }

  const deptConsumptionList = Object.entries(deptConsumptionMap)
    .map(([dept, qty]) => ({
      departmentName: dept,
      unitsConsumed: qty,
      spendValue: qty * unitPrice,
    }))
    .sort((a, b) => b.unitsConsumed - a.unitsConsumed);

  const totalDeptConsumption = deptConsumptionList.reduce((sum, d) => sum + d.unitsConsumed, 0) || 1;

  const deptHorizontalBars = deptConsumptionList.map((d) => ({
    label: d.departmentName,
    value: d.unitsConsumed,
    displayValue: `${d.unitsConsumed.toLocaleString()} ${item.unit || "units"} (${Math.round((d.unitsConsumed / totalDeptConsumption) * 100)}%)`,
  }));

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
                Upper Pandan, Bogo City, Cebu, Philippines · Central Consumable Stores &amp; Supplies
              </div>
            </div>
          </div>
          <div suppressHydrationWarning className="rounded-xs border border-neutral-200 bg-neutral-50/80 px-2.5 py-1 text-right font-mono text-[9.5px] space-y-0.5 shrink-0">
            <div>
              <span className="text-neutral-500">Generated:</span>{" "}
              <span className="font-semibold text-neutral-800">{formattedDate}, {formattedTime}</span>
            </div>
            <div>
              <span className="text-neutral-500">Doc ID:</span>{" "}
              <span className="font-bold text-neutral-800">
                CSM-SKU-{skuCode}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Individual Consumable SKU Ledger &amp; Department Usage
            </h2>
            <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">
              SKU: <span className="font-bold text-neutral-800">{skuCode}</span> · Category: {item.category || "General Supply"}
            </div>
          </div>
          <span className="text-[9.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-xs">
            SKU Stock Ledger
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break">
        <PrintMetricBar
          metrics={[
            {
              label: "On-Hand Balance",
              value: `${totalStock.toLocaleString()} ${item.unit || "units"}`,
              delta: isLow ? "Below Safety Threshold" : "Buffer Optimal",
              deltaType: isLow ? "warning" : "positive",
              subtext: `Min threshold: ${minThreshold} ${item.unit || "units"}`,
            },
            {
              label: "Stock Valuation",
              value: canViewCosts && totalValuation > 0 ? `₱${totalValuation.toLocaleString()}` : "—",
              delta: canViewCosts && unitPrice > 0 ? `₱${unitPrice.toLocaleString()}/${item.unit || "unit"}` : "Cataloged",
              deltaType: "neutral",
              subtext: "Current stores value",
            },
            {
              label: "Safety Status",
              value: isLow ? "LOW STOCK" : "OPTIMAL",
              delta: isLow ? "Reorder Triggered" : "Adequate",
              deltaType: isLow ? "warning" : "positive",
              subtext: "Automated replenishment",
            },
            {
              label: "Tracked Batches",
              value: `${Math.max(lots.length, 1)} Lots`,
              delta: "Active Inbound",
              deltaType: "neutral",
              subtext: item.location || "Central Vault Shelf",
            },
          ]}
        />
      </section>

      {/* ─── Section 1: Item Catalog & Reorder Details ─────────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>1. Catalog Specifications &amp; Reorder Controls</span>
            <span className="text-[10px] text-neutral-500 font-mono">SKU: {skuCode}</span>
          </div>
          <div className="p-3 grid grid-cols-12 gap-2.5 text-[11px]">
            <div className="col-span-4 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Item Name</div>
              <div className="font-bold text-[#2A3260] text-[12px]">{item.name}</div>
            </div>
            <div className="col-span-4 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Category</div>
              <div className="font-semibold text-neutral-800 capitalize">{item.category || "General Supply"}</div>
            </div>
            <div className="col-span-4 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Unit of Measure</div>
              <div className="font-semibold text-neutral-800">{item.unit || "Piece / Box"}</div>
            </div>

            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Unit Cost / Valuation</div>
              <div className="font-mono font-bold text-neutral-800">{canViewCosts && unitPrice > 0 ? `₱${unitPrice.toLocaleString()}` : "—"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Safety Threshold</div>
              <div className="font-mono text-neutral-700">{minThreshold} {item.unit || "units"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Storage Location</div>
              <div className="text-neutral-700">{item.location || "Central Supply Store Room"}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 2: Department Consumption Distribution ─────────────────── */}
      <section className="avoid-break w-full">
        <PrintHorizontalDistribution
          title="2. Department Consumption Breakdown"
          items={deptHorizontalBars}
          valueSuffix={` ${item.unit || "units"}`}
          className="w-full"
        />
      </section>

      {/* ─── Section 3: Department Consumption Table ─────────────────────── */}
      <section className="avoid-break w-full">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>3. Department Consumption Ranking</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {deptConsumptionList.length} Departments Tracked
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3 text-center whitespace-nowrap w-12">Rank</th>
                <th className="py-1.5 px-3 text-left">Department Name</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Units Issued</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Volume Share %</th>
                {canViewCosts && <th className="py-1.5 px-3 text-right whitespace-nowrap">Spend Valuation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {deptConsumptionList.map((dept, index) => {
                const pct = Math.round((dept.unitsConsumed / totalDeptConsumption) * 100);
                return (
                  <tr key={dept.departmentName} className={index === 0 ? "bg-teal-50/40 font-semibold" : ""}>
                    <td className="py-1.5 px-3 text-center font-mono font-bold text-teal-800">
                      #{index + 1}
                    </td>
                    <td className="py-1.5 px-3 font-semibold text-[#2A3260]">
                      {dept.departmentName}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-neutral-900 whitespace-nowrap">
                      {dept.unitsConsumed.toLocaleString()}{" "}
                      <span className="text-[9.5px] font-normal text-neutral-500">{item.unit || "units"}</span>
                    </td>
                    <td className="py-1.5 px-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center rounded-xs bg-neutral-100 px-2 py-0.5 font-mono font-bold text-neutral-700 text-[10px]">
                        {pct}%
                      </span>
                    </td>
                    {canViewCosts && (
                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-neutral-900 whitespace-nowrap">
                        {dept.spendValue != null ? `₱${dept.spendValue.toLocaleString()}` : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
              {deptConsumptionList.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 5 : 4} className="py-3 text-center text-neutral-400 italic text-[11px]">
                    No departmental consumption data recorded for this SKU.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Signatories Block ───────────────────────────────────────────── */}
      <section className="avoid-break pt-1">
        <PrintSignatories
          signers={[
            {
              role: "Stock Custodian / Issuer",
              name: "Consumables Inventory In-Charge",
              title: "Property & Supply Division",
            },
            {
              role: "Audited & Verified By",
              name: "Internal Auditor",
              title: "Office of Quality Assurance & Audit",
            },
          ]}
        />
      </section>

      {/* ─── Institutional Footer ───────────────────────────────────────── */}
      <footer className="avoid-break pt-2 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[9.5px] text-neutral-500 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS Individual SKU Ledger</div>
          <div>Official Inventory Record</div>
          <div suppressHydrationWarning>
            Verification Code: CRMC-CSM-{skuCode}-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
