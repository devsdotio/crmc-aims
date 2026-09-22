"use client";

import type { Asset } from "@/types/assets";
import {
  PrintMetricBar,
  PrintStatusBadge,
  PrintSignatories,
} from "../PrintCharts";

export interface IndividualAssetMaintenanceEntry {
  id?: string;
  logCode?: string | null;
  status?: "open" | "resolved" | string | null;
  cost?: number | null;
  date?: string | null;
  resolutionDate?: string | null;
  type?: string | null;
  /** Initial fault / issue notes. */
  issue?: string | null;
  workNotes?: string | null;
  resolutionNotes?: string | null;
  parts?: Array<{ name: string; cost?: string | null }>;
  /** Legacy single-line description (falls back when issue is absent). */
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
  const hasComparableCost = canViewCosts && purchasePrice > 0;
  const repairVsAcquisitionPct = hasComparableCost
    ? (totalRepairSpend / purchasePrice) * 100
    : null;

  return (
    <div className="print-page mx-auto w-full bg-white text-black text-[9.5px] leading-tight font-sans space-y-2 p-0">
      <style>{`
        @page {
          size: 14in 8.5in;
          margin: 10mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color: #000000 !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            vertical-align: top;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .print-page {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            background: #ffffff !important;
            vertical-align: top;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .print-page img {
            filter: none !important;
            -webkit-filter: none !important;
          }
          table {
            break-inside: auto;
          }
          tr {
            break-inside: auto;
            page-break-inside: auto;
          }
          thead {
            break-inside: avoid;
            break-after: avoid;
            page-break-after: avoid;
          }
        }
      `}</style>

      {/* ─── Institutional Header (Pure Black Ink) ───────────────────────── */}
      <header className="avoid-break border-b-2 border-black pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/CRMC%20LOGO.png"
              alt="CRMC Seal"
              className="h-11 w-11 object-contain shrink-0"
            />
            <div className="space-y-0.5">
              <h1 className="text-base font-extrabold tracking-tight text-black uppercase">
                CRMC-AIMS
              </h1>
              <div className="text-[10.5px] font-semibold text-black">
                Cebu Roosevelt Memorial Colleges, Inc. · Asset &amp; Inventory Management System
              </div>
              <div className="text-[9px] font-medium text-black">
                Upper Pandan, Bogo City, Cebu, Philippines · Property &amp; Supply Custody Division
              </div>
            </div>
          </div>
          <div suppressHydrationWarning className="rounded-xs border border-black bg-white px-2.5 py-1 text-right font-mono text-[9px] space-y-0.5 shrink-0 text-black">
            <div>
              <span>Generated:</span>{" "}
              <span className="font-bold">{formattedDate}, {formattedTime}</span>
            </div>
            <div>
              <span>Doc ID:</span>{" "}
              <span className="font-bold">
                AST-DOS-{asset.assetCode || asset.id}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-black pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-black tracking-tight uppercase">
              Individual Asset Dossier &amp; Equipment Audit
            </h2>
            <div className="text-[9.5px] text-black mt-0.5 font-mono">
              Asset Tag: <span className="font-bold">{asset.assetCode || asset.id}</span> · Serial: {asset.serialNumber || "N/A"}
            </div>
          </div>
          <span className="text-[9px] font-bold font-mono tracking-wider text-black uppercase border border-black px-2 py-0.5 rounded-xs">
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
              deltaType: "neutral",
              subtext: "Current readiness",
            },
            {
              label: "Lifetime Repairs",
              value: maintenanceHistory.length.toString(),
              delta: canViewCosts && totalRepairSpend > 0 ? `₱${totalRepairSpend.toLocaleString()}` : "No Repair Cost",
              deltaType: "neutral",
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
      {canViewCosts && (
        <section className="avoid-break rounded-xs border border-black px-3 py-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-wide">
              Repair Spend vs Acquisition Value
            </span>
            <span className="font-mono font-bold">
              {purchasePrice > 0
                ? `₱${totalRepairSpend.toLocaleString()} / ₱${purchasePrice.toLocaleString()}`
                : `₱${totalRepairSpend.toLocaleString()} / —`}
            </span>
          </div>
          <div className="mt-0.5 text-[9px] text-black">
            {repairVsAcquisitionPct != null
              ? `${repairVsAcquisitionPct.toFixed(1)}% of acquisition value has been spent on repairs.`
              : "Acquisition value is not available; percentage comparison is unavailable."}
          </div>
        </section>
      )}

      {/* ─── Section 1: Specifications & Identification ─────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-black bg-white overflow-hidden w-full">
          <div className="border-b border-black bg-white px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-black flex items-center justify-between">
            <span>1. Technical Specifications &amp; Identification</span>
            <span className="text-[9.5px] text-black font-mono">
              SKU / Tag: {asset.assetCode || asset.id}
            </span>
          </div>
          <div className="p-3 grid grid-cols-12 gap-2.5 text-[10.5px] text-black">
            <div className="col-span-4 space-y-1">
              <div className="text-[9.5px] font-bold uppercase text-black">Equipment Name</div>
              <div className="font-bold text-black text-[11.5px]">{asset.name}</div>
            </div>
            <div className="col-span-4 space-y-1">
              <div className="text-[9.5px] font-bold uppercase text-black">Category / Classification</div>
              <div className="font-semibold text-black capitalize">{asset.category || "General Equipment"}</div>
            </div>
            <div className="col-span-4 space-y-1">
              <div className="text-[9.5px] font-bold uppercase text-black">Assignment Type</div>
              <div className="font-semibold text-black capitalize">{asset.assignmentType || "Standard"}</div>
            </div>

            <div className="col-span-4 space-y-1 border-t border-black/30 pt-1.5">
              <div className="text-[9.5px] font-bold uppercase text-black">Serial Number</div>
              <div className="font-mono font-bold text-black">{asset.serialNumber || "UNRECORDED"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-black/30 pt-1.5">
              <div className="text-[9.5px] font-bold uppercase text-black">Purchase Date</div>
              <div className="font-mono text-black">{asset.purchaseDate || "Standard Procurement"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-black/30 pt-1.5">
              <div className="text-[9.5px] font-bold uppercase text-black">Current Custodian / Holder</div>
              <div className="font-mono text-black">{asset.currentHolder || "Unassigned / Department Custody"}</div>
            </div>

            <div className="col-span-4 space-y-1 border-t border-black/30 pt-1.5">
              <div className="text-[9.5px] font-bold uppercase text-black">Assigned Department</div>
              <div className="font-semibold text-black">{asset.department || "Institutional Pool"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-black/30 pt-1.5">
              <div className="text-[9.5px] font-bold uppercase text-black">Physical Location</div>
              <div className="text-black">{asset.location || "Central Storage Vault"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-black/30 pt-1.5">
              <div className="text-[9.5px] font-bold uppercase text-black">Operational Status</div>
              <div className="flex items-center gap-1.5">
                <PrintStatusBadge status={asset.status || "active"} />
              </div>
            </div>

            {asset.notes && (
              <div className="col-span-12 border-t border-black/30 pt-1.5">
                <div className="text-[9.5px] font-bold uppercase text-black mb-0.5">Asset Notes / Remarks</div>
                <div className="text-[10px] text-black bg-white border border-black p-2 rounded-xs">
                  {asset.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Section 2: Maintenance & Repair Work Orders Log ────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-black bg-white overflow-hidden w-full">
          <div className="border-b border-black bg-white px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-black flex items-center justify-between">
            <span>2. Maintenance &amp; Repair Work Orders Log</span>
            <span className="text-[9.5px] text-black font-mono">
              {maintenanceHistory.length} total work orders
            </span>
          </div>
          <table className="w-full border-collapse text-[10px] table-auto">
            <thead>
              <tr className="border-b border-black bg-white text-[9.5px] font-bold uppercase tracking-wider text-black">
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24 border-r border-black/30">Log Date</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-20 border-r border-black/30">Status</th>
                <th className="py-1.5 px-3 text-left border-r border-black/30">Issue / Work / Parts</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-32 border-r border-black/30">Technician</th>
                {canViewCosts && <th className="py-1.5 px-3 text-right whitespace-nowrap">Service Cost</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/30 text-[10px] text-black">
              {maintenanceHistory.map((entry, idx) => {
                const issue = entry.issue || entry.description;
                const partsSummary =
                  entry.parts && entry.parts.length > 0
                    ? entry.parts
                        .map((p) =>
                          canViewCosts && p.cost != null && p.cost !== ""
                            ? `${p.name} (₱${Number(p.cost).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                            : p.name
                        )
                        .join("; ")
                    : null;
                const statusLabel =
                  entry.status === "resolved"
                    ? "Resolved"
                    : entry.status === "open"
                      ? "Open"
                      : entry.status || (entry.resolutionDate ? "Resolved" : "Open");

                return (
                  <tr key={entry.id || idx}>
                    <td className="py-1.5 px-3 font-mono text-black whitespace-nowrap border-r border-black/30 align-top">
                      <div>{entry.date || "Unrecorded"}</div>
                      {entry.logCode && (
                        <div className="text-[8.5px] font-semibold mt-0.5">{entry.logCode}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-black capitalize whitespace-nowrap border-r border-black/30 align-top">
                      <div className="font-bold uppercase text-[8.5px]">{statusLabel}</div>
                      {entry.type && (
                        <div className="text-[8.5px] mt-0.5">{entry.type.replace(/_/g, " ")}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-3 font-medium border-r border-black/30 align-top space-y-0.5">
                      {issue ? (
                        <div>
                          <span className="font-bold uppercase text-[8px] tracking-wide">Issue: </span>
                          {issue}
                        </div>
                      ) : (
                        <div className="italic text-black/70">No issue notes recorded</div>
                      )}
                      {entry.workNotes ? (
                        <div>
                          <span className="font-bold uppercase text-[8px] tracking-wide">Work: </span>
                          {entry.workNotes}
                        </div>
                      ) : null}
                      {partsSummary ? (
                        <div>
                          <span className="font-bold uppercase text-[8px] tracking-wide">Parts: </span>
                          {partsSummary}
                        </div>
                      ) : null}
                      {entry.resolutionNotes ? (
                        <div>
                          <span className="font-bold uppercase text-[8px] tracking-wide">Resolution: </span>
                          {entry.resolutionNotes}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-1.5 px-3 text-black whitespace-nowrap border-r border-black/30 align-top">
                      {entry.technician || "Internal Staff"}
                    </td>
                    {canViewCosts && (
                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-black whitespace-nowrap align-top">
                        {entry.cost ? `₱${entry.cost.toLocaleString()}` : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
              {maintenanceHistory.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 5 : 4} className="py-2.5 text-center text-black italic text-[10px]">
                    No maintenance issues recorded. Equipment has operated with zero defect tickets.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Institutional Footer ───────────────────────────────────────── */}
      <footer className="avoid-break pt-2 border-t border-black">
        <div className="flex items-center justify-between text-[9px] text-black font-mono">
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
