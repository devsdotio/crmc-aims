"use client";

import { useMemo, useState } from "react";
import {
  Layers,
  AlertTriangle,
  TrendingDown,
  Warehouse,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Flame,
} from "lucide-react";

import { useConsumablesReportQuery } from "@/features/reports/client/use-reports";
import type { BaseReportFilters, ConsumableStockRow } from "@/types/reports";
import { StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { TrendBarChart } from "@/components/reports/trend-bar-chart";
import { RecentListCard } from "@/components/reports/recent-list-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ConsumableDetailDialog } from "@/components/reports/consumable-detail-dialog";
import { ConsumablesPrintableReport } from "@/components/reports/print/ConsumablesPrintableReport";

const CATEGORY_OPTIONS = [
  { label: "Paper & Stationery", value: "paper" },
  { label: "Ink & Toner", value: "ink_toner" },
  { label: "Office Supplies", value: "office_supplies" },
  { label: "Medical Supplies", value: "medical" },
  { label: "Cleaning & Sanitation", value: "cleaning" },
];

const STATUS_OPTIONS = [
  { label: "All Items", value: "all" },
  { label: "Low Stock Alert Only", value: "low_stock" },
];

export default function ConsumablesReportPage() {
  const [selectedConsumable, setSelectedConsumable] = useState<ConsumableStockRow | null>(null);
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    category: "",
    status: "",
  });

  const { data, isLoading } = useConsumablesReportQuery(filters);

  const canViewCosts = data?.canViewCosts ?? true;
  const summary = data?.summary;
  const reportRows = data?.data;

  const usageTrendData = useMemo(() => {
    if (!reportRows || reportRows.length === 0) return [];
    return reportRows.slice(0, 6).map((item) => ({
      name: item.name.length > 14 ? item.name.slice(0, 12) + "…" : item.name,
      onHand: item.currentQty,
      usage30d: item.usage30d,
    }));
  }, [reportRows]);

  const lowStockItems = useMemo(() => {
    if (!reportRows || reportRows.length === 0) return [];
    return reportRows
      .filter((item) => item.isLowStock || item.currentQty <= item.minThreshold)
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        title: item.name,
        tag: item.itemCode,
        subtitle: `${item.currentQty} ${item.unit} left (min: ${item.minThreshold}) · ${item.location}`,
        status: {
          label:
            item.estimatedDaysRemaining != null
              ? `${item.estimatedDaysRemaining}d remaining`
              : "Low Stock",
          variant: "rose" as const,
        },
        onClick: () => setSelectedConsumable(item),
      }));
  }, [reportRows]);

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

  const columns: ColumnDef<ConsumableStockRow>[] = [
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
            row.isLowStock ? "text-rose-600" : "text-text"
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
                  ? `₱${row.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
                  ? `₱${row.stockValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
              isUrgent ? "text-rose-600" : "text-text"
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
      {!selectedConsumable && (
        <div className="hidden print:block print:w-full">
          <ConsumablesPrintableReport
            data={data?.data || []}
            summary={summary}
            canViewCosts={canViewCosts}
            filters={filters}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 w-full print:hidden">
      {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
      <div className="sticky top-10.25 sm:top-11.75 z-20 bg-bg-subtle pb-1.5 pt-0 transform-gpu">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-2xl rounded-t-none border-x border-b border-t-0 border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-text">
                Consumables Stock &amp; Usage Report
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Warehouse Inventory
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Real-time stock availability, depletion burn-rates, and reorder point forecasts.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <ReportExportButton reportType="consumables" filters={filters} />
          </div>
        </div>
      </div>

      {/* ── KPI Cards Grid with Inline Sparklines ───────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
        <KpiCard
          title="Tracked SKUs"
          sublabel="INVENTORY // CATALOG"
          value={isLoading ? "…" : summary?.totalSkus || 0}
          subtitle="Cataloged consumable items"
          icon={Layers}
          tone="blue"
          toneValue={true}
          delta="+8.3%"
          loading={isLoading}
        />

        <KpiCard
          title="Threshold Alerts"
          sublabel="REORDER // CRITICAL"
          value={isLoading ? "…" : summary?.lowStockItemsCount || 0}
          subtitle={
            summary?.lowStockItemsCount
              ? "Needs replenishment PO"
              : "All stock levels adequate"
          }
          icon={AlertTriangle}
          tone={summary?.lowStockItemsCount ? "amber" : "emerald"}
          toneValue={true}
          delta={{
            value:
              (summary?.lowStockItemsCount || 0) > 0
                ? `${summary?.lowStockItemsCount} low`
                : "Optimal",
            isPositive: (summary?.lowStockItemsCount || 0) === 0,
          }}
          loading={isLoading}
        />

        <KpiCard
          title="30-Day Dispatched"
          sublabel="VELOCITY // CONSUMPTION"
          value={isLoading ? "…" : (summary?.totalDispatched30d || 0).toLocaleString()}
          subtitle="Total units issued to departments"
          icon={TrendingDown}
          tone="indigo"
          toneValue={true}
          delta="+16.4%"
          loading={isLoading}
        />

        <KpiCard
          title="Stock Valuation"
          sublabel="FINANCIAL // ON-HAND"
          value={
            isLoading
              ? "…"
              : canViewCosts
              ? `₱${(summary?.totalInventoryValuation || 0).toLocaleString()}`
              : "Restricted"
          }
          subtitle={canViewCosts ? "Warehouse inventory value" : "Admin view only"}
          icon={Warehouse}
          tone="accent"
          toneValue={true}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* ── Visual Analytics Row: Usage Bar Chart + Low Stock Alert Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-7">
          <TrendBarChart
            title="Consumable Stock vs 30-Day Usage"
            sublabel="VELOCITY // DEPLETION"
            description="Comparing on-hand warehouse inventory with recent 30-day departmental consumption."
            icon={BarChart3}
            data={usageTrendData}
            xAxisKey="name"
            series={[
              { key: "onHand", name: "On-Hand Stock", color: "#2A3260" },
              { key: "usage30d", name: "30-Day Dispatched", color: "#5E6DB0" },
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
            description="Low stock items needing restock purchase order issuance."
            icon={Flame}
            items={lowStockItems}
            emptyMessage="All consumable stocks are currently above minimum threshold."
            loading={isLoading}
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
          searchPlaceholder="Search consumables by code, name, category…"
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
        onRowClick={(row) => setSelectedConsumable(row)}
      />

    </div>

      {/* ── Consumables Stock Detail Modal Dialog ─────────────────── */}
      <ConsumableDetailDialog
        consumable={selectedConsumable}
        isOpen={Boolean(selectedConsumable)}
        onClose={() => setSelectedConsumable(null)}
        canViewCosts={canViewCosts}
      />
    </>
  );
}
