"use client";

import { useMemo, useState } from "react";
import {
  Package,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ExternalLink,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";

import { useAssetRegisterReportQuery } from "@/features/reports/client/use-reports";
import type { AssetRegisterRow, BaseReportFilters } from "@/types/reports";
import { StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { BreakdownDonutChart } from "@/components/reports/breakdown-donut-chart";
import { TrendBarChart } from "@/components/reports/trend-bar-chart";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ReportTimeframeFilter } from "@/components/reports/report-timeframe-filter";
import { useReportTimeframe } from "@/components/reports/report-timeframe-context";
import { AssetDetailDialog } from "@/components/reports/asset-detail-dialog";

import { AssetRegisterPrintableReport } from "@/components/reports/print/AssetRegisterPrintableReport";

const CATEGORY_OPTIONS = [
  { label: "Computing", value: "computing" },
  { label: "Transport", value: "transport" },
  { label: "Audio/Visual", value: "av" },
  { label: "Furniture", value: "furniture" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Needs Repair", value: "needs_repair" },
  { label: "Out of Service", value: "out_of_service" },
  { label: "Retired", value: "retired" },
];

export default function AssetRegisterReportPage() {
  const { timeframe, setTimeframe } = useReportTimeframe();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    category: "",
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

  const { data, isLoading } = useAssetRegisterReportQuery(effectiveFilters);

  const canViewCosts = data?.canViewCosts ?? true;
  const summary = data?.summary;

  const statusDonutData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Active", value: summary.activeCount || 0, color: "#16A34A" },
      { name: "Needs Repair", value: summary.needsRepairCount || 0, color: "#D97706" },
      { name: "Out of Service", value: summary.outOfServiceCount || 0, color: "#DC2626" },
      { name: "Retired", value: summary.retiredCount || 0, color: "#64748B" },
    ];
  }, [summary]);

  const reportRows = data?.data;

  const categoryTrendData = useMemo(() => {
    if (!reportRows || reportRows.length === 0) return [];
    const map: Record<string, { count: number; value: number; active: number }> = {};
    for (const row of reportRows) {
      const cat = row.category || "Unassigned";
      if (!map[cat]) map[cat] = { count: 0, value: 0, active: 0 };
      map[cat].count += 1;
      map[cat].value += row.currentValue || 0;
      if (row.status === "active") map[cat].active += 1;
    }
    return Object.entries(map).map(([name, stats]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      totalCount: stats.count,
      activeCount: stats.active,
      valuation: stats.value,
    }));
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
      category: "",
      status: "",
    });
  };

  const columns: ColumnDef<AssetRegisterRow>[] = [
    {
      key: "assetCode",
      header: "Code",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAssetId(row.id);
          }}
          className="font-mono font-bold text-text hover:text-accent transition-colors flex items-center gap-1.5 cursor-pointer text-left"
          title="Open Asset Lifecycle Dossier"
        >
          <span>{row.assetCode}</span>
          <QrCode className="h-3 w-3 text-text-secondary" />
        </button>
      ),
    },
    {
      key: "name",
      header: "Asset Name",
      render: (row) => (
        <div>
          <div className="font-semibold text-text">{row.name}</div>
          {row.serialNumber && (
            <div className="font-mono text-[10px] text-text-secondary">
              SN: {row.serialNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => (
        <span className="inline-flex rounded-full bg-bg-subtle border border-border/60 px-2 py-0.5 text-[10px] font-bold text-text capitalize">
          {row.category}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const isRepair = row.status === "needs_repair";
        const isOut = row.status === "out_of_service";
        const isRetired = row.status === "retired";

        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
              isRepair
                ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                : isOut || isRetired
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
            }`}
          >
            {row.status.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      key: "location",
      header: "Location",
      render: (row) => (
        <div>
          <div className="text-text font-medium">{row.location}</div>
          {row.department && (
            <div className="text-[10px] text-text-secondary">{row.department}</div>
          )}
        </div>
      ),
    },
    {
      key: "currentHolder",
      header: "Holder / Custody",
      render: (row) => (
        <span className="text-text-secondary">{row.currentHolder || "—"}</span>
      ),
    },
    {
      key: "purchaseDate",
      header: "Acquired",
      render: (row) => (
        <span className="text-text-secondary font-mono text-[11px]">
          {row.purchaseDate || "—"}
        </span>
      ),
    },
    ...(canViewCosts
      ? [
          {
            key: "currentValue" as const,
            header: "Valuation",
            align: "right" as const,
            render: (row: AssetRegisterRow) => (
              <span className="font-mono font-bold text-text">
                {row.currentValue != null ? `₱${row.currentValue.toLocaleString()}` : "—"}
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
            setSelectedAssetId(row.id);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:bg-bg-subtle hover:text-text hover:border-accent/50 transition-colors cursor-pointer"
          title="Open Lifecycle Dossier"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <>
      {!selectedAssetId && (
        <div className="hidden print:block print:w-full">
          <AssetRegisterPrintableReport
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
                Asset Inventory Register
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                Capital Equipment
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Physical registry of coded capital assets, custody status, locations, condition, and valuation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <ReportTimeframeFilter filters={effectiveFilters} onFilterChange={handleFilterChange} />
            <ReportExportButton reportType="assets" filters={effectiveFilters} />
          </div>
        </div>
      </div>

      {/* ── KPI Cards Grid with Inline Sparklines ───────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
        <KpiCard
          title="Total Registered"
          sublabel="ASSET // INVENTORY"
          value={isLoading ? "…" : summary?.totalAssets || 0}
          subtitle="Coded physical equipment"
          icon={Package}
          tone="blue"
          toneValue={true}
          delta="+12.5%"
          loading={isLoading}
        />

        <KpiCard
          title="Operational Rate"
          sublabel="ACTIVE // OPERATIONAL"
          value={isLoading ? "…" : `${summary?.activeCount || 0}`}
          subtitle={
            summary?.totalAssets
              ? `${Math.round(((summary.activeCount || 0) / summary.totalAssets) * 100)}% active units`
              : "0% active units"
          }
          icon={CheckCircle2}
          tone="emerald"
          toneValue={true}
          delta={{
            value: `${
              summary?.totalAssets
                ? Math.round(((summary.activeCount || 0) / summary.totalAssets) * 100)
                : 0
            }%`,
            isPositive: true,
          }}
          loading={isLoading}
        />

        <KpiCard
          title="Under Maintenance"
          sublabel="REPAIR // ATTENTION"
          value={
            isLoading
              ? "…"
              : (summary?.needsRepairCount || 0) + (summary?.outOfServiceCount || 0)
          }
          subtitle={`${summary?.needsRepairCount || 0} repairs pending`}
          icon={AlertCircle}
          tone="amber"
          toneValue={true}
          delta={{
            value: `${(summary?.needsRepairCount || 0) + (summary?.outOfServiceCount || 0)} units`,
            isPositive: false,
          }}
          loading={isLoading}
        />

        <KpiCard
          title="Valuation Baseline"
          sublabel="FINANCIAL // BOOK VALUE"
          value={
            isLoading
              ? "…"
              : canViewCosts
              ? `₱${(summary?.totalValuation || 0).toLocaleString()}`
              : "Restricted"
          }
          subtitle={canViewCosts ? "Acquisition value baseline" : "Admin view only"}
          icon={DollarSign}
          tone="indigo"
          toneValue={true}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* ── Visual Analytics Row: Status Donut + Category Breakdown ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-5">
          <BreakdownDonutChart
            title="Asset Status Distribution"
            sublabel="LIFECYCLE // STATUS"
            description="Proportion of registered inventory across active, repair, and retired states."
            icon={PieIcon}
            data={statusDonutData}
            loading={isLoading}
            unitLabel="units"
            className="h-full"
          />
        </div>

        <div className="lg:col-span-7">
          <TrendBarChart
            title="Asset Distribution by Category"
            sublabel="CATEGORY // ASSETS"
            description="Comparing total registered units and active deployed equipment across categories."
            icon={BarChart3}
            data={categoryTrendData}
            xAxisKey="name"
            series={[
              { key: "totalCount", name: "Total Units", color: "#2A3260" },
              { key: "activeCount", name: "Active Units", color: "#5E6DB0" },
            ]}
            loading={isLoading}
            canViewCosts={true}
            valueFormatter={(v) => `${v.toLocaleString()} units`}
            className="h-full"
          />
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="print:hidden">
        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          categories={CATEGORY_OPTIONS}
          statuses={STATUS_OPTIONS}
          searchPlaceholder="Search by code, name, serial number, location…"
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
        onRowClick={(row) => setSelectedAssetId(row.id)}
      />

    </div>

      {/* ── Asset Detail Modal Dialog ─────────────────────────────── */}
      <AssetDetailDialog
        assetId={selectedAssetId}
        isOpen={Boolean(selectedAssetId)}
        onClose={() => setSelectedAssetId(null)}
      />
    </>
  );
}
