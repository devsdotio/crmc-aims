"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Package,
  Layers,
  Wrench,
  FolderKanban,
  ChevronRight,
} from "lucide-react";

import { useDepartmentReportQuery } from "@/features/reports/client/use-reports";
import type { BaseReportFilters, DepartmentReportRow } from "@/types/reports";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ReportTimeframeFilter } from "@/components/reports/report-timeframe-filter";
import { useReportTimeframe } from "@/components/reports/report-timeframe-context";
import { DepartmentDetailDialog } from "@/components/reports/department-detail-dialog";
import { DepartmentsPrintableReport } from "@/components/reports/print/DepartmentsPrintableReport";

export default function DepartmentReportsPage() {
  const { timeframe, setTimeframe } = useReportTimeframe();
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
  });
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentReportRow | null>(null);

  const effectiveFilters = useMemo<BaseReportFilters>(
    () => ({
      ...filters,
      startDate: timeframe.startDate,
      endDate: timeframe.endDate,
    }),
    [filters, timeframe.startDate, timeframe.endDate]
  );

  const { data, isLoading } = useDepartmentReportQuery(effectiveFilters);
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
    setFilters({ page: 1, pageSize: 20, search: "" });
  };

  const columns: ColumnDef<DepartmentReportRow>[] = [
    {
      key: "departmentName",
      header: "Department",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-text">{row.departmentName}</span>
        </div>
      ),
    },
    {
      key: "assetsAssignedCount",
      header: "Assets Assigned",
      align: "right",
      render: (row) => (
        <div className="text-right">
          <div className="font-mono font-bold text-text">
            {row.assetsAssignedCount.toLocaleString()}
          </div>
          {canViewCosts && row.assetsValue != null && (
            <div className="text-[10px] font-mono text-text-secondary">
              ₱{row.assetsValue.toLocaleString()}
            </div>
          )}
        </div>
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
    {
      key: "activeMaintenanceCount",
      header: "Active Maintenance",
      align: "center",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
            row.activeMaintenanceCount > 0
              ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
              : "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
          }`}
        >
          <Wrench className="h-3 w-3" />
          {row.activeMaintenanceCount}
        </span>
      ),
    },
    {
      key: "activeProjects",
      header: "Projects",
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 text-[10px] font-bold">
          <FolderKanban className="h-3 w-3" />
          {row.activeProjects}
        </span>
      ),
    },
    {
      key: "topAssets",
      header: "Top Assets",
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-52">
          {(row.topAssets || []).slice(0, 3).map((asset, i) => (
            <span
              key={i}
              className="rounded bg-bg-subtle border border-border/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-text-secondary"
            >
              {asset}
            </span>
          ))}
          {(row.topAssets || []).length > 3 && (
            <span className="text-[10px] text-text-secondary font-medium">
              +{row.topAssets.length - 3} more
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDepartment(row);
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
      {!selectedDepartment && (
        <div className="hidden print:block print:w-full">
          <DepartmentsPrintableReport
            data={data?.data || []}
            summary={summary}
            canViewCosts={canViewCosts}
            filters={effectiveFilters}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 w-full print:hidden">
      {/* ── Top Header Banner ─────────────────────────────────────────── */}
      <div className="sticky top-10.25 sm:top-11.75 z-20 bg-bg-subtle pb-1.5 pt-0 transform-gpu">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-xl rounded-t-none border-x border-b border-t-0 border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-text">
                Department Reports
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                Dept. Breakdown
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              All assets assigned, consumables consumed, maintenance activity, and statistics per department.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <ReportTimeframeFilter filters={effectiveFilters} onFilterChange={handleFilterChange} />
            <ReportExportButton reportType="departments" filters={effectiveFilters} />
          </div>
        </div>
      </div>

      {/* ── KPI Cards Grid ───────────────────────────────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 -mt-1.5">
        <StatCard
          title="Total Departments"
          sublabel="ORG // UNITS"
          value={isLoading ? "…" : summary?.totalDepartments || 0}
          subtitle={`${summary?.mostActiveByAssets || "—"} most active`}
          icon={Building2}
          tone="blue"
          toneValue={true}
          loading={isLoading}
        />
        <StatCard
          title="Assets Deployed"
          sublabel="CAPITAL // DISTRIBUTED"
          value={
            isLoading
              ? "…"
              : canViewCosts
              ? `₱${(summary?.totalAssetsValue || 0).toLocaleString()}`
              : `${summary?.totalAssetsDeployed || 0} units`
          }
          subtitle={`${summary?.totalAssetsDeployed || 0} assets across all departments`}
          icon={Package}
          tone="accent"
          toneValue={true}
          loading={isLoading}
        />
        <StatCard
          title="Consumables Consumed"
          sublabel="STOCKS // DISTRIBUTED"
          value={
            isLoading
              ? "…"
              : canViewCosts
              ? `₱${(summary?.totalConsumablesValue || 0).toLocaleString()}`
              : `${summary?.totalConsumablesConsumed || 0} items`
          }
          subtitle={`${summary?.totalConsumablesConsumed || 0} items dispatched dept-wide`}
          icon={Layers}
          tone="indigo"
          toneValue={true}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="print:hidden">
        <ReportFilterBar
          filters={effectiveFilters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          searchPlaceholder="Search department name…"
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
        onRowClick={(row) => setSelectedDepartment(row)}
      />

    </div>

      {/* ── Department Detail Modal Dialog ─────────────────────────── */}
      <DepartmentDetailDialog
        department={selectedDepartment}
        isOpen={Boolean(selectedDepartment)}
        onClose={() => setSelectedDepartment(null)}
        canViewCosts={canViewCosts}
      />
    </>
  );
}
