"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Printer,
  Copy,
  Check,
  Building2,
  Package,
  Layers,
  Wrench,
  FolderKanban,
  QrCode,
  X,
  PieChart as PieChartIcon,
  BarChart3,
  Search,
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
import type { DepartmentReportRow } from "@/types/reports";

interface DepartmentDetailDialogProps {
  department: DepartmentReportRow | null;
  isOpen: boolean;
  onClose: () => void;
  canViewCosts?: boolean;
}

const VALUATION_COLORS = ["#2563EB", "#FF4E45"];
const OP_COLORS = ["#10B981", "#2563EB", "#F59E0B", "#EF4444"];

export function DepartmentDetailDialog({
  department,
  isOpen,
  onClose,
  canViewCosts = true,
}: DepartmentDetailDialogProps) {
  const [copied, setCopied] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [supplySearch, setSupplySearch] = useState("");
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [cachedDepartment, setCachedDepartment] = useState<DepartmentReportRow | null>(
    department
  );

  useEffect(() => {
    if (isOpen && department) {
      setCachedDepartment(department);
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
  }, [isOpen, department, isRendered]);

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

  const effectiveDepartment = isOpen ? department : cachedDepartment;

  if (!isRendered || !effectiveDepartment) {
    return null;
  }

  const handleCopyCode = () => {
    if (!effectiveDepartment?.departmentName) return;
    navigator.clipboard.writeText(effectiveDepartment.departmentName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const qrPayload =
    typeof window !== "undefined"
      ? `${window.location.origin}/reports/departments?search=${encodeURIComponent(effectiveDepartment.departmentName)}`
      : effectiveDepartment.departmentName;

  // Chart data calculations
  const assetsValue = effectiveDepartment.assetsValue || 0;
  const consumablesValue = effectiveDepartment.consumablesValue || 0;
  const totalAllocatedValue = assetsValue + consumablesValue;

  const spendBreakdownData = [
    { name: "Capital Asset Valuation", value: assetsValue },
    { name: "Consumable Dispatches", value: consumablesValue },
  ].filter((item) => item.value > 0);

  const operationalMetricsData = [
    { name: "Assets", count: effectiveDepartment.assetsAssignedCount },
    { name: "Projects", count: effectiveDepartment.activeProjects },
    { name: "Repairs", count: effectiveDepartment.activeMaintenanceCount },
  ];

  // Itemized assets filtering
  const assignedAssets = effectiveDepartment.assignedAssets || [];
  const filteredAssets = assignedAssets.filter(
    (a) =>
      a.assetCode.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.category.toLowerCase().includes(assetSearch.toLowerCase()) ||
      (a.serialNumber && a.serialNumber.toLowerCase().includes(assetSearch.toLowerCase())) ||
      (a.location && a.location.toLowerCase().includes(assetSearch.toLowerCase()))
  );

  // Itemized supplies filtering
  const consumedSupplies = effectiveDepartment.consumedSupplies || [];
  const filteredSupplies = consumedSupplies.filter(
    (s) =>
      s.itemCode.toLowerCase().includes(supplySearch.toLowerCase()) ||
      s.name.toLowerCase().includes(supplySearch.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(supplySearch.toLowerCase()))
  );

  // Chart data: top 5 items by total cost
  const topSuppliesChartData = [...consumedSupplies]
    .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
    .slice(0, 5)
    .map((s) => ({
      name: s.name.length > 20 ? `${s.name.slice(0, 20)}…` : s.name,
      cost: s.totalCost || 0,
      qty: s.quantity,
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200",
          isClosing ? "opacity-0" : "animate-in fade-in duration-200 opacity-100"
        )}
        onClick={handleInitiateClose}
        aria-hidden="true"
      />

      {/* ── Centered Modal Dialog (Wider & Single-View) ───────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dept-dialog-title"
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
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-accent uppercase tracking-wider">
                  Department Unit Report
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-bg-subtle border border-border/80 px-2 py-0.5 text-[10px] font-bold text-text-secondary">
                  CRMC Unit Index
                </span>
              </div>
              <h2
                id="dept-dialog-title"
                className="text-base font-bold text-text truncate max-w-md sm:max-w-xl"
              >
                {effectiveDepartment.departmentName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyCode}
              title="Copy department name"
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
              title="Print department report"
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
                document.getElementById("sec-dept-overview")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <PieChartIcon className="h-3.5 w-3.5 text-accent" />
              <span>Executive Overview</span>
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("sec-dept-assets")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Package className="h-3.5 w-3.5 text-blue-600" />
              <span>Custody Assets ({effectiveDepartment.assetsAssignedCount})</span>
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("sec-dept-supplies")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              <span>Consumables ({effectiveDepartment.consumablesConsumedCount})</span>
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("sec-dept-operations")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Wrench className="h-3.5 w-3.5 text-emerald-600" />
              <span>Operations &amp; Maintenance</span>
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-text-secondary shrink-0 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Unified Department Audit</span>
          </div>
        </div>

        {/* ── Body: Scoped Scrolling Single View ──────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8 scroll-smooth">
          {/* ════ SECTION 1: EXECUTIVE OVERVIEW & CHARTS ═════════════════ */}
          <section id="sec-dept-overview" className="space-y-5">
            {/* StatCards KPI Grid */}
            <StatCardGrid className="grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                size="sm"
                title="Assets Assigned"
                sublabel="CAPITAL // POOL"
                value={effectiveDepartment.assetsAssignedCount}
                subtitle={
                  canViewCosts && effectiveDepartment.assetsValue != null
                    ? `₱${effectiveDepartment.assetsValue.toLocaleString()}`
                    : "Assigned units"
                }
                icon={Package}
                tone="blue"
                toneValue
              />
              <StatCard
                size="sm"
                title="Stocks Consumed"
                sublabel="CONSUMABLES // USED"
                value={effectiveDepartment.consumablesConsumedCount.toLocaleString()}
                subtitle={
                  canViewCosts && effectiveDepartment.consumablesValue != null
                    ? `₱${effectiveDepartment.consumablesValue.toLocaleString()}`
                    : "Dispatched units"
                }
                icon={Layers}
                tone="indigo"
                toneValue
              />
              <StatCard
                size="sm"
                title="Active Maintenance"
                sublabel="HEALTH // REPAIRS"
                value={effectiveDepartment.activeMaintenanceCount}
                subtitle={
                  effectiveDepartment.activeMaintenanceCount > 0
                    ? "Pending repair tickets"
                    : "All assets operational"
                }
                icon={Wrench}
                tone={effectiveDepartment.activeMaintenanceCount > 0 ? "amber" : "emerald"}
                toneValue
              />
              <StatCard
                size="sm"
                title="Active Projects"
                sublabel="PROJECTS // IN-FLIGHT"
                value={effectiveDepartment.activeProjects}
                subtitle="Ongoing operations"
                icon={FolderKanban}
                tone="accent"
                toneValue
              />
            </StatCardGrid>

            {/* Analytics & Context Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Visualizations (Donut & Bar Charts) */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Spend & Valuation Donut Chart */}
                <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                          <PieChartIcon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-text">Resource Valuation</h4>
                          <p className="text-[10px] text-text-secondary">
                            Capital equipment vs consumables
                          </p>
                        </div>
                      </div>
                      {canViewCosts && totalAllocatedValue > 0 && (
                        <span className="text-xs font-mono font-bold text-text">
                          ₱{totalAllocatedValue.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {canViewCosts ? (
                      spendBreakdownData.length > 0 && totalAllocatedValue > 0 ? (
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={spendBreakdownData}
                                cx="50%"
                                cy="50%"
                                innerRadius={42}
                                outerRadius={68}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {spendBreakdownData.map((_, index) => (
                                  <Cell
                                    key={`cell-dept-${index}`}
                                    fill={VALUATION_COLORS[index % VALUATION_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(val: unknown) => [
                                  `₱${Number(val || 0).toLocaleString()}`,
                                  "Valuation",
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
                                height={32}
                                iconType="circle"
                                wrapperStyle={{ fontSize: "10px", fontWeight: 600 }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex h-48 flex-col items-center justify-center text-center p-4 border border-dashed border-border/70 rounded-xl">
                          <Building2 className="h-7 w-7 text-text-secondary/50 mb-1" />
                          <span className="text-xs font-semibold text-text">
                            No valuation figures recorded
                          </span>
                          <span className="text-[10px] text-text-secondary">
                            Values will populate as assets are inventoried.
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="flex h-48 items-center justify-center text-xs text-text-secondary">
                        Monetary valuations restricted.
                      </div>
                    )}
                  </div>
                </div>

                {/* Operational Profile Bar Chart */}
                <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                          <BarChart3 className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-text">Operational Profile</h4>
                          <p className="text-[10px] text-text-secondary">
                            Assets, projects &amp; maintenance
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={operationalMetricsData}
                          margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
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
                            formatter={(val: unknown) => [Number(val || 0).toLocaleString(), "Count"]}
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
                            {operationalMetricsData.map((_, index) => (
                              <Cell
                                key={`bar-op-${index}`}
                                fill={OP_COLORS[index % OP_COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Context & Key Assets Side Card */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary pb-2 border-b border-border/60">
                      Department Profile &amp; Deployed Items
                    </h4>

                    {/* Key Capital Equipment Tags */}
                    {effectiveDepartment.topAssets && effectiveDepartment.topAssets.length > 0 ? (
                      <div className="pt-2 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-text-secondary">
                          <span>Primary Equipment Classes</span>
                          <span className="font-mono">{effectiveDepartment.topAssets.length} types</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {effectiveDepartment.topAssets.map((asset, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-bg-subtle px-2 py-1 text-[11px] font-mono font-bold text-text"
                            >
                              <Package className="h-3 w-3 text-accent" />
                              {asset}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary pt-2">
                        General medical and administrative unit registered within CRMC operations.
                      </p>
                    )}
                  </div>

                  {/* QR Code & Digital Registry Strip */}
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-bg-subtle/70 p-2.5 mt-2">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg border border-border/80 bg-card p-1 shadow-2xs shrink-0">
                        <QRCodeSVG value={qrPayload} size={42} level="M" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-text">
                          <QrCode className="h-3 w-3 text-accent" />
                          <span>Department Asset Index</span>
                        </div>
                        <p className="text-[10px] text-text-secondary leading-tight">
                          Scan to verify custody records &amp; allocations
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-text bg-card px-2 py-1 rounded border border-border shrink-0">
                      CRMC-DEPT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-border/70" />

          {/* ════ SECTION 2: ASSIGNED CUSTODY ASSETS ══════════════════════ */}
          <section id="sec-dept-assets" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Assigned Custody Assets</h3>
                    <p className="text-xs text-text-secondary">
                      Itemized list of physical equipment and capital assets in {effectiveDepartment.departmentName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search assets by code, name, serial, location..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-text placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-2.5 py-1 rounded-md border border-border shrink-0">
                  {assignedAssets.length} Assets
                </span>
                {canViewCosts && effectiveDepartment.assetsValue != null && (
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 shrink-0">
                    ₱{effectiveDepartment.assetsValue.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {assignedAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border">
                <Package className="h-10 w-10 text-text-secondary/40 mb-2" />
                <div className="text-sm font-bold text-text">No Assets Assigned</div>
                <p className="text-xs text-text-secondary max-w-sm mt-1">
                  This department has no recorded physical equipment under active custody.
                </p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary border border-dashed border-border rounded-xl">
                No assigned assets matching &ldquo;{assetSearch}&rdquo;.
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border/80 bg-bg-subtle/80 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      <tr>
                        <th className="px-4 py-3">Asset Code</th>
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Serial #</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3">Location</th>
                        {canViewCosts && <th className="px-4 py-3 text-right">Valuation</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-bg-subtle/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-text flex items-center gap-1.5">
                            <QrCode className="h-3.5 w-3.5 text-accent" />
                            {asset.assetCode}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-text">{asset.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-bg-subtle border border-border/60 px-2 py-0.5 text-[10px] font-bold text-text capitalize">
                              {asset.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-text-secondary text-[11px]">
                            {asset.serialNumber || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-status-active-bg/20 text-status-active-text border-status-active-bg/30">
                              {asset.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {asset.location || "—"}
                          </td>
                          {canViewCosts && (
                            <td className="px-4 py-3 text-right font-mono font-bold text-text">
                              {asset.value != null ? `₱${asset.value.toLocaleString()}` : "—"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <hr className="border-border/70" />

          {/* ════ SECTION 3: CONSUMABLE SUPPLIES ISSUED ══════════════════ */}
          <section id="sec-dept-supplies" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Consumable Supplies Issued</h3>
                    <p className="text-xs text-text-secondary">
                      Itemized inventory materials and operational supplies dispatched to {effectiveDepartment.departmentName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search supplies by SKU, name, category..."
                    value={supplySearch}
                    onChange={(e) => setSupplySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-text placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                {canViewCosts && effectiveDepartment.consumablesValue != null && (
                  <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md border border-accent/20 shrink-0">
                    ₱{effectiveDepartment.consumablesValue.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Top Consumed Supplies Mini Chart (if multiple items with costs exist) */}
            {canViewCosts && topSuppliesChartData.length > 0 && topSuppliesChartData.some((d) => d.cost > 0) && (
              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-accent" />
                    <span className="text-xs font-bold text-text">Top Material Expenses</span>
                  </div>
                  <span className="text-[10px] text-text-secondary">By total cost incurred</span>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topSuppliesChartData}
                      margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
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
                        tickFormatter={(v) => `₱${v}`}
                      />
                      <Tooltip
                        cursor={false}
                        formatter={(val: unknown) => [
                          `₱${Number(val || 0).toLocaleString()}`,
                          "Expense",
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
                        dataKey="cost"
                        fill="#FF4E45"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        activeBar={{ opacity: 0.82 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Itemized Consumables Table */}
            {consumedSupplies.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border">
                <Layers className="h-10 w-10 text-text-secondary/40 mb-2" />
                <div className="text-sm font-bold text-text">No Consumables Dispatched</div>
                <p className="text-xs text-text-secondary max-w-sm mt-1">
                  No supplies have been issued to this department in the recorded cycles.
                </p>
              </div>
            ) : filteredSupplies.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary border border-dashed border-border rounded-xl">
                No consumable items matching &ldquo;{supplySearch}&rdquo;.
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border/80 bg-bg-subtle/80 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      <tr>
                        <th className="px-4 py-3">SKU Code</th>
                        <th className="px-4 py-3">Consumable Item</th>
                        <th className="px-4 py-3 text-right">Quantity</th>
                        {canViewCosts && <th className="px-4 py-3 text-right">Unit Cost</th>}
                        {canViewCosts && <th className="px-4 py-3 text-right">Total Cost</th>}
                        <th className="px-4 py-3">Date / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredSupplies.map((item) => (
                        <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-text">{item.itemCode}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-text">{item.name}</div>
                            {item.category && (
                              <div className="text-[10px] text-text-secondary capitalize">
                                {item.category.replace(/_/g, " ")}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-text">
                            {item.quantity.toLocaleString()}{" "}
                            <span className="font-normal text-text-secondary text-[11px]">
                              {item.unit}
                            </span>
                          </td>
                          {canViewCosts && (
                            <td className="px-4 py-3 text-right font-mono text-text-secondary">
                              {item.unitCost != null ? `₱${item.unitCost.toLocaleString()}` : "—"}
                            </td>
                          )}
                          {canViewCosts && (
                            <td className="px-4 py-3 text-right font-mono font-bold text-text">
                              {item.totalCost != null ? `₱${item.totalCost.toLocaleString()}` : "—"}
                            </td>
                          )}
                          <td className="px-4 py-3 text-[11px] text-text-secondary">
                            {item.incurredOn && <div className="font-mono">{item.incurredOn}</div>}
                            {item.purpose && (
                              <div className="truncate max-w-xs italic">
                                &ldquo;{item.purpose}&rdquo;
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <hr className="border-border/70" />

          {/* ════ SECTION 4: OPERATIONS & MAINTENANCE AUDIT ══════════════ */}
          <section id="sec-dept-operations" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">Operations &amp; Maintenance Audit</h3>
                  <p className="text-xs text-text-secondary">
                    Health status, ongoing repairs, and departmental staffing metrics
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                <span className="text-xs text-text-secondary block mb-1">Active Repairs</span>
                <div className="text-xl font-bold font-mono text-text">
                  {effectiveDepartment.activeMaintenanceCount}
                </div>
                <p className="text-[11px] text-text-secondary mt-1">Open maintenance work orders</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                <span className="text-xs text-text-secondary block mb-1">Active Projects</span>
                <div className="text-xl font-bold font-mono text-text">
                  {effectiveDepartment.activeProjects}
                </div>
                <p className="text-[11px] text-text-secondary mt-1">Currently running initiatives</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                <span className="text-xs text-text-secondary block mb-1">Staff Headcount</span>
                <div className="text-xl font-bold font-mono text-text">
                  {effectiveDepartment.staffCount ?? "—"}
                </div>
                <p className="text-[11px] text-text-secondary mt-1">Active personnel</p>
              </div>
            </div>
          </section>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-t border-border/80 bg-bg-subtle/50 px-5 py-3 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text">{effectiveDepartment.departmentName}</span>
            <span>·</span>
            <span>CRMC Department Audit</span>
          </div>
          <button
            onClick={handleInitiateClose}
            className="rounded-lg border border-border bg-card px-3.5 py-1.5 font-semibold text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
