"use client";

import type { DepartmentDTO } from "@/features/departments/client";
import {
  PrintMetricBar,
  PrintStatusBadge,
  PrintSignatories,
} from "../PrintCharts";

export interface IndividualDepartmentAsset {
  id: string;
  assetCode: string;
  name: string;
  category?: string;
  serialNumber?: string | null;
  condition?: string;
  status?: string;
  cost?: number | null;
  value?: number | null;
}

export interface IndividualDepartmentSupplyUsage {
  id: string;
  skuCode?: string;
  itemCode?: string;
  name: string;
  category?: string | null;
  quantity: number;
  unit?: string;
  spendValue?: number | null;
  totalCost?: number | null;
}

export interface IndividualDepartmentPrintableReportProps {
  department: {
    id: string;
    name?: string;
    departmentName?: string;
    code?: string;
    accountUserId?: string | null;
    accountEmail?: string | null;
    assetsAssignedCount?: number;
    assetsValue?: number | null;
    consumablesConsumedCount?: number;
    consumablesValue?: number | null;
    activeMaintenanceCount?: number;
    staffCount?: number | null;
    activeProjects?: number;
    assignedAssets?: IndividualDepartmentAsset[];
    consumedSupplies?: IndividualDepartmentSupplyUsage[];
  };
  assignedAssets?: IndividualDepartmentAsset[];
  supplyUsage?: IndividualDepartmentSupplyUsage[];
  activeProjectsCount?: number;
  openMaintenanceCount?: number;
  generatedAt?: Date;
  canViewCosts?: boolean;
}

