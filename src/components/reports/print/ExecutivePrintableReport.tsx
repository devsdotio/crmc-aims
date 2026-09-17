"use client";

import type { ExecutiveKpiSummary } from "@/types/reports";

interface ExecutivePrintableReportProps {
  data: ExecutiveKpiSummary;
  generatedAt?: Date;
  filtersSummary?: string;
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

export function ExecutivePrintableReport({
  data,
  generatedAt = new Date(),
  filtersSummary = "Scope: Institutional Rollup · Academic & Administrative Departments · All Categories",
}: ExecutivePrintableReportProps) {
  const { assets, consumables, procurement, requests, maintenance, charts, canViewCosts } = data;

  const operationalRate =
    assets?.totalCount && assets.totalCount > 0
      ? Math.round(((assets.activeCount || 0) / assets.totalCount) * 100)
      : 0;

  const formattedGeneratedDate = formatChedDate(generatedAt.toISOString().slice(0, 10));
  const controlNumber = `CRMC-CUST-EXEC-${generatedAt.getFullYear()}${String(generatedAt.getMonth() + 1).padStart(2, "0")}-${String(generatedAt.getDate()).padStart(2, "0")}`;

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
              Custodian Executive Summary &amp; Operational Domain Report
            </h1>
            <div className="text-[10px] font-medium mt-0.5 text-black">
              <span className="font-bold">Scope:</span> {filtersSummary}
            </div>
          </div>
          <div className="text-right text-[9px] font-mono text-black">
            <span>CHED / COA Custodian Accountability Standard</span>
          </div>
        </div>
      </header>

      {/* ─── 2. Quantitative Summary Rollup (Pure Black Ink) ──────────────── */}
      <section className="avoid-break grid grid-cols-5 gap-2 text-center text-[10px] text-black">
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Capital Assets Value
          </span>
          <span className="text-sm font-black font-mono">
            {canViewCosts ? formatPhp(assets?.totalValue) : `${assets?.totalCount || 0} units`}
          </span>
          <span className="text-[8px] block font-semibold">
            {operationalRate}% Operational Readiness
          </span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Stores Stock Value
          </span>
          <span className="text-sm font-black font-mono">
            {canViewCosts ? formatPhp(consumables?.totalValuation) : `${consumables?.totalItems || 0} SKUs`}
          </span>
          <span className="text-[8px] block font-semibold">
            {consumables?.lowStockCount || 0} Below Buffer Threshold
          </span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Open Purchase Orders
          </span>
          <span className="text-sm font-black font-mono">
            {procurement?.openOrdersCount || 0} Orders
          </span>
          <span className="text-[8px] block font-semibold">
            {canViewCosts ? formatPhp(procurement?.totalSpend30d) : "Active Pipeline"}
          </span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Active Requisitions
          </span>
          <span className="text-sm font-black font-mono">
            {requests?.pendingCount || 0} Pending
          </span>
          <span className="text-[8px] block font-semibold">
            {requests?.fulfilledThisMonth || 0} Fulfilled this Month
          </span>
        </div>
        <div className="border border-black p-1.5 bg-white">
          <span className="text-[8.5px] font-bold uppercase tracking-wider block">
            Maintenance Turnaround
          </span>
          <span className="text-sm font-black font-mono">
            {maintenance?.avgMttrDays || 0} Days MTTR
          </span>
          <span className="text-[8px] block font-semibold">
            {maintenance?.resolvedThisMonth || 0} Closed Work Orders
          </span>
        </div>
      </section>

      {/* ─── 3. Detailed Institutional Domain Matrices (Pure Black Ink) ───── */}
      <section className="grid grid-cols-12 gap-3 text-black">
        {/* Table 1: Category Valuation Share Table */}
        <div className="col-span-6 border border-black overflow-hidden bg-white">
          <div className="bg-white px-2.5 py-1.5 border-b border-black font-bold uppercase text-[8.5px] tracking-wider text-black flex justify-between items-center">
            <span>Equipment Category Fleet Valuation</span>
            <span className="font-mono">{charts?.categoryDistribution?.length || 0} Categories</span>
          </div>
          <table className="w-full border-collapse text-[9px] text-black">
            <thead>
              <tr className="bg-white border-b border-black font-bold uppercase text-[8px]">
                <th className="py-1 px-2 text-left">Category Name</th>
                <th className="py-1 px-2 text-right">Units</th>
                <th className="py-1 px-2 text-right">Valuation</th>
                <th className="py-1 px-2 text-right">Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/30">
              {(charts?.categoryDistribution || []).slice(0, 7).map((cat) => {
                const pct = assets?.totalValue ? Math.round((cat.value / assets.totalValue) * 100) : 0;
                return (
                  <tr key={cat.name}>
                    <td className="py-1 px-2 font-medium">{cat.name}</td>
                    <td className="py-1 px-2 text-right font-mono">{cat.count}</td>
                    <td className="py-1 px-2 text-right font-mono font-semibold">
                      {canViewCosts ? formatPhp(cat.value) : "—"}
                    </td>
                    <td className="py-1 px-2 text-right font-mono">{pct}%</td>
                  </tr>
                );
              })}
              {(!charts?.categoryDistribution || charts.categoryDistribution.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-3 text-center italic">
                    No equipment category breakdown available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table 2: Spend & Trend Summary Table */}
        <div className="col-span-6 border border-black overflow-hidden bg-white">
          <div className="bg-white px-2.5 py-1.5 border-b border-black font-bold uppercase text-[8.5px] tracking-wider text-black flex justify-between items-center">
            <span>6-Month Spend Summary (Procurement vs Repair)</span>
            <span className="font-mono">Historical Trend</span>
          </div>
          <table className="w-full border-collapse text-[9px] text-black">
            <thead>
              <tr className="bg-white border-b border-black font-bold uppercase text-[8px]">
                <th className="py-1 px-2 text-left">Period / Month</th>
                <th className="py-1 px-2 text-right">Procurement Spend</th>
                <th className="py-1 px-2 text-right">Maintenance Spend</th>
                <th className="py-1 px-2 text-right">Combined Outlay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/30">
              {(charts?.monthlySpendTrend || []).slice(-6).map((trend) => {
                const combined = trend.procurement + trend.maintenance;
                return (
                  <tr key={trend.month}>
                    <td className="py-1 px-2 font-medium">{trend.month}</td>
                    <td className="py-1 px-2 text-right font-mono">
                      {canViewCosts ? formatPhp(trend.procurement) : "—"}
                    </td>
                    <td className="py-1 px-2 text-right font-mono">
                      {canViewCosts ? formatPhp(trend.maintenance) : "—"}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-bold">
                      {canViewCosts ? formatPhp(combined) : "—"}
                    </td>
                  </tr>
                );
              })}
              {(!charts?.monthlySpendTrend || charts.monthlySpendTrend.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-3 text-center italic">
                    No historical spend recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── 4. Operational Domain Status Matrix (Pure Black Ink) ─────────── */}
      <section className="border-2 border-black overflow-hidden bg-white">
        <div className="bg-white px-2.5 py-1.5 border-b-2 border-black font-bold uppercase text-[8.5px] tracking-wider text-black">
          Custodian Operational Domain Matrix
        </div>
        <table className="w-full border-collapse text-[9px] text-black">
          <thead>
            <tr className="bg-white border-b border-black font-bold uppercase text-[8px]">
              <th className="py-1.5 px-2.5 text-left min-w-36 border-r border-black">Operational Domain</th>
              <th className="py-1.5 px-2.5 text-left border-r border-black">Financial / Value Position</th>
              <th className="py-1.5 px-2.5 text-left border-r border-black">Physical Volume / Capacity</th>
              <th className="py-1.5 px-2.5 text-left border-r border-black">Operational Status</th>
              <th className="py-1.5 px-2.5 text-right min-w-32">Service Level / Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/30">
            <tr>
              <td className="py-1.5 px-2.5 font-bold border-r border-black">1. Capital Equipment Fleet</td>
              <td className="py-1.5 px-2.5 font-mono font-semibold border-r border-black">
                {canViewCosts ? formatPhp(assets?.totalValue) : "—"}
              </td>
              <td className="py-1.5 px-2.5 font-mono border-r border-black">{assets?.totalCount || 0} Registered Units</td>
              <td className="py-1.5 px-2.5 border-r border-black uppercase font-bold text-[8px]">
                {operationalRate}% Operational Fleet
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono">
                {assets?.activeCount || 0} Active / {assets?.inRepairCount || 0} Repair
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-2.5 font-bold border-r border-black">2. Consumable Supply Stores</td>
              <td className="py-1.5 px-2.5 font-mono font-semibold border-r border-black">
                {canViewCosts ? formatPhp(consumables?.totalValuation) : "—"}
              </td>
              <td className="py-1.5 px-2.5 font-mono border-r border-black">{consumables?.totalItems || 0} Active SKUs</td>
              <td className="py-1.5 px-2.5 border-r border-black uppercase font-bold text-[8px]">
                {consumables?.lowStockCount && consumables.lowStockCount > 0
                  ? `${consumables.lowStockCount} SKUs Low Stock`
                  : "Optimal Stock Buffer"}
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono">
                {canViewCosts ? `${formatPhp(consumables?.monthBurnRateValue)} Monthly Burn` : "Normal Burn"}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-2.5 font-bold border-r border-black">3. Procurement &amp; Purchase Orders</td>
              <td className="py-1.5 px-2.5 font-mono font-semibold border-r border-black">
                {canViewCosts ? formatPhp(procurement?.totalSpend30d) : "—"}
              </td>
              <td className="py-1.5 px-2.5 font-mono border-r border-black">{procurement?.openOrdersCount || 0} Open Purchase Orders</td>
              <td className="py-1.5 px-2.5 border-r border-black uppercase font-bold text-[8px]">
                {procurement?.pendingDeliveryCount || 0} Pending Delivery
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono">
                Lead-time SLA within targets
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-2.5 font-bold border-r border-black">4. Department Requisitions</td>
              <td className="py-1.5 px-2.5 font-mono font-semibold border-r border-black">Requisition Pipeline</td>
              <td className="py-1.5 px-2.5 font-mono border-r border-black">{requests?.fulfilledThisMonth || 0} Fulfilled this Period</td>
              <td className="py-1.5 px-2.5 border-r border-black uppercase font-bold text-[8px]">
                {requests?.pendingCount && requests.pendingCount > 0
                  ? `${requests.pendingCount} In Queue`
                  : "Queue Clear"}
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono">
                {requests?.avgApprovalHours || 0}h Avg Turnaround
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-2.5 font-bold border-r border-black">5. Equipment Maintenance &amp; Work Orders</td>
              <td className="py-1.5 px-2.5 font-mono font-semibold border-r border-black">
                {canViewCosts ? formatPhp(maintenance?.totalRepairSpend30d) : "—"}
              </td>
              <td className="py-1.5 px-2.5 font-mono border-r border-black">{maintenance?.activeIssuesCount || 0} Active Work Orders</td>
              <td className="py-1.5 px-2.5 border-r border-black uppercase font-bold text-[8px]">
                {maintenance?.resolvedThisMonth || 0} Closed this Period
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono">
                {maintenance?.avgMttrDays || 0} Days Avg MTTR
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ─── 5. Formal Quadruple Signature Block (Pure Black Ink) ─────────── */}
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
          <div>Official CHED Custodian Summary Form · Pure Black Ink Folio</div>
          <div suppressHydrationWarning>
            Verification: {controlNumber}
          </div>
        </div>
      </footer>
    </div>
  );
}
