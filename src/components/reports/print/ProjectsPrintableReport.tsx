"use client";

import type { ProjectReportRow, ProjectReportSummary, BaseReportFilters } from "@/types/reports";
import {
  PrintMetricBar,
  PrintHorizontalDistribution,
  PrintObservationsBox,
  PrintStatusBadge,
} from "./PrintCharts";

interface ProjectsPrintableReportProps {
  data: ProjectReportRow[];
  summary?: ProjectReportSummary;
  canViewCosts?: boolean;
  filters?: BaseReportFilters;
  generatedAt?: Date;
}

export function ProjectsPrintableReport({
  data = [],
  summary,
  canViewCosts = true,
  filters,
  generatedAt = new Date(),
}: ProjectsPrintableReportProps) {
  const totalProjects = summary?.totalProjects || data.length || 0;
  const activeProjects = summary?.activeProjects || data.filter((d) => d.status === "active").length;
  const completedProjects = summary?.completedProjects || data.filter((d) => d.status === "completed").length;
  const assignedAssets = summary?.totalAssetsAssigned || 0;
  const totalSpend = summary?.totalProjectSpend || 0;

  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  // Department distribution
  const deptCounts: Record<string, number> = {};
  data.forEach((d) => {
    const dept = d.department || "General";
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const deptDistribution = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

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
    `${activeProjects} capital projects actively ongoing, with ${completedProjects} successfully completed.`,
    `${assignedAssets} institutional capital assets currently allocated to active project work sites.`,
    `Total capital project material and asset commitment stands at ${canViewCosts ? `₱${(totalSpend / 1000).toFixed(0)}k` : "active commitments"}.`,
  ];

  return (
    <div className="print-page mx-auto w-full max-w-[7.6in] bg-white text-text text-xs leading-tight font-sans">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="avoid-break border-b-2 border-[#2A3260] pb-2 mb-2.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/CRMC%20LOGO.png"
              alt="CRMC Seal"
              className="h-10 w-10 object-contain shrink-0"
            />
            <div className="space-y-0.5">
              <h1 className="text-base font-extrabold tracking-tight text-[#2A3260] uppercase">
                CRMC-AIMS
              </h1>
              <div className="text-[10px] font-semibold text-neutral-600">
                Cebu Roosevelt Memorial Colleges, Inc. · Asset &amp; Inventory Management System
              </div>
              <div className="text-[8.5px] font-medium text-neutral-500">
                Upper Pandan, Bogo City, Cebu, Philippines
              </div>
            </div>
          </div>
          <div className="rounded-xs border border-neutral-200 bg-neutral-50/80 px-2.5 py-1 text-right font-mono text-[8.5px] space-y-0.5 shrink-0">
            <div>
              <span className="text-neutral-500">Generated:</span>{" "}
              <span className="font-semibold text-neutral-800">{formattedDate}, {formattedTime}</span>
            </div>
            <div>
              <span className="text-neutral-500">Doc ID:</span>{" "}
              <span className="font-bold text-neutral-800">
                PRJ-RPT-{generatedAt.getFullYear()}{String(generatedAt.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Capital Projects Allocation Report
            </h2>
            <div className="text-[9px] text-neutral-500 mt-0.5">{filterSummary}</div>
          </div>
          <span className="text-[8.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-xs">
            Projects Audit
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break mb-2.5">
        <PrintMetricBar
          metrics={[
            {
              label: "Active Projects",
              value: activeProjects.toString(),
              delta: `${completionRate}% completed`,
              deltaType: "positive",
              subtext: `${totalProjects} total projects`,
            },
            {
              label: "Allocated Assets",
              value: `${assignedAssets} units`,
              delta: "Deployed",
              deltaType: "neutral",
              subtext: "Equipment in use",
            },
            {
              label: "Consumables Used",
              value: `${summary?.totalConsumablesConsumed || 0} items`,
              delta: "Materials",
              deltaType: "neutral",
              subtext: "Supplies consumed",
            },
            {
              label: "Total Project Spend",
              value: canViewCosts ? `₱${(totalSpend / 1000).toFixed(0)}k` : "—",
              delta: "Budget Consumed",
              deltaType: "neutral",
              subtext: "Direct allocations",
            },
          ]}
        />
      </section>

      {/* ─── Department Project Distribution ──────────────────────────────── */}
      <section className="avoid-break mb-2.5">
        <PrintHorizontalDistribution
          title="Projects by Department"
          items={deptDistribution}
          valueSuffix=" projects"
        />
      </section>

      {/* ─── Projects Table ──────────────────────────────────────────────── */}
      <section className="avoid-break mb-2.5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[9.5px] font-bold uppercase tracking-wider text-teal-800">
            Capital Projects Ledger
          </h3>
          <span className="text-[8.5px] text-neutral-500 font-mono">
            Showing {Math.min(data.length, 12)} of {totalProjects} projects
          </span>
        </div>
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[8.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1 px-2 text-left">Code</th>
                <th className="py-1 px-2 text-left">Project Name</th>
                <th className="py-1 px-2 text-left">Department</th>
                <th className="py-1 px-2 text-right">Assets</th>
                <th className="py-1 px-2 text-left">Status</th>
                {canViewCosts && <th className="py-1 px-2 text-right">Total Cost</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[9.5px] text-neutral-800">
              {data.slice(0, 12).map((row) => (
                <tr key={row.id}>
                  <td className="py-1 px-2 font-mono font-bold text-[#2A3260]">{row.projectCode}</td>
                  <td className="py-1 px-2 font-medium truncate max-w-40">{row.projectName}</td>
                  <td className="py-1 px-2 text-neutral-600 truncate max-w-30">{row.department}</td>
                  <td className="py-1 px-2 text-right font-mono font-semibold">{row.assignedAssetsCount}</td>
                  <td className="py-1 px-2">
                    <PrintStatusBadge status={row.status} />
                  </td>
                  {canViewCosts && (
                    <td className="py-1 px-2 text-right font-mono font-semibold text-neutral-900">
                      {row.totalProjectCost != null ? `₱${row.totalProjectCost.toLocaleString()}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 6 : 5} className="py-3 text-center text-neutral-400 italic">
                    No project records found matching active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Key Observations ─────────────────────────────────────────────── */}
      <section className="avoid-break mb-2">
        <PrintObservationsBox observations={observations} />
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="avoid-break mt-2 pt-1.5 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[8px] text-neutral-400 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS</div>
          <div>Page 1 of 1</div>
          <div>
            Verification Code: CRMC-PRJ-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
