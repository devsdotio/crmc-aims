"use client";

import Link from "next/link";
import {
  Package,
  HardHat,
  ShoppingCart,
  Wrench,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OperationalDomainHubProps {
  isLoading?: boolean;
  canViewCosts?: boolean;
  assets?: {
    totalCount: number;
    activeCount: number;
    inRepairCount: number;
    totalValue: number;
  };
  consumables?: {
    totalItems: number;
    lowStockCount: number;
    totalValuation: number;
    monthBurnRateValue: number;
    suppliesCount?: number;
    materialsCount?: number;
    suppliesLowStockCount?: number;
    materialsLowStockCount?: number;
    suppliesValuation?: number;
    materialsValuation?: number;
    suppliesBurnRateValue?: number;
    materialsBurnRateValue?: number;
  };
  procurement?: {
    openOrdersCount: number;
    totalSpend30d: number;
    pendingDeliveryCount: number;
  };
  maintenance?: {
    activeIssuesCount: number;
    resolvedThisMonth: number;
    avgMttrDays: number;
    totalRepairSpend30d: number;
  };
}

export function OperationalDomainHub({
  isLoading = false,
  canViewCosts = true,
  assets,
  consumables,
  procurement,
  maintenance,
}: OperationalDomainHubProps) {
  // 1. Assets calculations
  const totalAssets = assets?.totalCount || 0;
  const activeAssets = assets?.activeCount || 0;
  const inRepairAssets = assets?.inRepairCount || 0;
  const operationalRate = totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0;

  // 2. Supplies calculations
  const suppliesCount = consumables?.suppliesCount ?? 0;
  const suppliesLow = consumables?.suppliesLowStockCount ?? 0;
  const suppliesOptimal = Math.max(0, suppliesCount - suppliesLow);
  const suppliesBufferPct = suppliesCount > 0 ? Math.round((suppliesOptimal / suppliesCount) * 100) : 100;

  // 3. Materials calculations
  const materialsCount = consumables?.materialsCount ?? 0;
  const materialsLow = consumables?.materialsLowStockCount ?? 0;
  const materialsOptimal = Math.max(0, materialsCount - materialsLow);
  const materialsBufferPct = materialsCount > 0 ? Math.round((materialsOptimal / materialsCount) * 100) : 100;

  // 4. Maintenance calculations
  const activeRepairs = maintenance?.activeIssuesCount || 0;
  const resolvedRepairs = maintenance?.resolvedThisMonth || 0;
  const totalRepairs = activeRepairs + resolvedRepairs;
  const repairTurnaroundPct = totalRepairs > 0 ? Math.round((resolvedRepairs / totalRepairs) * 100) : 100;

  // 5. Procurement calculations
  const openPOs = procurement?.openOrdersCount || 0;
  const pendingDeliveries = procurement?.pendingDeliveryCount || 0;

  return (
    <div className="space-y-3">
      {/* ── Section Header with Status Badge ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-text">
              Operational Priority Hub
            </h2>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Audited Domains
            </span>
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Key operational health, stock thresholds, repair turnaround, and active procurement pipelines.
          </p>
        </div>
      </div>

      {/* ── 5 Priority Domain Cards Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Card 1: Capital Asset Fleet */}
        <Link
          href="/reports/assets"
          className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 hover:border-blue-500/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-visible hover:z-30 focus-within:z-30"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Package className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  operationalRate >= 90
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    : operationalRate >= 75
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                )}
              >
                <CheckCircle2 className="h-3 w-3" />
                {operationalRate}% Optimal
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary uppercase tracking-wider">
              <span>Capital Asset Registry</span>
              <Info className="h-3 w-3 text-text-secondary/50 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="mt-1 font-mono text-xl font-black text-text">
              {isLoading
                ? "…"
                : canViewCosts
                ? `₱${(assets?.totalValue || 0).toLocaleString()}`
                : `${totalAssets} units`}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">
              {activeAssets} deployed · {totalAssets} total units
            </div>

            {/* Micro-Progress Bar */}
            <div className="mt-3.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                <span>Fleet Readiness</span>
                <span className="font-bold text-text">{operationalRate}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(operationalRate, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span
              className={cn(
                "text-[10px] font-semibold font-mono px-2 py-0.5 rounded-md",
                inRepairAssets > 0
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60"
                  : "bg-bg-subtle text-text-secondary"
              )}
            >
              {inRepairAssets > 0 ? `${inRepairAssets} in repair` : "Zero repairs"}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
              Assets <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          {/* ── Hover Tooltip Explanation ── */}
          <div
            role="tooltip"
            className="pointer-events-none absolute z-50 top-full mt-2 left-0 w-68 sm:w-72 p-3 rounded-xl bg-slate-900/95 text-white dark:bg-slate-950/95 backdrop-blur-md border border-white/15 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
          >
            <div className="absolute -top-1 left-6 w-2 h-2 bg-slate-900 dark:bg-slate-950 border-t border-l border-white/15 rotate-45" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">
              <Info className="h-3 w-3" />
              <span>Capital Asset Registry</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-200">
              Monitors capitalized equipment, IT hardware, and vehicles, tracking active deployment, repair logs, and overall operational readiness.
            </p>
          </div>
        </Link>

        {/* Card 2: Consumable Supplies */}
        <Link
          href="/reports/consumables?classification=supply"
          className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-visible hover:z-30 focus-within:z-30"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Package className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  suppliesLow > 0
                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                )}
              >
                {suppliesLow > 0 ? (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    {suppliesLow} Low Stock
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Stock Optimal
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary uppercase tracking-wider">
              <span>Consumable Supplies</span>
              <Info className="h-3 w-3 text-text-secondary/50 group-hover:text-emerald-500 transition-colors" />
            </div>
            <div className="mt-1 font-mono text-xl font-black text-text">
              {isLoading
                ? "…"
                : canViewCosts
                ? `₱${(consumables?.suppliesValuation ?? 0).toLocaleString()}`
                : `${suppliesCount} SKUs`}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">
              {suppliesCount} catalog SKUs · Stores &amp; office
            </div>

            {/* Micro-Progress Bar */}
            <div className="mt-3.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                <span>Safety Buffer</span>
                <span className="font-bold text-text">{suppliesBufferPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(suppliesBufferPct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-[10px] font-mono text-text-secondary font-medium">
              ₱{(consumables?.suppliesBurnRateValue ?? 0).toLocaleString()}/30d burn
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              Supplies <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          {/* ── Hover Tooltip Explanation ── */}
          <div
            role="tooltip"
            className="pointer-events-none absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-68 sm:w-72 p-3 rounded-xl bg-slate-900/95 text-white dark:bg-slate-950/95 backdrop-blur-md border border-white/15 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-950 border-t border-l border-white/15 rotate-45" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
              <Info className="h-3 w-3" />
              <span>Consumable Supplies</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-200">
              Tracks storeroom inventory (paper, stationery, ink, toiletries &amp; medical items) against safety stock thresholds and 30-day burn rate.
            </p>
          </div>
        </Link>

        {/* Card 3: Consumable Materials */}
        <Link
          href="/reports/consumables?classification=material"
          className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 hover:border-amber-500/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-visible hover:z-30 focus-within:z-30"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <HardHat className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  materialsLow > 0
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800 animate-pulse"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                )}
              >
                {materialsLow > 0 ? (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    {materialsLow} Restock Alert
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Materials Optimal
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary uppercase tracking-wider">
              <span>Consumable Materials</span>
              <Info className="h-3 w-3 text-text-secondary/50 group-hover:text-amber-500 transition-colors" />
            </div>
            <div className="mt-1 font-mono text-xl font-black text-text">
              {isLoading
                ? "…"
                : canViewCosts
                ? `₱${(consumables?.materialsValuation ?? 0).toLocaleString()}`
                : `${materialsCount} SKUs`}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">
              {materialsCount} SKUs · Trade &amp; project stock
            </div>

            {/* Micro-Progress Bar */}
            <div className="mt-3.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                <span>Stock Buffer</span>
                <span className="font-bold text-text">{materialsBufferPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(materialsBufferPct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-[10px] font-mono text-text-secondary font-medium">
              ₱{(consumables?.materialsBurnRateValue ?? 0).toLocaleString()}/30d burn
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
              Materials <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          {/* ── Hover Tooltip Explanation ── */}
          <div
            role="tooltip"
            className="pointer-events-none absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-68 sm:w-72 p-3 rounded-xl bg-slate-900/95 text-white dark:bg-slate-950/95 backdrop-blur-md border border-white/15 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-950 border-t border-l border-white/15 rotate-45" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Info className="h-3 w-3" />
              <span>Consumable Materials</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-200">
              Manages construction, electrical, plumbing, and project hardware stocks maintained separately from administrative office supplies.
            </p>
          </div>
        </Link>

        {/* Card 4: Maintenance & Repairs */}
        <Link
          href="/reports/maintenance"
          className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 hover:border-rose-500/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-visible hover:z-30 focus-within:z-30"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <Wrench className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  activeRepairs > 0
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                )}
              >
                {activeRepairs > 0 ? (
                  <>
                    <Clock className="h-3 w-3" />
                    {activeRepairs} Active Orders
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Repairs Clear
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary uppercase tracking-wider">
              <span>Facility Maintenance</span>
              <Info className="h-3 w-3 text-text-secondary/50 group-hover:text-rose-500 transition-colors" />
            </div>
            <div className="mt-1 font-mono text-xl font-black text-text">
              {isLoading
                ? "…"
                : canViewCosts
                ? `₱${(maintenance?.totalRepairSpend30d || 0).toLocaleString()}`
                : `${activeRepairs} issues`}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">
              {resolvedRepairs} resolved this mo · {maintenance?.avgMttrDays || 0}d MTTR
            </div>

            {/* Micro-Progress Bar */}
            <div className="mt-3.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                <span>Resolution Turnaround</span>
                <span className="font-bold text-text">{repairTurnaroundPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(repairTurnaroundPct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-[10px] font-mono text-text-secondary font-medium">
              {resolvedRepairs} resolved / 30d
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform">
              Logs <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          {/* ── Hover Tooltip Explanation ── */}
          <div
            role="tooltip"
            className="pointer-events-none absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-68 sm:w-72 p-3 rounded-xl bg-slate-900/95 text-white dark:bg-slate-950/95 backdrop-blur-md border border-white/15 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-950 border-t border-l border-white/15 rotate-45" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">
              <Info className="h-3 w-3" />
              <span>Facility Maintenance</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-200">
              Audits corrective work orders, scheduled preventive maintenance, mean time to repair (MTTR), and repair cost expenditure.
            </p>
          </div>
        </Link>

        {/* Card 5: Procurement & Purchase Orders */}
        <Link
          href="/reports/purchase-orders"
          className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-visible hover:z-30 focus-within:z-30"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  pendingDeliveries > 0
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                )}
              >
                {pendingDeliveries > 0 ? (
                  <>
                    <Truck className="h-3 w-3" />
                    {pendingDeliveries} In Transit
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Fulfilled
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary uppercase tracking-wider">
              <span>Procurement &amp; Orders</span>
              <Info className="h-3 w-3 text-text-secondary/50 group-hover:text-indigo-500 transition-colors" />
            </div>
            <div className="mt-1 font-mono text-xl font-black text-text">
              {isLoading
                ? "…"
                : canViewCosts
                ? `₱${(procurement?.totalSpend30d || 0).toLocaleString()}`
                : `${openPOs} open POs`}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">
              {openPOs} active POs · 30-day procurement window
            </div>

            {/* Micro-Progress Bar */}
            <div className="mt-3.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                <span>Active Cycle Status</span>
                <span className="font-bold text-text">{openPOs} Open POs</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(openPOs > 0 ? 70 : 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-[10px] font-mono text-text-secondary font-medium">
              {pendingDeliveries} awaiting delivery
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
              Orders <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          {/* ── Hover Tooltip Explanation ── */}
          <div
            role="tooltip"
            className="pointer-events-none absolute z-50 top-full mt-2 right-0 w-68 sm:w-72 p-3 rounded-xl bg-slate-900/95 text-white dark:bg-slate-950/95 backdrop-blur-md border border-white/15 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
          >
            <div className="absolute -top-1 right-6 w-2 h-2 bg-slate-900 dark:bg-slate-950 border-t border-l border-white/15 rotate-45" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
              <Info className="h-3 w-3" />
              <span>Procurement &amp; Orders</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-200">
              Tracks active vendor purchase orders, fulfillment cycles, and pending delivery shipments across capital assets, supplies, and materials.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
