"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ExternalLink,
} from "lucide-react";

import { useMaintenanceReportQuery } from "@/features/reports/client/use-reports";
import type { BaseReportFilters, MaintenanceReportRow } from "@/types/reports";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ItemLifecycleSheet } from "@/components/reports/item-lifecycle-sheet";

const CATEGORY_OPTIONS = [
  { label: "Computing", value: "computing" },
  { label: "Transport", value: "transport" },
  { label: "Audio/Visual", value: "av" },
  { label: "Furniture", value: "furniture" },
];

const STATUS_OPTIONS = [
  { label: "All Work Orders", value: "all" },
  { label: "Active / Open Issues", value: "open" },
  { label: "Resolved", value: "resolved" },
];

export default function MaintenanceReportPage() {
  const [selectedAssetCode, setSelectedAssetCode] = useState<string | null>(null);
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    category: "",
    status: "",
  });

  const { data, isLoading } = useMaintenanceReportQuery(filters);

  const canViewCosts = data?.canViewCosts ?? true;
  const summary = data?.summary;
  const topFaulty = summary?.topFaultyAssets || [];

  const handleFilterChange = (updated: Partial<BaseReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleReset = () => {
    setFilters({
      page: 1,
      pageSize: 20,
      search: "",
      category: "",
      status: "",
    });
  };

  const columns: ColumnDef<MaintenanceReportRow>[] = [
    {
      key: "logCode",
      header: "Log Code",
      render: (row) => (
        <span className="font-mono font-bold text-text hover:text-accent transition-colors">
          {row.logCode}
        </span>
      ),
    },
    {
      key: "assetCode",
      header: "Asset",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAssetCode(row.assetCode);
          }}
          className="text-left cursor-pointer hover:opacity-85 transition-opacity"
          title="Open Asset Lifecycle Dossier"
        >
          <span className="font-mono font-bold text-text hover:text-accent transition-colors">
            {row.assetCode}
          </span>
          <div className="text-[11px] text-text-secondary truncate max-w-[200px]">
            {row.assetName}
          </div>
        </button>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => (
        <span className="rounded-full bg-bg-subtle border border-border/60 px-2 py-0.5 text-[10px] font-bold text-text capitalize">
          {row.category}
        </span>
      ),
    },
    {
      key: "condition",
      header: "Condition",
      render: (row) => (
        <span className="capitalize text-text-secondary text-xs font-medium">
          {row.condition.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "dateLogged",
      header: "Logged On",
      render: (row) => (
        <span className="text-text-secondary font-mono text-[11px]">
          {row.dateLogged}
        </span>
      ),
    },
    {
      key: "resolutionDate",
      header: "Resolved On",
      render: (row) => (
        <span className="text-text-secondary font-mono text-[11px]">
          {row.resolutionDate || "—"}
        </span>
      ),
    },
    ...(canViewCosts
      ? [
          {
            key: "repairCost" as const,
            header: "Repair Cost",
            align: "right" as const,
            render: (row: MaintenanceReportRow) => (
              <span className="font-mono font-bold text-text">
                {row.repairCost != null ? `₱${row.repairCost.toLocaleString()}` : "—"}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "mttrDays",
      header: "MTTR",
      align: "right",
      render: (row) => (
        <span className="font-mono font-bold text-text">
          {row.mttrDays != null ? `${row.mttrDays} d` : "—"}
        </span>
      ),
    },
    {
      key: "isResolved",
      header: "Status",
      align: "center",
      render: (row) => {
        if (row.isResolved) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-active-bg/20 text-status-active-text border border-status-active-bg/30 px-2 py-0.5 text-[10px] font-bold">
              <CheckCircle2 className="h-3 w-3" />
              <span>Resolved</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-repair-bg/20 text-status-repair-text border border-status-repair-bg/30 px-2 py-0.5 text-[10px] font-bold">
            <AlertTriangle className="h-3 w-3" />
            <span>Active Issue</span>
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
      <div className="sticky top-[41px] sm:top-[47px] z-20 bg-[#F2F3F7] pb-1.5 pt-0 transform-gpu">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-2xl rounded-t-none border-x border-b border-t-0 border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-text">
                Maintenance &amp; Repairs Performance
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                Work Orders &amp; Reliability
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Equipment breakdown frequency, mean-time-to-resolution (MTTR), and cumulative repair expenditure.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <ReportExportButton reportType="maintenance" filters={filters} />
          </div>
        </div>
      </div>

      {/* ── KPI Cards Grid ───────────────────────────────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
        <StatCard
          title="Total Work Orders"
          sublabel="MAINTENANCE // VOLUME"
          value={isLoading ? "…" : summary?.totalWorkOrders || 0}
          subtitle="Cumulative maintenance logs"
          icon={Wrench}
          tone="blue"
          toneValue={true}
          loading={isLoading}
        />

        <StatCard
          title="Active Defects"
          sublabel="UNRESOLVED // ATTENTION"
          value={isLoading ? "…" : summary?.openWorkOrders || 0}
          subtitle={
            summary?.openWorkOrders
              ? "Units currently under repair"
              : "Zero active maintenance tickets"
          }
          icon={AlertTriangle}
          tone={(summary?.openWorkOrders || 0) > 0 ? "rose" : "emerald"}
          toneValue={true}
          loading={isLoading}
        />

        <StatCard
          title="Avg MTTR Turnaround"
          sublabel="RESOLUTION // VELOCITY"
          value={isLoading ? "…" : `${summary?.avgMttrDays || 0} days`}
          subtitle="Mean time to restore asset"
          icon={Clock}
          tone="amber"
          toneValue={true}
          loading={isLoading}
        />

        <StatCard
          title="Repair Expenditure"
          sublabel="EXPENDITURE // TCO"
          value={
            isLoading
              ? "…"
              : canViewCosts
              ? `₱${(summary?.totalRepairSpend || 0).toLocaleString()}`
              : "Restricted"
          }
          subtitle={canViewCosts ? "Cumulative parts and labor" : "Admin view only"}
          icon={Wrench}
          tone="accent"
          toneValue={true}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* ── Top Chronic Fault Assets Banner ─────────────────────────── */}
      {topFaulty.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-text">
                  Frequent Breakdown Assets
                </h2>
                <p className="text-[11px] text-text-secondary">
                  Top units exceeding maintenance frequency thresholds (replacement candidates)
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
              High Wear
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {topFaulty.map((f) => (
              <button
                type="button"
                key={f.assetCode}
                onClick={() => setSelectedAssetCode(f.assetCode)}
                className="rounded-xl border border-border/80 bg-bg-subtle p-3.5 text-xs hover:border-accent/60 transition-colors text-left cursor-pointer group"
                title={`Open Lifecycle Dossier for ${f.assetCode}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-text group-hover:text-accent transition-colors">
                    {f.assetCode}
                  </span>
                  <span className="text-[10px] font-bold font-mono text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded">
                    {f.count} breakdowns
                  </span>
                </div>
                <div className="text-text font-medium truncate mt-1.5">{f.name}</div>
                {canViewCosts && f.totalCost > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">Total Spend</span>
                    <span className="font-mono font-bold text-text">
                      ₱{f.totalCost.toLocaleString()}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────────────────────── */}
      <div className="print:hidden">
        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          categories={CATEGORY_OPTIONS}
          statuses={STATUS_OPTIONS}
          searchPlaceholder="Search log code, asset code, technician, description…"
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

      {/* ── Slide-Over Lifecycle Sheet ───────────────────────────────── */}
      <ItemLifecycleSheet
        assetId={selectedAssetCode}
        isOpen={Boolean(selectedAssetCode)}
        onClose={() => setSelectedAssetCode(null)}
      />
    </div>
  );
}
