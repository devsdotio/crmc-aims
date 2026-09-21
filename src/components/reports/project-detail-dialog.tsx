"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Printer,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Layers,
  DollarSign,
  QrCode,
  FolderKanban,
  Package,
  Building2,
  TrendingUp,
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
import type { ProjectReportRow } from "@/types/reports";
import { IndividualProjectPrintableReport } from "@/components/reports/print/individual/IndividualProjectPrintableReport";

interface ProjectDetailDialogProps {
  project: ProjectReportRow | null;
  isOpen: boolean;
  onClose: () => void;
  canViewCosts?: boolean;
}

const COST_COLORS = ["#FF4E45", "#2A3260"];
const RESOURCE_COLORS = ["#2563EB", "#10B981"];

export function ProjectDetailDialog({
  project,
  isOpen,
  onClose,
  canViewCosts = true,
}: ProjectDetailDialogProps) {
  const [copied, setCopied] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [supplySearch, setSupplySearch] = useState("");
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [cachedProject, setCachedProject] = useState<ProjectReportRow | null>(
    project,
  );

  useEffect(() => {
    if (isOpen && project) {
      setCachedProject(project);
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
  }, [isOpen, project, isRendered]);

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

  const effectiveProject = isOpen ? project : cachedProject;

  if (!isRendered || !effectiveProject) {
    return null;
  }

  const handleCopyCode = () => {
    if (!effectiveProject?.projectCode) return;
    navigator.clipboard.writeText(effectiveProject.projectCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: ProjectReportRow["status"]) => {
    switch (status) {
      case "active":
        return {
          label: "Active Operations",
          bg: "bg-status-active-bg/20 text-status-active-text border-status-active-bg/40",
          icon: CheckCircle2,
        };
      case "completed":
        return {
          label: "Successfully Completed",
          bg: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
          icon: CheckCircle2,
        };
      case "on_hold":
        return {
          label: "On Hold",
          bg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
          icon: AlertCircle,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          bg: "bg-status-retired-bg/20 text-status-retired-text border-status-retired-bg/40",
          icon: AlertCircle,
        };
      default:
        return {
          label: status,
          bg: "bg-bg-subtle text-text-secondary border-border",
          icon: AlertCircle,
        };
    }
  };

  const statusMeta = getStatusBadge(effectiveProject.status);
  const StatusIcon = statusMeta.icon;

  const qrPayload =
    typeof window !== "undefined"
      ? `${window.location.origin}/reports/projects?search=${encodeURIComponent(effectiveProject.projectCode)}`
      : effectiveProject.projectCode;

  // Chart data calculations
  const consumablesCost = effectiveProject.consumablesValue || 0;
  const totalCost = effectiveProject.totalProjectCost || 0;
  const otherCost = Math.max(0, totalCost - consumablesCost);

  const costBreakdownData = [
    { name: "Consumable Stocks", value: consumablesCost },
    {
      name: "Direct Ops & Services",
      value: otherCost > 0 ? otherCost : totalCost > 0 ? 0 : 1,
    },
  ].filter((item) => item.value > 0);

  const resourceData = [
    { name: "Capital Assets", count: effectiveProject.assignedAssetsCount },
    {
      name: "Consumable Units",
      count: effectiveProject.consumablesConsumedCount,
    },
  ];

  // Itemized assets filtering
  const assignedAssets = effectiveProject.assignedAssets || [];
  const filteredAssets = assignedAssets.filter(
    (a) =>
      a.assetCode.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.category.toLowerCase().includes(assetSearch.toLowerCase()) ||
      (a.serialNumber &&
        a.serialNumber.toLowerCase().includes(assetSearch.toLowerCase())),
  );
  const totalAssignedAssetsValue = assignedAssets.reduce(
    (acc, item) => acc + (item.value || 0),
    0,
  );

  // Itemized supplies filtering
  const consumedSupplies = effectiveProject.consumedSupplies || [];
  const filteredSupplies = consumedSupplies.filter(
    (s) =>
      s.itemCode.toLowerCase().includes(supplySearch.toLowerCase()) ||
      s.name.toLowerCase().includes(supplySearch.toLowerCase()) ||
      (s.category &&
        s.category.toLowerCase().includes(supplySearch.toLowerCase())),
  );

  // Top 5 consumed items by total cost
  const topSuppliesChartData = [...consumedSupplies]
    .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
    .slice(0, 5)
    .map((s) => ({
      name: s.name.length > 20 ? `${s.name.slice(0, 20)}…` : s.name,
      cost: s.totalCost || 0,
      qty: s.quantity,
    }));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 print:hidden">
        {/* ── Backdrop ─────────────────────────────────────────────────── */}
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

        {/* ── Centered Modal Dialog (Wider & Single-View) ───────────────── */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-dialog-title"
          className={cn(
            "relative z-10 w-full sm:w-[88vw] max-w-6xl h-[85vh] bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden transform-gpu transition-all duration-200 ease-out will-change-transform",
            isClosing
              ? "scale-95 opacity-0"
              : "animate-in fade-in zoom-in-95 duration-200 scale-100 opacity-100",
          )}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/80 px-5 py-3.5 bg-bg-subtle/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent">
                    {effectiveProject.projectCode}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                      statusMeta.bg,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusMeta.label}
                  </span>
                </div>
                <h2
                  id="project-dialog-title"
                  className="text-base font-bold text-text truncate max-w-md sm:max-w-xl"
                >
                  {effectiveProject.projectName}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyCode}
                title="Copy project code"
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
                title="Print project report"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Section Navigator (Sticky quick-jump bar) ────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-card px-5 py-2 overflow-x-auto text-xs gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("sec-project-overview")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              >
                <PieChartIcon className="h-3.5 w-3.5 text-accent" />
                <span>Executive Overview</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("sec-project-assets")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              >
                <Package className="h-3.5 w-3.5 text-blue-600" />
                <span>
                  Assigned Assets ({effectiveProject.assignedAssetsCount})
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("sec-project-supplies")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                <span>
                  Consumables ({effectiveProject.consumablesConsumedCount})
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("sec-project-financials")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              >
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                <span>Financial Audit</span>
              </button>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[11px] text-text-secondary shrink-0 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Unified Executive Audit</span>
            </div>
          </div>

          {/* ── Body: Scoped Scrolling Single View ──────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8 scroll-smooth">
            {/* ════ SECTION 1: EXECUTIVE OVERVIEW & CHARTS ═════════════════ */}
            <section id="sec-project-overview" className="space-y-5">
              {/* StatCards KPI Grid */}
              <StatCardGrid className="grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  size="sm"
                  title="Capital Assets"
                  sublabel="DEPLOYED // EQUIPMENT"
                  value={effectiveProject.assignedAssetsCount}
                  subtitle="Units in project use"
                  icon={Package}
                  tone="blue"
                  toneValue
                />
                <StatCard
                  size="sm"
                  title="Stocks Consumed"
                  sublabel="CONSUMABLES // DISPATCH"
                  value={effectiveProject.consumablesConsumedCount.toLocaleString()}
                  subtitle="Consumable units"
                  icon={Layers}
                  tone="indigo"
                  toneValue
                />
                <StatCard
                  size="sm"
                  title="Total Project Cost"
                  sublabel="AUDIT // FINANCIAL"
                  value={
                    canViewCosts && effectiveProject.totalProjectCost != null
                      ? `₱${effectiveProject.totalProjectCost.toLocaleString()}`
                      : "Restricted"
                  }
                  subtitle={
                    canViewCosts ? "All tracked spend" : "Admin view only"
                  }
                  icon={DollarSign}
                  tone="accent"
                  toneValue
                />
                <StatCard
                  size="sm"
                  title="Operational Status"
                  sublabel="LIFECYCLE // STATE"
                  value={effectiveProject.status.replace(/_/g, " ")}
                  subtitle={effectiveProject.department}
                  icon={FolderKanban}
                  tone="amber"
                  toneValue
                />
              </StatCardGrid>

              {/* Analytics & Context Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Visualizations (Donut & Bar Charts) */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cost Breakdown Donut Chart */}
                  <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                            <PieChartIcon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-text">
                              Cost Breakdown
                            </h4>
                            <p className="text-[10px] text-text-secondary">
                              Materials vs direct ops
                            </p>
                          </div>
                        </div>
                        {canViewCosts &&
                          effectiveProject.totalProjectCost != null && (
                            <span className="text-xs font-mono font-bold text-text">
                              ₱
                              {effectiveProject.totalProjectCost.toLocaleString()}
                            </span>
                          )}
                      </div>

                      {canViewCosts ? (
                        costBreakdownData.length > 0 && totalCost > 0 ? (
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={costBreakdownData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={42}
                                  outerRadius={68}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {costBreakdownData.map((_, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={
                                        COST_COLORS[index % COST_COLORS.length]
                                      }
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(val: unknown) => [
                                    `₱${Number(val || 0).toLocaleString()}`,
                                    "Expenditure",
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
                                  wrapperStyle={{
                                    fontSize: "10px",
                                    fontWeight: 600,
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex h-48 flex-col items-center justify-center text-center p-4 border border-dashed border-border/70 rounded-xl">
                            <DollarSign className="h-7 w-7 text-text-secondary/50 mb-1" />
                            <span className="text-xs font-semibold text-text">
                              No direct expense data
                            </span>
                            <span className="text-[10px] text-text-secondary">
                              Expenditures appear as materials are consumed.
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="flex h-48 items-center justify-center text-xs text-text-secondary">
                          Financial visualizations restricted.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resource Deployment Bar Chart */}
                  <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                            <BarChart3 className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-text">
                              Resource Deployment
                            </h4>
                            <p className="text-[10px] text-text-secondary">
                              Capital equipment vs consumables
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={resourceData}
                            margin={{
                              top: 15,
                              right: 10,
                              left: -20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#E5E7EB"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="name"
                              tickLine={false}
                              axisLine={false}
                              tick={{
                                fontSize: 10,
                                fill: "#5A5F73",
                                fontWeight: 600,
                              }}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{
                                fontSize: 10,
                                fill: "#5A5F73",
                                fontFamily: "monospace",
                              }}
                            />
                            <Tooltip
                              cursor={false}
                              formatter={(val: unknown) => [
                                Number(val || 0).toLocaleString(),
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
                              {resourceData.map((_, index) => (
                                <Cell
                                  key={`bar-${index}`}
                                  fill={
                                    RESOURCE_COLORS[
                                      index % RESOURCE_COLORS.length
                                    ]
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Context & Metadata Side Card */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary pb-2 border-b border-border/60">
                        Project Governance &amp; Registry
                      </h4>
                      <div className="grid grid-cols-2 gap-3.5 text-xs pt-3">
                        <div>
                          <span className="text-text-secondary block text-[11px] mb-0.5">
                            Department
                          </span>
                          <span className="font-semibold text-text flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-accent" />
                            {effectiveProject.department}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary block text-[11px] mb-0.5">
                            Project Lead
                          </span>
                          <span className="font-semibold text-text flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-text-secondary" />
                            {effectiveProject.managerName || "Unassigned"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-text-secondary block text-[11px] mb-0.5">
                            Execution Schedule
                          </span>
                          <span className="font-mono text-text flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                            {effectiveProject.startDate} →{" "}
                            {effectiveProject.endDate || "Ongoing"}
                          </span>
                        </div>
                      </div>

                      {effectiveProject.description && (
                        <div className="pt-2.5 mt-2.5 border-t border-border/60">
                          <span className="text-text-secondary block text-[10px] uppercase font-bold tracking-wider mb-1">
                            Scope &amp; Description
                          </span>
                          <p className="text-xs text-text leading-relaxed line-clamp-3">
                            {effectiveProject.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* QR Code & Digital Passport strip */}
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-bg-subtle/70 p-2.5 mt-2">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg border border-border/80 bg-card p-1 shadow-2xs shrink-0">
                          <QRCodeSVG value={qrPayload} size={42} level="M" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-text">
                            <QrCode className="h-3 w-3 text-accent" />
                            <span>Digital Passport</span>
                          </div>
                          <p className="text-[10px] text-text-secondary leading-tight">
                            Scan to verify personnel &amp; assets in field
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-text bg-card px-2 py-1 rounded border border-border shrink-0">
                        {effectiveProject.projectCode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-border/70" />

            {/* ════ SECTION 2: ASSIGNED CAPITAL ASSETS ══════════════════════ */}
            <section id="sec-project-assets" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text">
                        Assigned Capital Equipment
                      </h3>
                      <p className="text-xs text-text-secondary">
                        Itemized list of physical assets actively deployed to{" "}
                        {effectiveProject.projectCode}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Search assets by code, name, category..."
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-text placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-2.5 py-1 rounded-md border border-border shrink-0">
                    {assignedAssets.length} Assets
                  </span>
                  {canViewCosts && totalAssignedAssetsValue > 0 && (
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 shrink-0">
                      ₱{totalAssignedAssetsValue.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {assignedAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border">
                  <Package className="h-10 w-10 text-text-secondary/40 mb-2" />
                  <div className="text-sm font-bold text-text">
                    No Assets Currently Assigned
                  </div>
                  <p className="text-xs text-text-secondary max-w-sm mt-1">
                    No physical equipment has been assigned to this project yet.
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
                          {canViewCosts && (
                            <th className="px-4 py-3 text-right">Book Value</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredAssets.map((asset) => (
                          <tr
                            key={asset.id}
                            className="hover:bg-bg-subtle/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono font-bold text-text flex items-center gap-1.5">
                              <QrCode className="h-3.5 w-3.5 text-accent" />
                              {asset.assetCode}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-text">
                                {asset.name}
                              </div>
                              {asset.location && (
                                <div className="text-[10px] text-text-secondary">
                                  {asset.location}
                                </div>
                              )}
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
                            {canViewCosts && (
                              <td className="px-4 py-3 text-right font-mono font-bold text-text">
                                {asset.value != null
                                  ? `₱${asset.value.toLocaleString()}`
                                  : "—"}
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

            {/* ════ SECTION 3: CONSUMABLE STOCKS DISPATCHED ════════════════ */}
            <section id="sec-project-supplies" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text">
                        Consumable Stocks Ledger
                      </h3>
                      <p className="text-xs text-text-secondary">
                        Itemized warehouse materials and supplies issued to{" "}
                        {effectiveProject.projectCode}
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
                  {canViewCosts &&
                    effectiveProject.consumablesValue != null && (
                      <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md border border-accent/20 shrink-0">
                        ₱{effectiveProject.consumablesValue.toLocaleString()}
                      </span>
                    )}
                </div>
              </div>

              {/* Top Consumed Supplies Mini Chart (if multiple items with costs exist) */}
              {canViewCosts &&
                topSuppliesChartData.length > 0 &&
                topSuppliesChartData.some((d) => d.cost > 0) && (
                  <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-accent" />
                        <span className="text-xs font-bold text-text">
                          Top Material Expenses
                        </span>
                      </div>
                      <span className="text-[10px] text-text-secondary">
                        By total cost incurred
                      </span>
                    </div>
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topSuppliesChartData}
                          margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E5E7EB"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tick={{
                              fontSize: 10,
                              fill: "#5A5F73",
                              fontWeight: 600,
                            }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{
                              fontSize: 10,
                              fill: "#5A5F73",
                              fontFamily: "monospace",
                            }}
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
                  <div className="text-sm font-bold text-text">
                    No Consumables Consumed
                  </div>
                  <p className="text-xs text-text-secondary max-w-sm mt-1">
                    No warehouse materials or supplies have been issued to this
                    project.
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
                          {canViewCosts && (
                            <th className="px-4 py-3 text-right">Unit Cost</th>
                          )}
                          {canViewCosts && (
                            <th className="px-4 py-3 text-right">Total Cost</th>
                          )}
                          <th className="px-4 py-3">Date / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredSupplies.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-bg-subtle/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono font-bold text-text">
                              {item.itemCode}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-text">
                                {item.name}
                              </div>
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
                                {item.unitCost != null
                                  ? `₱${item.unitCost.toLocaleString()}`
                                  : "—"}
                              </td>
                            )}
                            {canViewCosts && (
                              <td className="px-4 py-3 text-right font-mono font-bold text-text">
                                {item.totalCost != null
                                  ? `₱${item.totalCost.toLocaleString()}`
                                  : "—"}
                              </td>
                            )}
                            <td className="px-4 py-3 text-[11px] text-text-secondary">
                              {item.incurredOn && (
                                <div className="font-mono">
                                  {item.incurredOn}
                                </div>
                              )}
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

            {/* ════ SECTION 4: FINANCIAL AUDIT & RECONCILIATION ══════════════ */}
            <section id="sec-project-financials" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">
                      Financial Audit &amp; Cost Ledger
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Expenditure breakdown and audited cost totals for{" "}
                      {effectiveProject.projectName}
                    </p>
                  </div>
                </div>
              </div>

              {canViewCosts ? (
                <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div>
                      <div className="text-xs text-text-secondary">
                        Total Project Expenditure
                      </div>
                      <div className="text-2xl font-mono font-bold text-text">
                        ₱
                        {(
                          effectiveProject.totalProjectCost || 0
                        ).toLocaleString()}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 text-xs font-bold">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Audit Verified
                    </span>
                  </div>

                  <div className="divide-y divide-border/50 text-xs">
                    <div className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-accent" />
                        <span className="font-semibold text-text">
                          Warehouse Materials &amp; Consumables
                        </span>
                      </div>
                      <span className="font-mono font-bold text-text">
                        ₱
                        {(
                          effectiveProject.consumablesValue || 0
                        ).toLocaleString()}
                      </span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-text">
                          Direct Operations, Labor &amp; Contracted Services
                        </span>
                      </div>
                      <span className="font-mono font-bold text-text">
                        ₱{otherCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border">
                  <DollarSign className="h-10 w-10 text-text-secondary/40 mb-2" />
                  <div className="text-sm font-bold text-text">
                    Financial Details Restricted
                  </div>
                  <p className="text-xs text-text-secondary max-w-sm mt-1">
                    Your role does not permit access to direct budgetary figures
                    and monetary audit logs.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-t border-border/80 bg-bg-subtle/50 px-5 py-3 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-text">
                {effectiveProject.projectCode}
              </span>
              <span>·</span>
              <span>{effectiveProject.department}</span>
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

      <div className="hidden print:block">
        <IndividualProjectPrintableReport
          project={effectiveProject}
          canViewCosts={canViewCosts}
        />
      </div>
    </>
  );
}
