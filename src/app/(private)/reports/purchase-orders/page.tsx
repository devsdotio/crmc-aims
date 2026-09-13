"use client";

import { useState } from "react";
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

import { usePurchaseOrdersReportQuery } from "@/features/reports/client/use-reports";
import type { BaseReportFilters, PurchaseOrderRow } from "@/types/reports";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";

const TYPE_OPTIONS = [
  { label: "All Types", value: "all" },
  { label: "Consumables", value: "consumable" },
  { label: "Capital Assets", value: "asset" },
];

export default function PurchaseOrdersReportPage() {
  const [filters, setFilters] = useState<BaseReportFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    category: "",
  });

  const { data, isLoading } = usePurchaseOrdersReportQuery(filters);

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
    });
  };

  const columns: ColumnDef<PurchaseOrderRow>[] = [
    {
      key: "poNumber",
      header: "PO / Lot Code",
      render: (row) => (
        <span className="font-mono font-bold text-text hover:text-accent transition-colors">
          {row.poNumber}
        </span>
      ),
    },
    {
      key: "supplierName",
      header: "Supplier",
      render: (row) => (
        <span className="font-semibold text-text">{row.supplierName}</span>
      ),
    },
    {
      key: "itemType",
      header: "Type",
      render: (row) => (
        <span className="rounded-full bg-bg-subtle border border-border/60 px-2 py-0.5 text-[10px] font-bold text-text capitalize">
          {row.itemType}
        </span>
      ),
    },
    {
      key: "itemsPreview",
      header: "Item Description",
      render: (row) => (
        <span className="text-text font-medium">{row.itemsPreview}</span>
      ),
    },
    {
      key: "totalQuantity",
      header: "Qty",
      align: "right",
      render: (row) => (
        <span className="font-mono font-bold text-text">
          {row.totalQuantity.toLocaleString()}
        </span>
      ),
    },
    ...(canViewCosts
      ? [
          {
            key: "totalAmount" as const,
            header: "Total Spend",
            align: "right" as const,
            render: (row: PurchaseOrderRow) => (
              <span className="font-mono font-bold text-text">
                {row.totalAmount != null ? `₱${row.totalAmount.toLocaleString()}` : "—"}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "purchasedOn",
      header: "Date Acquired",
      render: (row) => (
        <span className="font-mono text-text-secondary text-[11px]">{row.purchasedOn}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-status-active-bg/20 text-status-active-text border border-status-active-bg/30 px-2 py-0.5 text-[10px] font-bold capitalize">
          <CheckCircle2 className="h-3 w-3" />
          <span>{row.status}</span>
        </span>
      ),
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
                Purchase Orders &amp; Receipts Report
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                Procurement Audit
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Procurement expenditure audit, vendor spend distributions, and order fulfillment.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <ReportExportButton reportType="purchase-orders" filters={filters} />
          </div>
        </div>
      </div>

      {/* ── KPI Cards Grid ───────────────────────────────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
        <StatCard
          title="Procurement Spend"
          sublabel="FINANCIAL // SPEND"
          value={
            isLoading
              ? "…"
              : canViewCosts
              ? `₱${(summary?.totalSpend || 0).toLocaleString()}`
              : "Restricted"
          }
          subtitle="Cumulative historical receipts"
          icon={DollarSign}
          tone="indigo"
          toneValue={true}
          loading={isLoading}
        />

        <StatCard
          title="Open Purchase Lots"
          sublabel="STOCK // UNDEPLETED"
          value={isLoading ? "…" : summary?.openOrdersCount || 0}
          subtitle="Lots with unexhausted stock"
          icon={ShoppingCart}
          tone="amber"
          toneValue={true}
          loading={isLoading}
        />

        <StatCard
          title="Completed Receipts"
          value={isLoading ? "…" : summary?.deliveredCount || 0}
          subtitle="Received into warehouse inventory"
          icon={CheckCircle2}
          tone="emerald"
          toneValue={true}
          loading={isLoading}
        />

        <StatCard
          title="Fulfillment Lead Time"
          sublabel="LOGISTICS // VELOCITY"
          value={isLoading ? "…" : `${summary?.avgLeadTimeDays || 4.2} d`}
          subtitle="PO issuance to warehouse delivery"
          icon={Clock}
          tone="blue"
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
          categories={TYPE_OPTIONS}
          searchPlaceholder="Search PO number, supplier, item name…"
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
