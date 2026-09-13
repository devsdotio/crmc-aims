"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Printer,
  Copy,
  Check,
  Wrench,
  History,
  Receipt,
  CheckCircle2,
  AlertCircle,
  MapPin,
  User,
  Calendar,
  Layers,
  DollarSign,
  QrCode,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { useAssetDrilldownReportQuery } from "@/features/reports/client/use-reports";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/providers/loading-context";
import { getCategoryStyle } from "@/constants/categories";
import { cn } from "@/lib/utils";

interface ItemLifecycleSheetProps {
  assetId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemLifecycleSheet({
  assetId,
  isOpen,
  onClose,
}: ItemLifecycleSheetProps) {
  const [activeTab, setActiveTab] = useState<
    "maintenance" | "custody" | "purchase"
  >("maintenance");
  const [copied, setCopied] = useState(false);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [cachedAssetId, setCachedAssetId] = useState<string | null>(assetId);

  useEffect(() => {
    if (isOpen && assetId) {
      setCachedAssetId(assetId);
      setIsRendered(true);
      setIsClosing(false);
    } else if (!isOpen && isRendered) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, assetId, isRendered]);

  const handleInitiateClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [isClosing, onClose]);

  // Close on Escape key press with smooth exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isClosing) {
        handleInitiateClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isClosing, handleInitiateClose]);

  const effectiveAssetId = isOpen ? assetId : cachedAssetId;
  const { data, isLoading } = useAssetDrilldownReportQuery(
    effectiveAssetId || "",
  );

  if (!isRendered || !effectiveAssetId) {
    return null;
  }

  const asset = data?.asset;
  const purchaseInfo = data?.purchaseInfo;
  const maintenanceHistory = data?.maintenanceHistory || [];
  const custodyHistory = data?.custodyHistory || [];
  const tco = data?.tco;
  const canViewCosts = data?.canViewCosts ?? true;
  const categoryMeta = asset ? getCategoryStyle(asset.category) : null;

  const handleCopyCode = () => {
    if (!asset?.assetCode) return;
    navigator.clipboard.writeText(asset.assetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getConditionColor = (condition: string) => {
    const lower = condition.toLowerCase();
    if (
      lower.includes("good") ||
      lower.includes("operational") ||
      lower.includes("new")
    ) {
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    }
    if (
      lower.includes("fair") ||
      lower.includes("degraded") ||
      lower.includes("worn")
    ) {
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    }
    return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lifecycle-sheet-title"
    >
      {/* ── Backdrop with Blur & Smooth Transition ─────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200",
          isClosing
            ? "opacity-0"
            : "animate-in fade-in duration-200 opacity-100",
        )}
        onClick={handleInitiateClose}
        aria-hidden="true"
      />

      {/* ── Slide-Over Panel with GPU Acceleration ────────────────────── */}
      <div
        className={cn(
          "relative z-10 w-full max-w-2xl h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden transform-gpu transition-transform duration-200 ease-in-out will-change-transform",
          isClosing
            ? "translate-x-full"
            : "animate-in slide-in-from-right duration-200 translate-x-0",
        )}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-border bg-card shrink-0 space-y-2.5">
          {/* Top Row: Context & Badges (Left) + Print Slip Action (Right) */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
                Asset Lifecycle Record
              </span>

              {asset ? (
                <>
                  {categoryMeta && (
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs shrink-0",
                        categoryMeta.bg,
                        categoryMeta.text,
                      )}
                    >
                      {categoryMeta.label}
                    </span>
                  )}

                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border capitalize shadow-2xs shrink-0",
                      asset.status === "active"
                        ? "bg-status-active-bg/25 text-status-active-text border-status-active-bg/40"
                        : asset.status === "needs_repair"
                          ? "bg-status-repair-bg/25 text-status-repair-text border-status-repair-bg/50"
                          : "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/40",
                    )}
                  >
                    {asset.status === "active" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-active-text" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}
                    <span>{asset.status.replace(/_/g, " ")}</span>
                  </span>
                </>
              ) : (
                <>
                  <div className="h-5 w-16 bg-border/40 rounded-full animate-pulse" />
                  <div className="h-5 w-20 bg-border/40 rounded-full animate-pulse" />
                </>
              )}
            </div>

            {/* Relocated Print Slip Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={!asset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-bg-subtle px-3 py-1.5 text-xs font-bold text-text shadow-2xs hover:bg-card hover:border-accent hover:text-accent transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:pointer-events-none"
              title="Print Asset Lifecycle Slip"
            >
              <Printer className="h-3.5 w-3.5 text-accent" />
              <span>Print Slip</span>
            </button>
          </div>

          {/* Row 2: Asset Name Heading & Identifiers */}
          <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
            {asset ? (
              <>
                <h2
                  id="lifecycle-sheet-title"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-text truncate"
                >
                  {asset.name}
                </h2>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-bg-subtle border border-border text-text hover:border-accent hover:text-accent transition-colors cursor-pointer shadow-2xs shrink-0"
                  title="Click to copy Asset Code"
                >
                  <QrCode className="h-3.5 w-3.5 text-accent" />
                  <span>{asset.assetCode}</span>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-text-secondary" />
                  )}
                </button>

                {asset.serialNumber && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-subtle border border-border font-mono text-xs text-text-secondary shrink-0">
                    SN:{" "}
                    <strong className="text-text font-bold">
                      {asset.serialNumber}
                    </strong>
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="h-7 w-56 bg-border/40 rounded-md animate-pulse" />
                <div className="h-6 w-28 bg-border/40 rounded-md animate-pulse" />
                <div className="h-6 w-32 bg-border/40 rounded-md animate-pulse" />
              </>
            )}
          </div>
        </div>

        {/* ── Body: Scoped Scroll ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          {!isLoading && !asset ? (
            <div className="flex flex-col items-center justify-center p-12 sm:p-16 gap-3 rounded-2xl border border-border/80 bg-bg-subtle text-center min-h-[340px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-xs">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div className="text-base font-bold text-text mt-1">
                Asset Record Not Found
              </div>
              <p className="text-xs text-text-secondary max-w-sm leading-relaxed">
                The requested asset record could not be loaded or may not exist
                in the database.
              </p>
            </div>
          ) : (
            <>
              {/* ── Asset Identity & Location Banner (Static Frame) ───── */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row gap-4 sm:items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  {/* QR Code Container */}
                  {asset ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-accent/30 bg-white p-2 shrink-0 shadow-xs hover:border-accent transition-colors">
                      <QRCodeSVG
                        value={
                          typeof window !== "undefined"
                            ? window.location.href
                            : asset.assetCode
                        }
                        size={68}
                        level="M"
                      />
                      <span className="mt-1 font-mono text-[8px] font-bold text-text-secondary">
                        {asset.assetCode}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-border/40 bg-bg-subtle w-[84px] h-[84px] shrink-0 animate-pulse">
                      <QrCode className="h-7 w-7 text-text-secondary/25" />
                    </div>
                  )}

                  {/* Highlights Grid */}
                  <div className="space-y-2 text-xs">
                    {asset ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/15 text-blue-600">
                            <MapPin className="h-3 w-3" />
                          </div>
                          <span className="font-bold text-text">
                            {asset.location || "Unassigned Warehouse"}
                          </span>
                          {asset.department && (
                            <span className="text-text-secondary text-[11px]">
                              ({asset.department})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-600">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="text-text-secondary">
                            Custodian:
                          </span>
                          <strong className="text-text font-bold">
                            {asset.currentHolder || "In Storage / Unallocated"}
                          </strong>
                        </div>

                        {asset.purchaseDate && (
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-500/15 text-violet-600">
                              <Calendar className="h-3 w-3" />
                            </div>
                            <span className="text-text-secondary">
                              Acquired:
                            </span>
                            <span className="font-mono font-semibold text-text">
                              {asset.purchaseDate}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="h-4 w-40 bg-border/40 rounded animate-pulse" />
                        <div className="h-4 w-48 bg-border/40 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-border/40 rounded animate-pulse" />
                      </>
                    )}
                  </div>
                </div>

                {/* Vendor / Supplier Highlight */}
                {asset ? (
                  asset.supplierName && (
                    <div className="sm:text-right text-xs pt-3 sm:pt-0 border-t sm:border-t-0 border-border/70">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">
                        Procured From
                      </span>
                      <div className="font-bold text-text mt-0.5">
                        {asset.supplierName}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="sm:text-right space-y-1">
                    <div className="h-3 w-16 bg-border/40 rounded animate-pulse sm:ml-auto" />
                    <div className="h-4 w-24 bg-border/40 rounded animate-pulse sm:ml-auto" />
                  </div>
                )}
              </div>

              {/* ── Total Cost of Ownership Strip (Static Frame) ───────── */}
              <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-4 shadow-xs flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-xs">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-text">
                      Total Cost of Ownership (TCO)
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      Acquisition baseline + lifetime repairs &amp; parts
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {tco ? (
                    <>
                      <div className="font-mono text-lg sm:text-xl font-black text-accent tracking-tight">
                        {canViewCosts
                          ? `₱${tco.totalCostOfOwnership.toLocaleString()}`
                          : "Restricted"}
                      </div>
                      {canViewCosts && (
                        <div className="text-[10px] font-mono text-text-secondary">
                          {maintenanceHistory.length} incident
                          {maintenanceHistory.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-6 w-24 bg-accent/20 rounded animate-pulse ml-auto" />
                  )}
                </div>
              </div>

              {/* ── 4-Card TCO Metric Breakdown (Static Frame) ─────────── */}
              <StatCardGrid className="grid-cols-2 lg:grid-cols-4 gap-2.5 !mt-0 shrink-0">
                <StatCard
                  title="Acquisition"
                  sublabel="PURCHASE LOT"
                  value={
                    canViewCosts && tco
                      ? `₱${tco.purchaseCost.toLocaleString()}`
                      : canViewCosts
                        ? "…"
                        : "Restricted"
                  }
                  subtitle={
                    purchaseInfo?.purchasedOn
                      ? `${purchaseInfo.purchasedOn}`
                      : "Baseline"
                  }
                  icon={Receipt}
                  tone="blue"
                  toneValue={true}
                  loading={!tco}
                />

                <StatCard
                  title="Repairs"
                  sublabel="WORK ORDERS"
                  value={
                    canViewCosts && tco
                      ? `₱${tco.maintenanceCost.toLocaleString()}`
                      : canViewCosts
                        ? "…"
                        : "Restricted"
                  }
                  subtitle={`${maintenanceHistory.length} recorded repairs`}
                  icon={Wrench}
                  tone="amber"
                  toneValue={true}
                  loading={!tco}
                />

                <StatCard
                  title="Parts / Supplies"
                  sublabel="DRAW DEDUCTIONS"
                  value={
                    canViewCosts && tco
                      ? `₱${tco.consumablesCost.toLocaleString()}`
                      : canViewCosts
                        ? "…"
                        : "Restricted"
                  }
                  subtitle="Stock issues"
                  icon={Layers}
                  tone="indigo"
                  toneValue={true}
                  loading={!tco}
                />

                <StatCard
                  title="Lifetime Spend"
                  sublabel="CUMULATIVE TCO"
                  value={
                    canViewCosts && tco
                      ? `₱${tco.totalCostOfOwnership.toLocaleString()}`
                      : canViewCosts
                        ? "…"
                        : "Restricted"
                  }
                  subtitle="Total TCO"
                  icon={DollarSign}
                  tone="accent"
                  toneValue={true}
                  loading={!tco}
                />
              </StatCardGrid>

              {/* ── Lifecycle Timeline Tabs (Static Frame) ─────────────── */}
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs flex-1 flex flex-col min-h-[380px]">
                {/* Tab Navigation */}
                <div className="flex border-b border-border bg-bg-subtle/60 px-3 overflow-x-auto no-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("maintenance")}
                    className={cn(
                      "flex items-center gap-1.5 py-3 px-3 border-b-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                      activeTab === "maintenance"
                        ? "border-accent text-accent font-bold"
                        : "border-transparent text-text-secondary hover:text-text hover:border-border",
                    )}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>
                      Maintenance &amp; Repairs{" "}
                      {asset ? `(${maintenanceHistory.length})` : "(…)"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("custody")}
                    className={cn(
                      "flex items-center gap-1.5 py-3 px-3 border-b-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                      activeTab === "custody"
                        ? "border-accent text-accent font-bold"
                        : "border-transparent text-text-secondary hover:text-text hover:border-border",
                    )}
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>
                      Custody &amp; Circulation{" "}
                      {asset ? `(${custodyHistory.length})` : "(…)"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("purchase")}
                    className={cn(
                      "flex items-center gap-1.5 py-3 px-3 border-b-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                      activeTab === "purchase"
                        ? "border-accent text-accent font-bold"
                        : "border-transparent text-text-secondary hover:text-text hover:border-border",
                    )}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Procurement PO</span>
                  </button>
                </div>

                {/* Tab Content Panels */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col min-h-0">
                  {!asset ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12">
                      <LoadingState
                        variant="card"
                        icon="layers"
                        message="Retrieving equipment history..."
                        subtitle="Loading recorded maintenance incidents, custody circulation, and procurement PO data"
                      />
                    </div>
                  ) : (
                    <>
                      {/* 1. Maintenance Tab */}
                      {activeTab === "maintenance" && (
                        <div className="animate-in fade-in-50 duration-150 flex-1 flex flex-col">
                          {maintenanceHistory.length === 0 ? (
                            <div className="flex-1 min-h-[260px] text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2.5 py-8">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs">
                                <CheckCircle2 className="h-6 w-6" />
                              </div>
                              <span className="text-sm font-bold text-text">
                                Zero Maintenance Incidents
                              </span>
                              <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
                                This equipment has operated without any reported
                                breakdowns or repair logs.
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border/60">
                              {maintenanceHistory.map((m) => (
                                <div
                                  key={m.id}
                                  className="py-3.5 first:pt-0 last:pb-0 space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-2 py-0.5 rounded border border-border/80">
                                        {m.logCode}
                                      </span>

                                      {/* Resolved status badge */}
                                      <span
                                        className={cn(
                                          "rounded-full px-2 py-0.5 text-[10px] font-bold border flex items-center gap-1 shadow-2xs",
                                          m.isResolved
                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
                                        )}
                                      >
                                        {m.isResolved ? (
                                          <CheckCircle2 className="h-3 w-3" />
                                        ) : (
                                          <AlertCircle className="h-3 w-3" />
                                        )}
                                        <span>
                                          {m.isResolved
                                            ? "Resolved"
                                            : "Active Work Order"}
                                        </span>
                                      </span>

                                      {/* Condition tag */}
                                      <span
                                        className={cn(
                                          "rounded-full px-2 py-0.5 text-[10px] font-semibold border capitalize",
                                          getConditionColor(m.condition),
                                        )}
                                      >
                                        {m.condition.replace(/_/g, " ")}
                                      </span>
                                    </div>

                                    {canViewCosts && m.repairCost != null && (
                                      <span className="font-mono font-bold text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                                        ₱{m.repairCost.toLocaleString()}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs text-text leading-relaxed">
                                    {m.notes ||
                                      "No additional log notes recorded."}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-text-secondary font-mono">
                                    <span>
                                      Logged:{" "}
                                      <strong className="text-text">
                                        {m.dateLogged}
                                      </strong>{" "}
                                      by {m.loggedByName}
                                    </span>
                                    {m.resolutionDate && (
                                      <span className="text-emerald-600 font-semibold">
                                        Resolved: {m.resolutionDate} by{" "}
                                        {m.resolvedByName || "Technician"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Custody Tab */}
                      {activeTab === "custody" && (
                        <div className="animate-in fade-in-50 duration-150 flex-1 flex flex-col">
                          {custodyHistory.length === 0 ? (
                            <div className="flex-1 min-h-[260px] text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2.5 py-8">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-subtle text-text-secondary border border-border/80 shadow-xs">
                                <History className="h-6 w-6" />
                              </div>
                              <span className="text-sm font-bold text-text">
                                No External Circulations
                              </span>
                              <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
                                This equipment has remained in assigned storage
                                without registered borrow requests.
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border/60">
                              {custodyHistory.map((c) => (
                                <div
                                  key={c.id}
                                  className="py-3.5 first:pt-0 last:pb-0 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-2 py-0.5 rounded border border-border/80">
                                        {c.logCode}
                                      </span>
                                      <span
                                        className={cn(
                                          "rounded-full px-2 py-0.5 text-[10px] font-bold border capitalize",
                                          c.status === "returned"
                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                            : c.status === "overdue"
                                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                              : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
                                        )}
                                      >
                                        {c.status}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-text-secondary font-mono">
                                      Released: {c.borrowedAt.split("T")[0]}
                                    </span>
                                  </div>

                                  <div className="text-xs text-text">
                                    <strong className="text-text">
                                      {c.borrowerName}
                                    </strong>{" "}
                                    <span className="text-text-secondary">
                                      ({c.department})
                                    </span>
                                  </div>

                                  {c.returnedAt ? (
                                    <div className="text-[11px] text-emerald-600 font-semibold font-mono flex items-center gap-1">
                                      <Check className="h-3 w-3" />
                                      <span>
                                        Returned to inventory on{" "}
                                        {c.returnedAt.split("T")[0]}
                                      </span>
                                    </div>
                                  ) : c.expectedReturnDate ? (
                                    <div className="text-[11px] text-amber-600 font-mono">
                                      Due for return: {c.expectedReturnDate}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Procurement PO Tab */}
                      {activeTab === "purchase" && (
                        <div className="flex-1 min-h-[260px] flex flex-col justify-center space-y-2.5 text-xs animate-in fade-in-50 duration-150 py-2">
                          <div className="flex justify-between items-center border-b border-border/70 py-2">
                            <span className="text-text-secondary">
                              Purchase Order / Lot
                            </span>
                            <span className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                              {purchaseInfo?.lotCode || "—"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center border-b border-border/70 py-2">
                            <span className="text-text-secondary">
                              Procured On
                            </span>
                            <span className="font-mono font-semibold text-text">
                              {purchaseInfo?.purchasedOn ||
                                asset.purchaseDate ||
                                "—"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center border-b border-border/70 py-2">
                            <span className="text-text-secondary">
                              Authorized Vendor
                            </span>
                            <span className="font-bold text-text">
                              {purchaseInfo?.supplierName ||
                                asset.supplierName ||
                                "—"}
                            </span>
                          </div>

                          {canViewCosts && tco && (
                            <div className="flex justify-between items-center border-b border-border/70 py-2">
                              <span className="text-text-secondary">
                                Recorded Acquisition Cost
                              </span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                {tco.purchaseCost
                                  ? `₱${tco.purchaseCost.toLocaleString()}`
                                  : "—"}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center py-2">
                            <span className="text-text-secondary">
                              PO Reference / Invoice
                            </span>
                            <span className="font-mono text-text">
                              {purchaseInfo?.reference || "—"}
                            </span>
                          </div>

                          {purchaseInfo?.receiptUrl && (
                            <div className="pt-2">
                              <a
                                href={purchaseInfo.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-accent hover:underline font-semibold"
                              >
                                <Receipt className="h-3.5 w-3.5" />
                                <span>View Digital Procurement Receipt</span>
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>


      </div>
    </div>
  );
}
