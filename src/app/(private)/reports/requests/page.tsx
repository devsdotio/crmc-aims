"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  PieChart as PieIcon,
} from "lucide-react";

import { useRequestsReportQuery } from "@/features/reports/client/use-reports";
import type { BaseReportFilters, RequestReportRow } from "@/types/reports";
import { StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { BreakdownDonutChart } from "@/components/reports/breakdown-donut-chart";
import { RecentListCard } from "@/components/reports/recent-list-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { RequestsPrintableReport } from "@/components/reports/print/RequestsPrintableReport";

const STATUS_OPTIONS = [
  { label: "Pending Approval", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Released / Fulfilled", value: "released" },
  { label: "Rejected", value: "rejected" },
];

export default function RequestsReportPage() {
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    status: "",
  });

  const { data, isLoading } = useRequestsReportQuery(filters);
  const summary = data?.summary;

  const statusDonutData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Pending", value: summary.pendingCount || 0, color: "#F59E0B" },
      { name: "Approved", value: summary.approvedCount || 0, color: "#2563EB" },
      { name: "Fulfilled", value: summary.fulfilledCount || 0, color: "#10B981" },
      { name: "Rejected", value: summary.rejectedCount || 0, color: "#EF4444" },
    ];
  }, [summary]);

  const reportRows = data?.data;

  const recentRequests = useMemo(() => {
    if (!reportRows || reportRows.length === 0) return [];
    return reportRows.slice(0, 5).map((req) => {
      const isPending = req.status === "pending";
      const isRejected = req.status === "rejected";
      const isReleased = req.status === "released";
      return {
        id: req.id,
        title: req.requestCode,
        tag: req.requestType === "asset_borrow" ? "Borrow" : "Consumable",
        subtitle: `${req.requesterName} (${req.department}) · ${
          req.itemsSummary || `${req.itemsCount} items`
        }`,
        date: req.requestedAt.split("T")[0],
        status: {
          label: req.status,
          variant: isReleased
            ? ("emerald" as const)
            : isPending
            ? ("amber" as const)
            : isRejected
            ? ("rose" as const)
            : ("blue" as const),
        },
      };
    });
  }, [reportRows]);

  const handleFilterChange = (updated: Partial<BaseReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleReset = () => {
    setFilters({
      page: 1,
      pageSize: 20,
      search: "",
      status: "",
    });
  };

  const columns: ColumnDef<RequestReportRow>[] = [
    {
      key: "requestCode",
      header: "Code",
      render: (row) => (
        <span className="font-mono font-bold text-text hover:text-accent transition-colors">
          {row.requestCode}
        </span>
      ),
    },
    {
      key: "requesterName",
      header: "Requester",
      render: (row) => (
        <div>
          <div className="font-semibold text-text">{row.requesterName}</div>
          <div className="text-[10px] text-text-secondary">{row.department}</div>
        </div>
      ),
    },
    {
      key: "itemsSummary",
      header: "Items / Equipment",
      render: (row) => (
        <div className="max-w-70">
          <div className="text-text font-medium truncate">{row.itemsSummary}</div>
          <div className="text-[10px] font-mono text-text-secondary">
            {row.itemsCount} item{row.itemsCount !== 1 ? "s" : ""} requested
          </div>
        </div>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      render: (row) => (
        <span className="text-text-secondary text-xs truncate max-w-55 block">
          {row.purpose}
        </span>
      ),
    },
    {
      key: "requestedAt",
      header: "Submitted",
      render: (row) => (
        <span className="text-text-secondary font-mono text-[11px]">
          {row.requestedAt.split("T")[0]}
        </span>
      ),
    },
    {
      key: "turnaroundHours",
      header: "SLA Turnaround",
      align: "right",
      render: (row) => (
        <span className="font-mono font-bold text-text">
          {row.turnaroundHours} hrs
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (row) => {
        const isPending = row.status === "pending";
        const isRejected = row.status === "rejected";
        const isReleased = row.status === "released";

        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border capitalize ${
              isPending
                ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                : isRejected
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : isReleased
                ? "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                : "bg-blue-500/10 text-blue-700 border-blue-500/20"
            }`}
          >
            {isPending && <Clock className="h-3 w-3" />}
            {isReleased && <CheckCircle2 className="h-3 w-3" />}
            {isRejected && <AlertCircle className="h-3 w-3" />}
            <span>{row.status}</span>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <div className="hidden print:block print:w-full">
        <RequestsPrintableReport
          data={data?.data || []}
          summary={summary}
          filters={filters}
        />
      </div>

      <div className="flex flex-col gap-3 w-full print:hidden">
      {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
      <div className="sticky top-10.25 sm:top-11.75 z-20 bg-bg-subtle pb-1.5 pt-0 transform-gpu">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-2xl rounded-t-none border-x border-b border-t-0 border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-text">
                Requisitions &amp; Issue Requests
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                Supply Logistics
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Borrowing requests, supply distributions, SLA approval turnaround, and department demand.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <ReportExportButton reportType="requests" filters={filters} />
          </div>
        </div>
      </div>

      {/* ── KPI Cards Grid with Inline Sparklines ───────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
        <KpiCard
          title="Total Requisitions"
          sublabel="REQUESTS // LOGISTICS"
          value={isLoading ? "…" : summary?.totalRequests || 0}
          subtitle="Cumulative tickets filed"
          icon={ClipboardList}
          tone="blue"
          toneValue={true}
          delta="+14.6%"
          loading={isLoading}
        />

        <KpiCard
          title="Pending Action"
          sublabel="APPROVAL // QUEUE"
          value={isLoading ? "…" : summary?.pendingCount || 0}
          subtitle={
            summary?.pendingCount
              ? "Awaiting review or dispatch"
              : "Queue is all clear"
          }
          icon={Clock}
          tone={(summary?.pendingCount || 0) > 0 ? "amber" : "emerald"}
          toneValue={true}
          delta={{
            value:
              (summary?.pendingCount || 0) > 0
                ? `${summary?.pendingCount} pending`
                : "All clear",
            isPositive: (summary?.pendingCount || 0) === 0,
          }}
          loading={isLoading}
        />

        <KpiCard
          title="Fulfilled & Issued"
          sublabel="FULFILLED // COMPLETED"
          value={isLoading ? "…" : summary?.fulfilledCount || 0}
          subtitle={
            summary?.totalRequests
              ? `${Math.round(((summary.fulfilledCount || 0) / summary.totalRequests) * 100)}% fulfillment rate`
              : "0% fulfillment rate"
          }
          icon={CheckCircle2}
          tone="emerald"
          toneValue={true}
          delta="+18.2%"
          loading={isLoading}
        />

        <KpiCard
          title="Avg Turnaround Time"
          sublabel="SLA // DISPATCH SPEED"
          value={isLoading ? "…" : `${summary?.avgTurnaroundHours ?? 4.8} hrs`}
          subtitle="Submission to release resolution"
          icon={TrendingUp}
          tone="accent"
          toneValue={true}
          delta="-1.4 hrs"
          loading={isLoading}
        />
      </StatCardGrid>

      {/* ── Visual Analytics Row: Status Donut + Recent Requisitions ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-5">
          <BreakdownDonutChart
            title="Request Status Distribution"
            sublabel="WORKFLOW // LIFECYCLE"
            description="Requisition breakdown across approval states and final issuance."
            icon={PieIcon}
            data={statusDonutData}
            unitLabel="requests"
            loading={isLoading}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-7">
          <RecentListCard
            title="Recent Requisitions & Requests"
            sublabel="ACTIVITY // AUDIT"
            description="Latest department borrow logs and consumable supply issues."
            icon={ClipboardList}
            items={recentRequests}
            emptyMessage="No requisition requests matching current filter criteria."
            loading={isLoading}
            className="h-full"
          />
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────── */}
      <div className="print:hidden">
        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          statuses={STATUS_OPTIONS}
          searchPlaceholder="Search request code, requester name, department…"
        />
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <ReportTable
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={data?.page || 1}
        pageSize={data?.pageSize || 20}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        onPageChange={(page) => handleFilterChange({ page })}
      />
    </div>
    </>
  );
}
