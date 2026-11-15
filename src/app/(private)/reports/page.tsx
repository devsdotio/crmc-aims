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
import { CategoryValuationChart } from "@/components/reports/category-valuation-chart";
import { SpendTrendChart } from "@/components/reports/spend-trend-chart";
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

          {/* ── Side-by-Side Visual Charts: Category Valuation & 6-Month Spend ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Chart 1: Category Valuation & Distribution Donut (col-span-6) */}
            <CategoryValuationChart
              categories={categoryDistribution}
              isLoading={isLoading}
              canViewCosts={canViewCosts}
              topCount={5}
            />

            {/* Chart 2: 6-Month Institutional Spend Trend (col-span-6) */}
            <SpendTrendChart
              trend={data?.charts?.monthlySpendTrend}
              isLoading={isLoading}
              canViewCosts={canViewCosts}
            />
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
