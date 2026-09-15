"use client";

import { useMemo, useState } from "react";
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  DollarSign,
  PieChart as PieIcon,
  Truck,
} from "lucide-react";

import { usePurchaseOrdersReportQuery } from "@/features/reports/client/use-reports";
import type { BaseReportFilters, PurchaseOrderRow } from "@/types/reports";
import { StatCardGrid } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/reports/kpi-card";
import { GaugeChart } from "@/components/reports/gauge-chart";
import { BreakdownDonutChart } from "@/components/reports/breakdown-donut-chart";
import { RecentListCard } from "@/components/reports/recent-list-card";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { ProcurementPrintableReport } from "@/components/reports/print/ProcurementPrintableReport";

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

  const reportRows = data?.data;
  const topSuppliers = summary?.topSuppliers;

  const vendorSpendDonutData = useMemo(() => {
    if (topSuppliers && topSuppliers.length > 0) {
      return topSuppliers.map((s) => ({
        name: s.name,
        value: s.spend,
      }));
    }
    if (!reportRows || reportRows.length === 0) return [];
    const map: Record<string, number> = {};
    for (const row of reportRows) {
      const name = row.supplierName || "Other";
      map[name] = (map[name] || 0) + (row.totalAmount || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [topSuppliers, reportRows]);

  const pendingOrders = useMemo(() => {
    if (!reportRows || reportRows.length === 0) return [];
    return reportRows
      .filter(
        (po) =>
          po.status.toLowerCase() !== "delivered" &&
          po.status.toLowerCase() !== "received"
      )
      .slice(0, 5)
      .map((po) => ({
        id: po.poNumber,
        title: po.poNumber,
        tag: po.itemType,
        subtitle: `${po.supplierName} · ${
          po.itemsPreview || `${po.totalQuantity} items`
        }`,
        date: po.purchasedOn,
        status: {
          label: po.status,
          variant: "amber" as const,
        },
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
    <>
      <div className="hidden print:block print:w-full">
        <ProcurementPrintableReport
          data={data?.data || []}
          summary={summary}
          canViewCosts={canViewCosts}
          filters={filters}
        />
      </div>

      <div className="flex flex-col gap-3 w-full print:hidden">
      {/* ── Top Header Banner (Attached seamlessly below tabs) ───────── */}
      <div className="sticky top-10.25 sm:top-11.75 z-20 bg-bg-subtle pb-1.5 pt-0 transform-gpu">
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

      {/* ── KPI Cards Grid with Inline Sparklines ───────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 -mt-1.5">
        <KpiCard
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
          delta="+18.4%"
          loading={isLoading}
        />

        <KpiCard
          title="Open Purchase Lots"
          sublabel="STOCK // UNDEPLETED"
          value={isLoading ? "…" : summary?.openOrdersCount || 0}
          subtitle="Lots with unexhausted stock"
          icon={ShoppingCart}
          tone="amber"
          toneValue={true}
          delta={{
            value: `${summary?.openOrdersCount || 0} open`,
            isPositive: (summary?.openOrdersCount || 0) < 10,
          }}
          loading={isLoading}
        />

        <KpiCard
          title="Completed Receipts"
          value={isLoading ? "…" : summary?.deliveredCount || 0}
          subtitle="Received into warehouse inventory"
          icon={CheckCircle2}
          tone="emerald"
          toneValue={true}
          delta="+12.5%"
          loading={isLoading}
        />

        <KpiCard
          title="Fulfillment Lead Time"
          sublabel="LOGISTICS // VELOCITY"
          value={isLoading ? "…" : `${summary?.avgLeadTimeDays || 4.2} d`}
          subtitle="PO issuance to warehouse delivery"
          icon={Clock}
          tone="blue"
          toneValue={true}
          delta="-0.8 d"
          loading={isLoading}
        />
      </StatCardGrid>

      {/* ── Visual Analytics Row: Completion Gauge + Vendor Donut + Recent POs ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-4">
          <GaugeChart
            title="Receipt Completion Rate"
            sublabel="FULFILLMENT // RATE"
            description="Ratio of delivered purchase receipts against active open procurement orders."
            icon={Truck}
            completedCount={summary?.deliveredCount || 0}
            pendingCount={summary?.openOrdersCount || 0}
            completedLabel="Delivered"
            pendingLabel="In-Flight"
            tone="emerald"
            loading={isLoading}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-4">
          <BreakdownDonutChart
            title="Spend by Vendor"
            sublabel="PROCUREMENT // VENDORS"
            description="Capital expenditure distributed among active approved suppliers."
            icon={PieIcon}
            data={vendorSpendDonutData}
            valueFormatter={(v) => (canViewCosts ? `₱${v.toLocaleString()}` : `${v}`)}
            unitLabel="spend"
            loading={isLoading}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-4">
          <RecentListCard
            title="Upcoming & Pending POs"
            sublabel="PURCHASING // QUEUE"
            description="Active procurement lots awaiting fulfillment or delivery verification."
            icon={ShoppingCart}
            items={pendingOrders}
            emptyMessage="No pending purchase orders requiring delivery."
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
    </>
  );
}
