"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Layers,
  AlertTriangle,
  TrendingDown,
  Warehouse,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Flame,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";

import { useConsumablesReportQuery } from "@/features/reports/client/use-reports";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import type {
  BaseReportFilters,
  ConsumableStockRow,
  ConsumableStockSummary,
} from "@/types/reports";
import { StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { TrendBarChart } from "@/components/reports/trend-bar-chart";
import { RecentListCard } from "@/components/reports/recent-list-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import type { ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ReportTimeframeFilter } from "@/components/reports/report-timeframe-filter";
import { useReportTimeframe } from "@/components/reports/report-timeframe-context";
import { ConsumableDetailDialog } from "@/components/reports/consumable-detail-dialog";
import { ConsumablesPrintableReport } from "@/components/reports/print/ConsumablesPrintableReport";
import { ConsumablePartSection } from "@/components/reports/consumable-part-section";
import {
  ClassificationFilterPills,
  ConsumableClassificationBadge,
} from "@/components/reports/consumable-classification-badge";
import { normalizeConsumableClassification } from "@/lib/consumable-classification";
import { cn } from "@/lib/utils";

const CLASSIFICATION_OPTIONS = [
  { label: "Part 1: Supplies", value: "supply" },
  { label: "Part 2: Materials", value: "material" },
];

const STATUS_OPTIONS = [
  { label: "Low Stock Alert", value: "low_stock" },
  { label: "Optimal Stock", value: "in_stock" },
];

type PartViewMode = "all" | "supply" | "material";

export default function ConsumablesReportPage() {
  const { timeframe, setTimeframe } = useReportTimeframe();
  const [selectedConsumable, setSelectedConsumable] = useState<ConsumableStockRow | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [supplyPage, setSupplyPage] = useState(1);
  const [materialPage, setMaterialPage] = useState(1);
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    category: "",
    classification: "",
    status: "",
  });

  const searchParams = useSearchParams();
  const initialClassParam = searchParams.get("classification");
  useEffect(() => {
    if (initialClassParam === "supply" || initialClassParam === "material") {
      setFilters((prev) =>
        prev.classification === initialClassParam
          ? prev
          : { ...prev, classification: initialClassParam, page: 1 }
      );
    }
  }, [initialClassParam]);

  const effectiveFilters = useMemo<BaseReportFilters>(
    () => ({
      ...filters,
      startDate: timeframe.startDate,
      endDate: timeframe.endDate,
    }),
    [filters, timeframe.startDate, timeframe.endDate]
  );

  const activePart: PartViewMode =
    effectiveFilters.classification === "supply"
      ? "supply"
      : effectiveFilters.classification === "material"
      ? "material"
      : "all";

  const supplyFilters = useMemo<BaseReportFilters>(
    () => ({
      ...effectiveFilters,
      classification: "supply",
      page: supplyPage,
      pageSize: 20,
    }),
    [effectiveFilters, supplyPage]
  );

  const materialFilters = useMemo<BaseReportFilters>(
    () => ({
      ...effectiveFilters,
      classification: "material",
      page: materialPage,
      pageSize: 20,
    }),
    [effectiveFilters, materialPage]
  );

  const { data: supplyData, isLoading: isLoadingSupply } =
    useConsumablesReportQuery(supplyFilters);
  const { data: materialData, isLoading: isLoadingMaterial } =
    useConsumablesReportQuery(materialFilters);

  const { data: categoriesData = [] } = useCategoriesQuery();

  const categoryOptions = useMemo(() => {
    return categoriesData
      .filter((c) => c.type === "consumable")
      .map((c) => ({ label: c.name, value: c.name }));
  }, [categoriesData]);

  const isLoading =
    activePart === "supply"
      ? isLoadingSupply
      : activePart === "material"
      ? isLoadingMaterial
      : isLoadingSupply || isLoadingMaterial;

  const canViewCosts =
    (activePart === "material" ? materialData?.canViewCosts : supplyData?.canViewCosts) ??
    supplyData?.canViewCosts ??
    materialData?.canViewCosts ??
    true;

  const supplySummary = supplyData?.summary;
  const materialSummary = materialData?.summary;

  const combinedSummary = useMemo<ConsumableStockSummary | undefined>(() => {
    if (!supplySummary && !materialSummary) return undefined;
    const sCount = supplySummary?.suppliesCount ?? supplySummary?.totalSkus ?? 0;
    const mCount = materialSummary?.materialsCount ?? materialSummary?.totalSkus ?? 0;
    const sLow = supplySummary?.suppliesLowStockCount ?? supplySummary?.lowStockItemsCount ?? 0;
    const mLow =
      materialSummary?.materialsLowStockCount ?? materialSummary?.lowStockItemsCount ?? 0;
    const sDisp =
      supplySummary?.suppliesDispatched30d ?? supplySummary?.totalDispatched30d ?? 0;
    const mDisp =
      materialSummary?.materialsDispatched30d ?? materialSummary?.totalDispatched30d ?? 0;
    const sVal =
      supplySummary?.suppliesValuation ?? supplySummary?.totalInventoryValuation ?? 0;
    const mVal =
      materialSummary?.materialsValuation ?? materialSummary?.totalInventoryValuation ?? 0;
    const sDispVal =
      supplySummary?.suppliesDispatchedValue30d ?? supplySummary?.totalDispatchedValue30d ?? 0;
    const mDispVal =
      materialSummary?.materialsDispatchedValue30d ??
      materialSummary?.totalDispatchedValue30d ??
      0;

    if (activePart === "supply" && supplySummary) return supplySummary;
    if (activePart === "material" && materialSummary) return materialSummary;

    return {
      totalSkus: sCount + mCount,
      lowStockItemsCount: sLow + mLow,
      totalDispatched30d: sDisp + mDisp,
      totalDispatchedValue30d: sDispVal + mDispVal,
      totalInventoryValuation: sVal + mVal,
      suppliesCount: sCount,
      materialsCount: mCount,
      suppliesLowStockCount: sLow,
      materialsLowStockCount: mLow,
      suppliesValuation: sVal,
      materialsValuation: mVal,
      suppliesDispatched30d: sDisp,
      materialsDispatched30d: mDisp,
      suppliesDispatchedValue30d: sDispVal,
      materialsDispatchedValue30d: mDispVal,
      topConsumingDepartments: [
        ...(supplySummary?.topConsumingDepartments ?? []),
        ...(materialSummary?.topConsumingDepartments ?? []),
      ].slice(0, 6),
    };
  }, [activePart, supplySummary, materialSummary]);

  const supplyRows = useMemo(() => supplyData?.data ?? [], [supplyData?.data]);
  const materialRows = useMemo(() => materialData?.data ?? [], [materialData?.data]);

  const visibleRows = useMemo(() => {
    if (activePart === "supply") return supplyRows;
    if (activePart === "material") return materialRows;
    return [...supplyRows, ...materialRows];
  }, [activePart, supplyRows, materialRows]);

  const usageTrendData = useMemo(() => {
    if (visibleRows.length === 0) return [];
    const byCategory = new Map<
      string,
      {
        name: string;
        suppliesOnHand: number;
        materialsOnHand: number;
        suppliesUsage: number;
        materialsUsage: number;
      }
    >();
    for (const item of visibleRows) {
      const catName = (item.category || "Uncategorized").replace(/_/g, " ");
      const existing = byCategory.get(catName) ?? {
        name: catName.length > 16 ? `${catName.slice(0, 14)}…` : catName,
        suppliesOnHand: 0,
        materialsOnHand: 0,
        suppliesUsage: 0,
        materialsUsage: 0,
      };
      const cls = normalizeConsumableClassification(item.classification);
      if (cls === "material") {
        existing.materialsOnHand += Number(item.currentQty) || 0;
        existing.materialsUsage += Number(item.usage30d) || 0;
      } else {
        existing.suppliesOnHand += Number(item.currentQty) || 0;
        existing.suppliesUsage += Number(item.usage30d) || 0;
      }
      byCategory.set(catName, existing);
    }
    return [...byCategory.values()].slice(0, 6);
  }, [visibleRows]);

  const lowStockItems = useMemo(() => {
    return visibleRows
      .filter((item) => item.isLowStock || item.availableQty <= item.minThreshold)
      .slice(0, 6)
      .map((item) => {
        const cls = normalizeConsumableClassification(item.classification);
        return {
          id: item.id,
          title: item.name,
          tag: `${item.itemCode} · ${cls === "material" ? "Material" : "Supply"}`,
          subtitle: `${item.currentQty} ${item.unit} left (min: ${item.minThreshold}) · ${item.location}`,
          status: {
            label:
              item.estimatedDaysRemaining != null
                ? `${item.estimatedDaysRemaining}d remaining`
                : "Low Stock",
            variant: "rose" as const,
          },
          onClick: () => setSelectedConsumable(item),
        };
      });
  }, [visibleRows]);

  const handleFilterChange = (updated: Partial<BaseReportFilters>) => {
    if ("startDate" in updated || "endDate" in updated) {
      setTimeframe({
        startDate: updated.startDate,
        endDate: updated.endDate,
      });
    }
    setSupplyPage(1);
    setMaterialPage(1);
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleReset = () => {
    setSupplyPage(1);
    setMaterialPage(1);
    setFilters({
      page: 1,
      pageSize: 20,
      search: "",
      category: "",
      classification: "",
      status: "",
    });
  };

  const columns: ColumnDef<ConsumableStockRow>[] = useMemo(
    () => [
      {
        key: "itemCode",
        header: "Code",
        render: (row) => (
          <span className="font-mono font-bold text-text">{row.itemCode}</span>
        ),
      },
      {
        key: "name",
        header: "Consumable SKU",
        render: (row) => (
          <div>
            <div className="font-semibold text-text">{row.name}</div>
            <div className="text-[10px] text-text-secondary capitalize font-medium">
              {row.category.replace(/_/g, " ")}
            </div>
          </div>
        ),
      },
      {
        key: "classification",
        header: "Class",
        render: (row) => (
          <ConsumableClassificationBadge
            classification={normalizeConsumableClassification(row.classification)}
            compact
          />
        ),
      },
      {
        key: "unit",
        header: "Unit",
        render: (row) => (
          <span className="text-text-secondary lowercase">{row.unit}</span>
        ),
      },
      {
        key: "currentQty",
        header: "On Hand",
        align: "right",
        render: (row) => (
          <span
            className={`font-mono font-bold ${
              row.isLowStock ? "text-rose-700 dark:text-rose-400" : "text-text"
            }`}
          >
            {row.currentQty.toLocaleString()}
          </span>
        ),
      },
      {
        key: "reservedQty",
        header: "Reserved",
        align: "right",
        render: (row) => (
          <span className="font-mono text-text-secondary">{row.reservedQty || 0}</span>
        ),
      },
      {
        key: "availableQty",
        header: "Available",
        align: "right",
        render: (row) => (
          <span className="font-mono font-bold text-text">{row.availableQty}</span>
        ),
      },
      {
        key: "minThreshold",
        header: "Threshold",
        align: "right",
        render: (row) => (
          <span className="font-mono text-text-secondary">{row.minThreshold}</span>
        ),
      },
      {
        key: "location",
        header: "Warehouse Bin",
        render: (row) => (
          <span className="text-text-secondary font-medium">{row.location}</span>
        ),
      },
      {
        key: "usage30d",
        header: "30d Usage",
        align: "right",
        render: (row) => (
          <span className="font-mono text-text font-medium">{row.usage30d}</span>
        ),
      },
      ...(canViewCosts
        ? [
            {
              key: "unitCost" as const,
              header: "Unit Cost",
              align: "right" as const,
              render: (row: ConsumableStockRow) => (
                <span className="font-mono text-text-secondary text-xs">
                  {row.unitCost != null && row.unitCost > 0
                    ? `₱${row.unitCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "—"}
                </span>
              ),
            },
            {
              key: "stockValuation" as const,
              header: "Stock Value",
              align: "right" as const,
              render: (row: ConsumableStockRow) => (
                <span className="font-mono font-bold text-text">
                  {row.stockValuation != null && row.stockValuation > 0
                    ? `₱${row.stockValuation.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "₱0.00"}
                </span>
              ),
            },
          ]
        : []),
      {
        key: "estimatedDaysRemaining",
        header: "Days Remaining",
        align: "right",
        render: (row) => {
          if (row.estimatedDaysRemaining == null) return "—";
          const isUrgent = row.estimatedDaysRemaining <= 7;
          return (
            <span
              className={`font-mono font-bold ${
                isUrgent ? "text-rose-700 dark:text-rose-400" : "text-text"
              }`}
            >
              {row.estimatedDaysRemaining} d
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Health",
        align: "center",
        render: (row) => {
          if (row.isLowStock) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-repair-bg/20 text-status-repair-text border border-status-repair-bg/30 px-2 py-0.5 text-[10px] font-bold">
                <AlertTriangle className="h-3 w-3" />
                <span>Low Stock</span>
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-active-bg/20 text-status-active-text border border-status-active-bg/30 px-2 py-0.5 text-[10px] font-bold">
              <CheckCircle2 className="h-3 w-3" />
              <span>Optimal</span>
            </span>
          );
        },
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
              setSelectedConsumable(row);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-blue-300 hover:bg-primary/10 px-2 py-1 rounded-md transition-colors cursor-pointer"
          >
            <span>View</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        ),
      },
    ],
    [canViewCosts]
  );

  const suppliesCount = supplySummary?.suppliesCount ?? supplyData?.total ?? 0;
  const materialsCount = materialSummary?.materialsCount ?? materialData?.total ?? 0;

  return (
    <>
      {!selectedConsumable && (
        <div className="hidden print:block print:w-full">
          <ConsumablesPrintableReport
            data={visibleRows}
            summary={combinedSummary}
            canViewCosts={canViewCosts}
            filters={effectiveFilters}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 w-full print:hidden">
        {/* ── Top Header Banner ─────────────────────────────────────── */}
        <div className="sticky top-12 sm:top-11.5 z-20 bg-bg-subtle pb-1.5 pt-0 transform-gpu">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-xl rounded-t-none border-x border-b border-t-0 border-border/80 bg-card p-4 sm:p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-text">
                  Consumables Stock &amp; Usage Report
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-amber-500/12 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  2-Part Ledger: Supplies &amp; Materials
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Separated Part 1 (Supplies) &amp; Part 2 (Materials) warehouse availability, burn-rates, and reorder forecasts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <ReportTimeframeFilter filters={effectiveFilters} onFilterChange={handleFilterChange} />
              <ReportExportButton reportType="consumables" filters={effectiveFilters} />
            </div>
          </div>
        </div>

        {/* ── KPI Summary Grid ──────────────────────────────────────── */}
        <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
          <KpiCard
            title="Tracked SKUs"
            sublabel="PART 1 & PART 2"
            value={isLoading ? "…" : (combinedSummary?.totalSkus ?? 0)}
            subtitle={`${suppliesCount} Supplies · ${materialsCount} Materials`}
            icon={Layers}
            tone="blue"
            toneValue={true}
            loading={isLoading}
            tooltipAlign="left"
            tooltip="Total non-sandbox consumable SKUs split between Part 1 (Supplies) and Part 2 (Materials)."
          />

          <KpiCard
            title="Low Stock Alerts"
            sublabel="REORDER // LOW STOCK"
            value={isLoading ? "…" : (combinedSummary?.lowStockItemsCount ?? 0)}
            subtitle={`${combinedSummary?.suppliesLowStockCount ?? 0} Supplies · ${combinedSummary?.materialsLowStockCount ?? 0} Materials low`}
            icon={AlertTriangle}
            tone={combinedSummary?.lowStockItemsCount ? "amber" : "emerald"}
            toneValue={true}
            delta={{
              value:
                (combinedSummary?.lowStockItemsCount || 0) > 0
                  ? `${combinedSummary?.lowStockItemsCount} low`
                  : "Optimal",
              isPositive: (combinedSummary?.lowStockItemsCount || 0) === 0,
            }}
            loading={isLoading}
            tooltipAlign="center"
            tooltip="SKUs whose available balance (on-hand minus reserved) is at or below minimum safety threshold."
          />

          <KpiCard
            title="30-Day Dispatched"
            sublabel="CONSUMPTION // USAGE"
            value={
              isLoading ? "…" : (combinedSummary?.totalDispatched30d ?? 0).toLocaleString()
            }
            subtitle={`${(combinedSummary?.suppliesDispatched30d ?? 0).toLocaleString()} Supplies · ${(combinedSummary?.materialsDispatched30d ?? 0).toLocaleString()} Materials`}
            icon={TrendingDown}
            tone="indigo"
            toneValue={true}
            loading={isLoading}
            tooltipAlign="right"
            tooltip="Non-voided Supply and Material quantities issued over the past 30 days."
          />

          <KpiCard
            title="Stock Valuation"
            sublabel="FINANCIAL // ON-HAND"
            value={
              isLoading
                ? "…"
                : canViewCosts
                ? `₱${(combinedSummary?.totalInventoryValuation ?? 0).toLocaleString()}`
                : "Restricted"
            }
            subtitle={
              canViewCosts
                ? `₱${(combinedSummary?.suppliesValuation ?? 0).toLocaleString()} Sup · ₱${(combinedSummary?.materialsValuation ?? 0).toLocaleString()} Mat`
                : "Admin view only"
            }
            icon={Warehouse}
            tone="accent"
            toneValue={true}
            loading={isLoading}
            tooltipAlign="right"
            tooltip="Total active FIFO lot valuation split across Consumable Supplies and Consumable Materials."
          />
        </StatCardGrid>

        {/* ── Visual Analytics Row ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          <div className="lg:col-span-7">
            <TrendBarChart
              title="Category Stock & 30d Dispatch: Supplies vs Materials"
              sublabel="VELOCITY // PART COMPARISON"
              description="Side-by-side comparison of Part 1 (Supplies) and Part 2 (Materials) across categories."
              icon={BarChart3}
              data={usageTrendData}
              xAxisKey="name"
              series={[
                { key: "suppliesOnHand", name: "Supplies On Hand", color: "#059669" },
                { key: "suppliesUsage", name: "Supplies 30d Used", color: "#34D399" },
                { key: "materialsOnHand", name: "Materials On Hand", color: "#D97706" },
                { key: "materialsUsage", name: "Materials 30d Used", color: "#FBBF24" },
              ]}
              loading={isLoading}
              canViewCosts={true}
              valueFormatter={(v) => `${v.toLocaleString()} units`}
              className="h-full"
            />
          </div>

          <div className="lg:col-span-5">
            <RecentListCard
              title="Items Below Reorder Point"
              sublabel="ALERT // REPLENISHMENT"
              description="Low stock Supplies and Materials needing replenishment."
              icon={Flame}
              items={lowStockItems}
              emptyMessage="All consumable stocks are currently above minimum threshold."
              loading={isLoading}
              className="h-full"
            />
          </div>
        </div>

        {/* ── Search & Filter Controls ──────────────────────────────── */}
        <div className="print:hidden">
          <ReportFilterBar
            filters={effectiveFilters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            categories={categoryOptions}
            classifications={CLASSIFICATION_OPTIONS}
            statuses={STATUS_OPTIONS}
            searchPlaceholder="Search Supplies or Materials by code, name, category…"
          />
        </div>

        {/* ── Part Switcher & View Switcher Header ──────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 print:hidden">
          <ClassificationFilterPills
            ariaLabel="Switch consumable report parts"
            value={activePart}
            onChange={(next) =>
              handleFilterChange({
                classification: next === "all" ? "" : next,
                page: 1,
              })
            }
            options={[
              {
                id: "all",
                label: "Both Parts (Separated)",
                count: suppliesCount + materialsCount,
              },
              {
                id: "supply",
                label: "Part 1: Supplies",
                count: suppliesCount,
              },
              {
                id: "material",
                label: "Part 2: Materials",
                count: materialsCount,
              },
            ]}
          />

          <div className="inline-flex items-center p-0.5 rounded-lg border border-border bg-bg-subtle/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "inline-flex items-center gap-1.5 min-h-10 sm:min-h-8 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer",
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
                "inline-flex items-center gap-1.5 min-h-10 sm:min-h-8 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer",
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

        {/* ── Two-Part Consumable Sections (Never Mixed) ────────────── */}
        <div className="flex flex-col gap-5">
          {(activePart === "all" || activePart === "supply") && (
            <ConsumablePartSection
              partNumber={1}
              classification="supply"
              title="Consumable Supplies"
              description="Office stationery, ink & toner, medical, cleaning, and storeroom supplies."
              rows={supplyRows}
              total={supplyData?.total ?? 0}
              page={supplyData?.page ?? supplyPage}
              pageSize={supplyData?.pageSize ?? 20}
              totalPages={supplyData?.totalPages ?? 1}
              isLoading={isLoadingSupply}
              canViewCosts={canViewCosts}
              viewMode={viewMode}
              columns={columns}
              summaryMetrics={{
                skusCount: suppliesCount,
                lowStockCount:
                  supplySummary?.suppliesLowStockCount ??
                  supplySummary?.lowStockItemsCount ??
                  0,
                dispatched30d:
                  supplySummary?.suppliesDispatched30d ??
                  supplySummary?.totalDispatched30d ??
                  0,
                valuation:
                  supplySummary?.suppliesValuation ??
                  supplySummary?.totalInventoryValuation ??
                  0,
              }}
              filtersForExport={effectiveFilters}
              onPageChange={setSupplyPage}
              onSelect={setSelectedConsumable}
              onResetFilters={handleReset}
            />
          )}

          {(activePart === "all" || activePart === "material") && (
            <ConsumablePartSection
              partNumber={2}
              classification="material"
              title="Consumable Materials"
              description="Construction hardware, plumbing, electrical, lumber, paint, and fabrication materials."
              rows={materialRows}
              total={materialData?.total ?? 0}
              page={materialData?.page ?? materialPage}
              pageSize={materialData?.pageSize ?? 20}
              totalPages={materialData?.totalPages ?? 1}
              isLoading={isLoadingMaterial}
              canViewCosts={canViewCosts}
              viewMode={viewMode}
              columns={columns}
              summaryMetrics={{
                skusCount: materialsCount,
                lowStockCount:
                  materialSummary?.materialsLowStockCount ??
                  materialSummary?.lowStockItemsCount ??
                  0,
                dispatched30d:
                  materialSummary?.materialsDispatched30d ??
                  materialSummary?.totalDispatched30d ??
                  0,
                valuation:
                  materialSummary?.materialsValuation ??
                  materialSummary?.totalInventoryValuation ??
                  0,
              }}
              filtersForExport={effectiveFilters}
              onPageChange={setMaterialPage}
              onSelect={setSelectedConsumable}
              onResetFilters={handleReset}
            />
          )}
        </div>
      </div>

      {/* ── Consumables Stock Detail Modal Dialog ─────────────────────── */}
      <ConsumableDetailDialog
        consumable={selectedConsumable}
        isOpen={Boolean(selectedConsumable)}
        onClose={() => setSelectedConsumable(null)}
        canViewCosts={canViewCosts}
      />
    </>
  );
}
