"use client";

import type { RequestReportRow, RequestsSummary, BaseReportFilters } from "@/types/reports";

interface RequestsPrintableReportProps {
  data: RequestReportRow[];
  summary?: RequestsSummary;
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

export function RequestsPrintableReport({
  data = [],
  summary,
  filters,
  generatedAt = new Date(),
}: RequestsPrintableReportProps) {
  const totalRequests = summary?.totalRequests || data.length || 0;
  const pendingCount = summary?.pendingCount || data.filter((d) => d.status === "pending").length;
  const approvedCount = summary?.approvedCount || data.filter((d) => d.status === "approved").length;
  const fulfilledCount = summary?.fulfilledCount || data.filter((d) => d.status === "fulfilled").length;
  const rejectedCount = summary?.rejectedCount || data.filter((d) => d.status === "rejected").length;
  const avgTurnaround = summary?.avgTurnaroundHours || 0;
  const fulfillmentRate = totalRequests > 0 ? Math.round((fulfilledCount / totalRequests) * 100) : 0;

  const formattedGeneratedDate = formatChedDate(generatedAt.toISOString().slice(0, 10));
  const reportingPeriod = filters?.startDate && filters?.endDate
    ? `${formatChedDate(filters.startDate)} to ${formatChedDate(filters.endDate)}`
    : `As of ${formattedGeneratedDate}`;

  const controlNumber = `CRMC-CUST-REQ-${generatedAt.getFullYear()}${String(generatedAt.getMonth() + 1).padStart(2, "0")}-${String(generatedAt.getDate()).padStart(2, "0")}`;

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
          thead {
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
              Custodian Report on Department Supplies &amp; Equipment Requisitions
            </h1>
            <div className="text-[10px] font-medium mt-0.5 text-black">
              <span className="font-bold">Reporting Period:</span> {reportingPeriod}
            </div>
          </div>
          <div className="text-right text-[9px] font-mono text-black">
            <span>CHED / COA Requisition Accountability Standard</span>
          </div>
        </div>
      </header>

      {/* ─── 2. Quantitative Summary Rollup (Pure Black Ink) ──────────────── */}
      <section className="avoid-break grid grid-cols-5 gap-2 text-center text-[10px] text-black">
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Total Requisitions
          </span>
          <span className="text-sm font-black font-mono">{totalRequests}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Pending Queue
          </span>
          <span className="text-sm font-black font-mono">{pendingCount}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Approved / Processing
          </span>
          <span className="text-sm font-black font-mono">{approvedCount}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Fulfilled Orders
          </span>
          <span className="text-sm font-black font-mono">{fulfilledCount}</span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Average SLA Turnaround
          </span>
          <span className="text-sm font-black font-mono">
            {avgTurnaround}h ({fulfillmentRate}%)
          </span>
        </div>
      </section>

      {/* ─── 3. Standard CHED Requisition Ledger Table (Pure Black Ink) ───── */}
      <section className="w-full">
        <div className="border-2 border-black overflow-hidden bg-white">
          <table className="w-full border-collapse text-left text-[9px] text-black">
            <thead>
              <tr className="bg-white text-black border-b-2 border-black uppercase font-bold text-[8.5px] tracking-wider avoid-orphan-header">
                <th className="py-2 px-1 text-center w-8 border-r border-black">Item No.</th>
                <th className="py-2 px-2 border-r border-black whitespace-nowrap">Request Code</th>
                <th className="py-2 px-2 border-r border-black min-w-32">Requester Name</th>
                <th className="py-2 px-2 border-r border-black min-w-32">Department</th>
                <th className="py-2 px-2 border-r border-black min-w-44">Requisition Summary</th>
                <th className="py-2 px-2 border-r border-black text-center whitespace-nowrap">Status</th>
                <th className="py-2 px-2 border-r border-black text-center whitespace-nowrap">Turnaround</th>
                <th className="py-2 px-2 min-w-28">Custodial Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/40 text-black">
              {data.map((row, index) => {
                const remarks =
                  row.status === "fulfilled"
                    ? "Items issued and signed for by requester"
                    : row.status === "approved"
                    ? "Approved by Dean/Head; pending store release"
                    : row.status === "rejected"
                    ? "Requisition disapproved / cancelled"
                    : "Awaiting administrative approval";

                return (
                  <tr key={row.id}>
                    <td className="py-1.5 px-1 text-center font-mono font-bold border-r border-black">
                      {index + 1}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black font-mono font-bold whitespace-nowrap">
                      {row.requestCode}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black font-semibold text-black">
                      {row.requesterName}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black">
                      {row.department || "—"}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black">
                      {row.itemsSummary || "—"}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black text-center whitespace-nowrap">
                      <span className="font-bold text-[8px] uppercase">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 border-r border-black text-center font-mono whitespace-nowrap">
                      {row.turnaroundHours != null ? `${row.turnaroundHours}h` : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-[8px]">
                      {remarks}
                    </td>
                  </tr>
                );
              })}

              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center italic text-[10px]">
                    No requisition pipeline records found matching specified filters.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Grand Total Row */}
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-white font-black border-t-2 border-b-2 border-black text-black text-[9.5px]">
                  <td colSpan={5} className="py-1.5 px-2 text-right uppercase tracking-wider border-r border-black">
                    Grand Total Requisition Orders:
                  </td>
                  <td className="py-1.5 px-2 text-center font-mono border-r border-black">
                    {totalRequests}
                  </td>
                  <td className="py-1.5 px-2 text-center font-mono border-r border-black">
                    {avgTurnaround}h Avg
                  </td>
                  <td className="py-1.5 px-2 text-[8.5px] font-sans font-normal">
                    {fulfilledCount} fulfilled, {pendingCount} pending, {rejectedCount} rejected.
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
              Administrative Officer / Auditor
            </div>
            <div className="text-[8.5px]">
              Supply Requisition Review Committee
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
          <div>Official CHED Requisition Summary Form · Pure Black Ink Folio</div>
          <div suppressHydrationWarning>
            Verification: {controlNumber}
          </div>
        </div>
      </footer>
    </div>
  );
}
