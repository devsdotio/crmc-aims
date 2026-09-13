"use client";

import Link from "next/link";
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
} from "lucide-react";

import { useExecutiveReportQuery } from "@/features/reports/client/use-reports";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ReportTrendChart } from "@/components/reports/charts/report-trend-chart";
import { ReportBreakdownChart } from "@/components/reports/charts/report-breakdown-chart";
import { ReportExportButton } from "@/components/reports/report-export-button";

export default function ExecutiveReportsPage() {
  const { data, isLoading } = useExecutiveReportQuery();

  const canViewCosts = data?.canViewCosts ?? true;
  const assets = data?.assets;
  const consumables = data?.consumables;
  const procurement = data?.procurement;
  const requests = data?.requests;
  const maintenance = data?.maintenance;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
      <div className="sticky top-[41px] sm:top-[47px] z-20 bg-[#F2F3F7] pb-1.5 pt-0 transform-gpu">
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
            <ReportExportButton reportType="assets" />
          </div>
        </div>
      </div>

      {/* ── Top Stat Cards Grid ──────────────────────────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 -mt-1.5">
        <StatCard
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
          loading={isLoading}
          href="/reports/assets"
        />

        <StatCard
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
          loading={isLoading}
          href="/reports/consumables"
        />

        <StatCard
          title="30-Day Procurement"
          sublabel="PURCHASE // LOTS"
          value={
            isLoading
              ? "…"
              : canViewCosts
              ? `₱${(procurement?.totalSpend30d || 0).toLocaleString()}`
              : `${procurement?.openOrdersCount || 0} orders`
          }
          subtitle={`${procurement?.openOrdersCount || 0} open lots active`}
          icon={ShoppingCart}
          tone="indigo"
          toneValue={true}
          loading={isLoading}
          href="/reports/purchase-orders"
        />

        <StatCard
          title="Open Requests"
          sublabel="WORKFLOW // QUEUE"
          value={isLoading ? "…" : requests?.pendingCount || 0}
          subtitle={`Avg ${requests?.avgApprovalHours || 4.2}h SLA turnaround`}
          icon={ClipboardList}
          tone="accent"
          toneValue={true}
          loading={isLoading}
          href="/reports/requests"
        />

        <StatCard
          title="Maintenance MTTR"
          sublabel="FACILITY // DOWNTIME"
          value={isLoading ? "…" : `${maintenance?.avgMttrDays || 0} d`}
          subtitle={`${maintenance?.activeIssuesCount || 0} active work orders`}
          icon={Wrench}
          tone="rose"
          toneValue={true}
          loading={isLoading}
          href="/reports/maintenance"
        />
      </StatCardGrid>

      {/* ── Middle Row: Spend Trend + Category Distribution ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left: Spend Trend */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-text">
                  Expenditure Trend (Last 6 Months)
                </h2>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Procurement purchase order receipts vs. equipment repair maintenance spend.
              </p>
            </div>
            <span className="font-mono text-[10px] font-bold text-text-secondary">
              MONTHLY ROLLUP
            </span>
          </div>

          <ReportTrendChart
            data={data?.charts?.monthlySpendTrend || []}
            canViewCosts={canViewCosts}
          />
        </div>

        {/* Right: Category Distribution */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-text">
                Inventory Proportions
              </h2>
            </div>
            <span className="font-mono text-[10px] font-bold text-text-secondary">
              BY CATEGORY
            </span>
          </div>

          <ReportBreakdownChart
            data={data?.charts?.categoryDistribution || []}
            showValue={canViewCosts}
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
            href="/reports/consumables"
            className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Layers className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-text group-hover:text-accent transition-colors">
                Consumables Stock &amp; Usage
              </h3>
              <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                Stock on hand, reorder alerts, consumption velocity (30d/90d), and stockout forecasting.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Threshold replenishment alert</span>
            </div>
          </Link>

          <Link
            href="/reports/maintenance"
            className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Wrench className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-text group-hover:text-accent transition-colors">
                Maintenance &amp; Repairs
              </h3>
              <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                Work order turnaround, MTTR, repair costs, technician workload, and recurring-fault equipment.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
              <span>MTTR &amp; downtime analysis</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
