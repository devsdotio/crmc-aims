"use client";

import { useMemo, useState } from "react";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Package,
  Layers,
  DollarSign,
  AlertCircle,
  PauseCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Table as TableIcon,
  Building2,
  Calendar,
  User,
} from "lucide-react";

import { useProjectReportQuery } from "@/features/reports/client/use-reports";
import type { BaseReportFilters, ProjectReportRow } from "@/types/reports";
import { StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ReportTimeframeFilter } from "@/components/reports/report-timeframe-filter";
import { useReportTimeframe } from "@/components/reports/report-timeframe-context";
import { ProjectDetailDialog } from "@/components/reports/project-detail-dialog";
import { ProjectsPrintableReport } from "@/components/reports/print/ProjectsPrintableReport";
import { ProjectCardSkeleton } from "@/components/reports/report-card-skeleton";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "On Hold", value: "on_hold" },
  { label: "Cancelled", value: "cancelled" },
];

function StatusBadge({ status }: { status: ProjectReportRow["status"] }) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-status-active-bg/20 text-status-active-text border border-status-active-bg/30 px-2 py-0.5 text-[10px] font-bold">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    case "on_hold":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold">
          <PauseCircle className="h-3 w-3" />
          On Hold
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-status-retired-bg/20 text-status-retired-text border border-status-retired-bg/30 px-2 py-0.5 text-[10px] font-bold">
          <XCircle className="h-3 w-3" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-bg-subtle text-text-secondary border border-border px-2 py-0.5 text-[10px] font-bold">
          <AlertCircle className="h-3 w-3" />
          {status}
        </span>
      );
  }
}

