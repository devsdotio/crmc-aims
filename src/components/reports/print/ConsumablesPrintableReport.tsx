"use client";

import { Fragment, useMemo } from "react";
import type { ConsumableStockRow, ConsumableStockSummary, BaseReportFilters } from "@/types/reports";

interface ConsumablesPrintableReportProps {
  data: ConsumableStockRow[];
  summary?: ConsumableStockSummary;
  canViewCosts?: boolean;
  filters?: BaseReportFilters;
  generatedAt?: Date;
}

/** Formats dates to standard CHED/COA DD-MMM-YYYY format (e.g., 15-Jan-2026). */
function formatChedDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mon = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${mon}-${year}`;
}

/** Formats currency with Philippine Peso symbol and two decimal places. */
function formatPhp(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ConsumablesPrintableReport({
  data = [],
  summary,
  canViewCosts = true,
  filters,
  generatedAt = new Date(),
}: ConsumablesPrintableReportProps) {
  const totalSkus = summary?.totalSkus || data.length || 0;
  const lowStockCount = summary?.lowStockItemsCount || data.filter((d) => d.isLowStock || d.currentQty <= d.minThreshold).length;
  const totalValuation = summary?.totalInventoryValuation || data.reduce((sum, d) => sum + (d.stockValuation || 0), 0);
  const totalDispatched = summary?.totalDispatched30d || data.reduce((sum, d) => sum + (d.usage30d || 0), 0);
  const optimalCount = Math.max(0, totalSkus - lowStockCount);

  const formattedGeneratedDate = formatChedDate(generatedAt.toISOString().slice(0, 10));

  // Determine reporting period display
  const reportingPeriod =
    filters?.startDate && filters?.endDate
      ? `${formatChedDate(filters.startDate)} to ${formatChedDate(filters.endDate)}`
      : filters?.startDate
      ? `From ${formatChedDate(filters.startDate)}`
      : `As of ${formattedGeneratedDate}`;

  const controlNumber = `CRMC-CUST-SUP-${generatedAt.getFullYear()}${String(generatedAt.getMonth() + 1).padStart(2, "0")}-${String(generatedAt.getDate()).padStart(2, "0")}`;

  // Pre-calculate grouped categories with continuous sequential item numbering
  const categoryGroupsWithIndices = useMemo(() => {
    const map = new Map<string, ConsumableStockRow[]>();
    data.forEach((item) => {
      const cat = (item.category || "General Supplies").trim();
      const capitalized = cat.charAt(0).toUpperCase() + cat.slice(1);
      if (!map.has(capitalized)) {
        map.set(capitalized, []);
      }
      map.get(capitalized)!.push(item);
    });

    const sortedEntries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const result: {
      categoryName: string;
      groupEndingBalance: number;
      groupIssued: number;
      groupTotalValue: number;
      groupCount: number;
      items: { row: ConsumableStockRow; itemNo: number }[];
    }[] = [];

    let currentItemNo = 0;
    for (const [categoryName, items] of sortedEntries) {
      const groupEndingBalance = items.reduce((sum, item) => sum + (item.currentQty || 0), 0);
      const groupIssued = items.reduce((sum, item) => sum + (item.usage30d || 0), 0);
      const groupTotalValue = items.reduce((sum, item) => sum + (item.stockValuation || 0), 0);
      const itemsWithNumbers: { row: ConsumableStockRow; itemNo: number }[] = [];
      for (const row of items) {
        currentItemNo += 1;
        itemsWithNumbers.push({ row, itemNo: currentItemNo });
      }
      result.push({
        categoryName,
        groupEndingBalance,
        groupIssued,
        groupTotalValue,
        groupCount: items.length,
        items: itemsWithNumbers,
      });
    }
    return result;
  }, [data]);

  return (
    <div className="print-page mx-auto w-full bg-white text-black text-[9.5px] leading-tight font-sans space-y-2 p-0">
      <style>{`
        @page {
          size: 14in 8.5in;
          margin: 10mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color: #000000 !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            vertical-align: top;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .print-page {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            background: #ffffff !important;
            vertical-align: top;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .print-page img {
            filter: none !important;
            -webkit-filter: none !important;
          }
          table {
            break-inside: auto;
          }
          tr {
            break-inside: auto;
            page-break-inside: auto;
          }
          thead, tr.category-header-row {
            break-inside: avoid;
            break-after: avoid;
            page-break-after: avoid;
          }
        }
      `}</style>

      {/* ─── 1. Formal Institutional Header Block (Pure Black Ink) ────────── */}
      <header className="avoid-break border-b-2 border-black pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/CRMC%20LOGO.png"
              alt="CRMC Seal"
              className="h-12 w-12 object-contain shrink-0"
            />
            <div className="space-y-0.5">
              <div className="text-[12px] font-black uppercase tracking-wide text-black">
                Cebu Roosevelt Memorial Colleges, Inc.
              </div>
              <div className="text-[10.5px] font-bold text-black uppercase tracking-wider">
                Property Custodian Office
              </div>
              <div className="text-[9px] text-black">
                Upper Pandan, Bogo City, Cebu, Philippines 6010 · aims@crmc.edu.ph
              </div>
            </div>
          </div>

          <div className="border border-black bg-white px-3 py-1 text-right font-mono text-[9px] space-y-0.5 shrink-0 text-black">
            <div>
              <span className="uppercase font-sans font-bold">Control No:</span>{" "}
              <span className="font-bold">{controlNumber}</span>
            </div>
            <div>
              <span className="uppercase font-sans font-bold">Date Printed:</span>{" "}
              <span className="font-semibold">{formattedGeneratedDate}</span>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-1.5 border-t border-black flex items-end justify-between text-black">
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase text-black">
              Report on the Physical Count of Inventories (RPCI) / Custodian Report of Supplies and Materials
            </h1>
            <div className="text-[10px] font-medium mt-0.5 text-black">
              <span className="font-bold">Reporting Period:</span> {reportingPeriod}
            </div>
          </div>
          <div className="text-right text-[9px] font-mono text-black">
            <span>CHED / COA Inventory Accountability Standard</span>
          </div>
        </div>
      </header>

      {/* ─── 2. Quantitative Summary Rollup (Pure Black Ink) ──────────────── */}
      <section className="avoid-break grid grid-cols-5 gap-2 text-center text-[10px] text-black">
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Cataloged Items (SKUs)
          </span>
          <span className="text-sm font-black font-mono">{totalSkus}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Optimal Stock Items
          </span>
          <span className="text-sm font-black font-mono">{optimalCount}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Below Reorder Point
          </span>
          <span className="text-sm font-black font-mono">{lowStockCount}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Recent Issued Volume
          </span>
          <span className="text-sm font-black font-mono">{totalDispatched.toLocaleString()}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Total Inventory Valuation
          </span>
          <span className="text-sm font-black font-mono">
            {canViewCosts ? formatPhp(totalValuation) : "—"}
          </span>
        </div>
      </section>

      {/* ─── 3. Standard CHED Custodian Supplies / Materials Table ────────── */}
      <section className="w-full">
        <div className="border-2 border-black overflow-hidden bg-white">
          <table className="w-full border-collapse text-left text-[9px] text-black">
            <thead>
              <tr className="bg-white text-black border-b-2 border-black uppercase font-bold text-[8.5px] tracking-wider avoid-orphan-header">
                <th className="py-2 px-1 text-center w-8 border-r border-black">Item No.</th>
                <th className="py-2 px-2 border-r border-black min-w-44">Stock / Item Description</th>
                <th className="py-2 px-2 text-center border-r border-black w-16">Unit of Measure</th>
                <th className="py-2 px-2 text-right border-r border-black whitespace-nowrap">Beginning Balance</th>
                <th className="py-2 px-2 text-right border-r border-black whitespace-nowrap">Received</th>
                <th className="py-2 px-2 text-right border-r border-black whitespace-nowrap">Issued</th>
                <th className="py-2 px-2 text-right border-r border-black whitespace-nowrap">Ending Balance</th>
                <th className="py-2 px-2 text-right border-r border-black whitespace-nowrap">Unit Cost</th>
                <th className="py-2 px-2 text-right border-r border-black whitespace-nowrap">Total Value</th>
                <th className="py-2 px-2 min-w-32">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/40 text-black">
              {categoryGroupsWithIndices.map((group) => {
                return (
                  <Fragment key={group.categoryName}>
                    {/* Category Group Header */}
                    <tr className="bg-white font-bold border-t-2 border-black text-black category-header-row avoid-orphan-header">
                      <td colSpan={10} className="py-1 px-2 text-[9px] uppercase tracking-wider font-black">
                        Category: {group.categoryName} ({group.groupCount} {group.groupCount === 1 ? "stock item" : "stock items"})
                      </td>
                    </tr>

                    {group.items.map(({ row, itemNo }) => {
                      const isLow = row.isLowStock || row.currentQty <= row.minThreshold;

                      const calculatedUnitCost =
                        row.unitCost != null
                          ? row.unitCost
                          : row.stockValuation != null && row.currentQty > 0
                          ? row.stockValuation / row.currentQty
                          : null;

                      const unitCostDisplay = calculatedUnitCost != null ? formatPhp(calculatedUnitCost) : "[TO BE FILLED]";
                      const totalValueDisplay = row.stockValuation != null ? formatPhp(row.stockValuation) : "[TO BE FILLED]";
                      const issuedDisplay = row.usage30d != null ? row.usage30d.toLocaleString() : "[TO BE FILLED]";

                      const remarks = isLow
                        ? `Critical stock; below reorder point (Buffer: ${row.minThreshold} ${row.unit})`
                        : `Stock level adequate (Safety threshold: ${row.minThreshold} ${row.unit})`;

                      return (
                        <tr key={row.id}>
                          <td className="py-1 px-1 text-center font-mono font-bold border-r border-black">
                            {itemNo}
                          </td>
                          <td className="py-1 px-2 border-r border-black font-medium text-black">
                            <div className="font-semibold">{row.name}</div>
                            <div className="text-[8px] font-mono">
                              SKU / Stock No: {row.itemCode}
                            </div>
                          </td>
                          <td className="py-1 px-2 text-center border-r border-black uppercase text-[8px]">
                            {row.unit || "unit"}
                          </td>
                          <td className="py-1 px-2 text-right font-mono border-r border-black">
                            [TO BE FILLED]
                          </td>
                          <td className="py-1 px-2 text-right font-mono border-r border-black">
                            [TO BE FILLED]
                          </td>
                          <td className="py-1 px-2 text-right font-mono border-r border-black">
                            {issuedDisplay}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-bold border-r border-black">
                            {row.currentQty.toLocaleString()}
                          </td>
                          <td className="py-1 px-2 text-right font-mono border-r border-black whitespace-nowrap">
                            {canViewCosts ? unitCostDisplay : "—"}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-semibold border-r border-black whitespace-nowrap">
                            {canViewCosts ? totalValueDisplay : "—"}
                          </td>
                          <td className="py-1 px-2 text-[8px]">
                            {remarks}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Category Subtotal */}
                    <tr className="bg-white font-bold border-t border-b-2 border-black text-black text-[9px]">
                      <td colSpan={5} className="py-1 px-2 text-right uppercase tracking-wider border-r border-black">
                        Subtotal for {group.categoryName}:
                      </td>
                      <td className="py-1 px-2 text-right font-mono border-r border-black">
                        {group.groupIssued.toLocaleString()}
                      </td>
                      <td className="py-1 px-2 text-right font-mono border-r border-black">
                        {group.groupEndingBalance.toLocaleString()}
                      </td>
                      <td className="py-1 px-2 border-r border-black text-center font-mono">
                        —
                      </td>
                      <td className="py-1 px-2 text-right font-mono border-r border-black">
                        {canViewCosts ? formatPhp(group.groupTotalValue) : "—"}
                      </td>
                      <td className="py-1 px-2 italic text-[8px]">
                        Subtotal for {group.groupCount} item line(s)
                      </td>
                    </tr>
                  </Fragment>
                );
              })}

              {data.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center italic text-[10px]">
                    No inventory supplies or materials found matching specified filter criteria.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Grand Total Rollup */}
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-white font-black border-t-2 border-b-2 border-black text-black text-[9.5px]">
                  <td colSpan={5} className="py-1.5 px-2 text-right uppercase tracking-wider border-r border-black">
                    Grand Total Supplies Count:
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                    {totalDispatched.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                    {data.reduce((sum, d) => sum + (d.currentQty || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-center font-mono">
                    —
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                    {canViewCosts ? formatPhp(totalValuation) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-[8.5px] font-sans font-normal">
                    Physical count inventory verified against Custodian stock cards.
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* ─── 4. Formal Quadruple Signature Block (Pure Black Ink) ─────────── */}
      <footer className="avoid-break pt-3 border-t-2 border-black space-y-3 text-black">
        <div className="grid grid-cols-4 gap-4 text-center">
          {/* 1. Prepared by */}
          <div className="space-y-1">
            <div className="text-[9px] font-bold uppercase tracking-wider text-left">
              Prepared by:
            </div>
            <div className="border-b border-black pt-7 mb-1" />
            <div className="text-[10px] font-bold uppercase">
              Property Custodian Staff
            </div>
            <div className="text-[8.5px]">
              Accountable Custodian Officer
            </div>
            <div className="text-[8.5px] font-mono">
              Date: ____________________
            </div>
          </div>

          {/* 2. Reviewed by */}
          <div className="space-y-1">
            <div className="text-[9px] font-bold uppercase tracking-wider text-left">
              Reviewed by:
            </div>
            <div className="border-b border-black pt-7 mb-1" />
            <div className="text-[10px] font-bold uppercase">
              Internal Auditor / Inventory Chair
            </div>
            <div className="text-[8.5px]">
              Audit &amp; Inspection Committee
            </div>
            <div className="text-[8.5px] font-mono">
              Date: ____________________
            </div>
          </div>

          {/* 3. Certified Correct by */}
          <div className="space-y-1">
            <div className="text-[9px] font-bold uppercase tracking-wider text-left">
              Certified Correct by:
            </div>
            <div className="border-b border-black pt-7 mb-1" />
            <div className="text-[10px] font-bold uppercase">
              Head Property Custodian
            </div>
            <div className="text-[8.5px]">
              Physical Plant &amp; Custodial Services
            </div>
            <div className="text-[8.5px] font-mono">
              Date: ____________________
            </div>
          </div>

          {/* 4. Approved by */}
          <div className="space-y-1">
            <div className="text-[9px] font-bold uppercase tracking-wider text-left">
              Approved by:
            </div>
            <div className="border-b border-black pt-7 mb-1" />
            <div className="text-[10px] font-bold uppercase">
              VP for Administration / President
            </div>
            <div className="text-[8.5px]">
              College Executive Administration
            </div>
            <div className="text-[8.5px] font-mono">
              Date: ____________________
            </div>
          </div>
        </div>

        <div className="mt-2 pt-1.5 border-t border-black flex items-center justify-between text-[8px] font-mono text-black">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS Custodian Office</div>
          <div>Official CHED RPCI Standard Form · Pure Black Ink Folio</div>
          <div suppressHydrationWarning>
            Verification: {controlNumber}
          </div>
        </div>
      </footer>
    </div>
  );
}
