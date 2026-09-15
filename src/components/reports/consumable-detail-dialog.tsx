"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Printer,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Warehouse,
  TrendingDown,
  Clock,
  QrCode,
  DollarSign,
  X,
  PieChart as PieChartIcon,
  BarChart3,
  Flame,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { ConsumableStockRow } from "@/types/reports";

interface ConsumableDetailDialogProps {
  consumable: ConsumableStockRow | null;
  isOpen: boolean;
  onClose: () => void;
  canViewCosts?: boolean;
}

const STOCK_COLORS = ["#10B981", "#2563EB", "#F43F5E"];
const VELOCITY_COLORS = ["#2A3260", "#6366F1", "#F59E0B"];

export function ConsumableDetailDialog({
  consumable,
  isOpen,
  onClose,
  canViewCosts = true,
}: ConsumableDetailDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [cachedConsumable, setCachedConsumable] = useState<ConsumableStockRow | null>(
    consumable
  );

  useEffect(() => {
    if (isOpen && consumable) {
      setCachedConsumable(consumable);
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
  }, [isOpen, consumable, isRendered]);

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

  const effectiveConsumable = isOpen ? consumable : cachedConsumable;

  if (!isRendered || !effectiveConsumable) {
    return null;
  }

  const handleCopyCode = () => {
    if (!effectiveConsumable?.itemCode) return;
    navigator.clipboard.writeText(effectiveConsumable.itemCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const qrPayload =
    typeof window !== "undefined"
      ? `${window.location.origin}/reports/consumables?search=${encodeURIComponent(effectiveConsumable.itemCode)}`
      : effectiveConsumable.itemCode;

  // Pie Chart: Stock Allocation Breakdown
  const available = effectiveConsumable.availableQty || 0;
  const reserved = effectiveConsumable.reservedQty || 0;
  const deficit =
    effectiveConsumable.isLowStock && effectiveConsumable.minThreshold > effectiveConsumable.currentQty
      ? effectiveConsumable.minThreshold - effectiveConsumable.currentQty
      : 0;

  const stockAllocationData = [
    { name: "Available Units", value: available },
    { name: "Reserved Units", value: reserved },
    ...(deficit > 0 ? [{ name: "Safety Deficit", value: deficit }] : []),
  ].filter((d) => d.value > 0);

  // Bar Chart: Velocity & Burn Comparison
  const velocityData = [
    { name: "30d Usage", count: effectiveConsumable.usage30d },
    { name: "Monthly Pace (90d)", count: Math.round((effectiveConsumable.usage90d || 0) / 3) },
    { name: "Min Threshold", count: effectiveConsumable.minThreshold },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
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
        aria-labelledby="consumable-dialog-title"
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-text">
                  {effectiveConsumable.itemCode}
                </span>
                <span className="text-[10px] font-semibold capitalize text-text-secondary">
                  {effectiveConsumable.category.replace(/_/g, " ")}
                </span>
                {effectiveConsumable.isLowStock ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 text-[10px] font-bold">
                    <AlertTriangle className="h-3 w-3" />
                    Low Stock Alert
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                    <CheckCircle2 className="h-3 w-3" />
                    Optimal Stock
                  </span>
                )}
              </div>
              <h2
                id="consumable-dialog-title"
                className="text-base font-bold text-text truncate max-w-md"
              >
                {effectiveConsumable.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyCode}
              title="Copy SKU code"
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
              title="Print consumable report"
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
                document.getElementById("sec-consumable-overview")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <PieChartIcon className="h-3.5 w-3.5 text-accent" />
              <span>Executive Overview</span>
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("sec-consumable-stock")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Warehouse className="h-3.5 w-3.5 text-emerald-600" />
              <span>Warehouse &amp; Stock Levels</span>
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("sec-consumable-velocity")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <TrendingDown className="h-3.5 w-3.5 text-indigo-600" />
              <span>Consumption Velocity</span>
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("sec-consumable-financials")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <DollarSign className="h-3.5 w-3.5 text-amber-600" />
              <span>Inventory Valuation</span>
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-text-secondary shrink-0 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Unified Stock Audit</span>
          </div>
        </div>

        {/* ── Body: Scoped Scrolling Single View ──────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8 scroll-smooth">
          {/* ════ SECTION 1: EXECUTIVE OVERVIEW & CHARTS ═════════════════ */}
          <section id="sec-consumable-overview" className="space-y-5">
              {/* StatCards KPI Grid */}
              <StatCardGrid className="grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  size="sm"
                  title="On Hand Total"
                  sublabel="INVENTORY // PHYSICAL"
                  value={effectiveConsumable.currentQty.toLocaleString()}
                  subtitle={`${effectiveConsumable.unit} in stock`}
                  icon={Layers}
                  tone="blue"
                  toneValue
                />
                <StatCard
                  size="sm"
                  title="Available Stock"
                  sublabel="ALLOCATION // FREE"
                  value={effectiveConsumable.availableQty.toLocaleString()}
                  subtitle={`${effectiveConsumable.reservedQty} reserved`}
                  icon={Warehouse}
                  tone={effectiveConsumable.isLowStock ? "rose" : "emerald"}
                  toneValue
                />
                <StatCard
                  size="sm"
                  title="30-Day Dispatched"
                  sublabel="BURN RATE // USAGE"
                  value={effectiveConsumable.usage30d.toLocaleString()}
                  subtitle="Units issued"
                  icon={TrendingDown}
                  tone="indigo"
                  toneValue
                />
                <StatCard
                  size="sm"
                  title="Depletion Horizon"
                  sublabel="RUNOUT FORECAST"
                  value={
                    effectiveConsumable.estimatedDaysRemaining != null
                      ? `${effectiveConsumable.estimatedDaysRemaining} days`
                      : "—"
                  }
                  subtitle={
                    effectiveConsumable.estimatedDaysRemaining &&
                    effectiveConsumable.estimatedDaysRemaining <= 7
                      ? "Critical reorder point"
                      : "Sufficient buffer"
                  }
                  icon={Clock}
                  tone={
                    effectiveConsumable.estimatedDaysRemaining &&
                    effectiveConsumable.estimatedDaysRemaining <= 7
                      ? "rose"
                      : "amber"
                  }
                  toneValue
                />
              </StatCardGrid>

              {/* ── Visualizations Section (Pie & Bar Charts) ───────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stock Distribution Donut / Pie Chart */}
                <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                        <PieChartIcon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-text">Stock Distribution</h4>
                        <p className="text-[10px] text-text-secondary">
                          Available vs reserved vs replenishment buffer
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-text">
                      {effectiveConsumable.currentQty} {effectiveConsumable.unit}
                    </span>
                  </div>

                  {stockAllocationData.length > 0 ? (
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stockAllocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {stockAllocationData.map((_, index) => (
                              <Cell
                                key={`cell-stock-${index}`}
                                fill={STOCK_COLORS[index % STOCK_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: unknown) => [
                              `${Number(val || 0).toLocaleString()} ${effectiveConsumable.unit}`,
                              "Quantity",
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
                    <div className="flex h-52 flex-col items-center justify-center text-center p-4 border border-dashed border-border/70 rounded-xl">
                      <Layers className="h-8 w-8 text-text-secondary/50 mb-1" />
                      <span className="text-xs font-semibold text-text">No active inventory</span>
                      <span className="text-[11px] text-text-secondary">
                        Stock level is currently 0 units.
                      </span>
                    </div>
                  )}
                </div>

                {/* Consumption Velocity Bar Chart */}
                <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                        <BarChart3 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-text">Consumption Velocity</h4>
                        <p className="text-[10px] text-text-secondary">
                          Monthly burn rate compared to safety threshold
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={velocityData}
                        margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10, fill: "#5A5F73", fontWeight: 600 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10, fill: "#5A5F73", fontFamily: "monospace" }}
                        />
                        <Tooltip
                          cursor={false}
                          formatter={(val: unknown) => [
                            `${Number(val || 0).toLocaleString()} ${effectiveConsumable.unit}`,
                            "Units",
                          ]}
                          contentStyle={{
                            backgroundColor: "var(--card, #ffffff)",
                            borderRadius: "10px",
                            border: "1px solid var(--border, #E5E7EB)",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        />
                        <Bar
                          dataKey="count"
                          radius={[6, 6, 0, 0]}
                          cursor="pointer"
                          activeBar={{ opacity: 0.82 }}
                        >
                          {velocityData.map((_, index) => (
                            <Cell
                              key={`bar-vel-${index}`}
                              fill={VELOCITY_COLORS[index % VELOCITY_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Stock Health & Location Summary */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Warehouse Location &amp; Reorder Specification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-text-secondary block mb-1">Warehouse Bin / Rack</span>
                    <span className="font-semibold text-text font-mono flex items-center gap-1.5">
                      <Warehouse className="h-3.5 w-3.5 text-accent" />
                      {effectiveConsumable.location || "General Warehouse"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary block mb-1">Minimum Safety Buffer</span>
                    <span className="font-mono font-bold text-text">
                      {effectiveConsumable.minThreshold} {effectiveConsumable.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary block mb-1">Unit of Measurement</span>
                    <span className="font-semibold text-text capitalize">
                      {effectiveConsumable.unit}
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
                      <QrCode className="h-3.5 w-3.5 text-amber-600" />
                      <span>Warehouse SKU Tag</span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5 max-w-sm">
                      Scan bin barcode to initiate requisition pick lists or audit physical bin counts.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[11px] font-bold text-text block">
                    {effectiveConsumable.itemCode}
                  </span>
                  <span className="text-[10px] text-text-secondary">CRMC Warehouse Catalog</span>
                </div>
              </div>
            </section>

            <hr className="border-border/70" />

            {/* ════ SECTION 2: WAREHOUSE & STOCK LEVELS ═════════════════ */}
            <section id="sec-consumable-stock" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Warehouse className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Inventory Availability Ledger</h3>
                    <p className="text-xs text-text-secondary">
                      Physical stock allocation breakdown across active reservations
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
                <div className="divide-y divide-border/60 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-text">Total Physical On-Hand</span>
                    <span className="font-mono font-bold text-text">
                      {effectiveConsumable.currentQty.toLocaleString()} {effectiveConsumable.unit}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-text">Allocated to Open Requisitions</span>
                    <span className="font-mono text-amber-600 font-bold">
                      {effectiveConsumable.reservedQty.toLocaleString()} {effectiveConsumable.unit}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-text">Net Available for Dispatch</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {effectiveConsumable.availableQty.toLocaleString()} {effectiveConsumable.unit}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-text">Minimum Reorder Level</span>
                    <span className="font-mono text-text-secondary">
                      {effectiveConsumable.minThreshold.toLocaleString()} {effectiveConsumable.unit}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-border/70" />

            {/* ════ SECTION 3: VELOCITY & BURN RATE ═════════════════════ */}
            <section id="sec-consumable-velocity" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Historical Burn Rate &amp; Velocity</h3>
                    <p className="text-xs text-text-secondary">
                      Usage pacing over recent operational cycles
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <span className="text-xs text-text-secondary block mb-1">30-Day Dispatches</span>
                  <div className="text-xl font-bold font-mono text-text">
                    {effectiveConsumable.usage30d.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1">{effectiveConsumable.unit} issued</p>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <span className="text-xs text-text-secondary block mb-1">90-Day Cumulative</span>
                  <div className="text-xl font-bold font-mono text-text">
                    {effectiveConsumable.usage90d.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1">Quarterly volume</p>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <span className="text-xs text-text-secondary block mb-1">Estimated Runout</span>
                  <div className="text-xl font-bold font-mono text-text">
                    {effectiveConsumable.estimatedDaysRemaining != null
                      ? `${effectiveConsumable.estimatedDaysRemaining} d`
                      : "—"}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1">Days remaining</p>
                </div>
              </div>
            </section>

            <hr className="border-border/70" />

            {/* ════ SECTION 4: FINANCIALS & VALUATION ═══════════════════ */}
            <section id="sec-consumable-financials" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Inventory Valuation Ledger</h3>
                    <p className="text-xs text-text-secondary">
                      Unit acquisition costs and warehouse stock valuation
                    </p>
                  </div>
                </div>
              </div>

              {canViewCosts ? (
                <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
                  <div className="divide-y divide-border/60 text-xs">
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="font-medium text-text">Unit Cost</span>
                      <span className="font-mono font-bold text-text">
                        {effectiveConsumable.unitCost != null
                          ? `₱${effectiveConsumable.unitCost.toLocaleString()}`
                          : "—"}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="font-medium text-text">Total Stock Valuation</span>
                      <span className="font-mono font-bold text-base text-accent">
                        {effectiveConsumable.stockValuation != null
                          ? `₱${effectiveConsumable.stockValuation.toLocaleString()}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border">
                  <DollarSign className="h-10 w-10 text-text-secondary/40 mb-2" />
                  <div className="text-sm font-bold text-text">Financial Details Restricted</div>
                  <p className="text-xs text-text-secondary max-w-sm mt-1">
                    Your role does not permit viewing cost metrics and stock valuations.
                  </p>
                </div>
              )}
            </section>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-t border-border/80 bg-bg-subtle/50 px-5 py-3 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-text">{effectiveConsumable.itemCode}</span>
            <span>·</span>
            <span>Warehouse Stock Record</span>
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
  );
}
