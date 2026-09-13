"use client";

import { useState } from "react";
import {
  Layers,
  AlertTriangle,
  TrendingDown,
  Warehouse,
  CheckCircle2,
} from "lucide-react";

import { useConsumablesReportQuery } from "@/features/reports/client/use-reports";
import type { BaseReportFilters, ConsumableStockRow } from "@/types/reports";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";

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
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
      <div className="sticky top-[41px] sm:top-[47px] z-20 bg-[#F2F3F7] pb-1.5 pt-0 transform-gpu">
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

      {/* ── KPI Cards Grid ───────────────────────────────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
        <StatCard
          title="Tracked SKUs"
          sublabel="INVENTORY // CATALOG"
          value={isLoading ? "…" : summary?.totalSkus || 0}
          subtitle="Cataloged consumable items"
          icon={Layers}
          tone="blue"
          toneValue={true}
          loading={isLoading}
        />

        <StatCard
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
          loading={isLoading}
        />

        <StatCard
          title="30-Day Dispatched"
          sublabel="VELOCITY // CONSUMPTION"
          value={isLoading ? "…" : (summary?.totalDispatched30d || 0).toLocaleString()}
          subtitle="Total units issued to departments"
          icon={TrendingDown}
          tone="indigo"
          toneValue={true}
          loading={isLoading}
        />

        <StatCard
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
      />
    </div>
  );
}
