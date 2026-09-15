"use client";

import { useMemo } from "react";
import type { AssetRegisterRow, AssetRegisterSummary, BaseReportFilters } from "@/types/reports";
import {
  PrintMetricBar,
  PrintDonutChart,
  PrintHorizontalDistribution,
  PrintObservationsBox,
  PrintStatusBadge,
} from "./PrintCharts";

interface AssetRegisterPrintableReportProps {
  data: AssetRegisterRow[];
  summary?: AssetRegisterSummary;
  canViewCosts?: boolean;
  filters?: BaseReportFilters;
  generatedAt?: Date;
}

interface CategoryGroup {
  category: string;
  sampleNames: string[];
  totalCount: number;
  activeCount: number;
  repairCount: number;
  retiredCount: number;
  operationalRate: number;
  totalValuation: number;
  departmentCounts: Record<string, number>;
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
  const totalValuation = summary?.totalValuation || 0;

  const operationalRate = totalAssets > 0 ? Math.round((activeCount / totalAssets) * 100) : 0;

  // Aggregate assets by Category / Equipment Class
  const categoryGroups = useMemo(() => {
    const map = new Map<string, CategoryGroup>();

    data.forEach((row) => {
      const rawCat = (row.category || "General Equipment").trim();
      const cat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);

      if (!map.has(cat)) {
        map.set(cat, {
          category: cat,
          sampleNames: [],
          totalCount: 0,
          activeCount: 0,
          repairCount: 0,
          retiredCount: 0,
          operationalRate: 100,
          totalValuation: 0,
          departmentCounts: {},
        });
      }

      const group = map.get(cat)!;
      group.totalCount += 1;
      if (row.status === "active") group.activeCount += 1;
      else if (row.status === "needs_repair" || row.status === "out_of_service") group.repairCount += 1;
      else if (row.status === "retired") group.retiredCount += 1;

      if (row.currentValue) group.totalValuation += row.currentValue;
      else if (row.purchaseCost) group.totalValuation += row.purchaseCost;

      if (row.name && !group.sampleNames.includes(row.name) && group.sampleNames.length < 2) {
        group.sampleNames.push(row.name);
      }

      const dept = row.department || "Unassigned";
      group.departmentCounts[dept] = (group.departmentCounts[dept] || 0) + 1;
    });

    return Array.from(map.values())
      .map((g) => {
        g.operationalRate = g.totalCount > 0 ? Math.round((g.activeCount / g.totalCount) * 100) : 0;
        return g;
      })
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [data]);

  // Status Donut Data
  const statusDonutData = [
    { name: "Active", value: activeCount, color: "#0D9488" },
    { name: "Needs Repair", value: repairCount, color: "#F59E0B" },
    { name: "Out of Service", value: oosCount, color: "#EF4444" },
    { name: "Retired", value: retiredCount, color: "#64748B" },
  ].filter((d) => d.value > 0);

