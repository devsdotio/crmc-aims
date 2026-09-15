"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Package,
  Layers,
  ShoppingCart,
  ClipboardList,
  Wrench,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  PieChart as PieIcon,
  FolderKanban,
  Building2,
} from "lucide-react";

import { useExecutiveReportQuery } from "@/features/reports/client/use-reports";
import { StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { GaugeChart } from "@/components/reports/gauge-chart";
import { BreakdownDonutChart } from "@/components/reports/breakdown-donut-chart";
import { TrendBarChart } from "@/components/reports/trend-bar-chart";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ExecutivePrintableReport } from "@/components/reports/print/ExecutivePrintableReport";

export default function ExecutiveReportsPage() {
  const { data, isLoading } = useExecutiveReportQuery();

  const canViewCosts = data?.canViewCosts ?? true;
  const assets = data?.assets;
  const consumables = data?.consumables;
  const procurement = data?.procurement;
  const requests = data?.requests;
  const maintenance = data?.maintenance;

  const operationalRate = useMemo(() => {
    if (!assets?.totalCount || assets.totalCount === 0) return 0;
    return Math.round(((assets.activeCount || 0) / assets.totalCount) * 100);
  }, [assets]);

  const categoryDonutData = useMemo(() => {
    if (!data?.charts?.categoryDistribution) return [];
    return data.charts.categoryDistribution.map((cat) => ({
      name: cat.name,
      value: canViewCosts && cat.value > 0 ? cat.value : cat.count,
      count: cat.count,
    }));
  }, [data?.charts?.categoryDistribution, canViewCosts]);

  return (
    <>
      {/* ── Screen Dashboard View (Hidden during browser print) ──────── */}
      <div className="flex flex-col gap-3 w-full print:hidden">
        {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
        <div className="sticky top-10.25 sm:top-11.75 z-20 bg-bg-subtle pb-1.5 pt-0 transform-gpu">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-2xl rounded-t-none border-x border-b border-t-0 border-border/80 bg-card p-4 sm:p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-text">
                  Reports &amp; Analytics
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/25">
                  Live Institutional Rollup
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Cross-domain metrics, inventory valuation, procurement spend trends, and SLA turnaround.
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <ReportExportButton reportType="executive" />
            </div>
          </div>
        </div>

        {/* ── Top Domain KPI Row with Report Links ──────────────────────── */}
        <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 -mt-1.5">
          <KpiCard
            title="Asset Valuation"
            sublabel="CAPITAL // ASSETS"
            value={
              isLoading
                ? "…"
                : canViewCosts
                ? `₱${(assets?.totalValue || 0).toLocaleString()}`
                : `${assets?.totalCount || 0} units`
            }
            subtitle={`${assets?.activeCount || 0} active · ${assets?.inRepairCount || 0} repair`}
            icon={Package}
            tone="blue"
            toneValue={true}
            delta="+12.4%"
            loading={isLoading}
            href="/reports/assets"
          />

          <KpiCard
            title="Consumables Stock"
            sublabel="INVENTORY // SUPPLIES"
            value={
              isLoading
                ? "…"
                : canViewCosts
                ? `₱${(consumables?.totalValuation || 0).toLocaleString()}`
                : `${consumables?.totalItems || 0} SKUs`
            }
            subtitle={
              consumables?.lowStockCount
                ? `${consumables.lowStockCount} items below threshold`
                : "All stock healthy"
            }
            icon={Layers}
            tone={consumables?.lowStockCount ? "amber" : "emerald"}
            toneValue={true}
            delta={{
              value: consumables?.lowStockCount ? `${consumables.lowStockCount} low` : "Optimal",
              isPositive: !consumables?.lowStockCount,
            }}
            loading={isLoading}
            href="/reports/consumables"
          />

          <KpiCard
            title="Procurement Spend"
            sublabel="PURCHASE // 30-DAY"
            value={
              isLoading
                ? "…"
                : canViewCosts
                ? `₱${(procurement?.totalSpend30d || 0).toLocaleString()}`
                : `${procurement?.openOrdersCount || 0} orders`
            }
            subtitle={`${procurement?.openOrdersCount || 0} open orders pending`}
            icon={ShoppingCart}
            tone="indigo"
            toneValue={true}
            delta="+18.5%"
            loading={isLoading}
            href="/reports/purchase-orders"
          />

          <KpiCard
            title="Supply Requests"
            sublabel="LOGISTICS // REQUISITIONS"
            value={isLoading ? "…" : requests?.pendingCount ?? 0}
            subtitle={`${requests?.fulfilledThisMonth || 0} fulfilled this month`}
            icon={ClipboardList}
            tone="accent"
            toneValue={true}
            delta={{
              value: (requests?.pendingCount ?? 0) > 0 ? `${requests?.pendingCount} open` : "Clear",
              isPositive: (requests?.pendingCount ?? 0) === 0,
            }}
            loading={isLoading}
            href="/reports/requests"
          />

          <KpiCard
            title="Maintenance MTTR"
            sublabel="FACILITY // DOWNTIME"
            value={isLoading ? "…" : `${maintenance?.avgMttrDays || 0} d`}
            subtitle={`${maintenance?.activeIssuesCount || 0} active work orders`}
            icon={Wrench}
            tone="rose"
            toneValue={true}
            delta="-0.8 d"
            loading={isLoading}
            href="/reports/maintenance"
          />
        </StatCardGrid>

        {/* ── Middle Row: Hero Operational Gauge + Spend Trend + Category Donut ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Hero Gauge: Operational Availability */}
          <div className="lg:col-span-3">
            <GaugeChart
              title="Institutional Asset Health"
              sublabel="FACILITY // RELIABILITY"
              description="Active operational equipment vs units in repair or out of service."
              icon={CheckCircle2}
              value={operationalRate}
              completedCount={assets?.activeCount || 0}
              pendingCount={(assets?.inRepairCount || 0) + Math.max(0, (assets?.totalCount || 0) - (assets?.activeCount || 0) - (assets?.inRepairCount || 0))}
              completedLabel="Active Ready"
              pendingLabel="Repair/Out"
              tone="emerald"
              loading={isLoading}
              className="h-full"
            />
          </div>

          {/* Spend Trend Bar/Area Chart */}
          <div className="lg:col-span-5">
            <TrendBarChart
              title="Monthly Spend Breakdown"
              sublabel="FINANCIAL // 6-MONTH"
              description="Procurement purchase receipts vs equipment repair maintenance spend."
              icon={TrendingUp}
              data={data?.charts?.monthlySpendTrend || []}
              xAxisKey="month"
              series={[
                { key: "procurement", name: "Procurement", color: "#2A3260" },
                { key: "maintenance", name: "Maintenance", color: "#FF4E45" },
              ]}
              loading={isLoading}
              canViewCosts={canViewCosts}
              valueFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              className="h-full"
            />
          </div>

          {/* Category Distribution Donut */}
          <div className="lg:col-span-4">
            <BreakdownDonutChart
              title="Category Valuation Share"
              sublabel="PROPORTIONS // CATEGORY"
              description="Asset and consumable distribution by institutional category."
              icon={PieIcon}
              data={categoryDonutData}
              valueFormatter={(v) => (canViewCosts ? `₱${v.toLocaleString()}` : `${v.toLocaleString()} units`)}
              unitLabel="units"
              loading={isLoading}
              className="h-full"
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
              className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
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
              className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
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
              className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
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
