"use client";

import type { ExecutiveKpiSummary } from "@/types/reports";
import {
  PrintDonutChart,
  PrintBarChart,
  PrintGaugeChart,
} from "./PrintCharts";

interface ExecutivePrintableReportProps {
  data: ExecutiveKpiSummary;
  generatedAt?: Date;
  filtersSummary?: string;
}

export function ExecutivePrintableReport({
  data,
  generatedAt = new Date(),
  filtersSummary = "Scope: Institutional Rollup · Academic & Administrative Departments · All Categories",
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
    month: "long",
    day: "numeric",
  });
  const formattedTime = generatedAt.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="print-page mx-auto w-full max-w-[7.6in] bg-white text-[#1B2140] text-xs leading-tight font-sans">
      {/* ─── Institutional Header ───────────────────────────────────────── */}
      <header className="avoid-break border-b-2 border-[#2A3260] pb-2 mb-2.5">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="text-[9px] font-bold tracking-widest text-[#FF4E45] uppercase">
              Upper Pandan, Bogo City, Cebu, Philippines
            </div>
            <h1 className="text-sm font-extrabold tracking-tight text-[#2A3260] uppercase">
              Cebu Roosevelt Memorial Colleges, Inc.
            </h1>
            <div className="text-[11px] font-semibold text-neutral-600">
              Asset &amp; Inventory Management System (CRMC-AIMS)
            </div>
          </div>

          <div className="rounded-xs border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-right font-mono text-[9px] space-y-0.5 shrink-0">
            <div>
              <span className="text-neutral-500">Doc ID:</span>{" "}
              <span className="font-bold text-neutral-800">
                EXEC-RPT-{generatedAt.getFullYear()}
                {String(generatedAt.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
            <div>
              <span className="text-neutral-500">Generated:</span>{" "}
              <span className="font-medium text-neutral-800">
                {formattedDate} {formattedTime}
              </span>
            </div>
            <div>
              <span className="text-neutral-500">Class:</span>{" "}
              <span className="font-bold text-emerald-700">OFFICIAL AUDIT</span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-1 text-[10px]">
          <div>
            <span className="font-bold text-[#2A3260] uppercase tracking-wide">
              Executive Operational &amp; Financial Audit Overview
            </span>
          </div>
          <div className="text-neutral-500">{filtersSummary}</div>
        </div>
      </header>

      {/* ─── Pillar KPI Grid ────────────────────────────────────────────── */}
      <section className="avoid-break mb-2.5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#2A3260]">
            1. Consolidated Operational Domain Metrics
          </h2>
          <span className="text-[9px] text-neutral-500">Live Institutional Rollup</span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {/* Assets */}
          <div className="rounded-xs border border-neutral-300 bg-neutral-50/50 p-1.5 px-2">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-neutral-600">
              Capital Assets
            </div>
            <div className="mt-0.5 text-[13px] font-extrabold text-[#2A3260]">
              {canViewCosts
                ? `₱${(assets?.totalValue || 0).toLocaleString()}`
                : `${assets?.totalCount || 0} units`}
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[8.5px] text-neutral-600">
              <span>{assets?.activeCount || 0} active</span>
              <span className="text-amber-700 font-semibold">{assets?.inRepairCount || 0} repair</span>
            </div>
          </div>

          {/* Consumables */}
          <div className="rounded-xs border border-neutral-300 bg-neutral-50/50 p-1.5 px-2">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-neutral-600">
              Consumables Stock
            </div>
            <div className="mt-0.5 text-[13px] font-extrabold text-[#2A3260]">
              {canViewCosts
                ? `₱${(consumables?.totalValuation || 0).toLocaleString()}`
                : `${consumables?.totalItems || 0} SKUs`}
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[8.5px] text-neutral-600">
              <span>{consumables?.totalItems || 0} items</span>
              <span
                className={
                  consumables?.lowStockCount
                    ? "text-amber-700 font-semibold"
                    : "text-emerald-700 font-semibold"
                }
              >
                {consumables?.lowStockCount
                  ? `${consumables.lowStockCount} low`
                  : "Optimal"}
              </span>
            </div>
          </div>

          {/* Procurement */}
          <div className="rounded-xs border border-neutral-300 bg-neutral-50/50 p-1.5 px-2">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-neutral-600">
              Procurement (30d)
            </div>
            <div className="mt-0.5 text-[13px] font-extrabold text-[#2A3260]">
              {canViewCosts
                ? `₱${(procurement?.totalSpend30d || 0).toLocaleString()}`
                : `${procurement?.openOrdersCount || 0} orders`}
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[8.5px] text-neutral-600">
              <span>{procurement?.openOrdersCount || 0} open POs</span>
              <span className="text-neutral-500">{procurement?.pendingDeliveryCount || 0} pending</span>
            </div>
          </div>

          {/* Requests */}
          <div className="rounded-xs border border-neutral-300 bg-neutral-50/50 p-1.5 px-2">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-neutral-600">
              Supply Requests
            </div>
            <div className="mt-0.5 text-[13px] font-extrabold text-[#2A3260]">
              {requests?.pendingCount ?? 0} Pending
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[8.5px] text-neutral-600">
              <span>{requests?.fulfilledThisMonth || 0} fulfilled</span>
              <span className="text-neutral-500">{requests?.avgApprovalHours || 0}h turnaround</span>
            </div>
          </div>

          {/* Maintenance */}
          <div className="rounded-xs border border-neutral-300 bg-neutral-50/50 p-1.5 px-2">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-neutral-600">
              Maintenance MTTR
            </div>
            <div className="mt-0.5 text-[13px] font-extrabold text-[#FF4E45]">
              {maintenance?.avgMttrDays || 0} Days
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[8.5px] text-neutral-600">
              <span>{maintenance?.activeIssuesCount || 0} active</span>
              <span className="text-emerald-700 font-semibold">{maintenance?.resolvedThisMonth || 0} fixed</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Visual Analysis Row (Gauge + Donut, then Spend Trend) ─────── */}
      <section className="avoid-break mb-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#2A3260]">
            2. Institutional Valuation Share &amp; Equipment Reliability
          </h2>
          <span className="text-[9px] text-neutral-500 font-mono">LIVE CHART AUDIT</span>
        </div>

        {/* Top Row: Gauge (col-span-4) + Donut (col-span-8) */}
        <div className="grid grid-cols-12 gap-2 items-stretch">
          {/* Gauge: Asset Health */}
          <div className="col-span-4">
            <PrintGaugeChart
              title="Asset Availability"
              value={operationalRate}
              label={`${assets?.activeCount || 0} / ${assets?.totalCount || 0} Units`}
              sublabel="Ready for Academic & Administrative Use"
              className="h-full min-h-[135px]"
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
              pieSize={115}
              className="h-full min-h-[135px]"
            />
          </div>
        </div>

        {/* Bottom Row: 6-Month Spend Trend (Full width) */}
        <div className="w-full">
          <PrintBarChart
            title="6-Month Institutional Spend Trend (Procurement vs Maintenance)"
            data={charts?.monthlySpendTrend || []}
            seriesKeys={[
              { key: "procurement", label: "Procurement Spend", color: "#2A3260" },
              { key: "maintenance", label: "Maintenance Spend", color: "#FF4E45" },
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
      <section className="avoid-break mb-3">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#2A3260]">
            3. Operational Domain Status Matrix
          </h2>
          <span className="text-[9px] text-neutral-500">Summary Audit Rollup</span>
        </div>

        <div className="rounded-xs border border-neutral-300 bg-white overflow-hidden">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-300 bg-neutral-100 text-[9px] font-bold uppercase tracking-wider text-neutral-700">
                <th className="py-1 px-2">Audit Domain</th>
                <th className="py-1 px-2">Primary Valuation / Spend</th>
                <th className="py-1 px-2">Unit / Queue Volume</th>
                <th className="py-1 px-2">Health / Service Status</th>
                <th className="py-1 px-2 text-right">SLA / Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800 text-[10.5px]">
              <tr>
                <td className="py-1 px-2 font-semibold text-[#2A3260]">
                  Capital Asset Registry
                </td>
                <td className="py-1 px-2 font-medium">
                  {canViewCosts ? `₱${(assets?.totalValue || 0).toLocaleString()}` : "—"}
                </td>
                <td className="py-1 px-2">{assets?.totalCount || 0} Total Assets</td>
                <td className="py-1 px-2">
                  <span className="inline-flex items-center rounded-xs bg-emerald-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-emerald-800 border border-emerald-300">
                    {operationalRate}% Operational
                  </span>
                </td>
                <td className="py-1 px-2 text-right text-neutral-600">
                  {assets?.inRepairCount || 0} Under Maintenance
                </td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-semibold text-[#2A3260]">
                  Consumable Supply Stores
                </td>
                <td className="py-1 px-2 font-medium">
                  {canViewCosts
                    ? `₱${(consumables?.totalValuation || 0).toLocaleString()}`
                    : "—"}
                </td>
                <td className="py-1 px-2">{consumables?.totalItems || 0} Registered SKUs</td>
                <td className="py-1 px-2">
                  {consumables?.lowStockCount ? (
                    <span className="inline-flex items-center rounded-xs bg-amber-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-amber-800 border border-amber-300">
                      {consumables.lowStockCount} Below Threshold
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-xs bg-emerald-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-emerald-800 border border-emerald-300">
                      Stock Levels Healthy
                    </span>
                  )}
                </td>
                <td className="py-1 px-2 text-right text-neutral-600">
                  {canViewCosts
                    ? `₱${(consumables?.monthBurnRateValue || 0).toLocaleString()} 30d burn`
                    : "—"}
                </td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-semibold text-[#2A3260]">
                  Procurement &amp; Purchase Orders
                </td>
                <td className="py-1 px-2 font-medium">
                  {canViewCosts
                    ? `₱${(procurement?.totalSpend30d || 0).toLocaleString()}`
                    : "—"}
                </td>
                <td className="py-1 px-2">
                  {procurement?.openOrdersCount || 0} Active Purchase Orders
                </td>
                <td className="py-1 px-2">
                  <span className="inline-flex items-center rounded-xs bg-blue-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-blue-800 border border-blue-300">
                    {procurement?.pendingDeliveryCount || 0} Pending Delivery
                  </span>
                </td>
                <td className="py-1 px-2 text-right text-neutral-600">30-Day Period Window</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-semibold text-[#2A3260]">
                  Department Requisitions
                </td>
                <td className="py-1 px-2 font-medium">
                  {requests?.fulfilledThisMonth || 0} Fulfilled Items
                </td>
                <td className="py-1 px-2">{requests?.pendingCount ?? 0} In Review Queue</td>
                <td className="py-1 px-2">
                  {(requests?.pendingCount ?? 0) > 0 ? (
                    <span className="inline-flex items-center rounded-xs bg-amber-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-amber-800 border border-amber-300">
                      Pending Action
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-xs bg-emerald-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-emerald-800 border border-emerald-300">
                      Queue Clear
                    </span>
                  )}
                </td>
                <td className="py-1 px-2 text-right text-neutral-600">
                  {requests?.avgApprovalHours || 0}h Avg Turnaround
                </td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-semibold text-[#2A3260]">
                  Corrective &amp; PM Maintenance
                </td>
                <td className="py-1 px-2 font-medium">
                  {canViewCosts
                    ? `₱${(maintenance?.totalRepairSpend30d || 0).toLocaleString()}`
                    : "—"}
                </td>
                <td className="py-1 px-2">
                  {maintenance?.activeIssuesCount || 0} Active Work Orders
                </td>
                <td className="py-1 px-2">
                  <span className="inline-flex items-center rounded-xs bg-emerald-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-emerald-800 border border-emerald-300">
                    {maintenance?.resolvedThisMonth || 0} Closed this Month
                  </span>
                </td>
                <td className="py-1 px-2 text-right text-neutral-600">
                  {maintenance?.avgMttrDays || 0} Days Avg MTTR
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Institutional Footer ───────────────────────────────────────── */}
      <footer className="avoid-break mt-3 pt-2 border-t border-neutral-300">
        <div className="flex items-center justify-between text-[8.5px] text-neutral-500 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · Upper Pandan, Bogo City, Cebu 6010</div>
          <div>
            CRMC-AIMS Institutional Report · Verification Code: CRMC-
            {generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
