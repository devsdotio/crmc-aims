"use client";

import type { PurchaseOrderRow, PurchaseOrdersSummary, BaseReportFilters } from "@/types/reports";

interface ProcurementPrintableReportProps {
  data: PurchaseOrderRow[];
  summary?: PurchaseOrdersSummary;
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

export function ProcurementPrintableReport({
  data = [],
  summary,
  canViewCosts = true,
  filters,
  generatedAt = new Date(),
}: ProcurementPrintableReportProps) {
  const totalSpend = summary?.totalSpend ?? data.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const openOrders =
    summary?.openOrdersCount ??
    data.filter((d) => ["pending_approval", "approved", "ordered"].includes(d.status)).length;
  const deliveredCount =
    summary?.deliveredCount ??
    data.filter((d) => d.status === "delivered" || d.status === "received").length;
  const avgLeadTime = summary?.avgLeadTimeDays ?? 0;

  const suppliesSpend =
    summary?.suppliesSpend ??
    data.filter((d) => d.classification === "supply").reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const materialsSpend =
    summary?.materialsSpend ??
    data.filter((d) => d.classification === "material").reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const assetsSpend =
    summary?.assetsSpend ??
    data.filter((d) => d.itemType === "asset").reduce((sum, d) => sum + (d.totalAmount || 0), 0);

  const formattedGeneratedDate = formatChedDate(generatedAt.toISOString().slice(0, 10));
  const reportingPeriod = filters?.startDate && filters?.endDate
    ? `${formatChedDate(filters.startDate)} to ${formatChedDate(filters.endDate)}`
    : `As of ${formattedGeneratedDate}`;

  const controlNumber = `CRMC-CUST-PRC-${generatedAt.getFullYear()}${String(generatedAt.getMonth() + 1).padStart(2, "0")}-${String(generatedAt.getDate()).padStart(2, "0")}`;

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
              Custodian Report on Procurement, Acquisitions &amp; Purchase Orders
            </h1>
            <div className="text-[10px] font-medium mt-0.5 text-black">
              <span className="font-bold">Reporting Period:</span> {reportingPeriod}
            </div>
          </div>
          <div className="text-right text-[9px] font-mono text-black">
            <span>CHED / COA Procurement Accountability Standard</span>
          </div>
        </div>
      </header>

      {/* ─── 2. Quantitative Summary Rollup (Pure Black Ink) ──────────────── */}
      <section className="avoid-break grid grid-cols-2 sm:grid-cols-5 print:grid-cols-[repeat(auto-fit,minmax(1.3in,1fr))] gap-2 text-center text-[10px] text-black">
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Total Purchase Orders
          </span>
          <span className="text-sm font-black font-mono">{data.length}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Open / Pending Delivery
          </span>
          <span className="text-sm font-black font-mono">{openOrders}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Received / Delivered
          </span>
          <span className="text-sm font-black font-mono">{deliveredCount}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Average Lead Time
          </span>
          <span className="text-sm font-black font-mono">{avgLeadTime} Days</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Total Procurement Spend
          </span>
          <span className="text-sm font-black font-mono">
            {canViewCosts ? formatPhp(totalSpend) : "Restricted"}
          </span>
          {canViewCosts && (
            <span className="text-[7.5px] font-mono block">
              Sup: {formatPhp(suppliesSpend)} · Mat: {formatPhp(materialsSpend)} · Asset: {formatPhp(assetsSpend)}
            </span>
          )}
        </div>
      </section>

      {/* ─── 3. Standard CHED Procurement Ledger Table (Pure Black Ink) ───── */}
      <section className="w-full">
        <div className="border-2 border-black overflow-hidden print:overflow-visible bg-white">
          <table className="w-full border-collapse text-left text-[9px] text-black">
            <thead>
              <tr className="bg-white text-black border-b-2 border-black uppercase font-bold text-[8.5px] tracking-wider avoid-orphan-header">
                <th className="py-2 px-1 text-center w-8 border-r border-black">Item No.</th>
                <th className="py-2 px-2 border-r border-black whitespace-nowrap">PO Number</th>
                <th className="py-2 px-2 border-r border-black text-center whitespace-nowrap">Class / Type</th>
                <th className="py-2 px-2 border-r border-black min-w-36">Supplier / Vendor</th>
                <th className="py-2 px-2 border-r border-black min-w-44">Items Description Preview</th>
                <th className="py-2 px-2 border-r border-black text-center whitespace-nowrap">Status</th>
                <th className="py-2 px-2 border-r border-black text-center whitespace-nowrap">Lead Time</th>
                <th className="py-2 px-2 text-right border-r border-black whitespace-nowrap">Total Amount</th>
                <th className="py-2 px-2 min-w-28">Custodial Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/40 text-black">
              {data.map((row, index) => {
                const isDelivered = row.status === "delivered" || row.status === "received";
                const isCancelled = row.status === "cancelled";
                const classLabel =
                  row.classification === "supply"
                    ? "SUPPLY"
                    : row.classification === "material"
                    ? "MATERIAL"
                    : row.itemType === "asset"
                    ? "ASSET"
                    : row.itemType === "mixed"
                    ? "MIXED"
                    : "CONSUMABLE";
                const remarks = isDelivered
                  ? "Inspected, verified & accepted into inventory"
                  : isCancelled
                  ? "Order cancelled / voided"
                  : row.status === "ordered"
                  ? "Issued to supplier; awaiting delivery"
                  : "Awaiting approval / supplier fulfillment";

                return (
                  <tr key={row.poNumber}>
                    <td className="py-1.5 px-1 text-center font-mono font-bold border-r border-black">
                      {index + 1}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black font-mono font-bold whitespace-nowrap">
                      {row.poNumber}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black text-center whitespace-nowrap">
                      <span className="border border-black px-1 py-0.5 font-mono font-bold text-[7.5px] uppercase">
                        {classLabel}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 border-r border-black font-semibold text-black">
                      {row.supplierName}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black">
                      {row.itemsPreview || "—"}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black text-center whitespace-nowrap">
                      <span className="font-bold text-[8px] uppercase">
                        {row.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 border-r border-black text-center font-mono whitespace-nowrap">
                      {row.leadTimeDays != null ? `${row.leadTimeDays} days` : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold border-r border-black whitespace-nowrap">
                      {canViewCosts ? (row.totalAmount != null ? formatPhp(row.totalAmount) : "—") : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-[8px]">
                      {remarks}
                    </td>
                  </tr>
                );
              })}

              {data.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center italic text-[10px]">
                    No purchase order or acquisition records found matching specified filters.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Grand Total Row */}
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-white font-black border-t-2 border-b-2 border-black text-black text-[9.5px]">
                  <td colSpan={7} className="py-1.5 px-2 text-right uppercase tracking-wider border-r border-black">
                    Grand Total Acquisitions:
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                    {canViewCosts ? formatPhp(totalSpend) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-[8.5px] font-sans font-normal">
                    {deliveredCount} of {data.length} orders delivered ({Math.round((deliveredCount / (data.length || 1)) * 100)}% fulfillment).
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
              Procurement Officer / Auditor
            </div>
            <div className="text-[8.5px]">
              Bids &amp; Awards / Audit Committee
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
          <div>Official CHED Procurement Summary Form · Pure Black Ink Folio</div>
          <div suppressHydrationWarning>
            Verification: {controlNumber}
          </div>
        </div>
      </footer>
    </div>
  );
}
