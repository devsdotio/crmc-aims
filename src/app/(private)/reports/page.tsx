"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Package,
  HardHat,
  ShoppingCart,
  Wrench,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  Building2,
  TableProperties,
} from "lucide-react";

import {
  useExecutiveReportQuery,
  useProjectReportQuery,
  useDepartmentReportQuery,
} from "@/features/reports/client/use-reports";
import { StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ExecutivePrintableReport } from "@/components/reports/print/ExecutivePrintableReport";
import { cn } from "@/lib/utils";

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

        {/* ── Top Domain KPI Row with Report Links ──────────────────────── */}
        <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 -mt-1.5">
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
            delta={{
              value: `${operationalRate}% active`,
              isPositive: operationalRate >= 80,
            }}
            loading={isLoading}
            href="/reports/assets"
            tooltipAlign="left"
            tooltip="The total cost of all school equipment and property (such as computers, furniture, and vehicles) recorded in the system."
          />

          <KpiCard
            title="Consumable Supplies"
            sublabel="INVENTORY // SUPPLIES"
            value={
              isLoading
                ? "…"
                : canViewCosts
                ? `₱${(consumables?.suppliesValuation ?? 0).toLocaleString()}`
                : `${consumables?.suppliesCount ?? 0} SKUs`
            }
            subtitle={
              (consumables?.suppliesLowStockCount ?? 0) > 0
                ? `${consumables?.suppliesLowStockCount} of ${consumables?.suppliesCount ?? 0} SKUs low`
                : `${consumables?.suppliesCount ?? 0} SKUs in optimal stock`
            }
            icon={Package}
            tone={(consumables?.suppliesLowStockCount ?? 0) > 0 ? "amber" : "emerald"}
            toneValue={true}
            delta={{
              value: (consumables?.suppliesLowStockCount ?? 0) > 0
                ? `${consumables?.suppliesLowStockCount} low`
                : "Optimal",
              isPositive: !(consumables?.suppliesLowStockCount ?? 0),
            }}
            loading={isLoading}
            href="/reports/consumables?classification=supply"
            tooltipAlign="left"
            tooltip="General storeroom supplies (paper, ink, toiletries, office & medical items) kept for campus distribution."
          />

          <KpiCard
            title="Consumable Materials"
            sublabel="INVENTORY // MATERIALS"
            value={
              isLoading
                ? "…"
                : canViewCosts
                ? `₱${(consumables?.materialsValuation ?? 0).toLocaleString()}`
                : `${consumables?.materialsCount ?? 0} SKUs`
            }
            subtitle={
              (consumables?.materialsLowStockCount ?? 0) > 0
                ? `${consumables?.materialsLowStockCount} of ${consumables?.materialsCount ?? 0} SKUs low`
                : `${consumables?.materialsCount ?? 0} SKUs in optimal stock`
            }
            icon={HardHat}
            tone={(consumables?.materialsLowStockCount ?? 0) > 0 ? "rose" : "amber"}
            toneValue={true}
            delta={{
              value: (consumables?.materialsLowStockCount ?? 0) > 0
                ? `${consumables?.materialsLowStockCount} low`
                : "Optimal",
              isPositive: !(consumables?.materialsLowStockCount ?? 0),
            }}
            loading={isLoading}
            href="/reports/consumables?classification=material"
            tooltipAlign="center"
            tooltip="Construction, trade, and project materials (lumber, wiring, plumbing, paint, fabrication stock) tracked independently from office supplies."
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
            subtitle={`${procurement?.openOrdersCount || 0} open POs · ${procurement?.pendingDeliveryCount || 0} pending delivery`}
            icon={ShoppingCart}
            tone="indigo"
            toneValue={true}
            delta={{
              value: (procurement?.openOrdersCount ?? 0) > 0 ? `${procurement?.openOrdersCount} open` : "Clear",
              isPositive: true,
            }}
            loading={isLoading}
            href="/reports/purchase-orders"
            tooltipAlign="center"
            tooltip="The total money spent buying Supplies, Materials, and Capital Equipment over the past 30 days."
          />

          <KpiCard
            title="Average Repair Time"
            sublabel="FACILITY // REPAIRS"
            value={isLoading ? "…" : `${maintenance?.avgMttrDays || 0} d`}
            subtitle={`${maintenance?.activeIssuesCount || 0} active work orders`}
            icon={Wrench}
            tone="rose"
            toneValue={true}
            delta={{
              value: (maintenance?.activeIssuesCount ?? 0) > 0 ? `${maintenance?.activeIssuesCount} active` : "Clear",
              isPositive: (maintenance?.activeIssuesCount ?? 0) === 0,
            }}
            loading={isLoading}
            href="/reports/maintenance"
            tooltipAlign="right"
            tooltip="The average number of days it takes for our team to fix broken equipment and get it working again."
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
                    Consolidated audit ledger of institutional assets, Supplies, Materials, procurement, and maintenance.
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
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-blue-300 hover:underline"
                      >
                        View Assets <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  {/* Row 2A: Consumable Supplies */}
                  <tr className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text">Consumable Supplies</div>
                          <div className="text-[11px] text-text-secondary">Office, stationery, ink, medical &amp; janitorial stores</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-text">
                        {isLoading ? "…" : (consumables?.suppliesCount ?? 0).toLocaleString()}
                      </span>{" "}
                      <span className="text-[11px] text-text-secondary">SKUs</span>
                      <div className="text-[10px] text-text-secondary">Supply inventory</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap text-text">
                      {isLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(consumables?.suppliesValuation ?? 0).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {(consumables?.suppliesLowStockCount ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          {consumables?.suppliesLowStockCount} Below Threshold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Supplies Optimal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                      {isLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(consumables?.suppliesBurnRateValue ?? 0).toLocaleString()} / 30d burn`
                        : "Active supply turnover"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href="/reports/consumables?classification=supply"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-blue-300 hover:underline"
                      >
                        View Supplies <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  {/* Row 2B: Consumable Materials */}
                  <tr className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-800 dark:text-amber-300 border border-amber-500/25">
                          <HardHat className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text">Consumable Materials</div>
                          <div className="text-[11px] text-text-secondary">Construction, electrical, plumbing &amp; project hardware</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-text">
                        {isLoading ? "…" : (consumables?.materialsCount ?? 0).toLocaleString()}
                      </span>{" "}
                      <span className="text-[11px] text-text-secondary">SKUs</span>
                      <div className="text-[10px] text-text-secondary">Material inventory</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap text-text">
                      {isLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(consumables?.materialsValuation ?? 0).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {(consumables?.materialsLowStockCount ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          <AlertTriangle className="h-3 w-3" />
                          {consumables?.materialsLowStockCount} Below Threshold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Materials Optimal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                      {isLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(consumables?.materialsBurnRateValue ?? 0).toLocaleString()} / 30d burn`
                        : "Active material turnover"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href="/reports/consumables?classification=material"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-blue-300 hover:underline"
                      >
                        View Materials <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  {/* Row 3: Procurement & POs */}
                  <tr className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text">Procurement &amp; Purchase Orders</div>
                          <div className="text-[11px] text-text-secondary">Vendor lots across Supplies, Materials &amp; Assets</div>
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
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {isLoading ? "…" : `${procurement?.pendingDeliveryCount || 0} Pending Delivery`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                      30-day procurement window
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href="/reports/purchase-orders"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-blue-300 hover:underline"
                      >
                        View Orders <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  {/* Row 4: Maintenance & Repairs */}
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
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-blue-300 hover:underline"
                      >
                        View Logs <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  {/* Row 6: Institutional Projects */}
                  <tr className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                          <FolderKanban className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text">Institutional Projects</div>
                          <div className="text-[11px] text-text-secondary">Capital ventures, Materials &amp; Supplies utilization</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-text">
                        {isProjectLoading ? "…" : projects?.totalProjects || 0}
                      </span>{" "}
                      <span className="text-[11px] text-text-secondary">initiatives</span>
                      <div className="text-[10px] text-text-secondary">
                        {isProjectLoading ? "…" : `${projects?.activeProjects || 0} active, ${projects?.completedProjects || 0} completed`}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap text-text">
                      {isProjectLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(projects?.totalProjectSpend || 0).toLocaleString()}`
                        : "—"}
                      <div className="text-[10px] text-text-secondary font-normal">
                        {isProjectLoading ? "…" : `${projects?.totalAssetsAssigned || 0} assets assigned`}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                        <CheckCircle2 className="h-3 w-3" />
                        {isProjectLoading ? "…" : `${projects?.activeProjects || 0} In Progress`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                      {isProjectLoading
                        ? "…"
                        : `${(projects?.totalSuppliesConsumed ?? 0).toLocaleString()} supplies · ${(projects?.totalMaterialsConsumed ?? 0).toLocaleString()} materials`}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href="/reports/projects"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-blue-300 hover:underline"
                      >
                        View Projects <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  {/* Row 7: Department Operational Units */}
                  <tr className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text">Department Units</div>
                          <div className="text-[11px] text-text-secondary">Colleges, institutes, &amp; administrative branches</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-text">
                        {isDeptLoading ? "…" : departments?.totalDepartments || 0}
                      </span>{" "}
                      <span className="text-[11px] text-text-secondary">departments</span>
                      <div className="text-[10px] text-text-secondary">
                        {isDeptLoading ? "…" : `${departments?.totalAssetsDeployed || 0} deployed units`}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap text-text">
                      {isDeptLoading
                        ? "…"
                        : canViewCosts
                        ? `₱${(departments?.totalAssetsValue || 0).toLocaleString()}`
                        : "—"}
                      {canViewCosts && (departments?.totalConsumablesValue || 0) > 0 && (
                        <div className="text-[10px] text-text-secondary font-normal">
                          ₱{(departments?.totalSuppliesValue ?? 0).toLocaleString()} Sup · ₱{(departments?.totalMaterialsValue ?? 0).toLocaleString()} Mat
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        {isDeptLoading ? "…" : departments?.mostActiveByAssets ? `Top: ${departments.mostActiveByAssets}` : "Audited Units"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                      {isDeptLoading
                        ? "…"
                        : `${(departments?.totalSuppliesConsumed ?? 0).toLocaleString()} supplies · ${(departments?.totalMaterialsConsumed ?? 0).toLocaleString()} materials`}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href="/reports/departments"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-blue-300 hover:underline"
                      >
                        View Units <ArrowRight className="h-3 w-3" />
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
