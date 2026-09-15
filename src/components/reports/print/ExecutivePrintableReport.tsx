"use client";

import type { ExecutiveKpiSummary } from "@/types/reports";
import {
  PrintDonutChart,
  PrintBarChart,
  PrintGaugeChart,
  PrintMetricBar,
  PrintObservationsBox,
  PrintStatusBadge,
} from "./PrintCharts";

interface ExecutivePrintableReportProps {
  data: ExecutiveKpiSummary;
  generatedAt?: Date;
  filtersSummary?: string;
}

export function ExecutivePrintableReport({
  data,
  generatedAt = new Date(),
  filtersSummary = "Department: All · Location: All · Status: All",
}: ExecutivePrintableReportProps) {
  const { assets, consumables, procurement, requests, maintenance, charts, canViewCosts } = data;

  const operationalRate =
    assets?.totalCount && assets.totalCount > 0
      ? Math.round(((assets.activeCount || 0) / assets.totalCount) * 100)
      : 0;

  const categoryDonutData = (charts?.categoryDistribution || []).map((c) => ({
    name: c.name,
    value: canViewCosts && c.value > 0 ? c.value : c.count,
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

  // Dynamic Key Observations generated from live data
  const observations: string[] = [
    `${assets?.activeCount || 0} of ${assets?.totalCount || 0} (${operationalRate}%) capital assets are fully operational, with ${assets?.inRepairCount || 0} currently under maintenance.`,
    consumables?.lowStockCount && consumables.lowStockCount > 0
      ? `${consumables.lowStockCount} consumable SKUs are below reorder point requiring immediate replenishment.`
      : `Consumable supply inventory is operating within optimal buffer thresholds across all departments.`,
    `${procurement?.openOrdersCount || 0} active purchase orders in pipeline (${canViewCosts ? `₱${(procurement?.totalSpend30d || 0).toLocaleString()}` : 'active cycle'}).`,
    `Maintenance repair turnaround averaging ${maintenance?.avgMttrDays || 0} days MTTR with ${maintenance?.resolvedThisMonth || 0} work orders closed this period.`,
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
              <span className="font-semibold text-neutral-800">
                {formattedDate}, {formattedTime}
              </span>
            </div>
            <div>
              <span className="text-neutral-500">Doc ID:</span>{" "}
              <span className="font-bold text-neutral-800">
                CRMC-EXEC-{generatedAt.getFullYear()}
                {String(generatedAt.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Operational Reports Summary
            </h2>
            <div className="text-[10px] text-neutral-500 mt-0.5">{filtersSummary}</div>
          </div>
          <span className="text-[9.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-xs">
            Executive Audit Overview
          </span>
        </div>
      </header>

      {/* ─── Connected Pillar KPI Metric Bar ─────────────────────────────── */}
      <section className="avoid-break">
        <PrintMetricBar
          metrics={[
            {
              label: "Total Assets",
              value: canViewCosts
                ? `₱${((assets?.totalValue || 0) / 1000000).toFixed(1)}M`
                : `${assets?.totalCount || 0}`,
              delta: `${operationalRate}% active`,
              deltaType: "positive",
              subtext: `${assets?.activeCount || 0} operational units`,
            },
            {
              label: "Consumables",
              value: canViewCosts
                ? `₱${((consumables?.totalValuation || 0) / 1000).toFixed(0)}k`
                : `${consumables?.totalItems || 0} SKUs`,
              delta: consumables?.lowStockCount ? `${consumables.lowStockCount} low` : "Optimal",
              deltaType: consumables?.lowStockCount ? "warning" : "positive",
              subtext: `${consumables?.totalItems || 0} registered SKUs`,
            },
            {
              label: "Procurement (30d)",
              value: canViewCosts
                ? `₱${((procurement?.totalSpend30d || 0) / 1000).toFixed(0)}k`
                : `${procurement?.openOrdersCount || 0} POs`,
              delta: `${procurement?.openOrdersCount || 0} open`,
              deltaType: "neutral",
              subtext: `${procurement?.pendingDeliveryCount || 0} pending delivery`,
            },
            {
              label: "Supply Requests",
              value: `${requests?.pendingCount ?? 0}`,
              delta: `${requests?.fulfilledThisMonth || 0} closed`,
              deltaType: (requests?.pendingCount ?? 0) > 0 ? "warning" : "positive",
              subtext: `${requests?.avgApprovalHours || 0}h avg turnaround`,
            },
            {
              label: "Maintenance MTTR",
              value: `${maintenance?.avgMttrDays || 0}d`,
              delta: `${maintenance?.activeIssuesCount || 0} active`,
              deltaType: (maintenance?.activeIssuesCount || 0) > 3 ? "warning" : "positive",
              subtext: `${maintenance?.resolvedThisMonth || 0} resolved this month`,
            },
          ]}
        />
      </section>

      {/* ─── Visual Analysis Row (Gauge + Donut, then Spend Trend) ─────── */}
      <section className="avoid-break space-y-2.5">
        {/* Top Row: Gauge (col-span-4) + Donut (col-span-8) */}
        <div className="grid grid-cols-12 gap-2.5 items-stretch">
          {/* Gauge: Asset Health */}
          <div className="col-span-4">
            <PrintGaugeChart
              title="Asset Availability"
              value={operationalRate}
              label={`${assets?.activeCount || 0} / ${assets?.totalCount || 0} Units`}
              sublabel="Ready for Academic & Administrative Use"
              className="h-full min-h-34"
            />
          </div>

          {/* Category Donut Chart */}
          <div className="col-span-8">
            <PrintDonutChart
              title="Category Valuation Share"
              data={categoryDonutData}
              valueFormatter={(v) =>
                canViewCosts ? `₱${v.toLocaleString()}` : `${v.toLocaleString()} units`
              }
              pieSize={110}
              className="h-full min-h-34"
            />
          </div>
        </div>

        {/* Bottom Row: 6-Month Spend Trend (Full width) */}
        <div className="w-full">
          <PrintBarChart
            title="6-Month Institutional Spend Trend (Procurement vs Maintenance)"
            data={charts?.monthlySpendTrend || []}
            seriesKeys={[
              { key: "procurement", label: "Procurement Spend", color: "#0D9488" },
              { key: "maintenance", label: "Maintenance Spend", color: "#F59E0B" },
            ]}
            valueFormatter={(v) =>
              canViewCosts
                ? `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                : `${v}`
            }
            width={640}
            height={110}
            className="w-full"
          />
        </div>
      </section>

      {/* ─── Operational Domain Summary Matrix Table ─────────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>Operational Domain Status Matrix</span>
            <span className="text-[10px] text-neutral-500 font-mono">Summary Audit Rollup</span>
          </div>

          <table className="w-full border-collapse text-left text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3">Audit Domain</th>
                <th className="py-1.5 px-3 whitespace-nowrap">Primary Valuation / Spend</th>
                <th className="py-1.5 px-3 whitespace-nowrap">Unit / Queue Volume</th>
                <th className="py-1.5 px-3 whitespace-nowrap">Health / Service Status</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">SLA / Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800 text-[11px]">
              <tr>
                <td className="py-1.5 px-3 font-semibold text-[#2A3260]">
                  Capital Asset Registry
                </td>
                <td className="py-1.5 px-3 font-mono font-medium whitespace-nowrap">
                  {canViewCosts ? `₱${(assets?.totalValue || 0).toLocaleString()}` : "—"}
                </td>
                <td className="py-1.5 px-3 whitespace-nowrap">{assets?.totalCount || 0} Total Assets</td>
                <td className="py-1.5 px-3 whitespace-nowrap">
                  <PrintStatusBadge status="active" label={`${operationalRate}% Operational`} />
                </td>
                <td className="py-1.5 px-3 text-right text-neutral-600 whitespace-nowrap">
                  {assets?.inRepairCount || 0} Under Maintenance
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-semibold text-[#2A3260]">
                  Consumable Supply Stores
                </td>
                <td className="py-1.5 px-3 font-mono font-medium whitespace-nowrap">
                  {canViewCosts
                    ? `₱${(consumables?.totalValuation || 0).toLocaleString()}`
                    : "—"}
                </td>
                <td className="py-1.5 px-3 whitespace-nowrap">{consumables?.totalItems || 0} Registered SKUs</td>
                <td className="py-1.5 px-3 whitespace-nowrap">
                  {consumables?.lowStockCount ? (
                    <PrintStatusBadge status="low stock" label={`${consumables.lowStockCount} Below Threshold`} />
                  ) : (
                    <PrintStatusBadge status="optimal" label="Stock Levels Optimal" />
                  )}
                </td>
                <td className="py-1.5 px-3 text-right text-neutral-600 whitespace-nowrap">
                  {canViewCosts
                    ? `₱${(consumables?.monthBurnRateValue || 0).toLocaleString()} 30d burn`
                    : "—"}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-semibold text-[#2A3260]">
                  Procurement &amp; Purchase Orders
                </td>
                <td className="py-1.5 px-3 font-mono font-medium whitespace-nowrap">
                  {canViewCosts
                    ? `₱${(procurement?.totalSpend30d || 0).toLocaleString()}`
                    : "—"}
                </td>
                <td className="py-1.5 px-3 whitespace-nowrap">
                  {procurement?.openOrdersCount || 0} Active Purchase Orders
                </td>
                <td className="py-1.5 px-3 whitespace-nowrap">
                  <PrintStatusBadge status="ordered" label={`${procurement?.pendingDeliveryCount || 0} Pending Delivery`} />
                </td>
                <td className="py-1.5 px-3 text-right text-neutral-600 whitespace-nowrap">30-Day Period Window</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-semibold text-[#2A3260]">
                  Department Requisitions
                </td>
                <td className="py-1.5 px-3 font-medium whitespace-nowrap">
                  {requests?.fulfilledThisMonth || 0} Fulfilled Items
                </td>
                <td className="py-1.5 px-3 whitespace-nowrap">{requests?.pendingCount ?? 0} In Review Queue</td>
                <td className="py-1.5 px-3 whitespace-nowrap">
                  {(requests?.pendingCount ?? 0) > 0 ? (
                    <PrintStatusBadge status="pending" label="Pending Action" />
                  ) : (
                    <PrintStatusBadge status="fulfilled" label="Queue Clear" />
                  )}
                </td>
                <td className="py-1.5 px-3 text-right text-neutral-600 whitespace-nowrap">
                  {requests?.avgApprovalHours || 0}h Avg Turnaround
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-semibold text-[#2A3260]">
                  Corrective &amp; PM Maintenance
                </td>
                <td className="py-1.5 px-3 font-mono font-medium whitespace-nowrap">
                  {canViewCosts
                    ? `₱${(maintenance?.totalRepairSpend30d || 0).toLocaleString()}`
                    : "—"}
                </td>
                <td className="py-1.5 px-3 whitespace-nowrap">
                  {maintenance?.activeIssuesCount || 0} Active Work Orders
                </td>
                <td className="py-1.5 px-3 whitespace-nowrap">
                  <PrintStatusBadge status="completed" label={`${maintenance?.resolvedThisMonth || 0} Closed this Month`} />
                </td>
                <td className="py-1.5 px-3 text-right text-neutral-600 whitespace-nowrap">
                  {maintenance?.avgMttrDays || 0} Days Avg MTTR
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Key Observations Callout Box ─────────────────────────────────── */}
      <section className="avoid-break">
        <PrintObservationsBox observations={observations} />
      </section>

      {/* ─── Institutional Footer ───────────────────────────────────────── */}
      <footer className="avoid-break pt-2 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[9.5px] text-neutral-500 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS Executive</div>
          <div>Page 1 of 1</div>
          <div suppressHydrationWarning>
            Verification Code: CRMC-EXEC-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
