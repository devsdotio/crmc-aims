"use client";

import type { MaintenanceReportRow, MaintenanceSummary, BaseReportFilters } from "@/types/reports";
import {
  PrintMetricBar,
  PrintHorizontalDistribution,
  PrintObservationsBox,
  PrintStatusBadge,
} from "./PrintCharts";

interface MaintenancePrintableReportProps {
  data: MaintenanceReportRow[];
  summary?: MaintenanceSummary;
  canViewCosts?: boolean;
  filters?: BaseReportFilters;
  generatedAt?: Date;
}

export function MaintenancePrintableReport({
  data = [],
  summary,
  canViewCosts = true,
  filters,
  generatedAt = new Date(),
}: MaintenancePrintableReportProps) {
  const totalOrders = summary?.totalWorkOrders || data.length || 0;
  const openOrders = summary?.openWorkOrders || data.filter((d) => !d.isResolved).length;
  const resolvedOrders = summary?.resolvedWorkOrders || data.filter((d) => d.isResolved).length;
  const totalSpend = summary?.totalRepairSpend || 0;
  const avgMttr = summary?.avgMttrDays || 0;

  const resolutionRate = totalOrders > 0 ? Math.round((resolvedOrders / totalOrders) * 100) : 0;

  // Top faulty assets distribution
  const faultyDistribution = (summary?.topFaultyAssets || [])
    .slice(0, 5)
    .map((a) => ({
      label: `${a.assetCode} - ${a.name}`,
      value: a.count,
      displayValue: `${a.count} repairs`,
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
    filters?.status ? `Status: ${filters.status}` : "Status: All",
    filters?.search ? `Search: "${filters.search}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const observations = [
    `${resolvedOrders} of ${totalOrders} (${resolutionRate}%) maintenance work orders have been completed and verified.`,
    `Mean Time to Repair (MTTR) is currently ${avgMttr} days across all equipment categories.`,
    `${openOrders} active work orders currently under corrective or preventive repair.`,
  ];

  return (
    <div className="print-page mx-auto w-full max-w-[7.6in] bg-white text-text text-[11px] leading-normal font-sans space-y-3">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
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
                MNT-RPT-{generatedAt.getFullYear()}{String(generatedAt.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Maintenance &amp; Repairs Audit Report
            </h2>
            <div className="text-[10px] text-neutral-500 mt-0.5">{filterSummary}</div>
          </div>
          <span className="text-[9.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-xs">
            Maintenance Audit
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break">
        <PrintMetricBar
          metrics={[
            {
              label: "Total Work Orders",
              value: totalOrders.toLocaleString(),
              delta: `${resolutionRate}% resolved`,
              deltaType: "positive",
              subtext: "Logged tickets",
            },
            {
              label: "Active Work Orders",
              value: openOrders.toString(),
              delta: openOrders > 3 ? "Action Required" : "Optimal",
              deltaType: openOrders > 3 ? "warning" : "positive",
              subtext: "In repair queue",
            },
            {
              label: "Total Repair Spend",
              value: canViewCosts ? `₱${(totalSpend / 1000).toFixed(0)}k` : "—",
              delta: "Maintenance Cost",
              deltaType: "neutral",
              subtext: "Parts & labor",
            },
            {
              label: "Mean Time to Repair",
              value: `${avgMttr} days`,
              delta: "Resolution Speed",
              deltaType: "neutral",
              subtext: "Ticket to closure",
            },
          ]}
        />
      </section>

      {/* ─── Top Faulty Assets Distribution ──────────────────────────────── */}
      <section className="avoid-break">
        <PrintHorizontalDistribution
          title="Top Assets by Repair Frequency"
          items={faultyDistribution}
          valueSuffix=" events"
        />
      </section>

      {/* ─── Work Orders Table ───────────────────────────────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>Maintenance Work Orders Ledger</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              Showing {Math.min(data.length, 10)} of {totalOrders} records
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Log Code</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Asset Code</th>
                <th className="py-1.5 px-3 text-left">Equipment Name</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap">Condition</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Status</th>
                {canViewCosts && <th className="py-1.5 px-3 text-right whitespace-nowrap">Repair Cost</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {data.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td className="py-1.5 px-3 font-mono font-bold text-[#2A3260] whitespace-nowrap">{row.logCode}</td>
                  <td className="py-1.5 px-3 font-mono font-semibold text-neutral-700 whitespace-nowrap">{row.assetCode}</td>
                  <td className="py-1.5 px-3 font-medium truncate max-w-44">{row.assetName}</td>
                  <td className="py-1.5 px-3 text-neutral-600 capitalize whitespace-nowrap">{row.condition}</td>
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    <PrintStatusBadge
                      status={row.isResolved ? "fulfilled" : "pending"}
                      label={row.isResolved ? "Resolved" : "Active"}
                    />
                  </td>
                  {canViewCosts && (
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-neutral-900 whitespace-nowrap">
                      {row.repairCost != null ? `₱${row.repairCost.toLocaleString()}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 6 : 5} className="py-3 text-center text-neutral-400 italic text-[11px]">
                    No maintenance records found matching active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Key Observations ─────────────────────────────────────────────── */}
      <section className="avoid-break">
        <PrintObservationsBox observations={observations} />
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="avoid-break pt-2 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[9.5px] text-neutral-500 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS Maintenance</div>
          <div>Page 1 of 1</div>
          <div>
            Verification Code: CRMC-MNT-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
