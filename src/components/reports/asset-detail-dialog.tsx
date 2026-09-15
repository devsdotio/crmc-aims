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
  PieChart as PieChartIcon,
  TrendingUp,
  X,
  Package,
  ExternalLink,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { useAssetDrilldownReportQuery } from "@/features/reports/client/use-reports";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/providers/loading-context";
import { getCategoryStyle } from "@/constants/categories";
import { cn } from "@/lib/utils";
import { IndividualAssetPrintableReport } from "@/components/reports/print/individual/IndividualAssetPrintableReport";

interface AssetDetailDialogProps {
  assetId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const TCO_COLORS = ["#2A3260", "#FF4E45", "#F59E0B"];

export function AssetDetailDialog({
  assetId,
  isOpen,
  onClose,
}: AssetDetailDialogProps) {
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
  const { data, isLoading } = useAssetDrilldownReportQuery(effectiveAssetId || "");

  if (!isRendered || !effectiveAssetId) {
    return null;
  }

  const asset = data?.asset;
  const purchaseInfo = data?.purchaseInfo;
  const maintenanceHistory = data?.maintenanceHistory || [];
  const custodyHistory = data?.custodyHistory || [];
  const consumablesConsumed = data?.consumablesConsumed || [];
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
      lower.includes("needs repair") ||
      lower.includes("damaged")
    ) {
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    }
    return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  };

  const qrPayload =
    typeof window !== "undefined"
      ? `${window.location.origin}/inventory?search=${encodeURIComponent(asset?.assetCode || "")}`
      : asset?.assetCode || "";

  // Visualizations data
  const tcoData = tco
    ? [
        { name: "Acquisition Cost", value: tco.purchaseCost || 0 },
        { name: "Maintenance & Repairs", value: tco.maintenanceCost || 0 },
        { name: "Consumable Supplies", value: tco.consumablesCost || 0 },
      ].filter((item) => item.value > 0)
    : [];

  const maintenanceTrendData = [...maintenanceHistory]
    .sort((a, b) => new Date(a.dateLogged).getTime() - new Date(b.dateLogged).getTime())
    .map((log) => ({
      date: log.dateLogged.slice(5),
      cost: log.repairCost || 0,
      code: log.logCode,
      condition: log.condition,
    }));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 print:hidden">
      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200",
          isClosing ? "opacity-0" : "animate-in fade-in duration-200 opacity-100"
        )}
        onClick={handleInitiateClose}
        aria-hidden="true"
      />

      {/* ── Centered Modal Dialog ────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-dialog-title"
        className={cn(
          "relative z-10 w-full sm:w-[88vw] max-w-6xl h-[85vh] bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden transform-gpu transition-all duration-200 ease-out will-change-transform",
          isClosing
            ? "scale-95 opacity-0"
            : "animate-in fade-in zoom-in-95 duration-200 scale-100 opacity-100"
        )}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/80 px-5 py-3.5 bg-bg-subtle/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-accent">
                  {asset?.assetCode || "Loading..."}
                </span>
                {categoryMeta && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
                      categoryMeta.bg,
                      categoryMeta.text
                    )}
                  >
                    {categoryMeta.label}
                  </span>
                )}
                {asset?.status && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                      asset.status === "active"
                        ? "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                        : "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                    )}
                  >
                    {asset.status === "active" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {asset.status.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <h2
                id="asset-dialog-title"
                className="text-base font-bold text-text truncate max-w-md"
              >
                {asset?.name || "Asset Lifecycle Dossier"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyCode}
              title="Copy asset code"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handlePrint}
              title="Print asset lifecycle report"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={handleInitiateClose}
              title="Close dialog (Esc)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Section Navigator (Sticky quick-jump bar) ────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-card px-5 py-2 overflow-x-auto text-xs gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() =>
                document.getElementById("sec-asset-overview")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <PieChartIcon className="h-3.5 w-3.5 text-accent" />
              <span>Executive Overview</span>
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("sec-asset-maintenance")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Wrench className="h-3.5 w-3.5 text-rose-500" />
              <span>Maintenance History ({maintenanceHistory.length})</span>
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("sec-asset-custody")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <History className="h-3.5 w-3.5 text-blue-600" />
              <span>Custody Log ({custodyHistory.length})</span>
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("sec-asset-purchase")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Receipt className="h-3.5 w-3.5 text-indigo-600" />
              <span>Acquisition &amp; PO</span>
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-text-secondary shrink-0 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Unified Asset Dossier</span>
          </div>
        </div>

        {/* ── Body: Scoped Scrolling Single View ──────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8 scroll-smooth">
          {isLoading ? (
            <div className="py-16">
              <LoadingState message="Loading asset lifecycle dossier..." />
            </div>
          ) : !asset ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
              <div className="text-base font-bold text-text">Asset Record Not Found</div>
              <p className="text-xs text-text-secondary mt-1">
                The requested asset could not be located in the register.
              </p>
            </div>
          ) : (
            <>
              {/* ════ SECTION 1: EXECUTIVE OVERVIEW & CHARTS ══════════════ */}
              <section id="sec-asset-overview" className="space-y-5">
                  {/* StatCards KPI Grid */}
                  <StatCardGrid className="grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard
                      size="sm"
                      title="Acquisition"
                      sublabel="PURCHASE // BOOK"
                      value={
                        canViewCosts && tco
                          ? `₱${(tco.purchaseCost || 0).toLocaleString()}`
                          : "Restricted"
                      }
                      subtitle="Initial PO Value"
                      icon={DollarSign}
                      tone="blue"
                      toneValue
                    />
                    <StatCard
                      size="sm"
                      title="Repairs Spend"
                      sublabel="MAINTENANCE // MTBF"
                      value={
                        canViewCosts && tco
                          ? `₱${(tco.maintenanceCost || 0).toLocaleString()}`
                          : "Restricted"
                      }
                      subtitle={`${maintenanceHistory.length} logged incidents`}
                      icon={Wrench}
                      tone="rose"
                      toneValue
                    />
                    <StatCard
                      size="sm"
                      title="Supplies Used"
                      sublabel="CONSUMABLES // DISPATCH"
                      value={
                        canViewCosts && tco
                          ? `₱${(tco.consumablesCost || 0).toLocaleString()}`
                          : "Restricted"
                      }
                      subtitle={`${consumablesConsumed.length} items linked`}
                      icon={Layers}
                      tone="indigo"
                      toneValue
                    />
                    <StatCard
                      size="sm"
                      title="Total Ownership (TCO)"
                      sublabel="CUMULATIVE // LIFETIME"
                      value={
                        canViewCosts && tco
                          ? `₱${(tco.totalCostOfOwnership || 0).toLocaleString()}`
                          : "Restricted"
                      }
                      subtitle="Lifetime tracked spend"
                      icon={TrendingUp}
                      tone="accent"
                      toneValue
                    />
                  </StatCardGrid>

                  {/* ── Visualizations Section (Pie & Line Charts) ─────────── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* TCO Breakdown Donut / Pie Chart */}
                    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                            <PieChartIcon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-text">TCO Breakdown</h4>
                            <p className="text-[10px] text-text-secondary">
                              Capital purchase vs maintenance vs consumables
                            </p>
                          </div>
                        </div>
                        {canViewCosts && tco && (
                          <span className="text-xs font-mono font-bold text-text">
                            ₱{tco.totalCostOfOwnership.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {canViewCosts ? (
                        tcoData.length > 0 ? (
                          <div className="h-52 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={tcoData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={75}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {tcoData.map((_, index) => (
                                    <Cell
                                      key={`cell-tco-${index}`}
                                      fill={TCO_COLORS[index % TCO_COLORS.length]}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(val: unknown) => [
                                    `₱${Number(val || 0).toLocaleString()}`,
                                    "Cost",
                                  ]}
                                  contentStyle={{
                                    backgroundColor: "var(--card, #ffffff)",
                                    borderRadius: "10px",
                                    border: "1px solid var(--border, #E5E7EB)",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                  }}
                                />
                                <Legend
                                  verticalAlign="bottom"
                                  height={36}
                                  iconType="circle"
                                  wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex h-52 items-center justify-center text-xs text-text-secondary">
                            Zero tracked expenditure logged.
                          </div>
                        )
                      ) : (
                        <div className="flex h-52 items-center justify-center text-xs text-text-secondary">
                          Financial breakdowns restricted.
                        </div>
                      )}
                    </div>

                    {/* Maintenance Cost Trend Line / Area Chart */}
                    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                            <Wrench className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-text">Maintenance &amp; Repairs</h4>
                            <p className="text-[10px] text-text-secondary">
                              Repair costs across incident history
                            </p>
                          </div>
                        </div>
                      </div>

                      {canViewCosts ? (
                        maintenanceTrendData.length > 0 ? (
                          <div className="h-52 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={maintenanceTrendData}
                                margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                              >
                                <defs>
                                  <linearGradient id="assetRepairGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FF4E45" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#FF4E45" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#E5E7EB"
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="date"
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fontSize: 10, fill: "#5A5F73", fontWeight: 600 }}
                                />
                                <YAxis
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fontSize: 10, fill: "#5A5F73", fontFamily: "monospace" }}
                                  tickFormatter={(v) => `₱${v}`}
                                />
                                <Tooltip
                                  formatter={(val: unknown) => [
                                    `₱${Number(val || 0).toLocaleString()}`,
                                    "Repair Cost",
                                  ]}
                                  contentStyle={{
                                    backgroundColor: "var(--card, #ffffff)",
                                    borderRadius: "10px",
                                    border: "1px solid var(--border, #E5E7EB)",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="cost"
                                  stroke="#FF4E45"
                                  strokeWidth={2}
                                  fill="url(#assetRepairGrad)"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex h-52 flex-col items-center justify-center text-center p-4 border border-dashed border-border/70 rounded-xl">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-1" />
                            <span className="text-xs font-semibold text-text">Zero Repair Incidents</span>
                            <span className="text-[11px] text-text-secondary">
                              Asset has had no recorded maintenance tickets.
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="flex h-52 items-center justify-center text-xs text-text-secondary">
                          Maintenance cost trends restricted.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Core Attributes Card */}
                  <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Physical Custody &amp; Location Specs
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-text-secondary block mb-1">Physical Location</span>
                        <span className="font-semibold text-text flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-accent" />
                          {asset.location}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary block mb-1">Current Custodian</span>
                        <span className="font-semibold text-text flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-text-secondary" />
                          {asset.currentHolder || "General Storage / Unassigned"}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary block mb-1">Department Assigned</span>
                        <span className="font-semibold text-text">
                          {asset.department || "Hospital-wide"}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary block mb-1">Serial Number</span>
                        <span className="font-mono font-bold text-text">
                          {asset.serialNumber || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary block mb-1">Acquisition Date</span>
                        <span className="font-mono text-text">
                          {asset.purchaseDate || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary block mb-1">Supplier / Vendor</span>
                        <span className="font-semibold text-text">
                          {asset.supplierName || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code & Verification Banner */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border/80 bg-bg-subtle/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-border/80 bg-card p-2 shadow-xs shrink-0">
                        <QRCodeSVG value={qrPayload} size={56} level="M" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-text">
                          <QrCode className="h-3.5 w-3.5 text-accent" />
                          <span>Digital Asset Passport</span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5 max-w-sm">
                          Scan with any mobile device to quickly log maintenance or transfer custody.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[11px] font-bold text-text block">
                        {asset.assetCode}
                      </span>
                      <span className="text-[10px] text-text-secondary">CRMC Equipment Register</span>
                    </div>
                  </div>
              </section>

              <hr className="border-border/70" />

              {/* ════ SECTION 2: MAINTENANCE HISTORY ══════════════════════ */}
              <section id="sec-asset-maintenance" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text">Work Orders &amp; Repair History</h3>
                      <p className="text-xs text-text-secondary">
                        Audit trail of maintenance, inspections, and resolved issues
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-2.5 py-1 rounded-md border border-border">
                    {maintenanceHistory.length} Logged Events
                  </span>
                </div>

                  {maintenanceHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                      <div className="text-sm font-bold text-text">No Maintenance History</div>
                      <p className="text-xs text-text-secondary max-w-sm mt-1">
                        This asset has no recorded repair work orders. It remains in optimal condition.
                      </p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-border/80 ml-3 pl-6 space-y-6">
                      {maintenanceHistory.map((log) => (
                        <div key={log.id} className="relative group">
                          <div
                            className={cn(
                              "absolute -left-7.75 top-1 h-3.5 w-3.5 rounded-full border-2 bg-card",
                              log.isResolved
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-rose-500 bg-rose-500 animate-pulse"
                            )}
                          />

                          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-text">
                                    {log.logCode}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                                      getConditionColor(log.condition)
                                    )}
                                  >
                                    {log.condition}
                                  </span>
                                  <span className="text-[10px] font-semibold text-text-secondary">
                                    via {log.source.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <p className="text-xs text-text mt-1 font-medium">{log.notes}</p>
                              </div>

                              {canViewCosts && log.repairCost != null && (
                                <div className="text-right">
                                  <div className="text-[10px] text-text-secondary uppercase">
                                    Cost
                                  </div>
                                  <div className="font-mono text-xs font-bold text-text">
                                    ₱{log.repairCost.toLocaleString()}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-text-secondary pt-2 border-t border-border/50">
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="h-3 w-3" />
                                {log.dateLogged}
                              </span>
                              <span>Logged by {log.loggedByName}</span>
                              {log.isResolved ? (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Resolved on {log.resolutionDate || "recorded"}
                                </span>
                              ) : (
                                <span className="text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Issue Active
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </section>

              <hr className="border-border/70" />

              {/* ════ SECTION 3: CUSTODY LOG ══════════════════════════════ */}
              <section id="sec-asset-custody" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <History className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text">Custody &amp; Chain of Responsibility</h3>
                      <p className="text-xs text-text-secondary">
                        Full log of handovers, check-outs, and loan returns
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-2.5 py-1 rounded-md border border-border">
                    {custodyHistory.length} Check-outs
                  </span>
                </div>

                  {custodyHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border">
                      <History className="h-10 w-10 text-text-secondary/40 mb-2" />
                      <div className="text-sm font-bold text-text">No Historical Check-outs</div>
                      <p className="text-xs text-text-secondary max-w-sm mt-1">
                        This item has remained in primary storage or with its baseline holder.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
                      <div className="divide-y divide-border/60">
                        {custodyHistory.map((custody) => (
                          <div
                            key={custody.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-text">{custody.borrowerName}</span>
                                <span className="text-[10px] text-text-secondary">({custody.department})</span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                                    custody.status === "returned"
                                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                      : "bg-blue-500/10 text-blue-700 border-blue-500/20"
                                  )}
                                >
                                  {custody.status}
                                </span>
                              </div>
                              <p className="text-text-secondary italic">&quot;{custody.purpose}&quot;</p>
                            </div>

                            <div className="text-right text-[11px] font-mono text-text-secondary">
                              <div>Issued: {custody.borrowedAt}</div>
                              {custody.returnedAt && <div>Returned: {custody.returnedAt}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </section>

              <hr className="border-border/70" />

              {/* ════ SECTION 4: ACQUISITION & PO ═════════════════════════ */}
              <section id="sec-asset-purchase" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text">Acquisition &amp; Procurement Details</h3>
                      <p className="text-xs text-text-secondary">
                        Purchase Order linkage and vendor origin metadata
                      </p>
                    </div>
                  </div>
                </div>

                  {purchaseInfo ? (
                    <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-text-secondary block mb-1">Purchase Order #</span>
                          <span className="font-mono font-bold text-text text-sm">
                            {purchaseInfo.poNumber || "Direct Stock Entry"}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary block mb-1">Vendor / Supplier</span>
                          <span className="font-semibold text-text">
                            {purchaseInfo.supplierName || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary block mb-1">Procurement Date</span>
                          <span className="font-mono text-text">
                            {purchaseInfo.purchasedOn || "—"}
                          </span>
                        </div>
                        {canViewCosts && (
                          <div>
                            <span className="text-text-secondary block mb-1">Unit Acquisition Cost</span>
                            <span className="font-mono font-bold text-accent">
                              {purchaseInfo.unitCost != null
                                ? `₱${purchaseInfo.unitCost.toLocaleString()}`
                                : "—"}
                            </span>
                          </div>
                        )}
                        {purchaseInfo.lotCode && (
                          <div>
                            <span className="text-text-secondary block mb-1">Batch / Lot Code</span>
                            <span className="font-mono text-text">{purchaseInfo.lotCode}</span>
                          </div>
                        )}
                        {purchaseInfo.reference && (
                          <div>
                            <span className="text-text-secondary block mb-1">Invoice / Reference</span>
                            <span className="font-mono text-text">{purchaseInfo.reference}</span>
                          </div>
                        )}
                      </div>

                      {purchaseInfo.receiptUrl && (
                        <div className="pt-3 border-t border-border/60">
                          <a
                            href={purchaseInfo.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>View Original Purchase Invoice Document</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border">
                      <Receipt className="h-10 w-10 text-text-secondary/40 mb-2" />
                      <div className="text-sm font-bold text-text">No Direct PO Record Attached</div>
                      <p className="text-xs text-text-secondary max-w-sm mt-1">
                        This item was registered directly into inventory without a linked Purchase Order.
                      </p>
                    </div>
                  )}
              </section>
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-t border-border/80 bg-bg-subtle/50 px-5 py-3 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-text">{asset?.assetCode}</span>
            <span>·</span>
            <span>{asset?.location || "Storage"}</span>
          </div>
          <button
            onClick={handleInitiateClose}
            className="rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    {asset && (
      <div className="hidden print:block print:w-full">
        <IndividualAssetPrintableReport
          asset={asset}
          maintenanceHistory={maintenanceHistory.map((m) => ({
            id: m.id,
            cost: m.totalCost || m.repairCost || 0,
            date: m.dateLogged,
            type: m.condition,
            description: m.notes || `Work Order ${m.logCode}`,
            technician: m.serviceProvider || "Internal Maintenance",
          }))}
          canViewCosts={canViewCosts}
        />
      </div>
    )}
  </>
  );
}
