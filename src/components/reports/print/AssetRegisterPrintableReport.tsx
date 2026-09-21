"use client";

import { Fragment, useMemo } from "react";
import type { AssetRegisterRow, AssetRegisterSummary, BaseReportFilters } from "@/types/reports";

interface AssetRegisterPrintableReportProps {
  data: AssetRegisterRow[];
  summary?: AssetRegisterSummary;
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

/** Normalizes asset condition to standard CHED/COA terminology (Good/Serviceable/Unserviceable). */
function formatChedCondition(status: string): string {
  if (status === "active") {
    return "Good / Serviceable";
  }
  if (status === "needs_repair") {
    return "Unserviceable (For Repair)";
  }
  if (status === "out_of_service") {
    return "Unserviceable";
  }
  if (status === "retired" || status === "disposed") {
    return "Disposed / Condemned";
  }
  return "Serviceable";
}

export function AssetRegisterPrintableReport({
  data = [],
  summary,
  canViewCosts = true,
  filters,
  generatedAt = new Date(),
}: AssetRegisterPrintableReportProps) {
  const totalAssets = summary?.totalAssets || data.length || 0;
  const activeCount = summary?.activeCount || data.filter((d) => d.status === "active").length;
  const repairCount = summary?.needsRepairCount || data.filter((d) => d.status === "needs_repair").length;
  const oosCount = summary?.outOfServiceCount || data.filter((d) => d.status === "out_of_service").length;
  const retiredCount = summary?.retiredCount || data.filter((d) => d.status === "retired").length;
  const totalValuation = summary?.totalValuation || data.reduce((sum, d) => sum + (d.purchaseCost || d.currentValue || 0), 0);

  const formattedGeneratedDate = formatChedDate(generatedAt.toISOString().slice(0, 10));

  // Determine reporting period display
  const reportingPeriod =
    filters?.startDate && filters?.endDate
      ? `${formatChedDate(filters.startDate)} to ${formatChedDate(filters.endDate)}`
      : filters?.startDate
      ? `From ${formatChedDate(filters.startDate)}`
      : `As of ${formattedGeneratedDate}`;

  const controlNumber = `CRMC-CUST-PPE-${generatedAt.getFullYear()}${String(generatedAt.getMonth() + 1).padStart(2, "0")}-${String(generatedAt.getDate()).padStart(2, "0")}`;

  // Purely pre-calculate grouped categories with sequential item numbering
  const categoryGroupsWithIndices = useMemo(() => {
    const map = new Map<string, AssetRegisterRow[]>();
    data.forEach((item) => {
      const cat = (item.category || "General Equipment").trim();
      const capitalized = cat.charAt(0).toUpperCase() + cat.slice(1);
      if (!map.has(capitalized)) {
        map.set(capitalized, []);
      }
      map.get(capitalized)!.push(item);
    });

    const sortedEntries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const result: {
      categoryName: string;
      groupQty: number;
      groupTotalCost: number;
      items: { row: AssetRegisterRow; itemNo: number }[];
    }[] = [];

    let currentItemNo = 0;
    for (const [categoryName, items] of sortedEntries) {
      const groupQty = items.length;
      const groupTotalCost = items.reduce((sum, item) => sum + (item.purchaseCost || 0), 0);
      const itemsWithNumbers: { row: AssetRegisterRow; itemNo: number }[] = [];
      for (const row of items) {
        currentItemNo += 1;
        itemsWithNumbers.push({ row, itemNo: currentItemNo });
      }
      result.push({
        categoryName,
        groupQty,
        groupTotalCost,
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
              Report on the Physical Count of Property, Plant and Equipment (RPCPPE)
            </h1>
            <div className="text-[10px] font-medium mt-0.5 text-black">
              <span className="font-bold">Reporting Period:</span> {reportingPeriod}
            </div>
          </div>
          <div className="text-right text-[9px] font-mono text-black">
            <span>CHED / COA Property Accountability Standard</span>
          </div>
        </div>
      </header>

      {/* ─── 2. Quantitative Summary Rollup (Pure Black Ink) ──────────────── */}
      <section className="avoid-break grid grid-cols-5 gap-2 text-center text-[10px] text-black">
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Total Equipment Units
          </span>
          <span className="text-sm font-black font-mono">{totalAssets}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Good / Serviceable
          </span>
          <span className="text-sm font-black font-mono">{activeCount}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Under Maintenance
          </span>
          <span className="text-sm font-black font-mono">{repairCount}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Unserviceable / OOS
          </span>
          <span className="text-sm font-black font-mono">{oosCount + retiredCount}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Total Fleet Cost / Value
          </span>
          <span className="text-sm font-black font-mono">
            {canViewCosts ? formatPhp(totalValuation) : "—"}
          </span>
        </div>
      </section>

      {/* ─── 3. Standard CHED Custodian RPCPPE Table (Pure Black Ink) ─────── */}
      <section className="w-full">
        <div className="border-2 border-black overflow-hidden bg-white">
          <table className="w-full border-collapse text-left text-[9px] text-black">
            <thead>
              <tr className="bg-white text-black border-b-2 border-black uppercase font-bold text-[8.5px] tracking-wider avoid-orphan-header">
                <th className="py-2 px-1 text-center w-8 border-r border-black">Item No.</th>
                <th className="py-2 px-2 border-r border-black min-w-36">Property / Article Description</th>
                <th className="py-2 px-2 border-r border-black whitespace-nowrap">Property No. / Tag</th>
                <th className="py-2 px-2 border-r border-black whitespace-nowrap">Date Acquired</th>
                <th className="py-2 px-1 text-center border-r border-black w-10">Unit</th>
                <th className="py-2 px-1 text-right border-r border-black w-9">Qty</th>
                <th className="py-2 px-2 text-right border-r border-black whitespace-nowrap">Unit Cost</th>
                <th className="py-2 px-2 text-right border-r border-black whitespace-nowrap">Total Cost</th>
                <th className="py-2 px-2 border-r border-black min-w-28">Location / Office Assigned</th>
                <th className="py-2 px-2 border-r border-black text-center whitespace-nowrap">Condition</th>
                <th className="py-2 px-2 border-r border-black min-w-28">Accountable Person</th>
                <th className="py-2 px-2 min-w-24">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/40 text-black">
              {categoryGroupsWithIndices.map((group) => {
                return (
                  <Fragment key={group.categoryName}>
                    {/* Category Group Header */}
                    <tr className="bg-white font-bold border-t-2 border-black text-black category-header-row avoid-orphan-header">
                      <td colSpan={12} className="py-1 px-2 text-[9px] uppercase tracking-wider font-black">
                        Category: {group.categoryName} ({group.groupQty} {group.groupQty === 1 ? "unit" : "units"})
                      </td>
                    </tr>

                    {group.items.map(({ row, itemNo }) => {
                      const conditionLabel = formatChedCondition(row.status);
                      const assignedLocation = [row.location, row.department].filter(Boolean).join(" - ") || "[TO BE FILLED]";
                      const accountableOfficer = row.currentHolder || "[TO BE FILLED]";
                      const unitCost = row.purchaseCost != null ? formatPhp(row.purchaseCost) : "[TO BE FILLED]";
                      const totalCost = row.purchaseCost != null ? formatPhp(row.purchaseCost) : "[TO BE FILLED]";

                      const remarks =
                        row.status === "needs_repair"
                          ? "Subject to maintenance inspection"
                          : row.status === "out_of_service"
                          ? "Decommissioned; pending repair"
                          : row.status === "retired" || row.status === "disposed"
                          ? "Approved for disposal/condemnation"
                          : "In regular operational service";

                      return (
                        <tr key={row.id}>
                          <td className="py-1 px-1 text-center font-mono font-bold border-r border-black">
                            {itemNo}
                          </td>
                          <td className="py-1 px-2 border-r border-black font-semibold text-black">
                            <div>{row.name}</div>
                            {row.serialNumber && (
                              <div className="text-[8px] font-mono font-normal">
                                SN: {row.serialNumber}
                              </div>
                            )}
                          </td>
                          <td className="py-1 px-2 border-r border-black font-mono font-bold whitespace-nowrap">
                            {row.assetCode || "[TO BE FILLED]"}
                          </td>
                          <td className="py-1 px-2 border-r border-black font-mono whitespace-nowrap">
                            {row.purchaseDate ? formatChedDate(row.purchaseDate) : "[TO BE FILLED]"}
                          </td>
                          <td className="py-1 px-1 text-center border-r border-black uppercase text-[8px]">
                            Unit
                          </td>
                          <td className="py-1 px-1 text-right font-mono font-bold border-r border-black">
                            1
                          </td>
                          <td className="py-1 px-2 text-right font-mono border-r border-black whitespace-nowrap">
                            {canViewCosts ? unitCost : "—"}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-semibold border-r border-black whitespace-nowrap">
                            {canViewCosts ? totalCost : "—"}
                          </td>
                          <td className="py-1 px-2 border-r border-black">
                            {assignedLocation}
                          </td>
                          <td className="py-1 px-2 border-r border-black text-center whitespace-nowrap">
                            <span className="font-semibold text-[8px] uppercase">
                              {conditionLabel}
                            </span>
                          </td>
                          <td className="py-1 px-2 border-r border-black font-medium">
                            {accountableOfficer}
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
                      <td className="py-1 px-1 text-right font-mono border-r border-black">
                        {group.groupQty}
                      </td>
                      <td className="py-1 px-2 border-r border-black text-center font-mono">
                        —
                      </td>
                      <td className="py-1 px-2 text-right font-mono border-r border-black">
                        {canViewCosts ? formatPhp(group.groupTotalCost) : "—"}
                      </td>
                      <td colSpan={4} className="py-1 px-2 italic text-[8px]">
                        Subtotal reflects {group.groupQty} serialized unit(s)
                      </td>
                    </tr>
                  </Fragment>
                );
              })}

              {data.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-6 text-center italic text-[10px]">
                    No capital assets found matching specified filter criteria.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Grand Total Rollup */}
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-white font-black border-t-2 border-b-2 border-black text-black text-[9.5px]">
                  <td colSpan={5} className="py-1.5 px-2 text-right uppercase tracking-wider border-r border-black">
                    Grand Total Physical Count:
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono border-r border-black">
                    {totalAssets}
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-center font-mono">
                    —
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                    {canViewCosts ? formatPhp(totalValuation) : "—"}
                  </td>
                  <td colSpan={4} className="py-1.5 px-2 text-[8.5px] font-sans font-normal">
                    Verified physical inventory count against Property Custodian ledger records.
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
          <div>Official CHED RPCPPE Standard Form · Pure Black Ink Folio</div>
          <div suppressHydrationWarning>
            Verification: {controlNumber}
          </div>
        </div>
      </footer>
    </div>
  );
}
