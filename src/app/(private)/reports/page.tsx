"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Package,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FolderKanban,
  Building2,
} from "lucide-react";

import {
  useExecutiveReportQuery,
  useProjectReportQuery,
  useDepartmentReportQuery,
} from "@/features/reports/client/use-reports";
import { OperationalDomainHub } from "@/components/reports/operational-domain-hub";
import { InstitutionalOperationsRibbon } from "@/components/reports/institutional-operations-ribbon";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ExecutivePrintableReport } from "@/components/reports/print/ExecutivePrintableReport";

export default function ExecutiveReportsPage() {
  const { data, isLoading } = useExecutiveReportQuery();

  const domainFilter = useMemo(() => ({ page: 1, pageSize: 1 }), []);
  const { data: projectReportData, isLoading: isProjectLoading } = useProjectReportQuery(domainFilter);
  const { data: departmentReportData, isLoading: isDeptLoading } = useDepartmentReportQuery(domainFilter);

  const canViewCosts = data?.canViewCosts ?? true;
  const assets = data?.assets;
  const consumables = data?.consumables;
  const procurement = data?.procurement;
  const maintenance = data?.maintenance;
  const projects = projectReportData?.summary;
  const departments = departmentReportData?.summary;

  const categoryDistribution = data?.charts?.categoryDistribution;

  return (
    <>
      {/* ── Screen Dashboard View (Hidden during browser print) ──────── */}
      <div className="flex flex-col gap-3 w-full print:hidden">
        {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
        <div className="sticky top-12 sm:top-11.5 z-20 bg-bg-subtle pb-1.5 pt-0 transform-gpu">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-xl rounded-t-none border-x border-b border-t-0 border-border/80 bg-card p-4 sm:p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-text">
                  Reports &amp; Analytics
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-blue-300 border border-primary/25 dark:border-blue-400/30">
                  Live Institutional Rollup
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Cross-domain metrics, Supplies &amp; Materials valuation, procurement spend trends, and SLA turnaround.
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <ReportExportButton reportType="executive" />
            </div>
          </div>
        </div>

        {/* ── Operational Priority Command Center (5 Visual Interactive Cards) ── */}
        <OperationalDomainHub
          isLoading={isLoading}
          canViewCosts={canViewCosts}
          assets={assets}
          consumables={consumables}
          procurement={procurement}
          maintenance={maintenance}
        />

        {/* ── Middle Section: Institutional Ribbon & Ledgers ─────────────── */}
        <div className="space-y-3">
          {/* Institutional Operations Summary Ribbon */}
          <InstitutionalOperationsRibbon
            isLoading={isProjectLoading || isDeptLoading}
            canViewCosts={canViewCosts}
            projects={projects}
            departments={departments}
          />

          {/* ── Side-by-Side Tables: Category Valuation & 6-Month Spend Ledgers ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Table 2: Category Valuation & Inventory Breakdown (col-span-6) */}
            <div className="lg:col-span-6 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col">
              <div className="border-b border-border px-4 sm:px-5 py-3 bg-bg-subtle/40 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text">
                    Category Valuation &amp; Distribution Ledger
                  </h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    Itemized valuation, asset volume, and percentage share across categories.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-text-secondary">
                  {categoryDistribution?.length || 0} Categories
                </span>
              </div>

              <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border bg-bg-subtle/90 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      <th className="py-2 px-4 sm:px-5">Category Name</th>
                      <th className="py-2 px-3 text-right">Units</th>
                      <th className="py-2 px-3 text-right">Valuation (₱)</th>
                      <th className="py-2 px-4 text-right">Inventory Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-text">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-text-secondary text-xs">
                          Loading category data…
                        </td>
                      </tr>
                    ) : !categoryDistribution || categoryDistribution.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-text-secondary text-xs">
                          No category distribution recorded.
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const totalVal = categoryDistribution.reduce(
                          (sum, c) => sum + (canViewCosts && c.value > 0 ? c.value : c.count),
                          0
                        );
                        const totalCount = categoryDistribution.reduce((sum, c) => sum + c.count, 0);
                        return (
                          <>
                            {categoryDistribution.map((cat, idx) => {
                              const itemMetric = canViewCosts && cat.value > 0 ? cat.value : cat.count;
                              const sharePct = totalVal > 0 ? Math.round((itemMetric / totalVal) * 100) : 0;
                              return (
                                <tr key={idx} className="hover:bg-bg-subtle/30 transition-colors">
                                  <td className="py-2.5 px-4 sm:px-5 font-semibold text-text">
                                    {cat.name}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-text-secondary">
                                    {cat.count.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-text">
                                    {canViewCosts ? `₱${cat.value.toLocaleString()}` : "—"}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                                        <div
                                          className="h-full bg-accent rounded-full"
                                          style={{ width: `${Math.min(sharePct, 100)}%` }}
                                        />
                                      </div>
                                      <span className="font-mono text-[11px] font-bold text-text-secondary w-8 text-right">
                                        {sharePct}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Rollup Totals Row */}
                            <tr className="border-t-2 border-border bg-bg-subtle/60 font-bold text-text">
                              <td className="py-2.5 px-4 sm:px-5">Total Rollup</td>
                              <td className="py-2.5 px-3 text-right font-mono text-text">
                                {totalCount.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-text">
                                {canViewCosts ? `₱${categoryDistribution.reduce((s, c) => s + c.value, 0).toLocaleString()}` : "—"}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-text">
                                100%
                              </td>
                            </tr>
                          </>
                        );
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 3: 6-Month Institutional Spend Ledger (col-span-6) */}
            <div className="lg:col-span-6 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col">
              <div className="border-b border-border px-4 sm:px-5 py-3 bg-bg-subtle/40 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text">
                    6-Month Spend &amp; Financial Ledger
                  </h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    Monthly historical disbursement comparison: Procurement vs Maintenance spend.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-text-secondary">
                  Semi-Annual Window
                </span>
              </div>

              <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border bg-bg-subtle/90 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      <th className="py-2 px-4 sm:px-5">Month Period</th>
                      <th className="py-2 px-3 text-right">Procurement Spend</th>
                      <th className="py-2 px-3 text-right">Maintenance Spend</th>
                      <th className="py-2 px-4 text-right">Combined Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-text">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-text-secondary text-xs">
                          Loading spend ledger…
                        </td>
                      </tr>
                    ) : !data?.charts?.monthlySpendTrend || data.charts.monthlySpendTrend.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-text-secondary text-xs">
                          No historical spend data recorded.
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const trend = data.charts.monthlySpendTrend;
                        const totalProc = trend.reduce((s, m) => s + m.procurement, 0);
                        const totalMaint = trend.reduce((s, m) => s + m.maintenance, 0);
                        const totalCombined = totalProc + totalMaint;
                        return (
                          <>
                            {trend.map((row, idx) => {
                              const monthTotal = row.procurement + row.maintenance;
                              return (
                                <tr key={idx} className="hover:bg-bg-subtle/30 transition-colors">
                                  <td className="py-2.5 px-4 sm:px-5 font-semibold text-text">
                                    {row.month}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-text">
                                    {canViewCosts ? `₱${row.procurement.toLocaleString()}` : "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                                    {canViewCosts ? `₱${row.maintenance.toLocaleString()}` : "—"}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-primary dark:text-blue-300">
                                    {canViewCosts ? `₱${monthTotal.toLocaleString()}` : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Rollup Totals Row */}
                            <tr className="border-t-2 border-border bg-bg-subtle/60 font-bold text-text">
                              <td className="py-2.5 px-4 sm:px-5">6-Month Total</td>
                              <td className="py-2.5 px-3 text-right font-mono text-text">
                                {canViewCosts ? `₱${totalProc.toLocaleString()}` : "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-700 dark:text-rose-400">
                                {canViewCosts ? `₱${totalMaint.toLocaleString()}` : "—"}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-primary dark:text-blue-300 font-extrabold">
                                {canViewCosts ? `₱${totalCombined.toLocaleString()}` : "—"}
                              </td>
                            </tr>
                          </>
                        );
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── Lower Section: Specialized Reports Drilldown Cards ───────── */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Operational Audit Modules
            </h2>
            <span className="text-[10px] text-text-secondary font-mono">
              DRILL-DOWN &amp; CSV EXPORTS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/reports/assets"
              className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Package className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-text group-hover:text-accent transition-colors">
                  Asset Inventory Register
                </h3>
                <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                  Coded capital equipment registry, custody status, locations, condition, and per-asset QR scan logs.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Full lifecycle audit history</span>
              </div>
            </Link>

            <Link
              href="/reports/projects"
              className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-text group-hover:text-accent transition-colors">
                  Project Reports
                </h3>
                <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                  Assigned assets, consumed stocks, overall project cost, start and end dates per project.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                <span>Asset &amp; stock cost rollup</span>
              </div>
            </Link>

            <Link
              href="/reports/departments"
              className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-text group-hover:text-accent transition-colors">
                  Department Reports
                </h3>
                <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                  All assets assigned, consumables consumed, maintenance activity, and statistics per department.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
                <AlertTriangle className="h-3.5 w-3.5 text-blue-500" />
                <span>Org-wide asset &amp; stock breakdown</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Direct Print Target: Only rendered in native browser print preview ── */}
      {data && (
        <div className="hidden print:block w-full">
          <ExecutivePrintableReport
            data={data}
            generatedAt={new Date()}
            filtersSummary="Scope: Institutional Rollup · Academic & Administrative Departments · All Categories"
          />
        </div>
      )}
    </>
  );
}
