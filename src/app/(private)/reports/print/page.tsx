"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import {
  useAssetRegisterReportQuery,
  useConsumablesReportQuery,
  useDepartmentReportQuery,
  useExecutiveReportQuery,
  useMaintenanceReportQuery,
  useProjectReportQuery,
  usePurchaseOrdersReportQuery,
  useRequestsReportQuery,
} from "@/features/reports/client/use-reports";
import type { BaseReportFilters } from "@/types/reports";

import { AssetRegisterPrintableReport } from "@/components/reports/print/AssetRegisterPrintableReport";
import { ConsumablesPrintableReport } from "@/components/reports/print/ConsumablesPrintableReport";
import { DepartmentsPrintableReport } from "@/components/reports/print/DepartmentsPrintableReport";
import { ExecutivePrintableReport } from "@/components/reports/print/ExecutivePrintableReport";
import { MaintenancePrintableReport } from "@/components/reports/print/MaintenancePrintableReport";
import { ProcurementPrintableReport } from "@/components/reports/print/ProcurementPrintableReport";
import { ProjectsPrintableReport } from "@/components/reports/print/ProjectsPrintableReport";
import { RequestsPrintableReport } from "@/components/reports/print/RequestsPrintableReport";
import { PrintTriggerButton } from "@/components/reports/print/PrintTriggerButton";

interface DomainMeta {
  title: string;
  backHref: string;
  backLabel: string;
  scopeText: string;
}

const REPORT_DOMAINS: Record<string, DomainMeta> = {
  executive: {
    title: "Executive Overview",
    backHref: "/reports",
    backLabel: "Back to Reports",
    scopeText: "Scope: Institutional Rollup · Academic & Administrative Departments · All Categories",
  },
  assets: {
    title: "Capital Asset Register",
    backHref: "/reports/assets",
    backLabel: "Back to Asset Register",
    scopeText: "Scope: Capital Equipment Registry · Physical Inventory & Custody",
  },
  asset: {
    title: "Capital Asset Register",
    backHref: "/reports/assets",
    backLabel: "Back to Asset Register",
    scopeText: "Scope: Capital Equipment Registry · Physical Inventory & Custody",
  },
  consumables: {
    title: "Consumable Supply Stores",
    backHref: "/reports/consumables",
    backLabel: "Back to Consumables",
    scopeText: "Scope: Consumable Supply Inventory · Stock Levels & Lot Allocations",
  },
  consumable: {
    title: "Consumable Supply Stores",
    backHref: "/reports/consumables",
    backLabel: "Back to Consumables",
    scopeText: "Scope: Consumable Supply Inventory · Stock Levels & Lot Allocations",
  },
  departments: {
    title: "Departmental Custody & Consumption",
    backHref: "/reports/departments",
    backLabel: "Back to Departments",
    scopeText: "Scope: Department Allocations · Asset Holdings & Consumable Burn",
  },
  department: {
    title: "Departmental Custody & Consumption",
    backHref: "/reports/departments",
    backLabel: "Back to Departments",
    scopeText: "Scope: Department Allocations · Asset Holdings & Consumable Burn",
  },
  projects: {
    title: "Project Allocations & Expenditures",
    backHref: "/reports/projects",
    backLabel: "Back to Projects",
    scopeText: "Scope: Institutional Projects · Equipment Assignments & Material Requisitions",
  },
  project: {
    title: "Project Allocations & Expenditures",
    backHref: "/reports/projects",
    backLabel: "Back to Projects",
    scopeText: "Scope: Institutional Projects · Equipment Assignments & Material Requisitions",
  },
  maintenance: {
    title: "Equipment Maintenance & Work Orders",
    backHref: "/reports/maintenance",
    backLabel: "Back to Maintenance",
    scopeText: "Scope: Corrective & Preventive Maintenance · MTTR & Work Order Ledger",
  },
  "purchase-orders": {
    title: "Procurement & Purchase Orders",
    backHref: "/reports/purchase-orders",
    backLabel: "Back to Purchase Orders",
    scopeText: "Scope: Purchase Orders & Acquisitions · Supplier Lead Time & Delivery",
  },
  procurement: {
    title: "Procurement & Purchase Orders",
    backHref: "/reports/purchase-orders",
    backLabel: "Back to Purchase Orders",
    scopeText: "Scope: Purchase Orders & Acquisitions · Supplier Lead Time & Delivery",
  },
  requests: {
    title: "Department Requisition Pipeline",
    backHref: "/reports/requests",
    backLabel: "Back to Requests",
    scopeText: "Scope: Supply & Equipment Requests · Approval Queue & SLA Metrics",
  },
  request: {
    title: "Department Requisition Pipeline",
    backHref: "/reports/requests",
    backLabel: "Back to Requests",
    scopeText: "Scope: Supply & Equipment Requests · Approval Queue & SLA Metrics",
  },
};

