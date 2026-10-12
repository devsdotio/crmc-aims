"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ExternalLink,
  BarChart3,
  FileText,
  HardHat,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Cpu,
  User,
  Calendar,
} from "lucide-react";

import { useMaintenanceReportQuery } from "@/features/reports/client/use-reports";
import { useDepartmentsQuery } from "@/features/departments/client";
import type { BaseReportFilters, MaintenanceReportRow } from "@/types/reports";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { GaugeChart } from "@/components/reports/gauge-chart";
import { TrendBarChart } from "@/components/reports/trend-bar-chart";
import { RecentListCard } from "@/components/reports/recent-list-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ReportTimeframeFilter } from "@/components/reports/report-timeframe-filter";
import { useReportTimeframe } from "@/components/reports/report-timeframe-context";
import { AssetDetailDialog } from "@/components/reports/asset-detail-dialog";
import { MaintenancePrintableReport } from "@/components/reports/print/MaintenancePrintableReport";
import { MaintenanceCardSkeleton } from "@/components/reports/report-card-skeleton";
import { cn } from "@/lib/utils";

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
  const { timeframe, setTimeframe } = useReportTimeframe();
  const [selectedAssetCode, setSelectedAssetCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    category: "",
    status: "",
    departmentId: "",
  });

  const { data: deptData = [] } = useDepartmentsQuery();
  const departmentOptions = useMemo(
    () =>
      deptData
        .map((d) => ({ label: d.name, value: d.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [deptData]
  );

  const effectiveFilters = useMemo<BaseReportFilters>(
    () => ({
      ...filters,
      startDate: timeframe.startDate,
      endDate: timeframe.endDate,
    }),
    [filters, timeframe.startDate, timeframe.endDate]
  );

  const { data, isLoading } = useMaintenanceReportQuery(effectiveFilters);

  const canViewCosts = data?.canViewCosts ?? true;
  const summary = data?.summary;
  const topFaulty = summary?.topFaultyAssets || [];
  const reportRows = data?.data;

  const maintenanceCategoryData = useMemo(() => {
    if (!reportRows || reportRows.length === 0) return [];
    const map: Record<string, { total: number; resolved: number; cost: number }> = {};
    for (const row of reportRows) {
      const cat = row.category || "General";
      if (!map[cat]) map[cat] = { total: 0, resolved: 0, cost: 0 };
      map[cat].total += 1;
      if (row.isResolved) map[cat].resolved += 1;
      map[cat].cost += row.repairCost || 0;
    }
    return Object.entries(map).map(([name, s]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      totalWorkOrders: s.total,
      resolvedWorkOrders: s.resolved,
      cost: s.cost,
    }));
  }, [reportRows]);

  const activeMaintenanceList = useMemo(() => {
    if (!reportRows || reportRows.length === 0) return [];
    const openOrders = reportRows.filter((w) => !w.isResolved);
    const candidateList = openOrders.length > 0 ? openOrders : reportRows;

    return candidateList.slice(0, 5).map((w) => ({
      id: w.id,
      title: `${w.assetCode} · ${w.assetName}`,
      tag: w.logCode,
      subtitle: `Logged by: ${w.loggedByName || "Staff"} · ${w.condition.replace(/_/g, " ")}`,
      date: w.dateLogged,
      status: {
        label: w.isResolved ? "Resolved" : "Under Repair",
        variant: w.isResolved ? ("emerald" as const) : ("rose" as const),
      },
      onClick: () => setSelectedAssetCode(w.assetCode),
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
      departmentId: "",
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
          <div className="text-[11px] text-text-secondary truncate max-w-50">
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
      key: "department",
      header: "Department",
      render: (row) => (
        <span className="text-xs text-text-secondary truncate max-w-40">
          {row.department || "General / Unassigned"}
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
      key: "notes",
      header: "Documentation",
      render: (row) => {
        const workSnippet = row.workNotes?.trim();
        const partsCount = row.repairParts?.length ?? 0;
        const partsNames =
          partsCount > 0
            ? row.repairParts!.map((p) => p.name).slice(0, 3).join(", ")
            : null;
        return (
          <div className="min-w-40 max-w-72 space-y-0.5">
            <div className="text-xs text-text line-clamp-2">
              {row.notes?.trim() || "—"}
            </div>
            {workSnippet ? (
              <div className="text-[10px] text-text-secondary line-clamp-1">
                Work: {workSnippet}
              </div>
            ) : null}
            {partsCount > 0 ? (
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-semibold border border-sky-200 dark:border-sky-800 truncate max-w-full">
                  <Wrench className="h-2.5 w-2.5 shrink-0" />
                  <span>
                    {partsCount} Part{partsCount > 1 ? "s" : ""}: {partsNames}
                    {partsCount > 3 ? "…" : ""}
                  </span>
                </span>
              </div>
            ) : null}
          </div>
        );
      },
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
    <>
      {!selectedAssetCode && (
        <div className="hidden print:block print:w-full">
          <MaintenancePrintableReport
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
                Maintenance &amp; Repairs Performance
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                Work Orders &amp; Reliability
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Equipment breakdown frequency, mean-time-to-resolution (MTTR), and cumulative repair expenditure.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <ReportTimeframeFilter filters={effectiveFilters} onFilterChange={handleFilterChange} />
            <ReportExportButton reportType="maintenance" filters={effectiveFilters} />
          </div>
        </div>
      </div>

      {/* ── KPI Cards Grid with Inline Sparklines ───────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
        <KpiCard
          title="Total Work Orders"
          sublabel="MAINTENANCE // VOLUME"
          value={isLoading ? "…" : summary?.totalWorkOrders || 0}
          subtitle="Cumulative maintenance logs"
          icon={Wrench}
          tone="blue"
          toneValue={true}
          loading={isLoading}
          tooltipAlign="left"
          tooltip="The total number of repair and maintenance tasks recorded in the system."
        />

        <KpiCard
          title="Active Repairs"
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
          delta={{
            value:
              (summary?.openWorkOrders || 0) > 0
                ? `${summary?.openWorkOrders} active`
                : "Optimal",
            isPositive: (summary?.openWorkOrders || 0) === 0,
          }}
          loading={isLoading}
          tooltipAlign="center"
          tooltip="Items that are currently broken and waiting to be fixed or serviced."
        />

        <KpiCard
          title="Average Repair Time"
          sublabel="REPAIRS // DURATION"
          value={isLoading ? "…" : `${summary?.avgMttrDays || 0} days`}
          subtitle="Average time to fix equipment"
          icon={Clock}
          tone="amber"
          toneValue={true}
          loading={isLoading}
          tooltipAlign="right"
          tooltip="The average number of days it takes from reporting a broken item until it is completely fixed."
        />

        <KpiCard
          title="Repair Cost"
          sublabel="FINANCIAL // REPAIRS"
          value={
            isLoading
              ? "…"
              : canViewCosts
              ? `₱${(summary?.totalRepairSpend || 0).toLocaleString()}`
              : "Restricted"
          }
          subtitle={canViewCosts ? "Total parts and labor costs" : "Admin view only"}
          icon={Wrench}
          tone="accent"
          toneValue={true}
          loading={isLoading}
          tooltipAlign="right"
          tooltip="The total money spent on spare parts, supplies, and labor to fix broken equipment."
        />
      </StatCardGrid>

      {/* ── Visual Analytics Row: Resolution Gauge + Category Trend + Active Orders ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-4">
          <GaugeChart
            title="Work Order Resolution"
            sublabel="RELIABILITY // RESOLUTION"
            description="Ratio of completed and verified repairs against open maintenance tickets."
            icon={CheckCircle2}
            completedCount={summary?.resolvedWorkOrders || 0}
            pendingCount={summary?.openWorkOrders || 0}
            completedLabel="Resolved"
            pendingLabel="Open Defects"
            tone="emerald"
            loading={isLoading}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-4">
          <TrendBarChart
            title="Work Orders by Category"
            sublabel="CATEGORY // MAINTENANCE"
            description="Maintenance tickets opened vs successfully resolved per asset category."
            icon={BarChart3}
            data={maintenanceCategoryData}
            xAxisKey="name"
            series={[
              { key: "totalWorkOrders", name: "Total Orders", color: "#2A3260" },
              { key: "resolvedWorkOrders", name: "Resolved", color: "#5E6DB0" },
            ]}
            loading={isLoading}
            canViewCosts={true}
            valueFormatter={(v) => `${v.toLocaleString()} orders`}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-4">
          <RecentListCard
            title="Active Maintenance Logs"
            sublabel="FACILITY // TICKETS"
            description="Assets currently logged under repair or awaiting technician inspection."
            icon={Wrench}
            items={activeMaintenanceList}
            emptyMessage="Zero active maintenance work orders currently open."
            loading={isLoading}
            className="h-full"
          />
        </div>
      </div>

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
          filters={effectiveFilters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          categories={CATEGORY_OPTIONS}
          departments={departmentOptions}
          statuses={STATUS_OPTIONS}
          searchPlaceholder="Search log code, asset code, technician, description…"
        />
      </div>

      {/* ── View Mode Switcher Bar ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 print:hidden">
        <div className="text-xs text-text-secondary font-medium">
          Showing <span className="font-mono font-bold text-text">{data?.total || 0}</span> work order records
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "cards" && (data?.data?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => {
                const rows = data?.data || [];
                const allExpanded = rows.every((r) => expandedCards.has(r.id));
                if (allExpanded) {
                  setExpandedCards(new Set());
                } else {
                  setExpandedCards(new Set(rows.map((r) => r.id)));
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card text-text hover:bg-bg-subtle transition-colors cursor-pointer shadow-2xs"
            >
              {(data?.data || []).every((r) => expandedCards.has(r.id))
                ? "Collapse All"
                : "Expand All"}
            </button>
          )}

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
          renderExpandedRow={(row) => (
            <div className="px-6 py-4 bg-bg-subtle/50 inner-shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Diagnostics */}
                <div className="space-y-3">
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-text mb-1.5 uppercase tracking-wide">
                      <FileText className="h-3.5 w-3.5 text-accent" />
                      Diagnostics &amp; Condition
                    </h4>
                    <div className="p-3 rounded-xl border border-border/60 bg-card text-xs text-text-secondary leading-relaxed shadow-2xs">
                      {row.notes || <span className="italic opacity-60">No initial diagnostic notes provided.</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] bg-card p-3 rounded-xl border border-border/60 shadow-2xs">
                    <div className="flex-1">
                      <span className="block text-text-secondary mb-0.5">Logged By</span>
                      <span className="font-semibold text-text">{row.loggedByName}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Resolution & Work */}
                <div className="space-y-3">
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5 uppercase tracking-wide">
                      <HardHat className="h-3.5 w-3.5" />
                      Work Executed &amp; Resolution
                    </h4>
                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-text-secondary leading-relaxed shadow-2xs">
                      {row.resolutionNotes || row.workNotes ? (
                        <div className="space-y-2">
                          {row.workNotes && (
                            <div>
                              <span className="font-bold text-text block mb-0.5">Work Done:</span>
                              {row.workNotes}
                            </div>
                          )}
                          {row.resolutionNotes && (
                            <div>
                              <span className="font-bold text-text block mb-0.5">Resolution:</span>
                              {row.resolutionNotes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="italic opacity-60 text-text-secondary">No resolution documentation provided.</span>
                      )}
                    </div>
                  </div>

                  {row.repairParts && row.repairParts.length > 0 && (
                    <div className="rounded-xl border border-sky-300/40 dark:border-sky-800/40 bg-sky-500/5 dark:bg-sky-950/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wide">
                          <Wrench className="h-3.5 w-3.5 text-sky-600" />
                          Replaced Components &amp; Spare Parts ({row.repairParts.length})
                        </div>
                        {canViewCosts && (
                          <span className="font-mono text-[10px] font-bold text-accent bg-card px-2 py-0.5 rounded border border-border/60">
                            Subtotal: ₱{row.repairParts.reduce((sum, p) => sum + (p.cost != null ? Number(p.cost) || 0 : 0), 0).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {row.repairParts.map((part, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-card border border-border/70 p-2 rounded-lg shadow-2xs text-[11px]"
                          >
                            <span className="font-medium text-text truncate mr-2" title={part.name}>
                              {part.name}
                            </span>
                            {canViewCosts && part.cost != null && (
                              <span className="font-mono font-bold text-accent shrink-0">
                                ₱{Number(part.cost).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <MaintenanceCardSkeleton key={i} />
              ))}
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-secondary border border-dashed border-border rounded-2xl bg-card">
              No maintenance work orders found matching the selected filters.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {data.data.map((row) => {
                  const isExpanded = expandedCards.has(row.id);
                  const parts = row.repairParts ?? [];
                  const partsCount = parts.length;
                  const partsSubtotal = parts.reduce(
                    (sum, p) => sum + (p.cost != null ? Number(p.cost) || 0 : 0),
                    0
                  );

                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "group rounded-2xl border bg-card transition-all duration-200 overflow-hidden shadow-2xs flex flex-col",
                        isExpanded
                          ? "border-accent/40 ring-1 ring-accent/20 shadow-xs"
                          : "border-border/80 hover:border-border hover:shadow-xs h-82.5"
                      )}
                    >
                      {/* Card Primary Header & Summary */}
                      <div className={cn("p-4 sm:p-5 flex flex-col justify-between gap-3", !isExpanded && "h-full")}>
                        <div className="flex flex-col gap-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            {/* Left: Expand Chevron, Log Code & Asset Tag */}
                            <div className="flex items-start gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleCardExpand(row.id)}
                                className="mt-0.5 p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer shrink-0"
                                title={isExpanded ? "Collapse work order" : "Expand work order"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-accent" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-accent">
                                    {row.logCode}
                                  </span>
                                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-bg-subtle text-text-secondary border border-border/60">
                                    {row.source?.replace(/_/g, " ") || "Maintenance"}
                                  </span>
                                  {row.isResolved ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                      <CheckCircle2 className="h-3 w-3" /> Resolved
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                      <AlertTriangle className="h-3 w-3" /> Active Issue
                                    </span>
                                  )}
                                </div>

                                {/* Asset Link & Name */}
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {row.assetCode ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAssetCode(row.assetCode)}
                                      className="inline-flex items-center gap-1 font-mono text-xs font-bold text-text hover:text-accent transition-colors cursor-pointer group/link"
                                      title="View full asset dossier"
                                    >
                                      <span>{row.assetCode}</span>
                                      <ExternalLink className="h-3 w-3 opacity-60 group-hover/link:opacity-100" />
                                    </button>
                                  ) : (
                                    <span className="font-mono text-xs text-text-secondary">—</span>
                                  )}
                                  {row.assetName && (
                                    <>
                                      <span className="text-text-secondary text-xs">·</span>
                                      <span className="text-xs font-medium text-text truncate max-w-45 sm:max-w-xs" title={row.assetName}>
                                        {row.assetName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Condition & Financial Total */}
                            <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                              {row.condition && (
                                <span
                                  className={cn(
                                    "rounded-md px-2 py-0.5 text-[10px] font-semibold border capitalize",
                                    row.condition.toLowerCase().includes("working") ||
                                      row.condition.toLowerCase().includes("excellent") ||
                                      row.condition.toLowerCase().includes("good")
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                      : row.condition.toLowerCase().includes("damaged")
                                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-bold"
                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-bold"
                                  )}
                                >
                                  {row.condition.replace(/_/g, " ")}
                                </span>
                              )}

                              {canViewCosts && (
                                <div className="text-right pl-2 border-l border-border/60">
                                  <div className="text-[9px] uppercase tracking-wider text-text-secondary font-medium">
                                    Repair Total
                                  </div>
                                  <div className="text-xs font-mono font-bold text-accent">
                                    {row.repairCost != null ? `₱${row.repairCost.toLocaleString()}` : "—"}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Metadata strip: Personnel, Timeline, MTTR */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-border/50 text-[11px] text-text-secondary">
                            <div className="flex items-center gap-1.5 truncate">
                              <Calendar className="h-3 w-3 text-text-secondary/70 shrink-0" />
                              <span className="truncate">
                                Logged: <strong className="text-text font-medium">{row.dateLogged}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 truncate">
                              <User className="h-3 w-3 text-text-secondary/70 shrink-0" />
                              <span className="truncate">
                                By: <strong className="text-text font-medium">{row.loggedByName || "Staff"}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 truncate">
                              <HardHat className="h-3 w-3 text-text-secondary/70 shrink-0" />
                              <span className="truncate">
                                Tech: <strong className="text-text font-medium">{row.resolvedByName || "In Queue"}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 truncate">
                              <Clock className="h-3 w-3 text-text-secondary/70 shrink-0" />
                              <span className="truncate">
                                {row.resolutionDate ? (
                                  <>
                                    MTTR:{" "}
                                    <strong className="text-text font-medium">
                                      {row.mttrDays != null ? `${row.mttrDays}d` : "Done"}
                                    </strong>
                                  </>
                                ) : (
                                  <strong className="text-amber-600 dark:text-amber-400 font-medium">Active</strong>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dedicated Replaced Parts Spotlight Container (Uniform Fixed Height) */}
                        {partsCount > 0 ? (
                          <div className="h-24 rounded-xl border border-sky-300/40 dark:border-sky-800/40 bg-sky-500/5 dark:bg-sky-950/20 p-2.5 flex flex-col justify-between overflow-hidden">
                            <div className="flex items-center justify-between gap-2 shrink-0">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-200">
                                <Cpu className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                                <span className="truncate">Replaced Hardware &amp; Components</span>
                                <span className="rounded-full bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-sky-700 dark:text-sky-300 shrink-0">
                                  {partsCount}
                                </span>
                              </div>
                              {canViewCosts && partsSubtotal > 0 && (
                                <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 font-bold shrink-0">
                                  ₱{partsSubtotal.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-13.5 pr-0.5">
                              {parts.map((part, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="inline-flex items-center gap-1 rounded-md border border-sky-200/60 dark:border-sky-800/60 bg-card px-2 py-0.5 text-[11px] shadow-2xs"
                                >
                                  <span className="font-semibold text-text truncate max-w-32.5" title={part.name}>
                                    {part.name}
                                  </span>
                                  {canViewCosts && part.cost != null && (
                                    <span className="font-mono text-[10px] font-bold text-accent shrink-0">
                                      ₱{Number(part.cost).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="h-24 rounded-xl border border-dashed border-border/70 bg-bg-subtle/30 p-2.5 flex flex-col items-center justify-center gap-1 text-center text-xs text-text-secondary">
                            <div className="flex items-center gap-1.5 font-medium text-text-secondary">
                              <Wrench className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                              <span>No physical parts replaced</span>
                            </div>
                            <span className="text-[10px] text-text-secondary/70">Labor, inspection, or servicing only</span>
                          </div>
                        )}

                        {/* Collapsed Brief Preview & Drawer Toggle */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50 shrink-0 mt-auto">
                          <p className="text-xs text-text-secondary line-clamp-1 italic max-w-45 sm:max-w-xs" title={row.notes || row.workNotes || ""}>
                            {row.notes ? `"${row.notes}"` : row.workNotes ? `Work: ${row.workNotes}` : "No notes logged."}
                          </p>

                          <button
                            type="button"
                            onClick={() => toggleCardExpand(row.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline shrink-0 ml-2 cursor-pointer"
                          >
                            <span>{isExpanded ? "Hide Details" : "Diagnostic Dossier"}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Diagnostic & Parts Dossier Drawer */}
                      {isExpanded && (
                        <div className="border-t border-border/70 bg-bg-subtle/40 p-4 sm:p-5 flex flex-col gap-4 animate-in fade-in-50 duration-200">
                          {/* Diagnostic Summary Blocks */}
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                                <FileText className="h-3.5 w-3.5 text-accent" />
                                <span>Diagnostic &amp; Initial Complaint</span>
                              </div>
                              <p className="text-xs text-text whitespace-pre-wrap leading-relaxed">
                                {row.notes?.trim() || (
                                  <span className="text-text-secondary italic">No initial complaint notes recorded.</span>
                                )}
                              </p>
                              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-text-secondary">
                                <span>Reported By:</span>
                                <span className="font-semibold text-text">{row.loggedByName || "Staff"}</span>
                              </div>
                            </div>

                            <div className="rounded-xl border border-emerald-500/20 bg-card p-3.5 shadow-2xs space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                                <HardHat className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Work Executed &amp; Resolution</span>
                              </div>
                              <div className="text-xs text-text space-y-1.5 leading-relaxed">
                                {row.workNotes && (
                                  <div>
                                    <span className="font-bold text-text block mb-0.5">Work Done:</span>
                                    {row.workNotes}
                                  </div>
                                )}
                                {row.resolutionNotes && (
                                  <div>
                                    <span className="font-bold text-text block mb-0.5">Resolution:</span>
                                    {row.resolutionNotes}
                                  </div>
                                )}
                                {!row.workNotes && !row.resolutionNotes && (
                                  <span className="text-text-secondary italic">No technical procedure notes logged.</span>
                                )}
                              </div>
                              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-text-secondary">
                                <span>Assigned Specialist:</span>
                                <span className="font-semibold text-text">{row.resolvedByName || "In Queue"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Full Itemized Parts & Spares Breakdown */}
                          <div className="rounded-xl border border-sky-300/40 dark:border-sky-800/40 bg-card overflow-hidden shadow-2xs">
                            <div className="flex items-center justify-between px-3.5 py-2.5 bg-bg-subtle/80 border-b border-border/80">
                              <div className="flex items-center gap-2">
                                <Cpu className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                                <span className="text-xs font-bold text-text">
                                  Full Parts &amp; Hardware Components Ledger
                                </span>
                              </div>
                              <span className="text-[11px] text-text-secondary font-medium">
                                {partsCount} component{partsCount === 1 ? "" : "s"}
                              </span>
                            </div>

                            {partsCount > 0 ? (
                              <div className="divide-y divide-border/60 p-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                                  {parts.map((part, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="flex items-center justify-between p-2.5 rounded-lg bg-sky-500/5 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-800/50 text-xs"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Cpu className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                                        <span className="font-semibold text-text truncate" title={part.name}>
                                          {part.name}
                                        </span>
                                      </div>
                                      {canViewCosts && part.cost != null && (
                                        <span className="font-mono font-bold text-accent shrink-0 ml-2">
                                          ₱{Number(part.cost).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {canViewCosts && partsSubtotal > 0 && (
                                  <div className="flex items-center justify-between px-4 py-2.5 bg-bg-subtle/60 text-xs font-semibold">
                                    <span className="text-text">Total Parts Expenditure:</span>
                                    <span className="font-mono font-bold text-accent">
                                      ₱{partsSubtotal.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-4 text-center text-xs text-text-secondary flex items-center justify-center gap-2">
                                <Wrench className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                                <span>No physical parts were replaced on this equipment ticket. Labor and servicing only.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  of <span className="font-mono font-bold text-text">{data.total || 0}</span> records
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

      {/* ── Asset Detail Modal Dialog ─────────────────────────────── */}
      <AssetDetailDialog
        assetId={selectedAssetCode}
        isOpen={Boolean(selectedAssetCode)}
        onClose={() => setSelectedAssetCode(null)}
      />
    </>
  );
}