export default function ProjectReportsPage() {
  const { timeframe, setTimeframe } = useReportTimeframe();
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    status: "",
  });
  const [selectedProject, setSelectedProject] = useState<ProjectReportRow | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const effectiveFilters = useMemo<BaseReportFilters>(
    () => ({
      ...filters,
      startDate: timeframe.startDate,
      endDate: timeframe.endDate,
    }),
    [filters, timeframe.startDate, timeframe.endDate]
  );

  const { data, isLoading } = useProjectReportQuery(effectiveFilters);
  const canViewCosts = data?.canViewCosts ?? true;
  const summary = data?.summary;

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
    setFilters({ page: 1, pageSize: 20, search: "", status: "" });
  };

  const columns: ColumnDef<ProjectReportRow>[] = [
    {
      key: "projectCode",
      header: "Code",
      render: (row) => (
        <span className="font-mono font-bold text-text">{row.projectCode}</span>
      ),
    },
    {
      key: "projectName",
      header: "Project Name",
      render: (row) => (
        <div className="max-w-xs">
          <div className="font-semibold text-text truncate">{row.projectName}</div>
          {row.description && (
            <div className="text-[10px] text-text-secondary truncate mt-0.5">
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (row) => (
        <span className="inline-flex items-center gap-1 rounded-md bg-bg-subtle px-2 py-0.5 text-xs text-text-secondary font-medium">
          {row.department}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "startDate",
      header: "Start Date",
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.startDate || "—"}
        </span>
      ),
    },
    {
      key: "endDate",
      header: "End Date",
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.endDate || "Ongoing"}
        </span>
      ),
    },
    {
      key: "assignedAssetsCount",
      header: "Assets",
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center gap-1 font-mono font-bold text-text">
          <Package className="h-3 w-3 text-text-secondary" />
          {row.assignedAssetsCount}
        </span>
      ),
    },
    {
      key: "consumablesConsumedCount",
      header: "Stocks Used",
      align: "right",
      render: (row) => (
        <div className="text-right">
          <div className="font-mono font-bold text-text">
            {row.consumablesConsumedCount.toLocaleString()}
          </div>
          {canViewCosts && row.consumablesValue != null && (
            <div className="text-[10px] font-mono text-text-secondary">
              ₱{row.consumablesValue.toLocaleString()}
            </div>
          )}
        </div>
      ),
    },
    ...(canViewCosts
      ? [
          {
            key: "totalProjectCost" as const,
            header: "Total Cost",
            align: "right" as const,
            render: (row: ProjectReportRow) => (
              <span className="font-mono font-bold text-text">
                {row.totalProjectCost != null
                  ? `₱${row.totalProjectCost.toLocaleString()}`
                  : "—"}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedProject(row);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:text-accent/80 px-2 py-1 rounded-md hover:bg-accent/10 transition-colors cursor-pointer"
        >
          <span>View</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      ),
    },
  ];

  return (
    <>
      {!selectedProject && (
        <div className="hidden print:block print:w-full">
          <ProjectsPrintableReport
            data={data?.data || []}
            summary={summary}
            canViewCosts={canViewCosts}
            filters={effectiveFilters}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 w-full print:hidden">
      {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
      <div className="sticky top-10.25 sm:top-11.75 z-20 bg-bg-subtle pb-1.5 pt-0 transform-gpu">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-xl rounded-t-none border-x border-b border-t-0 border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-text">
                Project Reports
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/25">
                Project Audit
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Assigned assets, consumables consumed, overall project cost, and project timelines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <ReportTimeframeFilter filters={effectiveFilters} onFilterChange={handleFilterChange} />
            <ReportExportButton reportType="projects" filters={effectiveFilters} />
          </div>
        </div>
      </div>

      {/* ── KPI Cards Grid (One Single Row) ─────────────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
        <KpiCard
          title="Total Projects"
          sublabel="PORTFOLIO // ALL"
          value={isLoading ? "…" : summary?.totalProjects || 0}
          subtitle={`${summary?.activeProjects || 0} active · ${summary?.completedProjects || 0} completed`}
          icon={FolderKanban}
          tone="accent"
          toneValue={true}
          loading={isLoading}
          tooltipAlign="left"
          tooltip="All school projects, repairs, and building activities tracked in the system."
        />
        <KpiCard
          title="Active Projects"
          sublabel="OPERATIONS // ACTIVE"
          value={isLoading ? "…" : summary?.activeProjects || 0}
          subtitle={`${summary?.completedProjects || 0} completed · ${(summary?.totalProjects || 0) - (summary?.activeProjects || 0) - (summary?.completedProjects || 0)} other`}
          icon={Clock}
          tone="amber"
          toneValue={true}
          loading={isLoading}
          tooltipAlign="center"
          tooltip="Projects that are currently ongoing and being worked on right now."
        />
        <KpiCard
          title="Assigned Equipment"
          sublabel="EQUIPMENT // ASSIGNED"
          value={isLoading ? "…" : summary?.totalAssetsAssigned || 0}
          subtitle="Used across active projects"
          icon={Package}
          tone="blue"
          toneValue={true}
          loading={isLoading}
          tooltipAlign="right"
          tooltip="Equipment and tools currently borrowed and in use at project locations."
        />
        <KpiCard
          title="Project Spend"
          sublabel="FINANCIAL // TOTAL COST"
          value={
            isLoading
              ? "…"
              : canViewCosts
              ? `₱${(summary?.totalProjectSpend || 0).toLocaleString()}`
              : "Masked"
          }
          subtitle={
            canViewCosts
              ? `${summary?.totalConsumablesConsumed || 0} supplies issued`
              : "Admin view only"
          }
          icon={DollarSign}
          tone="emerald"
          toneValue={true}
          loading={isLoading}
          tooltipAlign="right"
          tooltip="The total money spent so far on materials, supplies, and work for these projects."
        />
      </StatCardGrid>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="print:hidden">
        <ReportFilterBar
          filters={effectiveFilters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          statuses={STATUS_OPTIONS}
          searchPlaceholder="Search project code, name, department, manager…"
        />
      </div>

      {/* ── View Switcher Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 print:hidden">
        <div className="text-xs text-text-secondary font-medium">
          Showing <span className="font-mono font-bold text-text">{data?.total || 0}</span> institutional projects
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
          onRowClick={(row) => setSelectedProject(row)}
        />
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <ProjectCardSkeleton key={idx} />
              ))}
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card p-12 text-center">
              <FolderKanban className="h-10 w-10 text-text-secondary/40 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text">No projects found</h3>
              <p className="text-xs text-text-secondary mt-1">
                Try adjusting your search criteria or filter selections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((row) => (
                <div
                  key={row.id}
                  onClick={() => setSelectedProject(row)}
                  className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer relative"
                >
                  <div>
                    {/* Top Bar: Code & Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-subtle border border-border/60 text-xs font-mono font-bold text-text group-hover:text-accent transition-colors">
                        <span>{row.projectCode}</span>
                      </div>
                      <StatusBadge status={row.status} />
                    </div>

                    {/* Project Name & Description */}
                    <h4 className="text-sm font-bold text-text group-hover:text-accent transition-colors line-clamp-1">
                      {row.projectName}
                    </h4>
                    {row.description && (
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                        {row.description}
                      </p>
                    )}

                    {/* Department */}
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-3">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-text-secondary/70" />
                      <span className="text-[11px] font-medium text-text truncate">
                        {row.department}
                      </span>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-text-secondary/70" />
                      <span className="font-mono text-[11px]">
                        {row.startDate || "—"} → {row.endDate || "Ongoing"}
                      </span>
                    </div>

                    {/* Asset & Consumable Metrics */}
                    <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-border/40">
                      <div className="p-2 rounded-lg bg-bg-subtle/50 border border-border/50 text-center">
                        <div className="text-[10px] text-text-secondary uppercase font-semibold">Assigned Assets</div>
                        <div className="font-mono font-bold text-xs text-text mt-0.5 flex items-center justify-center gap-1">
                          <Package className="h-3 w-3 text-text-secondary" />
                          <span>{row.assignedAssetsCount}</span>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-bg-subtle/50 border border-border/50 text-center">
                        <div className="text-[10px] text-text-secondary uppercase font-semibold">Stocks Used</div>
                        <div className="font-mono font-bold text-xs text-text mt-0.5 flex items-center justify-center gap-1">
                          <Layers className="h-3 w-3 text-text-secondary" />
                          <span>{row.consumablesConsumedCount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer: Total Spend / Cost & Details Button */}
                  <div className="mt-4 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
                    <div>
                      {canViewCosts && row.totalProjectCost != null ? (
                        <div>
                          <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Total Cost</div>
                          <div className="font-mono font-bold text-text text-sm">
                            ₱{row.totalProjectCost.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-text-secondary">
                          {row.consumablesValue ? `₱${row.consumablesValue.toLocaleString()} supplies` : "Active Project"}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(row);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                    >
                      <span>Details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
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

      {/* ── Project Detail Modal Dialog ────────────────────────────── */}
      <ProjectDetailDialog
        project={selectedProject}
        isOpen={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        canViewCosts={canViewCosts}
      />
    </>
  );
}