export function IndividualDepartmentPrintableReport({
  department,
  assignedAssets: propAssignedAssets,
  supplyUsage: propSupplyUsage,
  activeProjectsCount: propActiveProjectsCount,
  openMaintenanceCount: propOpenMaintenanceCount,
  generatedAt = new Date(),
  canViewCosts = true,
}: IndividualDepartmentPrintableReportProps) {
  const formattedDate = generatedAt.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = generatedAt.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const deptName = department.departmentName || department.name || "Department";
  const deptCode = department.code || (department.id ? `DPT-${department.id.slice(0, 6)}` : "DPT-GEN");

  const effectiveAssets: IndividualDepartmentAsset[] =
    propAssignedAssets ||
    department.assignedAssets?.map((a) => ({
      id: a.id,
      assetCode: a.assetCode || a.id,
      name: a.name,
      category: a.category,
      serialNumber: a.serialNumber,
      condition: a.condition,
      status: a.status,
      cost: a.value ?? a.cost ?? null,
    })) ||
    [];

  const effectiveSupplies: IndividualDepartmentSupplyUsage[] =
    propSupplyUsage ||
    department.consumedSupplies?.map((s) => ({
      id: s.id,
      skuCode: s.itemCode || s.skuCode || s.id,
      name: s.name,
      category: s.category,
      quantity: s.quantity,
      unit: s.unit,
      spendValue: s.totalCost ?? s.spendValue ?? null,
    })) ||
    [];

  const totalAssetsCount = department.assetsAssignedCount ?? effectiveAssets.length;
  const totalAssetsValuation =
    department.assetsValue ?? effectiveAssets.reduce((sum, a) => sum + (a.cost || a.value || 0), 0);
  const totalSuppliesCount =
    department.consumablesConsumedCount ?? effectiveSupplies.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const totalSuppliesValuation =
    department.consumablesValue ?? effectiveSupplies.reduce((sum, s) => sum + (s.spendValue || s.totalCost || 0), 0);

  const activeProjects = propActiveProjectsCount ?? department.activeProjects ?? 0;
  const openMaintenance = propOpenMaintenanceCount ?? department.activeMaintenanceCount ?? 0;

  return (
    <div className="print-page mx-auto w-full max-w-[7.6in] bg-white text-text text-[11px] leading-normal font-sans space-y-3">
      {/* ─── Institutional Header ───────────────────────────────────────── */}
      <header className="avoid-break border-b-2 border-[#2A3260] pb-2.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/CRMC%20LOGO.png"
              alt="CRMC Seal"
              className="h-11 w-11 object-contain shrink-0"
            />
            <div className="space-y-0.5">
              <h1 className="text-base font-extrabold tracking-tight text-[#2A3260] uppercase">
                CRMC-AIMS
              </h1>
              <div className="text-[11px] font-semibold text-neutral-700">
                Cebu Roosevelt Memorial Colleges, Inc. · Asset &amp; Inventory Management System
              </div>
              <div className="text-[9.5px] font-medium text-neutral-500">
                Upper Pandan, Bogo City, Cebu, Philippines · Department Resource Allocation &amp; Audit
              </div>
            </div>
          </div>
          <div suppressHydrationWarning className="rounded-xs border border-neutral-200 bg-neutral-50/80 px-2.5 py-1 text-right font-mono text-[9.5px] space-y-0.5 shrink-0">
            <div>
              <span className="text-neutral-500">Generated:</span>{" "}
              <span className="font-semibold text-neutral-800">{formattedDate}, {formattedTime}</span>
            </div>
            <div>
              <span className="text-neutral-500">Doc ID:</span>{" "}
              <span className="font-bold text-neutral-800">
                DPT-DOS-{deptCode}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Individual Department Resource Allocation &amp; Audit Dossier
            </h2>
            <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">
              Department: <span className="font-bold text-neutral-800">{deptName}</span> · Code: {deptCode}
            </div>
          </div>
          <span className="text-[9.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-xs">
            Department Audit Dossier
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break">
        <PrintMetricBar
          metrics={[
            {
              label: "Assigned Fleet Assets",
              value: `${totalAssetsCount.toLocaleString()} Units`,
              delta: totalAssetsCount > 0 ? "In Custody" : "No Assets",
              deltaType: totalAssetsCount > 0 ? "positive" : "neutral",
              subtext: "Capital equipment in use",
            },
            {
              label: "Fleet Valuation",
              value: canViewCosts && totalAssetsValuation > 0 ? `₱${totalAssetsValuation.toLocaleString()}` : "—",
              delta: "Capital Value",
              deltaType: "neutral",
              subtext: "Assigned asset book value",
            },
            {
              label: "Consumables Dispatched",
              value: `${totalSuppliesCount.toLocaleString()} units`,
              delta: canViewCosts && totalSuppliesValuation > 0 ? `₱${totalSuppliesValuation.toLocaleString()}` : "Dispatched",
              deltaType: "neutral",
              subtext: "Total materials consumed",
            },
            {
              label: "Active Projects & Work Orders",
              value: `${activeProjects} Prj · ${openMaintenance} Mnt`,
              delta: openMaintenance > 0 ? "Maintenance Active" : "Optimal",
              deltaType: openMaintenance > 0 ? "warning" : "positive",
              subtext: "Operational activity",
            },
          ]}
        />
      </section>

      {/* ─── Section 1: Department Governance & Custody Profile ──────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>1. Department Governance &amp; Custody Profile</span>
            <span className="text-[10px] text-neutral-500 font-mono">Code: {deptCode}</span>
          </div>
          <div className="p-3 grid grid-cols-12 gap-2.5 text-[11px]">
            <div className="col-span-6 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Official Department Name</div>
              <div className="font-bold text-[#2A3260] text-[12px]">{deptName}</div>
            </div>
            <div className="col-span-3 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">System Code</div>
              <div className="font-mono font-bold text-neutral-800">{deptCode}</div>
            </div>
            <div className="col-span-3 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Account Access</div>
              <div>
                <PrintStatusBadge
                  status={department.accountUserId ? "active" : "neutral"}
                  label={department.accountUserId ? "Linked Account" : "No Login"}
                />
              </div>
            </div>

            <div className="col-span-6 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Linked Account / Liaison Email</div>
              <div className="font-mono text-neutral-700">{department.accountEmail || "Unassigned liaison account"}</div>
            </div>
            <div className="col-span-6 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Campus Unit / Facility</div>
              <div className="text-neutral-700">CRMC Main Campus Academic &amp; Administrative Wing</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 2: Assigned Capital Fleet Equipment Register ────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>2. Assigned Fleet Capital Assets Register</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              Showing {Math.min(effectiveAssets.length, 10)} of {totalAssetsCount} assigned assets
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Asset Tag</th>
                <th className="py-1.5 px-3 text-left">Equipment Name</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap">Category</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap">Serial Number</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Condition</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {effectiveAssets.slice(0, 10).map((asset) => (
                <tr key={asset.id}>
                  <td className="py-1.5 px-3 font-mono font-bold text-[#2A3260] whitespace-nowrap">
                    {asset.assetCode || asset.id}
                  </td>
                  <td className="py-1.5 px-3 font-medium">
                    {asset.name}
                  </td>
                  <td className="py-1.5 px-3 text-neutral-600 capitalize whitespace-nowrap">
                    {asset.category || "Equipment"}
                  </td>
                  <td className="py-1.5 px-3 font-mono text-neutral-600 whitespace-nowrap">
                    {asset.serialNumber || "—"}
                  </td>
                  <td className="py-1.5 px-3 text-neutral-600 capitalize whitespace-nowrap">
                    {asset.condition || "Good"}
                  </td>
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    <PrintStatusBadge status={asset.status || "active"} />
                  </td>
                </tr>
              ))}
              {effectiveAssets.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-2.5 text-center text-neutral-400 italic text-[11px]">
                    No capital fleet assets currently assigned to this department.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Section 3: Consumables Supplies Usage Ledger ────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>3. Consumable Supplies Requisitions &amp; Usage Ledger</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {effectiveSupplies.length} Dispatched Supply Items
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">SKU Code</th>
                <th className="py-1.5 px-3 text-left">Item Description</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap">Category</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Units Dispatched</th>
                {canViewCosts && <th className="py-1.5 px-3 text-right whitespace-nowrap">Spend Valuation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {effectiveSupplies.slice(0, 10).map((supply) => (
                <tr key={supply.id}>
                  <td className="py-1.5 px-3 font-mono font-bold text-[#2A3260] whitespace-nowrap">
                    {supply.skuCode}
                  </td>
                  <td className="py-1.5 px-3 font-medium">
                    {supply.name}
                  </td>
                  <td className="py-1.5 px-3 text-neutral-600 capitalize whitespace-nowrap">
                    {supply.category || "Supply"}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-neutral-800 whitespace-nowrap">
                    {supply.quantity.toLocaleString()} <span className="text-[9.5px] text-neutral-500">{supply.unit || "units"}</span>
                  </td>
                  {canViewCosts && (
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-neutral-900 whitespace-nowrap">
                      {supply.spendValue != null ? `₱${supply.spendValue.toLocaleString()}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {effectiveSupplies.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 5 : 4} className="py-2.5 text-center text-neutral-400 italic text-[11px]">
                    No consumable supply requisitions recorded for this department yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Signatories Block ───────────────────────────────────────────── */}
      <section className="avoid-break pt-1">
        <PrintSignatories
          signers={[
            {
              role: "Department Head / Custodian",
              name: deptName + " Representative",
              title: "Department Custodian",
            },
            {
              role: "Property Management & Audit",
              name: "Property & Supply Officer",
              title: "Office of Quality Assurance & Audit",
            },
          ]}
        />
      </section>

      {/* ─── Institutional Footer ───────────────────────────────────────── */}
      <footer className="avoid-break pt-2 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[9.5px] text-neutral-500 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS Individual Department Dossier</div>
          <div>Official Department Record</div>
          <div suppressHydrationWarning>
            Verification Code: CRMC-DPT-{deptCode}-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
