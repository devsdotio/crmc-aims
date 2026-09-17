"use client";

import type { DepartmentReportRow, DepartmentReportSummary, BaseReportFilters } from "@/types/reports";
import {
  PrintMetricBar,
  PrintHorizontalDistribution,
  PrintObservationsBox,
} from "./PrintCharts";

interface DepartmentsPrintableReportProps {
  data: DepartmentReportRow[];
  summary?: DepartmentReportSummary;
  canViewCosts?: boolean;
  filters?: BaseReportFilters;
  generatedAt?: Date;
}

export function DepartmentsPrintableReport({
  data = [],
  summary,
  canViewCosts = true,
  filters,
  generatedAt = new Date(),
}: DepartmentsPrintableReportProps) {
  const totalDepts = summary?.totalDepartments || data.length || 0;
  const totalAssets = summary?.totalAssetsDeployed || 0;
  const totalAssetsValue = summary?.totalAssetsValue || 0;
  const totalConsumablesValue = summary?.totalConsumablesValue || 0;

  // Department asset distribution
  const deptDistribution = data
    .map((d) => ({
      label: d.departmentName,
      value: d.assetsAssignedCount,
      displayValue: `${d.assetsAssignedCount} units`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

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
    filters?.search ? `Search: "${filters.search}"` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "All Institutional Departments";

  const observations = [
    `${totalAssets} capital assets distributed across ${totalDepts} academic and administrative departments.`,
    `Highest equipment allocation concentrated in ${deptDistribution[0]?.label || "primary department"} (${deptDistribution[0]?.value || 0} units).`,
    `Department consumables dispatch totaled ${canViewCosts ? `₱${totalConsumablesValue.toLocaleString()}` : "normal consumption levels"}.`,
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
          <div suppressHydrationWarning className="rounded-xs border border-neutral-200 bg-neutral-50/80 px-2.5 py-1 text-right font-mono text-[9.5px] space-y-0.5 shrink-0">
            <div>
              <span className="text-neutral-500">Generated:</span>{" "}
              <span className="font-semibold text-neutral-800">{formattedDate}, {formattedTime}</span>
            </div>
            <div>
              <span className="text-neutral-500">Doc ID:</span>{" "}
              <span className="font-bold text-neutral-800">
                DPT-RPT-{generatedAt.getFullYear()}{String(generatedAt.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Department Resource Allocation Report
            </h2>
            <div className="text-[10px] text-neutral-500 mt-0.5">{filterSummary}</div>
          </div>
          <span className="text-[9.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-xs">
            Department Audit
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break">
        <PrintMetricBar
          metrics={[
            {
              label: "Departments",
              value: totalDepts.toString(),
              delta: "Active units",
              deltaType: "positive",
              subtext: "Academic & Admin",
            },
            {
              label: "Deployed Assets",
              value: `${totalAssets} units`,
              delta: "In Custody",
              deltaType: "neutral",
              subtext: "Fleet allocation",
            },
            {
              label: "Asset Valuation",
              value: canViewCosts ? `₱${(totalAssetsValue / 1000000).toFixed(2)}M` : "—",
              delta: "Capital Value",
              deltaType: "neutral",
              subtext: "Assigned valuation",
            },
            {
              label: "Consumables Value",
              value: canViewCosts ? `₱${(totalConsumablesValue / 1000).toFixed(0)}k` : "—",
              delta: "Dispatched",
              deltaType: "neutral",
              subtext: "Direct consumption",
            },
          ]}
        />
      </section>

      {/* ─── Department Distribution ──────────────────────────────────────── */}
      <section className="avoid-break">
        <PrintHorizontalDistribution
          title="Top Departments by Asset Count"
          items={deptDistribution}
        />
      </section>

      {/* ─── Departments Table ───────────────────────────────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>Department Asset &amp; Supply Ledger</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              Showing {data.length} departments
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3 text-left">Department Name</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Assets</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Consumables</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Projects</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Maint. Issues</th>
                {canViewCosts && <th className="py-1.5 px-3 text-right whitespace-nowrap">Asset Valuation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {data.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td className="py-1.5 px-3 font-semibold text-[#2A3260]">{row.departmentName}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-semibold whitespace-nowrap">{row.assetsAssignedCount}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-neutral-600 whitespace-nowrap">{row.consumablesConsumedCount}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-neutral-600 whitespace-nowrap">{row.activeProjects}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-neutral-600 whitespace-nowrap">{row.activeMaintenanceCount}</td>
                  {canViewCosts && (
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-neutral-900 whitespace-nowrap">
                      {row.assetsValue != null ? `₱${row.assetsValue.toLocaleString()}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 6 : 5} className="py-3 text-center text-neutral-400 italic text-[11px]">
                    No department records found.
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
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS Departments</div>
          <div>Page 1 of 1</div>
          <div suppressHydrationWarning>
            Verification Code: CRMC-DPT-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