function PrintLoadingSpinner({ message = "Generating live institutional audit rollup..." }: { message?: string }) {
  return (
    <div className="py-24 text-center space-y-3">
      <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-solid border-[#2A3260] border-r-transparent align-[-0.125em]" />
      <p className="text-xs font-semibold text-neutral-600">{message}</p>
    </div>
  );
}

function PrintErrorDisplay({ error, title = "Error loading report summary" }: { error: unknown; title?: string }) {
  return (
    <div className="py-20 text-center text-xs text-red-600 space-y-1">
      <p className="font-bold">{title}</p>
      <p className="text-neutral-500">{(error as Error)?.message || "Failed to fetch report data"}</p>
    </div>
  );
}

function PrintEmptyDisplay({ message = "No report data available for the specified criteria." }: { message?: string }) {
  return (
    <div className="py-20 text-center text-xs text-neutral-500">
      {message}
    </div>
  );
}

// ── Individual Domain Print Renderers ──────────────────────────────────────

function ExecutivePrintContent({ filtersSummary }: { filtersSummary: string }) {
  const { data, isLoading, error } = useExecutiveReportQuery();

  if (isLoading) return <PrintLoadingSpinner message="Generating executive institutional rollup..." />;
  if (error) return <PrintErrorDisplay error={error} title="Error loading executive summary" />;
  if (!data) return <PrintEmptyDisplay />;

  return (
    <ExecutivePrintableReport
      data={data}
      generatedAt={new Date()}
      filtersSummary={filtersSummary}
    />
  );
}

function AssetsPrintContent({ filters }: { filters: BaseReportFilters }) {
  const { data, isLoading, error } = useAssetRegisterReportQuery(filters);

  if (isLoading) return <PrintLoadingSpinner message="Loading capital asset registry..." />;
  if (error) return <PrintErrorDisplay error={error} title="Error loading asset register" />;
  if (!data) return <PrintEmptyDisplay />;

  return (
    <AssetRegisterPrintableReport
      data={data.data}
      summary={data.summary}
      canViewCosts={data.canViewCosts}
      filters={filters}
      generatedAt={new Date()}
    />
  );
}

function ConsumablesPrintContent({ filters }: { filters: BaseReportFilters }) {
  const { data, isLoading, error } = useConsumablesReportQuery(filters);

  if (isLoading) return <PrintLoadingSpinner message="Loading consumable inventory & lot allocations..." />;
  if (error) return <PrintErrorDisplay error={error} title="Error loading consumables report" />;
  if (!data) return <PrintEmptyDisplay />;

  return (
    <ConsumablesPrintableReport
      data={data.data}
      summary={data.summary}
      canViewCosts={data.canViewCosts}
      filters={filters}
      generatedAt={new Date()}
    />
  );
}

function DepartmentsPrintContent({ filters }: { filters: BaseReportFilters }) {
  const { data, isLoading, error } = useDepartmentReportQuery(filters);

  if (isLoading) return <PrintLoadingSpinner message="Loading departmental custody & consumption rollup..." />;
  if (error) return <PrintErrorDisplay error={error} title="Error loading departments report" />;
  if (!data) return <PrintEmptyDisplay />;

  return (
    <DepartmentsPrintableReport
      data={data.data}
      summary={data.summary}
      canViewCosts={data.canViewCosts}
      filters={filters}
      generatedAt={new Date()}
    />
  );
}

function ProjectsPrintContent({ filters }: { filters: BaseReportFilters }) {
  const { data, isLoading, error } = useProjectReportQuery(filters);

  if (isLoading) return <PrintLoadingSpinner message="Loading project asset & supply allocations..." />;
  if (error) return <PrintErrorDisplay error={error} title="Error loading project report" />;
  if (!data) return <PrintEmptyDisplay />;

  return (
    <ProjectsPrintableReport
      data={data.data}
      summary={data.summary}
      canViewCosts={data.canViewCosts}
      filters={filters}
      generatedAt={new Date()}
    />
  );
}

function MaintenancePrintContent({ filters }: { filters: BaseReportFilters }) {
  const { data, isLoading, error } = useMaintenanceReportQuery(filters);

  if (isLoading) return <PrintLoadingSpinner message="Loading equipment repair & maintenance ledger..." />;
  if (error) return <PrintErrorDisplay error={error} title="Error loading maintenance report" />;
  if (!data) return <PrintEmptyDisplay />;

  return (
    <MaintenancePrintableReport
      data={data.data}
      summary={data.summary}
      canViewCosts={data.canViewCosts}
      filters={filters}
      generatedAt={new Date()}
    />
  );
}

function ProcurementPrintContent({ filters }: { filters: BaseReportFilters }) {
  const { data, isLoading, error } = usePurchaseOrdersReportQuery(filters);

  if (isLoading) return <PrintLoadingSpinner message="Loading procurement & purchase order records..." />;
  if (error) return <PrintErrorDisplay error={error} title="Error loading procurement report" />;
  if (!data) return <PrintEmptyDisplay />;

  return (
    <ProcurementPrintableReport
      data={data.data}
      summary={data.summary}
      canViewCosts={data.canViewCosts}
      filters={filters}
      generatedAt={new Date()}
    />
  );
}

function RequestsPrintContent({ filters }: { filters: BaseReportFilters }) {
  const { data, isLoading, error } = useRequestsReportQuery(filters);

  if (isLoading) return <PrintLoadingSpinner message="Loading requisition pipeline records..." />;
  if (error) return <PrintErrorDisplay error={error} title="Error loading requests report" />;
  if (!data) return <PrintEmptyDisplay />;

  return (
    <RequestsPrintableReport
      data={data.data}
      summary={data.summary}
      canViewCosts={data.canViewCosts}
      filters={filters}
      generatedAt={new Date()}
    />
  );
}

// ── Printable Report Inner Controller ─────────────────────────────────────

function PrintableReportView() {
  const searchParams = useSearchParams();
  const rawType = (searchParams.get("type") || "executive").toLowerCase();
  const meta = REPORT_DOMAINS[rawType] || REPORT_DOMAINS.executive;

  const filters: BaseReportFilters = useMemo(
    () => ({
      page: 1,
      pageSize: 100,
      search: searchParams.get("search") || undefined,
      departmentId: searchParams.get("departmentId") || searchParams.get("department") || undefined,
      category: searchParams.get("category") || undefined,
      status: searchParams.get("status") || undefined,
      startDate: searchParams.get("dateFrom") || searchParams.get("startDate") || undefined,
      endDate: searchParams.get("dateTo") || searchParams.get("endDate") || undefined,
    }),
    [searchParams]
  );

  const isLandscape = true; // All official CHED / Custodian reports adhere to the landscape A4 folio standard

  return (
    <div className="h-full w-full overflow-y-auto bg-[#E5E7EB] py-3 sm:py-5 px-2 sm:px-4 print:bg-white print:p-0 print:m-0 print:overflow-visible">
      {/* ─── Top Control Toolbar (Screen Only) ──────────────────────────── */}
      <div className={`no-print mx-auto mb-3 flex ${isLandscape ? "max-w-[10.4in]" : "max-w-[7.6in]"} flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-300 bg-white p-2.5 sm:p-3 shadow-xs`}>
        <div className="flex items-center gap-3">
          <Link
            href={meta.backHref}
            className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 bg-neutral-50 px-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 hover:border-neutral-400 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-neutral-600" />
            <span>{meta.backLabel}</span>
          </Link>

          <div>
            <div className="text-xs font-bold text-neutral-900">
              Print Preview: {meta.title}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              {isLandscape
                ? "Legal Landscape (14\" × 8.5\") · CHED / COA Custodian Report Standard"
                : "Standard Letter (8.5\" × 11\") · Live Institutional Data"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PrintTriggerButton />
        </div>
      </div>

      {/* ─── Printable Document Sheet Container ─────────────────────────── */}
      <div className={`mx-auto ${isLandscape ? "max-w-[10.4in]" : "max-w-[7.6in]"} rounded-xs border border-neutral-300 bg-white p-5 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none`}>
        {rawType === "executive" && <ExecutivePrintContent filtersSummary={meta.scopeText} />}
        {(rawType === "assets" || rawType === "asset") && <AssetsPrintContent filters={filters} />}
        {(rawType === "consumables" || rawType === "consumable") && <ConsumablesPrintContent filters={filters} />}
        {(rawType === "departments" || rawType === "department") && <DepartmentsPrintContent filters={filters} />}
        {(rawType === "projects" || rawType === "project") && <ProjectsPrintContent filters={filters} />}
        {rawType === "maintenance" && <MaintenancePrintContent filters={filters} />}
        {(rawType === "purchase-orders" || rawType === "procurement") && <ProcurementPrintContent filters={filters} />}
        {(rawType === "requests" || rawType === "request") && <RequestsPrintContent filters={filters} />}
      </div>
    </div>
  );
}

export default function PrintableReportPage() {
  return (
    <Suspense fallback={<PrintLoadingSpinner message="Preparing institutional document preview..." />}>
      <PrintableReportView />
    </Suspense>
  );
}
