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
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  Building2,
  TableProperties,
} from "lucide-react";

import { useExecutiveReportQuery } from "@/features/reports/client/use-reports";
import { StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ExecutivePrintableReport } from "@/components/reports/print/ExecutivePrintableReport";
import { cn } from "@/lib/utils";

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

  const categoryDistribution = data?.charts?.categoryDistribution;

  return (
    <>
      {/* ── Screen Dashboard View (Hidden during browser print) ──────── */}
      <div className="flex flex-col gap-3 w-full print:hidden">
        {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
        <div className="sticky top-10.25 sm:top-11.75 z-20 bg-bg-subtle pb-1.5 pt-0 transform-gpu">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-xl rounded-t-none border-x border-b border-t-0 border-border/80 bg-card p-4 sm:p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-text">
                  Reports &amp; Analytics
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/25">
                  Live Institutional Rollup
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
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

        {/* ── Middle Section: Tabular Operational Dossiers ─────────────── */}
        <div className="space-y-3">
          {/* Table 1: Institutional Operational Domain Matrix */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 sm:px-5 py-3.5 bg-bg-subtle/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <TableProperties className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text">
                    Operational Domain Status Matrix
                  </h2>
                  <p className="text-[11px] text-text-secondary">
                    Consolidated audit ledger of institutional assets, supplies, procurement, requisitions, and maintenance.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Audited Live Matrix
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg-subtle/60 text-[10.5px] font-bold uppercase tracking-wider text-text-secondary">
                    <th className="py-2.5 px-4 sm:px-5">Audit Domain</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Volume &amp; Units</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Valuation / Spend</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Operational Status</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Key SLA / Efficiency</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">Report Module</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-text">
                  {/* Row 1: Capital Assets */}
                  <tr className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text">Capital Asset Registry</div>
                          <div className="text-[11px] text-text-secondary">Equipment, furniture, &amp; IT hardware</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-text">
                        {isLoading ? "…" : (assets?.totalCount || 0).toLocaleString()}
                      </span>{" "}
                      <span className="text-[11px] text-text-secondary">units</span>
                      <div className="text-[10px] text-text-secondary">
                        {isLoading ? "…" : `${assets?.activeCount || 0} deployed`}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap text-text">
                      {isLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(assets?.totalValue || 0).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md",
                          operationalRate >= 90
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : operationalRate >= 75
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        )}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {isLoading ? "…" : `${operationalRate}% Operational`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                      {isLoading ? "…" : `${assets?.inRepairCount || 0} unit(s) under repair`}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href="/reports/assets"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                      >
                        View Assets <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  {/* Row 2: Consumable Supplies */}
                  <tr className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text">Consumable Supply Stores</div>
                          <div className="text-[11px] text-text-secondary">Office, academic, &amp; medical inventory</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-text">
                        {isLoading ? "…" : (consumables?.totalItems || 0).toLocaleString()}
                      </span>{" "}
                      <span className="text-[11px] text-text-secondary">SKUs</span>
                      <div className="text-[10px] text-text-secondary">Active store catalog</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap text-text">
                      {isLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(consumables?.totalValuation || 0).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {consumables?.lowStockCount ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          {consumables.lowStockCount} Below Threshold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Stock Levels Healthy
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                      {isLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(consumables?.monthBurnRateValue || 0).toLocaleString()} / 30d burn`
                        : "Active inventory turnover"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href="/reports/consumables"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                      >
                        View Supplies <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  {/* Row 3: Procurement & POs */}
                  <tr className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text">Procurement &amp; Purchase Orders</div>
                          <div className="text-[11px] text-text-secondary">Vendor lots &amp; acquisition pipeline</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-text">
                        {isLoading ? "…" : procurement?.openOrdersCount || 0}
                      </span>{" "}
                      <span className="text-[11px] text-text-secondary">active POs</span>
                      <div className="text-[10px] text-text-secondary">Open procurement cycles</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap text-text">
                      {isLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(procurement?.totalSpend30d || 0).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                        {isLoading ? "…" : `${procurement?.pendingDeliveryCount || 0} Pending Delivery`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                      30-day procurement window
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href="/reports/purchase-orders"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                      >
                        View Orders <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  {/* Row 4: Department Requisitions */}
                  <tr className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text">Department Requisitions</div>
                          <div className="text-[11px] text-text-secondary">Supply requests &amp; institutional distribution</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-text">
                        {isLoading ? "…" : requests?.fulfilledThisMonth || 0}
                      </span>{" "}
                      <span className="text-[11px] text-text-secondary">issued</span>
                      <div className="text-[10px] text-text-secondary">Fulfilled this period</div>
                    </td>
                    <td className="py-3 px-3 font-mono whitespace-nowrap text-text-secondary">
                      {isLoading ? "…" : `${requests?.pendingCount ?? 0} In Queue`}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {(requests?.pendingCount ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          {requests?.pendingCount} Pending Action
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Queue Clear
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                      {isLoading ? "…" : `${requests?.avgApprovalHours || 0}h avg turnaround`}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href="/reports/requests"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                      >
                        View Requests <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  {/* Row 5: Maintenance & Repairs */}
                  <tr className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                          <Wrench className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text">Corrective &amp; PM Maintenance</div>
                          <div className="text-[11px] text-text-secondary">Work orders, repairs, &amp; asset calibration</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-text">
                        {isLoading ? "…" : maintenance?.activeIssuesCount || 0}
                      </span>{" "}
                      <span className="text-[11px] text-text-secondary">active orders</span>
                      <div className="text-[10px] text-text-secondary">
                        {isLoading ? "…" : `${maintenance?.resolvedThisMonth || 0} resolved this month`}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap text-text">
                      {isLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(maintenance?.totalRepairSpend30d || 0).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {(maintenance?.activeIssuesCount || 0) > 3 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                          <AlertTriangle className="h-3 w-3" />
                          Backlog High
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Maintenance On Track
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                      {isLoading ? "…" : `${maintenance?.avgMttrDays || 0} days MTTR`}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href="/reports/maintenance"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                      >
                        View Logs <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Side-by-Side Tables: Category Valuation & 6-Month Spend Ledgers ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Table 2: Category Valuation & Inventory Breakdown (col-span-6) */}
            <div className="lg:col-span-6 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col h-[360px]">
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
            <div className="lg:col-span-6 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col h-[360px]">
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
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-accent">
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
                              <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                                {canViewCosts ? `₱${totalMaint.toLocaleString()}` : "—"}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-accent font-extrabold">
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
