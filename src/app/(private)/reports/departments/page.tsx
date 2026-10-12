"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Package,
  Layers,
  Wrench,
  FolderKanban,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Table as TableIcon,
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
import { DepartmentCardSkeleton } from "@/components/reports/report-card-skeleton";
import { cn } from "@/lib/utils";

export default function DepartmentReportsPage() {
  const { timeframe, setTimeframe } = useReportTimeframe();
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
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
          infoTooltip="Total administrative offices, colleges, academic departments, and institutional units recorded in CRMC."
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
          infoTooltip="Total fixed capital equipment and instructional apparatus currently assigned to departmental custodians."
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
          infoTooltip="Volume of consumable materials and office supplies dispatched and consumed across all campus departments."
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

      {/* ── View Mode Switcher Bar ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 print:hidden">
        <div className="text-xs text-text-secondary font-medium">
          Showing <span className="font-mono font-bold text-text">{data?.total || 0}</span> departments
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
            title="Switch to Table View"
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
            title="Switch to Card View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* ── Table or Card View ────────────────────────────────────────── */}
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
          onRowClick={(row) => setSelectedDepartment(row)}
        />
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <DepartmentCardSkeleton key={idx} />
              ))}
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-secondary border border-dashed border-border rounded-2xl bg-card">
              No departments found matching the search criteria.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.data.map((dept) => (
                  <div
                    key={dept.id}
                    onClick={() => setSelectedDepartment(dept)}
                    className="group rounded-2xl border border-border/80 bg-card p-5 shadow-2xs hover:border-accent/40 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Department Title & Badge */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:scale-105 transition-transform">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-text truncate group-hover:text-accent transition-colors">
                              {dept.departmentName}
                            </h3>
                            <span className="text-[10px] text-text-secondary font-mono">
                              Institutional Unit
                            </span>
                          </div>
                        </div>
                        <div className="p-1 rounded-md text-text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>

                      {/* 4-Stat Metric Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Assigned Assets */}
                        <div className="rounded-xl border border-border/60 bg-bg-subtle/40 p-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-0.5">
                            <Package className="h-3 w-3 text-blue-500" />
                            <span>Assets</span>
                          </div>
                          <div className="text-sm font-mono font-bold text-text">
                            {dept.assetsAssignedCount.toLocaleString()}
                          </div>
                          {canViewCosts && dept.assetsValue != null && (
                            <div className="text-[10px] font-mono text-text-secondary truncate">
                              ₱{dept.assetsValue.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Stocks Used */}
                        <div className="rounded-xl border border-border/60 bg-bg-subtle/40 p-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-0.5">
                            <Layers className="h-3 w-3 text-indigo-500" />
                            <span>Stocks</span>
                          </div>
                          <div className="text-sm font-mono font-bold text-text">
                            {dept.consumablesConsumedCount.toLocaleString()}
                          </div>
                          {canViewCosts && dept.consumablesValue != null && (
                            <div className="text-[10px] font-mono text-text-secondary truncate">
                              ₱{dept.consumablesValue.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Maintenance Tickets */}
                        <div className="rounded-xl border border-border/60 bg-bg-subtle/40 p-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-0.5">
                            <Wrench className="h-3 w-3 text-amber-500" />
                            <span>Repairs</span>
                          </div>
                          <div className="text-sm font-mono font-bold text-text">
                            {dept.activeMaintenanceCount.toLocaleString()}
                          </div>
                          {canViewCosts && dept.maintenanceSummary?.totalRepairSpend != null && (
                            <div className="text-[10px] font-mono text-text-secondary truncate">
                              ₱{dept.maintenanceSummary.totalRepairSpend.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Active Projects */}
                        <div className="rounded-xl border border-border/60 bg-bg-subtle/40 p-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-0.5">
                            <FolderKanban className="h-3 w-3 text-emerald-500" />
                            <span>Projects</span>
                          </div>
                          <div className="text-sm font-mono font-bold text-text">
                            {dept.activeProjects.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-text-secondary font-medium">
                            {dept.activeProjects > 0 ? "Active Works" : "None"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-text-secondary">
                      <span className="font-medium">Audit Dossier</span>
                      <span className="text-accent font-semibold group-hover:underline">View Breakdown →</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card View Pagination Footer */}
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-card px-4 py-3 text-xs text-text-secondary shadow-2xs">
                <div>
                  Showing{" "}
                  <span className="font-mono font-bold text-text">
                    {Math.min(((data.page || 1) - 1) * (data.pageSize || 20) + 1, data.total || 0)}
                  </span>{" "}
                  to{" "}
                  <span className="font-mono font-bold text-text">
                    {Math.min((data.page || 1) * (data.pageSize || 20), data.total || 0)}
                  </span>{" "}
                  of <span className="font-mono font-bold text-text">{data.total || 0}</span> departments
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleFilterChange({ page: (data.page || 1) - 1 })}
                    disabled={(data.page || 1) <= 1 || isLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text transition-colors hover:bg-bg-subtle disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-xs font-mono font-bold text-text">
                    {data.page || 1} / {data.totalPages || 1}
                  </span>
                  <button
                    onClick={() => handleFilterChange({ page: (data.page || 1) + 1 })}
                    disabled={(data.page || 1) >= (data.totalPages || 1) || isLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text transition-colors hover:bg-bg-subtle disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
