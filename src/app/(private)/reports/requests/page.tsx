"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  PieChart as PieIcon,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Calendar,
  FileText,
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
import { ReportTimeframeFilter } from "@/components/reports/report-timeframe-filter";
import { useReportTimeframe } from "@/components/reports/report-timeframe-context";
import { RequestsPrintableReport } from "@/components/reports/print/RequestsPrintableReport";
import { RequestCardSkeleton } from "@/components/reports/report-card-skeleton";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { label: "Pending Approval", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Released / Fulfilled", value: "released" },
  { label: "Rejected", value: "rejected" },
];

export default function RequestsReportPage() {
  const { timeframe, setTimeframe } = useReportTimeframe();
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    status: "",
  });

  const effectiveFilters = useMemo<BaseReportFilters>(
    () => ({
      ...filters,
      startDate: timeframe.startDate,
      endDate: timeframe.endDate,
    }),
    [filters, timeframe.startDate, timeframe.endDate]
  );

  const { data, isLoading } = useRequestsReportQuery(effectiveFilters);
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
    if ("startDate" in updated || "endDate" in updated) {
      setTimeframe({
        startDate: updated.startDate,
        endDate: updated.endDate,
      });
    }
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
          filters={effectiveFilters}
        />
      </div>

      <div className="flex flex-col gap-3 w-full print:hidden">
      {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
      <div className="sticky top-10.25 sm:top-11.75 z-20 bg-bg-subtle pb-1.5 pt-0 transform-gpu">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-xl rounded-t-none border-x border-b border-t-0 border-border/80 bg-card p-4 sm:p-5 shadow-xs">
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

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <ReportTimeframeFilter filters={effectiveFilters} onFilterChange={handleFilterChange} />
            <ReportExportButton reportType="requests" filters={effectiveFilters} />
          </div>
        </div>
      </div>

      {/* ── KPI Cards Grid with Inline Sparklines ───────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
        <KpiCard
          title="Total Requests"
          sublabel="REQUESTS // LOGISTICS"
          value={isLoading ? "…" : summary?.totalRequests || 0}
          subtitle="Supply & borrow requests"
          icon={ClipboardList}
          tone="blue"
          toneValue={true}
          loading={isLoading}
          tooltipAlign="left"
          tooltip="The total number of supply and equipment requests submitted by staff and teachers."
        />

        <KpiCard
          title="Pending Action"
          sublabel="APPROVAL // QUEUE"
          value={isLoading ? "…" : summary?.pendingCount || 0}
          subtitle={
            summary?.pendingCount
              ? "Awaiting review or pickup"
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
          tooltipAlign="center"
          tooltip="Requests still waiting to be approved or prepared for pickup."
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
          delta={{
            value: `${
              summary?.totalRequests
                ? Math.round(((summary.fulfilledCount || 0) / summary.totalRequests) * 100)
                : 0
            }% rate`,
            isPositive: true,
          }}
          loading={isLoading}
          tooltipAlign="right"
          tooltip="Requests where all items have been given to the person who asked for them."
        />

        <KpiCard
          title="Avg Response Time"
          sublabel="SPEED // TURNAROUND"
          value={
            isLoading
              ? "…"
              : summary?.avgTurnaroundHours != null
              ? `${summary.avgTurnaroundHours} hrs`
              : "—"
          }
          subtitle="Request to pickup time"
          icon={TrendingUp}
          tone="accent"
          toneValue={true}
          loading={isLoading}
          tooltipAlign="right"
          tooltip="How many hours it usually takes from when a request is made until the items are handed out."
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
          filters={effectiveFilters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          statuses={STATUS_OPTIONS}
          searchPlaceholder="Search request code, requester name, department…"
        />
      </div>

      {/* ── View Switcher Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 print:hidden">
        <div className="text-xs text-text-secondary font-medium">
          Showing <span className="font-mono font-bold text-text">{data?.total || 0}</span> requisitions &amp; requests
        </div>
        <div className="inline-flex items-center p-0.5 rounded-lg border border-border bg-bg-subtle/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer",
              viewMode === "table"
                ? "bg-card text-text shadow-2xs font-bold"
                : "text-text-secondary hover:text-text"
            )}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer",
              viewMode === "cards"
                ? "bg-card text-text shadow-2xs font-bold"
                : "text-text-secondary hover:text-text"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* ── Data Display: Table or Cards ──────────────────────────────── */}
      {viewMode === "table" ? (
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
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <RequestCardSkeleton key={idx} />
              ))}
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card p-12 text-center">
              <ClipboardList className="h-10 w-10 text-text-secondary/40 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text">No requisitions found</h3>
              <p className="text-xs text-text-secondary mt-1">
                Try adjusting your search criteria or filter selections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((row) => {
                const isPending = row.status === "pending";
                const isRejected = row.status === "rejected";
                const isReleased = row.status === "released";

                return (
                  <div
                    key={row.id}
                    className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 hover:border-accent/40 hover:shadow-md transition-all relative"
                  >
                    <div>
                      {/* Top Bar: Code, Type Badge, and Status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-subtle border border-border/60 text-xs font-mono font-bold text-text group-hover:text-accent transition-colors">
                          <span>{row.requestCode}</span>
                        </div>
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
                      </div>

                      {/* Requester & Department */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <User className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                        <h4 className="text-sm font-bold text-text group-hover:text-accent transition-colors line-clamp-1">
                          {row.requesterName}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5 ml-5">
                        <Building2 className="h-3 w-3 shrink-0 text-text-secondary/70" />
                        <span className="text-[11px] font-medium text-text-secondary truncate">
                          {row.department}
                        </span>
                      </div>

                      {/* Items Summary & Type Tag */}
                      <div className="mt-3 p-2.5 rounded-lg bg-bg-subtle/50 border border-border/50">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-text truncate max-w-45">
                            {row.itemsSummary}
                          </span>
                          <span className="font-mono text-[10px] text-text-secondary shrink-0">
                            {row.itemsCount} item{row.itemsCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {row.purpose && (
                          <p className="text-[11px] text-text-secondary italic line-clamp-1">
                            &ldquo;{row.purpose}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Footer: Submitted date & SLA */}
                    <div className="mt-3.5 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-[11px] text-text-secondary font-mono">
                        <Calendar className="h-3 w-3 text-text-secondary/70" />
                        <span>{row.requestedAt.split("T")[0]}</span>
                      </div>
                      <div className="text-[11px] font-mono text-text">
                        <span className="text-text-secondary text-[10px]">SLA: </span>
                        <strong className="font-bold">{row.turnaroundHours} hrs</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Card View Pagination Footer */}
          {!isLoading && data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/80 px-2 py-3">
              <span className="text-xs text-text-secondary">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => handleFilterChange({ page: data.page - 1 })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-border bg-card text-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.totalPages}
                  onClick={() => handleFilterChange({ page: data.page + 1 })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-border bg-card text-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
