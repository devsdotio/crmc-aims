"use client";

import { Fragment, useMemo } from "react";
import type { ConsumableStockRow, ConsumableStockSummary, BaseReportFilters } from "@/types/reports";
import { normalizeConsumableClassification } from "@/lib/consumable-classification";

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

interface ConsumableCategoryGroup {
  categoryName: string;
  groupAvailable: number;
  groupReserved: number;
  groupEndingBalance: number;
  groupIssued: number;
  groupTotalValue: number;
  groupCount: number;
  items: { row: ConsumableStockRow; itemNo: number }[];
}

function buildCategoryGroups(items: ConsumableStockRow[]): ConsumableCategoryGroup[] {
  const map = new Map<string, ConsumableStockRow[]>();
  items.forEach((item) => {
    const rawCat = item.category?.trim();
    const cat = rawCat && rawCat.length > 0 ? rawCat : "Uncategorized";
    const capitalized = cat.charAt(0).toUpperCase() + cat.slice(1);
    if (!map.has(capitalized)) {
      map.set(capitalized, []);
    }
    map.get(capitalized)!.push(item);
  });

  const sortedEntries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const result: ConsumableCategoryGroup[] = [];
  let currentItemNo = 0;

  for (const [categoryName, groupItems] of sortedEntries) {
    const groupEndingBalance = groupItems.reduce((sum, item) => sum + (item.currentQty || 0), 0);
    const groupReserved = groupItems.reduce((sum, item) => sum + (item.reservedQty || 0), 0);
    const groupAvailable = groupItems.reduce(
      (sum, item) => sum + (item.availableQty ?? Math.max(0, (item.currentQty || 0) - (item.reservedQty || 0))),
      0
    );
    const groupIssued = groupItems.reduce((sum, item) => sum + (item.usage30d || 0), 0);
    const groupTotalValue = groupItems.reduce((sum, item) => sum + (item.stockValuation || 0), 0);

    const itemsWithNumbers: { row: ConsumableStockRow; itemNo: number }[] = [];
    for (const row of groupItems) {
      currentItemNo += 1;
      itemsWithNumbers.push({ row, itemNo: currentItemNo });
    }
    result.push({
      categoryName,
      groupAvailable,
      groupReserved,
      groupEndingBalance,
      groupIssued,
      groupTotalValue,
      groupCount: groupItems.length,
      items: itemsWithNumbers,
    });
  }

  return result;
}

