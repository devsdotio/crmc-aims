"use client";

import type { Asset } from "@/types/assets";
import {
  PrintMetricBar,
  PrintStatusBadge,
  PrintSignatories,
} from "../PrintCharts";

export interface IndividualAssetMaintenanceEntry {
  id?: string;
  cost?: number | null;
  date?: string | null;
  type?: string | null;
  description?: string | null;
  technician?: string | null;
}

export interface IndividualAssetPrintableReportProps {
  asset: {
    id: string;
    assetCode?: string | null;
    name: string;
    category?: string | null;
    status?: string | null;
    assignmentType?: string | null;
    location?: string | null;
    department?: string | null;
    currentHolder?: string | null;
    purchaseDate?: string | null;
    value?: number | null;
    serialNumber?: string | null;
    notes?: string | null;
    maintenanceHistory?: IndividualAssetMaintenanceEntry[];
  };
  maintenanceHistory?: IndividualAssetMaintenanceEntry[];
  generatedAt?: Date;
  canViewCosts?: boolean;
}

export function IndividualAssetPrintableReport({
  asset,
  maintenanceHistory: propMaintenance,
  generatedAt = new Date(),
  canViewCosts = true,
}: IndividualAssetPrintableReportProps) {
  const formattedDate = generatedAt.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = generatedAt.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const maintenanceHistory = propMaintenance || asset.maintenanceHistory || [];
  const totalRepairSpend = maintenanceHistory.reduce(
    (sum, m) => sum + (m.cost || 0),
    0,
  );

  const purchasePrice = asset.value ?? 0;

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
                Upper Pandan, Bogo City, Cebu, Philippines · Property &amp; Supply Custody Division
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
                AST-DOS-{asset.assetCode || asset.id}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Individual Asset Dossier &amp; Equipment Audit
            </h2>
            <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">
              Asset Tag: <span className="font-bold text-neutral-800">{asset.assetCode || asset.id}</span> · Serial: {asset.serialNumber || "N/A"}
            </div>
          </div>
          <span className="text-[9.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-xs">
            Equipment Dossier
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break">
        <PrintMetricBar
          metrics={[
            {
              label: "Acquisition Value",
              value: canViewCosts && purchasePrice > 0 ? `₱${purchasePrice.toLocaleString()}` : "—",
              delta: "Book Value",
              deltaType: "neutral",
              subtext: asset.purchaseDate ? `Acquired ${asset.purchaseDate}` : "Capital asset",
            },
            {
              label: "Operational State",
              value: asset.status?.toUpperCase() || "ACTIVE",
              delta: asset.status === "active" ? "Operational" : "Flagged",
              deltaType: asset.status === "needs_repair" || asset.status === "out_of_service" ? "warning" : "positive",
              subtext: "Current readiness",
            },
            {
              label: "Lifetime Repairs",
              value: maintenanceHistory.length.toString(),
              delta: canViewCosts && totalRepairSpend > 0 ? `₱${totalRepairSpend.toLocaleString()}` : "No Repair Cost",
              deltaType: maintenanceHistory.length > 2 ? "warning" : "positive",
              subtext: "Work orders logged",
            },
            {
              label: "Assigned Custodian",
              value: asset.currentHolder || asset.department || "Storage Vault",
              delta: asset.department || "Institutional",
              deltaType: "neutral",
              subtext: asset.location || "On-Premises",
            },
          ]}
        />
      </section>

      {/* ─── Section 1: Specifications & Identification ─────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>1. Technical Specifications &amp; Identification</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              SKU / Tag: {asset.assetCode || asset.id}
            </span>
          </div>
          <div className="p-3 grid grid-cols-12 gap-2.5 text-[11px]">
            <div className="col-span-4 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Equipment Name</div>
              <div className="font-bold text-[#2A3260] text-[12px]">{asset.name}</div>
            </div>
            <div className="col-span-4 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Category / Classification</div>
              <div className="font-semibold text-neutral-800 capitalize">{asset.category || "General Equipment"}</div>
            </div>
            <div className="col-span-4 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Assignment Type</div>
              <div className="font-semibold text-neutral-800 capitalize">{asset.assignmentType || "Standard"}</div>
            </div>

            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Serial Number</div>
              <div className="font-mono font-bold text-neutral-800">{asset.serialNumber || "UNRECORDED"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Purchase Date</div>
              <div className="font-mono text-neutral-700">{asset.purchaseDate || "Standard Procurement"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Current Custodian / Holder</div>
              <div className="font-mono text-neutral-700">{asset.currentHolder || "Unassigned / Department Custody"}</div>
            </div>

            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Assigned Department</div>
              <div className="font-semibold text-[#2A3260]">{asset.department || "Institutional Pool"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Physical Location</div>
              <div className="text-neutral-700">{asset.location || "Central Storage Vault"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Operational Status</div>
              <div className="flex items-center gap-1.5">
                <PrintStatusBadge status={asset.status || "active"} />
              </div>
            </div>

            {asset.notes && (
              <div className="col-span-12 border-t border-neutral-100 pt-1.5">
                <div className="text-[10px] font-bold uppercase text-neutral-500 mb-0.5">Asset Notes / Remarks</div>
                <div className="text-[10.5px] text-neutral-700 bg-neutral-50 p-2 rounded-xs">
                  {asset.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Section 2: Maintenance & Repair Work Orders Log ────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>2. Maintenance &amp; Repair Work Orders Log</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {maintenanceHistory.length} total work orders
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Log Date</th>
                <th className="py-1.5 px-3 text-left">Task Description</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-28">Type</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-32">Technician</th>
                {canViewCosts && <th className="py-1.5 px-3 text-right whitespace-nowrap">Service Cost</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {maintenanceHistory.map((entry, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 px-3 font-mono text-neutral-600 whitespace-nowrap">
                    {entry.date || "Unrecorded"}
                  </td>
                  <td className="py-1.5 px-3 font-medium">
                    {entry.description || "Routine inspection and maintenance check"}
                  </td>
                  <td className="py-1.5 px-3 text-neutral-600 capitalize whitespace-nowrap">
                    {entry.type || "maintenance"}
                  </td>
                  <td className="py-1.5 px-3 text-neutral-700 whitespace-nowrap">
                    {entry.technician || "Internal Staff"}
                  </td>
                  {canViewCosts && (
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-neutral-900 whitespace-nowrap">
                      {entry.cost ? `₱${entry.cost.toLocaleString()}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {maintenanceHistory.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 5 : 4} className="py-2.5 text-center text-emerald-700 italic text-[11px]">
                    No maintenance issues recorded. Equipment has operated with zero defect tickets.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Institutional Footer ───────────────────────────────────────── */}
      <footer className="avoid-break pt-2 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[9.5px] text-neutral-500 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS Individual Asset Dossier</div>
          <div>Official Equipment Record</div>
          <div suppressHydrationWarning>
            Verification Code: CRMC-AST-{asset.assetCode || asset.id}-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
