"use client";

import type { PurchaseOrderRow, PurchaseOrdersSummary, BaseReportFilters } from "@/types/reports";
import {
  PrintMetricBar,
  PrintGaugeChart,
  PrintHorizontalDistribution,
  PrintObservationsBox,
  PrintStatusBadge,
} from "./PrintCharts";

interface ProcurementPrintableReportProps {
  data: PurchaseOrderRow[];
  summary?: PurchaseOrdersSummary;
  canViewCosts?: boolean;
  filters?: BaseReportFilters;
  generatedAt?: Date;
}

export function ProcurementPrintableReport({
  data = [],
  summary,
  canViewCosts = true,
  filters,
  generatedAt = new Date(),
}: ProcurementPrintableReportProps) {
  const totalSpend = summary?.totalSpend || 0;
  const openOrders = summary?.openOrdersCount || data.filter((d) => d.status !== "received").length;
  const deliveredCount = summary?.deliveredCount || data.filter((d) => d.status === "received").length;
  const avgLeadTime = summary?.avgLeadTimeDays || 0;
  const totalOrders = openOrders + deliveredCount || data.length || 1;

  const fulfillmentRate = Math.round((deliveredCount / totalOrders) * 100);

  // Supplier distribution
  const supplierDistribution = (summary?.topSuppliers || [])
    .slice(0, 5)
    .map((s) => ({
      label: s.name,
      value: s.spend,
      displayValue: canViewCosts ? `₱${(s.spend / 1000).toFixed(0)}k` : `${s.spend}`,
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

  const filterSummary = [
    filters?.status ? `PO Status: ${filters.status}` : "Status: All",
    filters?.search ? `Search: "${filters.search}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const observations = [
    `${deliveredCount} of ${totalOrders} (${fulfillmentRate}%) purchase orders have been received and inducted into inventory.`,
    `Average procurement lead time across suppliers is ${avgLeadTime} days.`,
    `Top procurement expenditure allocated to ${summary?.topSuppliers?.[0]?.name || "primary vendors"}.`,
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
                PO-AUD-{generatedAt.getFullYear()}{String(generatedAt.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Procurement &amp; Purchase Orders Report
            </h2>
            <div className="text-[9px] text-neutral-500 mt-0.5">{filterSummary}</div>
          </div>
          <span className="text-[8.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-xs">
            Procurement Audit
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break mb-2.5">
        <PrintMetricBar
          metrics={[
            {
              label: "Total PO Spend",
              value: canViewCosts ? `₱${(totalSpend / 1000000).toFixed(2)}M` : "—",
              delta: "Expenditure",
              deltaType: "neutral",
              subtext: "Issued orders",
            },
            {
              label: "Open Orders",
              value: openOrders.toString(),
              delta: `${openOrders} in pipeline`,
              deltaType: openOrders > 5 ? "warning" : "positive",
              subtext: "Pending delivery",
            },
            {
              label: "Delivered & Received",
              value: deliveredCount.toString(),
              delta: `${fulfillmentRate}% rate`,
              deltaType: "positive",
              subtext: "Fully closed orders",
            },
            {
              label: "Average Lead Time",
              value: `${avgLeadTime} days`,
              delta: "Cycle Time",
              deltaType: "neutral",
              subtext: "Order to delivery",
            },
          ]}
        />
      </section>

      {/* ─── Distribution & Gauge Row ─────────────────────────────────────── */}
      <section className="avoid-break mb-2.5 grid grid-cols-12 gap-2 items-stretch">
        <div className="col-span-4">
          <PrintGaugeChart
            title="PO Fulfillment Rate"
            value={fulfillmentRate}
            label={`${deliveredCount} / ${totalOrders} Orders`}
            sublabel="Completed Delivery Cycle"
            className="h-full"
          />
        </div>
        <div className="col-span-8">
          <PrintHorizontalDistribution
            title="Spend by Top Suppliers"
            items={supplierDistribution}
            className="h-full"
          />
        </div>
      </section>

      {/* ─── Purchase Orders Table ───────────────────────────────────────── */}
      <section className="avoid-break mb-2.5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[9.5px] font-bold uppercase tracking-wider text-teal-800">
            Purchase Orders Registry
          </h3>
          <span className="text-[8.5px] text-neutral-500 font-mono">
            Showing {Math.min(data.length, 12)} of {data.length} records
          </span>
        </div>
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[8.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1 px-2 text-left">PO Number</th>
                <th className="py-1 px-2 text-left">Supplier</th>
                <th className="py-1 px-2 text-left">Items Preview</th>
                <th className="py-1 px-2 text-left">Status</th>
                <th className="py-1 px-2 text-right">Lead Time</th>
                {canViewCosts && <th className="py-1 px-2 text-right">Total Amount</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[9.5px] text-neutral-800">
              {data.slice(0, 12).map((row) => (
                <tr key={row.poNumber}>
                  <td className="py-1 px-2 font-mono font-bold text-[#2A3260]">{row.poNumber}</td>
                  <td className="py-1 px-2 font-medium truncate max-w-35">{row.supplierName}</td>
                  <td className="py-1 px-2 text-neutral-600 truncate max-w-40">{row.itemsPreview}</td>
                  <td className="py-1 px-2">
                    <PrintStatusBadge status={row.status} />
                  </td>
                  <td className="py-1 px-2 text-right font-mono text-neutral-600">
                    {row.leadTimeDays != null ? `${row.leadTimeDays}d` : "—"}
                  </td>
                  {canViewCosts && (
                    <td className="py-1 px-2 text-right font-mono font-semibold text-neutral-900">
                      {row.totalAmount != null ? `₱${row.totalAmount.toLocaleString()}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 6 : 5} className="py-3 text-center text-neutral-400 italic">
                    No purchase orders found matching active filters.
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
            Verification Code: CRMC-PO-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
