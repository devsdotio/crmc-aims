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
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  User,
} from "lucide-react";

import { useAssetRegisterReportQuery } from "@/features/reports/client/use-reports";
import { useCategoriesQuery, useCategoryStyleMap } from "@/features/categories/client/use-categories";
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
import { AssetCardSkeleton } from "@/components/reports/report-card-skeleton";

import { AssetRegisterPrintableReport } from "@/components/reports/print/AssetRegisterPrintableReport";
import { cn } from "@/lib/utils";

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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    category: "",
    classification: "",
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
  const { data: categoriesData = [] } = useCategoriesQuery();

  const CLASSIFICATION_OPTIONS = useMemo(() => {
    return categoriesData
      .filter((c) => c.type === "asset_class")
      .map((c) => ({ label: c.name, value: c.name.toLowerCase() }));
  }, [categoriesData]);

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
  const { getCategoryStyle } = useCategoryStyleMap();

  const classificationTrendData = useMemo(() => {
    if (!reportRows || reportRows.length === 0) return { data: [], categories: [] };
    
    const map: Record<string, Record<string, number>> = {};
    const allCategories = new Set<string>();

    for (const row of reportRows) {
      const classification = row.classification || "Unassigned";
      const category = row.category || "General";
      
      const classKey = classification.charAt(0).toUpperCase() + classification.slice(1);
      const catKey = category.charAt(0).toUpperCase() + category.slice(1);
      
      if (!map[classKey]) map[classKey] = {};
      if (!map[classKey][catKey]) map[classKey][catKey] = 0;
      
      map[classKey][catKey] += 1;
      allCategories.add(catKey);
    }
    
    const sortedClassNames = Object.keys(map).sort();
    const sortedCategories = Array.from(allCategories).sort();

    let maxBars = 0;
    const finalData = sortedClassNames.map((className) => {
      // Get all categories in this classification and sort by count descending
      const catsInClass = Object.keys(map[className]).map(cat => ({
        name: cat,
        count: map[className][cat]
      })).sort((a, b) => b.count - a.count);
      
      maxBars = Math.max(maxBars, catsInClass.length);
      
      const row: Record<string, string | number | undefined> = { name: className };
      catsInClass.forEach((cat, idx) => {
        const style = getCategoryStyle(cat.name);
        row[`bar${idx}`] = cat.count;
        row[`bar${idx}_name`] = cat.name;
        row[`bar${idx}_color`] = style.cssVar;
      });
      return row;
    });

    const barKeys = Array.from({ length: maxBars }, (_, i) => `bar${i}`);

    return {
      data: finalData,
      barKeys,
      categories: sortedCategories.map((cat) => {
        const style = getCategoryStyle(cat);
        return {
          key: cat,
          name: cat,
          color: style.cssVar,
          iconToken: style.iconToken
        };
      })
    };
  }, [reportRows, getCategoryStyle]);

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
      classification: "",
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
        <div>
          <span className="inline-flex rounded-full bg-bg-subtle border border-border/60 px-2 py-0.5 text-[10px] font-bold text-text capitalize">
            {row.category}
          </span>
          {row.classification && (
            <div className="text-[10px] text-text-secondary mt-0.5 capitalize">
              {row.classification}
            </div>
          )}
        </div>
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
          loading={isLoading}
          tooltipAlign="left"
          tooltip="The total number of school items and equipment registered with an ID tag in our inventory."
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
          tooltipAlign="center"
          tooltip="The percentage of all school equipment that is in good working order and ready to use."
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
          tooltipAlign="right"
          tooltip="Items that are broken, waiting for parts, or currently being repaired by our maintenance team."
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
          subtitle={canViewCosts ? "Original purchase cost" : "Admin view only"}
          icon={DollarSign}
          tone="indigo"
          toneValue={true}
          loading={isLoading}
          tooltipAlign="right"
          tooltip="The original purchase price of all school property and equipment currently in use."
        />
      </StatCardGrid>

      {/* ── Visual Analytics Row: Status Donut + Category Breakdown ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-4">
          <BreakdownDonutChart
            title="Asset Status Distribution"
            sublabel="LIFECYCLE // STATUS"
            description="Proportion of registered inventory across active, repair, and retired states."
            icon={PieIcon}
            data={statusDonutData}
            loading={isLoading}
            unitLabel="units"
            className="h-88"
          />
        </div>

        <div className="lg:col-span-8">
          <TrendBarChart
            title="Asset Distribution by Classification"
            sublabel="CLASSIFICATION // ASSETS"
            description="Comparing total registered units across asset classifications, segmented by category."
            icon={BarChart3}
            data={classificationTrendData.data}
            xAxisKey="name"
            stacked={false}
            layout="horizontal"
            series={classificationTrendData.categories}
            barKeys={classificationTrendData.barKeys}
            loading={isLoading}
            canViewCosts={true}
            valueFormatter={(v) => `${v.toLocaleString()} units`}
            className="h-88"
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
          classifications={CLASSIFICATION_OPTIONS}
          statuses={STATUS_OPTIONS}
          searchPlaceholder="Search by code, name, serial number, location…"
        />
      </div>

      {/* ── View Switcher Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 print:hidden">
        <div className="text-xs text-text-secondary font-medium">
          Showing <span className="font-mono font-bold text-text">{data?.total || 0}</span> registered assets
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
          onRowClick={(row) => setSelectedAssetId(row.id)}
        />
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <AssetCardSkeleton key={idx} />
              ))}
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card p-12 text-center">
              <Package className="h-10 w-10 text-text-secondary/40 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text">No registered assets found</h3>
              <p className="text-xs text-text-secondary mt-1">
                Try adjusting your search criteria or filter selections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((row) => {
                const isRepair = row.status === "needs_repair";
                const isOut = row.status === "out_of_service";
                const isRetired = row.status === "retired";

                return (
                  <div
                    key={row.id}
                    onClick={() => setSelectedAssetId(row.id)}
                    className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer relative"
                  >
                    <div>
                      {/* Top Bar: Code & Status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-subtle border border-border/60 text-xs font-mono font-bold text-text group-hover:text-accent transition-colors">
                          <QrCode className="h-3 w-3 text-text-secondary" />
                          <span>{row.assetCode}</span>
                        </div>
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
                      </div>

                      {/* Asset Name & Serial */}
                      <h4 className="text-sm font-bold text-text group-hover:text-accent transition-colors line-clamp-1">
                        {row.name}
                      </h4>
                      {row.serialNumber && (
                        <p className="font-mono text-[10px] text-text-secondary mt-0.5">
                          SN: {row.serialNumber}
                        </p>
                      )}

                      {/* Badges: Category & Classification */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="inline-flex rounded-md bg-bg-subtle border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-text capitalize">
                          {row.category}
                        </span>
                        {row.classification && (
                          <span className="inline-flex rounded-md bg-accent/5 border border-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent capitalize">
                            {row.classification}
                          </span>
                        )}
                      </div>

                      {/* Location & Custody Details */}
                      <div className="mt-3.5 space-y-1.5 text-xs text-text-secondary border-t border-border/40 pt-2.5">
                        {(row.location || row.department) && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-text-secondary/70" />
                            <span className="truncate text-text font-medium text-[11px]">
                              {row.location || "—"} {row.department ? `(${row.department})` : ""}
                            </span>
                          </div>
                        )}
                        {row.currentHolder && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 shrink-0 text-text-secondary/70" />
                            <span className="truncate text-[11px]">
                              Holder: <strong className="text-text font-medium">{row.currentHolder}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Footer: Valuation, Acquired Date, Link */}
                    <div className="mt-4 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
                      <div>
                        {canViewCosts && row.currentValue != null ? (
                          <div>
                            <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Valuation</div>
                            <div className="font-mono font-bold text-text text-sm">
                              ₱{row.currentValue.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-text-secondary font-mono">
                            {row.purchaseDate ? `Acq: ${row.purchaseDate}` : "No date"}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAssetId(row.id);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                      >
                        <span>Dossier</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
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

      {/* ── Asset Detail Modal Dialog ─────────────────────────────── */}
      <AssetDetailDialog
        assetId={selectedAssetId}
        isOpen={Boolean(selectedAssetId)}
        onClose={() => setSelectedAssetId(null)}
      />
    </>
  );
}