export function ConsumablesPrintableReport({
  data = [],
  summary,
  canViewCosts = true,
  filters,
  generatedAt = new Date(),
}: ConsumablesPrintableReportProps) {
  const partFilter =
    filters?.classification === "supply" || filters?.classification === "material"
      ? filters.classification
      : "all";
  const showSupplies = partFilter === "all" || partFilter === "supply";
  const showMaterials = partFilter === "all" || partFilter === "material";

  const { part1Items, part2Items } = useMemo(() => {
    const supplies: ConsumableStockRow[] = [];
    const materials: ConsumableStockRow[] = [];
    for (const item of data) {
      if (normalizeConsumableClassification(item.classification) === "material") {
        materials.push(item);
      } else {
        supplies.push(item);
      }
    }
    return { part1Items: supplies, part2Items: materials };
  }, [data]);

  const part1Groups = useMemo(() => buildCategoryGroups(part1Items), [part1Items]);
  const part2Groups = useMemo(() => buildCategoryGroups(part2Items), [part2Items]);

  const calcPartTotals = (items: ConsumableStockRow[]) => {
    const count = items.length;
    const lowStock = items.filter((d) => d.isLowStock || (d.availableQty ?? d.currentQty) <= d.minThreshold).length;
    const valuation = items.reduce((sum, d) => sum + (d.stockValuation || 0), 0);
    const issued = items.reduce((sum, d) => sum + (d.usage30d || 0), 0);
    const onHand = items.reduce((sum, d) => sum + (d.currentQty || 0), 0);
    const reserved = items.reduce((sum, d) => sum + (d.reservedQty || 0), 0);
    const available = items.reduce(
      (sum, d) => sum + (d.availableQty ?? Math.max(0, (d.currentQty || 0) - (d.reservedQty || 0))),
      0
    );
    return { count, lowStock, valuation, issued, onHand, reserved, available };
  };

  const part1Totals = useMemo(() => calcPartTotals(part1Items), [part1Items]);
  const part2Totals = useMemo(() => calcPartTotals(part2Items), [part2Items]);

  const totalSkus = summary?.totalSkus ?? data.length;
  const lowStockCount = summary?.lowStockItemsCount ?? (part1Totals.lowStock + part2Totals.lowStock);
  const totalValuation = summary?.totalInventoryValuation ?? (part1Totals.valuation + part2Totals.valuation);
  const totalDispatched = summary?.totalDispatched30d ?? (part1Totals.issued + part2Totals.issued);
  const optimalCount = Math.max(0, totalSkus - lowStockCount);

  const formattedGeneratedDate = formatChedDate(generatedAt.toISOString().slice(0, 10));

  // Determine reporting period display
  const reportingPeriod =
    filters?.startDate && filters?.endDate
      ? `${formatChedDate(filters.startDate)} to ${formatChedDate(filters.endDate)}`
      : filters?.startDate
      ? `From ${formatChedDate(filters.startDate)}`
      : `As of ${formattedGeneratedDate}`;

  const controlPrefix =
    partFilter === "supply"
      ? "CRMC-CUST-SUP"
      : partFilter === "material"
      ? "CRMC-CUST-MAT"
      : "CRMC-CUST-CSM";
  const controlNumber = `${controlPrefix}-${generatedAt.getFullYear()}${String(generatedAt.getMonth() + 1).padStart(2, "0")}-${String(generatedAt.getDate()).padStart(2, "0")}`;

  return (
    <div className="print-page mx-auto w-full bg-white text-black text-[9.5px] leading-tight font-sans space-y-2 p-0">

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
      <section className="avoid-break grid grid-cols-2 sm:grid-cols-5 print:grid-cols-[repeat(auto-fit,minmax(1.3in,1fr))] gap-2 text-center text-[10px] text-black">
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Part I · Supplies ({part1Totals.count} SKUs)
          </span>
          <span className="text-sm font-black font-mono">
            {canViewCosts ? formatPhp(part1Totals.valuation) : `${part1Totals.onHand.toLocaleString()} units`}
          </span>
          <span className="text-[8px] font-mono block">
            {part1Totals.lowStock} low stock
          </span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Part II · Materials ({part2Totals.count} SKUs)
          </span>
          <span className="text-sm font-black font-mono">
            {canViewCosts ? formatPhp(part2Totals.valuation) : `${part2Totals.onHand.toLocaleString()} units`}
          </span>
          <span className="text-[8px] font-mono block">
            {part2Totals.lowStock} low stock
          </span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Below Reorder Point
          </span>
          <span className="text-sm font-black font-mono">
            {lowStockCount} / {totalSkus}
          </span>
          <span className="text-[8px] font-mono block">
            {optimalCount} optimal buffer
          </span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            30-Day Issued Volume
          </span>
          <span className="text-sm font-black font-mono">{totalDispatched.toLocaleString()}</span>
          <span className="text-[8px] font-mono block">
            {part1Totals.issued.toLocaleString()} Sup · {part2Totals.issued.toLocaleString()} Mat
          </span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Combined Valuation
          </span>
          <span className="text-sm font-black font-mono">
            {canViewCosts ? formatPhp(totalValuation) : "—"}
          </span>
          <span className="text-[8px] font-mono block">{totalSkus} total SKUs</span>
        </div>
      </section>

      {/* ─── 3. Standard CHED Separated Supplies & Materials Ledgers ───────── */}
      {[
        ...(showSupplies
          ? [
              {
                key: "part-1-supplies",
                partTitle: "Part I — Consumable Supplies (Office, Classroom & Institutional Stocks)",
                classTag: "SUPPLY",
                groups: part1Groups,
                totals: part1Totals,
                subtotalLabel: "Part I Supplies Subtotal:",
                emptyText: "No consumable supplies found matching specified filter criteria.",
              },
            ]
          : []),
        ...(showMaterials
          ? [
              {
                key: "part-2-materials",
                partTitle: "Part II — Consumable Materials (Construction, Maintenance & Project Materials)",
                classTag: "MATERIAL",
                groups: part2Groups,
                totals: part2Totals,
                subtotalLabel: "Part II Materials Subtotal:",
                emptyText: "No consumable materials found matching specified filter criteria.",
              },
            ]
          : []),
      ].map((part) => (
        <section key={part.key} className="w-full space-y-1">
          <div className="border-2 border-black overflow-hidden print:overflow-visible bg-white">
            <div className="bg-white border-b-2 border-black px-2.5 py-1.5 flex items-center justify-between text-black">
              <span className="text-[10px] font-black uppercase tracking-wider">
                {part.partTitle}
              </span>
              <span className="text-[8.5px] font-mono font-bold uppercase">
                {part.totals.count} SKU(s) · {part.totals.lowStock} Low Stock
              </span>
            </div>
            <table className="w-full border-collapse text-left text-[9px] text-black">
              <thead>
                <tr className="bg-white text-black border-b-2 border-black uppercase font-bold text-[8.5px] tracking-wider avoid-orphan-header">
                  <th className="py-2 px-1 text-center w-8 border-r border-black">Item No.</th>
                  <th className="py-2 px-2 border-r border-black">Stock / Item Description</th>
                  <th className="py-2 px-1.5 text-center border-r border-black">Class</th>
                  <th className="py-2 px-1.5 text-center border-r border-black">Unit</th>
                  <th className="py-2 px-1.5 text-right border-r border-black whitespace-nowrap">Available</th>
                  <th className="py-2 px-1.5 text-right border-r border-black whitespace-nowrap">Reserved</th>
                  <th className="py-2 px-1.5 text-right border-r border-black whitespace-nowrap">Issued (30d)</th>
                  <th className="py-2 px-1.5 text-right border-r border-black whitespace-nowrap">On-Hand</th>
                  <th className="py-2 px-1.5 text-right border-r border-black whitespace-nowrap">Unit Cost</th>
                  <th className="py-2 px-1.5 text-right border-r border-black whitespace-nowrap">Total Value</th>
                  <th className="py-2 px-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/40 text-black">
                {part.groups.map((group) => (
                  <Fragment key={group.categoryName}>
                    <tr className="bg-white font-bold border-t-2 border-black text-black category-header-row avoid-orphan-header">
                      <td colSpan={11} className="py-1 px-2 text-[9px] uppercase tracking-wider font-black">
                        Category: {group.categoryName} ({group.groupCount} {group.groupCount === 1 ? "stock item" : "stock items"})
                      </td>
                    </tr>

                    {group.items.map(({ row, itemNo }) => {
                      const availableQty =
                        row.availableQty ?? Math.max(0, (row.currentQty ?? 0) - (row.reservedQty ?? 0));
                      const reservedQty = row.reservedQty ?? 0;
                      const isLow = row.isLowStock || availableQty <= row.minThreshold;
                      const calculatedUnitCost =
                        row.unitCost != null
                          ? row.unitCost
                          : row.stockValuation != null && row.currentQty > 0
                          ? row.stockValuation / row.currentQty
                          : null;

                      const unitCostDisplay = calculatedUnitCost != null ? formatPhp(calculatedUnitCost) : "—";
                      const totalValueDisplay = row.stockValuation != null ? formatPhp(row.stockValuation) : "—";
                      const issuedDisplay = row.usage30d != null ? row.usage30d.toLocaleString() : "0";
                      const remarks = isLow
                        ? `Low stock; below reorder buffer (${row.minThreshold} ${row.unit})`
                        : `Optimal buffer (Safety threshold: ${row.minThreshold} ${row.unit})`;

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
                          <td className="py-1 px-2 border-r border-black text-center font-bold text-[8px] uppercase">
                            <span className="border border-black px-1 py-0.5 rounded-xs">
                              {part.classTag}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-center border-r border-black uppercase text-[8px]">
                            {row.unit || "unit"}
                          </td>
                          <td className="py-1 px-2 text-right font-mono border-r border-black">
                            {availableQty.toLocaleString()}
                          </td>
                          <td className="py-1 px-2 text-right font-mono border-r border-black">
                            {reservedQty.toLocaleString()}
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

                    <tr className="bg-white font-bold border-t border-b-2 border-black text-black text-[9px]">
                      <td colSpan={4} className="py-1 px-2 text-right uppercase tracking-wider border-r border-black">
                        Subtotal ({group.categoryName}):
                      </td>
                      <td className="py-1 px-2 text-right font-mono border-r border-black">
                        {group.groupAvailable.toLocaleString()}
                      </td>
                      <td className="py-1 px-2 text-right font-mono border-r border-black">
                        {group.groupReserved.toLocaleString()}
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
                        {group.groupCount} line(s)
                      </td>
                    </tr>
                  </Fragment>
                ))}

                {part.totals.count === 0 && (
                  <tr>
                    <td colSpan={11} className="py-4 text-center italic text-[9.5px]">
                      {part.emptyText}
                    </td>
                  </tr>
                )}
              </tbody>

              {part.totals.count > 0 && (
                <tfoot>
                  <tr className="bg-white font-black border-t-2 border-black text-black text-[9.5px]">
                    <td colSpan={4} className="py-1.5 px-2 text-right uppercase tracking-wider border-r border-black">
                      {part.subtotalLabel}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                      {part.totals.available.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                      {part.totals.reserved.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                      {part.totals.issued.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                      {part.totals.onHand.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black text-center font-mono">
                      —
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                      {canViewCosts ? formatPhp(part.totals.valuation) : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-[8.5px] font-sans font-normal">
                      {part.totals.count} SKU(s) verified
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      ))}

      {partFilter === "all" && data.length > 0 && (
        <section className="avoid-break border-2 border-black bg-white px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 text-[9.5px] font-black text-black">
          <span className="uppercase tracking-wider">
            Combined Grand Total (Part I Supplies + Part II Materials):
          </span>
          <div className="flex flex-wrap items-center gap-4 font-mono">
            <span>SKUs: {totalSkus}</span>
            <span>Available: {(part1Totals.available + part2Totals.available).toLocaleString()}</span>
            <span>Reserved: {(part1Totals.reserved + part2Totals.reserved).toLocaleString()}</span>
            <span>Issued 30d: {totalDispatched.toLocaleString()}</span>
            <span>On-Hand: {(part1Totals.onHand + part2Totals.onHand).toLocaleString()}</span>
            <span>Total Valuation: {canViewCosts ? formatPhp(totalValuation) : "—"}</span>
          </div>
        </section>
      )}

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
