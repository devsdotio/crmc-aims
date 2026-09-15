"use client";

import type { RequestReportRow, RequestsSummary, BaseReportFilters } from "@/types/reports";
import {
  PrintMetricBar,
  PrintDonutChart,
  PrintHorizontalDistribution,
  PrintObservationsBox,
  PrintStatusBadge,
} from "./PrintCharts";

interface RequestsPrintableReportProps {
  data: RequestReportRow[];
  summary?: RequestsSummary;
  canViewCosts?: boolean;
  filters?: BaseReportFilters;
  generatedAt?: Date;
}

export function RequestsPrintableReport({
  data = [],
  summary,
  filters,
  generatedAt = new Date(),
}: RequestsPrintableReportProps) {
  const totalRequests = summary?.totalRequests || data.length || 0;
  const pendingCount = summary?.pendingCount || data.filter((d) => d.status === "pending").length;
  const approvedCount = summary?.approvedCount || data.filter((d) => d.status === "approved").length;
  const fulfilledCount = summary?.fulfilledCount || data.filter((d) => d.status === "fulfilled").length;
  const rejectedCount = summary?.rejectedCount || data.filter((d) => d.status === "rejected").length;
  const avgTurnaround = summary?.avgTurnaroundHours || 0;

  const fulfillmentRate = totalRequests > 0 ? Math.round((fulfilledCount / totalRequests) * 100) : 0;

  // Status Donut
  const statusDonutData = [
    { name: "Fulfilled", value: fulfilledCount, color: "#0D9488" },
    { name: "Approved", value: approvedCount, color: "#14B8A6" },
    { name: "Pending", value: pendingCount, color: "#F59E0B" },
    { name: "Rejected", value: rejectedCount, color: "#EF4444" },
  ].filter((d) => d.value > 0);

  // Department distribution
  const deptDistribution = (summary?.departmentBreakdown || [])
    .slice(0, 5)
    .map((d) => ({
      label: d.department,
      value: d.count,
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
    filters?.status ? `Status: ${filters.status}` : "Status: All",
    filters?.search ? `Search: "${filters.search}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const observations = [
    `${fulfilledCount} of ${totalRequests} (${fulfillmentRate}%) requisitions have been approved and fulfilled.`,
    `Average fulfillment turnaround time is ${avgTurnaround} hours from requisition to issuance.`,
    `Department requisition volume highest in ${deptDistribution[0]?.label || "primary departments"} (${deptDistribution[0]?.value || 0} requests).`,
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
                REQ-RPT-{generatedAt.getFullYear()}{String(generatedAt.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Supply Requisitions &amp; Requests Report
            </h2>
            <div className="text-[9px] text-neutral-500 mt-0.5">{filterSummary}</div>
          </div>
          <span className="text-[8.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-xs">
            Requisitions Audit
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break mb-2.5">
        <PrintMetricBar
          metrics={[
            {
              label: "Total Requisitions",
              value: totalRequests.toLocaleString(),
              delta: `${fulfillmentRate}% fulfilled`,
              deltaType: "positive",
              subtext: "Total submitted",
            },
            {
              label: "Pending Queue",
              value: pendingCount.toString(),
              delta: pendingCount > 0 ? "Pending Action" : "Clear",
              deltaType: pendingCount > 0 ? "warning" : "positive",
              subtext: "Awaiting approval",
            },
            {
              label: "Fulfilled Items",
              value: fulfilledCount.toString(),
              delta: "Completed",
              deltaType: "positive",
              subtext: "Dispatched to requester",
            },
            {
              label: "Average Turnaround",
              value: `${avgTurnaround}h`,
              delta: "SLA Metric",
              deltaType: "neutral",
              subtext: "Submission to fulfillment",
            },
          ]}
        />
      </section>

      {/* ─── Visual Distribution Row ─────────────────────────────────────── */}
      <section className="avoid-break mb-2.5 grid grid-cols-12 gap-2 items-stretch">
        <div className="col-span-6">
          <PrintDonutChart
            title="Request Status Distribution"
            data={statusDonutData}
            pieSize={100}
            className="h-full"
          />
        </div>
        <div className="col-span-6">
          <PrintHorizontalDistribution
            title="Requisitions by Department"
            items={deptDistribution}
            valueSuffix=" reqs"
            className="h-full"
          />
        </div>
      </section>

      {/* ─── Requests Table ──────────────────────────────────────────────── */}
      <section className="avoid-break mb-2.5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[9.5px] font-bold uppercase tracking-wider text-teal-800">
            Requisition Queue Ledger
          </h3>
          <span className="text-[8.5px] text-neutral-500 font-mono">
            Showing {Math.min(data.length, 12)} of {totalRequests} records
          </span>
        </div>
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[8.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1 px-2 text-left">Code</th>
                <th className="py-1 px-2 text-left">Requester</th>
                <th className="py-1 px-2 text-left">Department</th>
                <th className="py-1 px-2 text-left">Items Preview</th>
                <th className="py-1 px-2 text-left">Status</th>
                <th className="py-1 px-2 text-right">Turnaround</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[9.5px] text-neutral-800">
              {data.slice(0, 12).map((row) => (
                <tr key={row.id}>
                  <td className="py-1 px-2 font-mono font-bold text-[#2A3260]">{row.requestCode}</td>
                  <td className="py-1 px-2 font-medium truncate max-w-35">{row.requesterName}</td>
                  <td className="py-1 px-2 text-neutral-600 truncate max-w-30">{row.department}</td>
                  <td className="py-1 px-2 text-neutral-600 truncate max-w-40">{row.itemsSummary}</td>
                  <td className="py-1 px-2">
                    <PrintStatusBadge status={row.status} />
                  </td>
                  <td className="py-1 px-2 text-right font-mono text-neutral-600">
                    {row.turnaroundHours != null ? `${row.turnaroundHours}h` : "—"}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-neutral-400 italic">
                    No requisition records found matching active filters.
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
            Verification Code: CRMC-REQ-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
