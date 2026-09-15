"use client";

import { useState } from "react";
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
} from "lucide-react";

import { useProjectReportQuery } from "@/features/reports/client/use-reports";
import type { BaseReportFilters, ProjectReportRow } from "@/types/reports";
import { StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ProjectDetailDialog } from "@/components/reports/project-detail-dialog";

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
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    status: "",
  });
  const [selectedProject, setSelectedProject] = useState<ProjectReportRow | null>(null);

  const { data, isLoading } = useProjectReportQuery(filters);
  const canViewCosts = data?.canViewCosts ?? true;
  const summary = data?.summary;

  const handleFilterChange = (updated: Partial<BaseReportFilters>) => {
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
    <div className="flex flex-col gap-3 w-full">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-text">
                Project Reports
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/25">
                Project Audit
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Assigned assets, consumables consumed, overall project cost, and project timelines.
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <ReportExportButton reportType="projects" filters={filters} />
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
        />
        <KpiCard
          title="Assets Deployed"
          sublabel="CAPITAL // ASSIGNED"
          value={isLoading ? "…" : summary?.totalAssetsAssigned || 0}
          subtitle="Across all tracked projects"
          icon={Package}
          tone="blue"
          toneValue={true}
          loading={isLoading}
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
              ? `${summary?.totalConsumablesConsumed || 0} consumables issued`
              : "Admin view only"
          }
          icon={DollarSign}
          tone="emerald"
          toneValue={true}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="print:hidden">
        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          statuses={STATUS_OPTIONS}
          searchPlaceholder="Search project code, name, department, manager…"
          showDatePresets
        />
      </div>

      {/* ── Data Table ───────────────────────────────────────────────── */}
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

      {/* ── Project Detail Modal Dialog ────────────────────────────── */}
      <ProjectDetailDialog
        project={selectedProject}
        isOpen={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        canViewCosts={canViewCosts}
      />
    </div>
  );
}
