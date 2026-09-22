"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Wrench,
  History,
  Receipt,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Building,
  User,
  Calendar,
  Layers,
  DollarSign,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { useAssetDrilldownReportQuery } from "@/features/reports/client/use-reports";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { IndividualAssetPrintableReport } from "@/components/reports/print/individual/IndividualAssetPrintableReport";
import { mapMaintenanceHistoryToPrintEntries } from "@/components/reports/print/individual/map-maintenance-print-entries";

export default function AssetDrilldownReportPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = use(params);
  const [activeTab, setActiveTab] = useState<"maintenance" | "custody" | "purchase">("maintenance");
  const { data, isLoading } = useAssetDrilldownReportQuery(assetId);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border/80 bg-card p-8">
        <div className="text-xs font-semibold text-text-secondary animate-pulse">
          Loading asset lifecycle record…
        </div>
      </div>
    );
  }

  if (!data || !data.asset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3 rounded-2xl border border-border/80 bg-card">
        <div className="text-sm font-bold text-text">Asset not found</div>
        <Link
          href="/reports/assets"
          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Asset Register</span>
        </Link>
      </div>
    );
  }

  const { asset, purchaseInfo, maintenanceHistory, custodyHistory, tco, canViewCosts } = data;
  const repairVsAcquisitionPct =
    tco.purchaseCost > 0 ? (tco.maintenanceCost / tco.purchaseCost) * 100 : null;

  return (
    <>
    <div className="flex flex-col gap-3 w-full print:hidden">
      {/* ── Top Back Nav & Print Button ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/reports/assets"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Asset Register</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-bold text-text shadow-2xs hover:bg-bg-subtle transition-all cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5 text-accent" />
          <span>Print Lifecycle Slip</span>
        </button>
      </div>

      {/* ── Asset Header Card with QR ────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* QR Code */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white p-2.5 shadow-2xs shrink-0">
            <QRCodeSVG
              value={typeof window !== "undefined" ? window.location.href : asset.assetCode}
              size={90}
              level="M"
            />
            <span className="mt-1 font-mono text-[9px] font-bold text-text-secondary">
              {asset.assetCode}
            </span>
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-text">
                {asset.assetCode}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                  asset.status === "active"
                    ? "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                    : asset.status === "needs_repair"
                    ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {asset.status === "active" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                <span className="capitalize">{asset.status.replace(/_/g, " ")}</span>
              </span>
              <span className="rounded-full bg-bg-subtle border border-border/60 px-2 py-0.5 text-[10px] font-bold text-text capitalize">
                {rowCategoryFormat(asset.category)}
              </span>
            </div>

            <h1 className="mt-1 text-lg sm:text-xl font-bold text-text">{asset.name}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-text-secondary" />
                <span className="font-medium text-text">{asset.location}</span>
              </div>
              {asset.department && (
                <div className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-text-secondary" />
                  <span>{asset.department}</span>
                </div>
              )}
              {asset.currentHolder && (
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-text-secondary" />
                  <span>Holder: <strong className="text-text">{asset.currentHolder}</strong></span>
                </div>
              )}
              {asset.purchaseDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                  <span>Acquired: <span className="font-mono">{asset.purchaseDate}</span></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status tags */}
        <div className="text-right text-xs text-text-secondary border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto">
          {asset.serialNumber && (
            <div>
              Serial No: <span className="font-mono font-bold text-text">{asset.serialNumber}</span>
            </div>
          )}
          {asset.supplierName && (
            <div className="mt-1">
              Supplier: <span className="font-semibold text-text">{asset.supplierName}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── TCO Stat Cards Grid ──────────────────────────────────────── */}
      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Acquisition Cost"
          sublabel="TCO // INITIAL PURCHASE"
          value={canViewCosts ? `₱${tco.purchaseCost.toLocaleString()}` : "Restricted"}
          subtitle={purchaseInfo?.purchasedOn ? `Recorded ${purchaseInfo.purchasedOn}` : "Purchase lot baseline"}
          icon={Receipt}
          tone="blue"
          toneValue={true}
        />

        <StatCard
          title="Maintenance Cost"
          sublabel="TCO // REPAIR EXPENSE"
          value={canViewCosts ? `₱${tco.maintenanceCost.toLocaleString()}` : "Restricted"}
          subtitle={`${maintenanceHistory.length} recorded repairs`}
          icon={Wrench}
          tone="amber"
          toneValue={true}
        />

        <StatCard
          title="Parts / Consumables"
          sublabel="TCO // DIRECT DISPATCH"
          value={canViewCosts ? `₱${tco.consumablesCost.toLocaleString()}` : "Restricted"}
          subtitle="Dedicated supply draws"
          icon={Layers}
          tone="indigo"
          toneValue={true}
        />

        <StatCard
          title="Total Cost of Ownership"
          sublabel="TCO // LIFETIME SPEND"
          value={canViewCosts ? `₱${tco.totalCostOfOwnership.toLocaleString()}` : "Restricted"}
          subtitle="Lifetime equipment expenditure"
          icon={DollarSign}
          tone="accent"
          toneValue={true}
        />
      </StatCardGrid>
      {canViewCosts && (
        <div className="rounded-xl border border-border/70 bg-bg-subtle/40 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-text">
              Repair Spend vs Acquisition Value
            </span>
            <span className="font-mono font-bold text-text">
              ₱{tco.maintenanceCost.toLocaleString()} / ₱{tco.purchaseCost.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-text-secondary">
            {repairVsAcquisitionPct != null
              ? `${repairVsAcquisitionPct.toFixed(1)}% of acquisition value has been spent on repairs.`
              : "Acquisition cost is unavailable, so percentage comparison cannot be computed."}
          </div>
        </div>
      )}

      {/* ── Lifecycle Timeline Tabs ──────────────────────────────────── */}
      <div className="flex flex-col rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-border bg-bg-subtle/50 px-4 md:px-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("maintenance")}
            className={cn(
              "flex items-center gap-2 py-3 px-2 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer",
              activeTab === "maintenance"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-text-secondary hover:text-text hover:border-border"
            )}
          >
            <Wrench className="h-4 w-4" />
            <span>Maintenance &amp; Repairs ({maintenanceHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("custody")}
            className={cn(
              "flex items-center gap-2 py-3 px-2 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer",
              activeTab === "custody"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-text-secondary hover:text-text hover:border-border"
            )}
          >
            <History className="h-4 w-4" />
            <span>Borrow &amp; Custody ({custodyHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("purchase")}
            className={cn(
              "flex items-center gap-2 py-3 px-2 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer",
              activeTab === "purchase"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-text-secondary hover:text-text hover:border-border"
            )}
          >
            <Receipt className="h-4 w-4" />
            <span>Purchase &amp; Receipt</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === "maintenance" && (
            <div>
              {maintenanceHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-secondary">
                  No maintenance or repair work orders recorded for this asset.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {maintenanceHistory.map((m) => (
                    <div key={m.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-text">
                            {m.logCode}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              m.isResolved
                                ? "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                                : "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                            }`}
                          >
                            {m.isResolved ? "Resolved" : "Active Issue"}
                          </span>
                          <span className="text-xs text-text-secondary capitalize">
                            Condition: {m.condition}
                          </span>
                        </div>
                        {canViewCosts && m.repairCost != null && (
                          <span className="font-mono font-bold text-xs text-text">
                            Cost: ₱{m.repairCost.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 text-xs text-text leading-relaxed space-y-1.5">
                        <p>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary mr-1">
                            Issue
                          </span>
                          {m.notes || "No log notes recorded."}
                        </p>
                        {m.workNotes ? (
                          <p>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mr-1">
                              Work
                            </span>
                            {m.workNotes}
                          </p>
                        ) : null}
                        {m.repairParts && m.repairParts.length > 0 ? (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-400 mb-0.5">
                              Parts ({m.repairParts.length})
                            </div>
                            <ul className="space-y-0.5">
                              {m.repairParts.map((part, idx) => (
                                <li
                                  key={`${m.id}-part-${idx}`}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span>{part.name}</span>
                                  {canViewCosts && part.cost != null && part.cost !== "" ? (
                                    <span className="font-mono text-[11px] text-text-secondary">
                                      ₱{Number(part.cost).toLocaleString("en-PH", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {m.resolutionNotes ? (
                          <p>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mr-1">
                              Resolution
                            </span>
                            {m.resolutionNotes}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-2 flex items-center gap-4 text-[11px] text-text-secondary font-mono">
                        <span>Logged: {m.dateLogged} by {m.loggedByName}</span>
                        {m.resolutionDate && (
                          <span>Resolved: {m.resolutionDate} by {m.resolvedByName || "Technician"}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "custody" && (
            <div>
              {custodyHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-secondary">
                  No borrow or department custody transfers recorded for this asset.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {custodyHistory.map((c) => (
                    <div key={c.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-text">
                            {c.logCode}
                          </span>
                          <span className="rounded-full bg-bg-subtle border border-border/60 px-2 py-0.5 text-[10px] font-bold text-text capitalize">
                            {c.status}
                          </span>
                        </div>
                        <span className="text-xs text-text-secondary font-mono">
                          Released: {c.borrowedAt.split("T")[0]}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-text">
                        <span className="font-bold">{c.borrowerName}</span> ({c.department})
                      </div>
                      {c.returnedAt && (
                        <div className="mt-1 text-[11px] text-emerald-600 font-semibold font-mono">
                          Returned on {c.returnedAt.split("T")[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "purchase" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <h3 className="font-bold text-text uppercase tracking-wider text-[11px]">
                  Procurement Information
                </h3>
                <div className="flex justify-between border-b border-border/60 py-2">
                  <span className="text-text-secondary">PO / Lot Code:</span>
                  <span className="font-mono font-bold text-text">
                    {purchaseInfo?.lotCode || "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 py-2">
                  <span className="text-text-secondary">Purchased On:</span>
                  <span className="font-mono text-text">
                    {purchaseInfo?.purchasedOn || asset.purchaseDate || "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 py-2">
                  <span className="text-text-secondary">Supplier:</span>
                  <span className="font-semibold text-text">
                    {purchaseInfo?.supplierName || asset.supplierName || "—"}
                  </span>
                </div>
                {canViewCosts && (
                  <div className="flex justify-between border-b border-border/60 py-2">
                    <span className="text-text-secondary">Acquisition Cost:</span>
                    <span className="font-mono font-bold text-text">
                      {tco.purchaseCost ? `₱${tco.purchaseCost.toLocaleString()}` : "—"}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-text uppercase tracking-wider text-[11px]">
                  Asset Specifications &amp; System Metadata
                </h3>
                <div className="flex justify-between border-b border-border/60 py-2">
                  <span className="text-text-secondary">Serial Number:</span>
                  <span className="font-mono font-semibold text-text">{asset.serialNumber || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 py-2">
                  <span className="text-text-secondary">Assignment Type:</span>
                  <span className="capitalize font-semibold text-text">{asset.assignmentType}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 py-2">
                  <span className="text-text-secondary">Created At:</span>
                  <span className="font-mono text-text">{asset.createdAt.split("T")[0]}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 py-2">
                  <span className="text-text-secondary">Last Updated:</span>
                  <span className="font-mono text-text">{asset.updatedAt.split("T")[0]}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="hidden print:block print:w-full">
      <IndividualAssetPrintableReport
        asset={asset}
        maintenanceHistory={mapMaintenanceHistoryToPrintEntries(maintenanceHistory)}
        canViewCosts={canViewCosts}
      />
    </div>
    </>
  );
}

function rowCategoryFormat(cat: string): string {
  return cat.replace(/_/g, " ");
}