  // Department distribution calculation
  const deptCounts: Record<string, number> = {};
  data.forEach((d) => {
    const dept = d.department || "Unassigned";
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
    filters?.category ? `Category: ${filters.category}` : "Category: All",
    filters?.status ? `Status: ${filters.status}` : "Status: All",
    filters?.search ? `Search: "${filters.search}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const observations = [
    `${categoryGroups.length} equipment categories cataloged, with ${activeCount} of ${totalAssets} (${operationalRate}%) units fully operational.`,
    categoryGroups.length > 0 && categoryGroups[0].repairCount > 0
      ? `${categoryGroups[0].category} represents the largest fleet with ${categoryGroups[0].repairCount} units (${100 - categoryGroups[0].operationalRate}%) requiring maintenance.`
      : `Primary equipment categories maintain high operational readiness across departments.`,
    `Asset deployment concentrated in ${deptDistribution[0]?.label || "primary departments"} (${deptDistribution[0]?.value || 0} total units).`,
  ];

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
                AST-REG-{generatedAt.getFullYear()}{String(generatedAt.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Capital Asset Register &amp; Category Breakdown
            </h2>
            <div className="text-[10px] text-neutral-500 mt-0.5">{filterSummary}</div>
          </div>
          <span className="text-[9.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-xs">
            Categorized Fleet Audit
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break">
        <PrintMetricBar
          metrics={[
            {
              label: "Total Assets",
              value: totalAssets.toLocaleString(),
              delta: `${operationalRate}% active`,
              deltaType: "positive",
              subtext: `${activeCount} operational units`,
            },
            {
              label: "Fleet Valuation",
              value: canViewCosts ? `₱${(totalValuation / 1000000).toFixed(2)}M` : "—",
              delta: "Book Value",
              deltaType: "neutral",
              subtext: `${categoryGroups.length} categories`,
            },
            {
              label: "Under Maintenance",
              value: (repairCount + oosCount).toString(),
              delta: `${repairCount} in repair`,
              deltaType: repairCount > 0 ? "warning" : "positive",
              subtext: `${oosCount} out of service`,
            },
            {
              label: "Retired / Decommissioned",
              value: retiredCount.toString(),
              delta: "Archived",
              deltaType: "neutral",
              subtext: "Inactive fleet",
            },
          ]}
        />
      </section>

      {/* ─── Visual Distribution Row ─────────────────────────────────────── */}
      <section className="avoid-break grid grid-cols-12 gap-2.5 items-stretch">
        <div className="col-span-6">
          <PrintDonutChart
            title="Fleet Operational Status"
            data={statusDonutData}
            pieSize={110}
            className="h-full"
          />
        </div>
        <div className="col-span-6">
          <PrintHorizontalDistribution
            title="Assets by Department"
            items={deptDistribution}
            valueSuffix=" units"
            className="h-full"
          />
        </div>
      </section>

      {/* ─── Categorized Asset Breakdown Table ───────────────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>Category &amp; Equipment Classification Summary</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {categoryGroups.length} Categories · {totalAssets} Total Units
            </span>
          </div>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1 px-3 text-left">Category / Equipment Group</th>
                <th className="py-1 px-3 text-right">Total Units</th>
                <th className="py-1 px-3 text-left">Operational Readiness</th>
                <th className="py-1 px-3 text-left">Maintenance Status</th>
                <th className="py-1 px-3 text-left">Primary Department(s)</th>
                {canViewCosts && <th className="py-1 px-3 text-right">Group Valuation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {categoryGroups.map((group) => {
                const topDepts = Object.entries(group.departmentCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 2)
                  .map(([dept, count]) => `${dept} (${count})`)
                  .join(", ");

                return (
                  <tr key={group.category}>
                    <td className="py-1.5 px-3 font-bold text-[#2A3260]">
                      <div>{group.category}</div>
                      {group.sampleNames.length > 0 && (
                        <div className="text-[9.5px] font-normal text-neutral-500 truncate max-w-48">
                          e.g. {group.sampleNames.join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-extrabold text-neutral-900">
                      {group.totalCount.toLocaleString()}{" "}
                      <span className="text-[9.5px] font-normal text-neutral-500">units</span>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            group.operationalRate >= 85
                              ? "bg-emerald-600"
                              : group.operationalRate >= 60
                              ? "bg-amber-600"
                              : "bg-rose-600"
                          }`}
                        />
                        <span className="font-semibold text-neutral-800">
                          {group.activeCount} Active
                        </span>
                        <span className="text-[9.5px] font-bold text-neutral-500">
                          ({group.operationalRate}%)
                        </span>
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      {group.repairCount > 0 ? (
                        <PrintStatusBadge
                          status="repair"
                          label={`${group.repairCount} in repair (${100 - group.operationalRate}%)`}
                        />
                      ) : (
                        <PrintStatusBadge status="optimal" label="100% Operational" />
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-neutral-700 text-[10px] truncate max-w-44">
                      {topDepts || "Unassigned"}
                    </td>
                    {canViewCosts && (
                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-neutral-900">
                        {group.totalValuation > 0 ? `₱${group.totalValuation.toLocaleString()}` : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
              {categoryGroups.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 6 : 5} className="py-3 text-center text-neutral-400 italic text-[11px]">
                    No asset categories found matching active filters.
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

      {/* ─── Institutional Footer ───────────────────────────────────────── */}
      <footer className="avoid-break pt-2 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[9.5px] text-neutral-500 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS</div>
          <div>Page 1 of 1</div>
          <div suppressHydrationWarning>
            Verification Code: CRMC-AST-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
