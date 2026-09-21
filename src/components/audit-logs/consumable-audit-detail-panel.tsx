"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  X,
  User,
  MapPin,
  Tag,
  Calendar,
  Layers,
  FileText,
  History,
  ShieldCheck,
  PlusCircle,
  MinusCircle,
  RotateCcw,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  Edit3,
  Building2,
  Copy,
  Check,
  QrCode,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { LoadingState } from "@/components/providers/loading-context";
import { useConsumableQuery } from "@/features/consumables/client/use-consumables";
import { useAuditLogsQuery } from "@/features/audit-logs/client/use-audit-logs";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client";
import { formatDateTime, formatRelativeTime } from "./audit-log-utils";
import type { ConsumableItem } from "@/features/consumables/client/consumables-api";
import type { StockHistoryEntry } from "@/server/db/schema";
import type { PurchaseLot } from "@/types/purchase-lots";

interface ConsumableAuditDetailPanelProps {
  consumable: ConsumableItem | null;
  isOpen: boolean;
  onClose: () => void;
}

type MergedConsumableLog = {
  id: string;
  date: string;
  type: string;
  quantityChange?: number;
  actor: string;
  reason?: string;
  notes?: string;
  unitCost?: string | number;
  supplierName?: string;
  lotCode?: string;
  recipientName?: string;
  totalCost?: string | number;
  changes?: Record<string, { from: unknown; to: unknown }>;
};

function formatPhp(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return "₱0.00";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(n)) return "₱0.00";
  return `₱${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getAccountabilityStyle(type: string, quantityChange?: number) {
  switch (type.toLowerCase()) {
    case "restock":
      return {
        label: "Restock Intake",
        bg: "bg-status-active-bg/20 border-status-active-bg/40",
        text: "text-status-active-text",
        badge: "bg-status-active-bg/15 text-status-active-text border-status-active-bg/30",
        iconText: "text-status-active-text",
        icon: <PackagePlus className="h-3.5 w-3.5" />,
      };
    case "checkout":
    case "release":
    case "released":
      return {
        label: "Release / Issuance",
        bg: "bg-status-repair-bg/20 border-status-repair-bg/40",
        text: "text-status-repair-text",
        badge: "bg-status-repair-bg/15 text-status-repair-text border-status-repair-bg/30",
        iconText: "text-status-repair-text",
        icon: <PackageMinus className="h-3.5 w-3.5" />,
      };
    case "adjustment":
    case "adjust":
      return {
        label: "Stock Adjustment",
        bg: "bg-category-computing-bg/20 border-category-computing-bg/40",
        text: "text-category-computing-bg",
        badge: "bg-category-computing-bg/15 text-category-computing-bg border-category-computing-bg/30",
        iconText: "text-category-computing-bg",
        icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
      };
    case "created":
    case "create":
      return {
        label: "Consumable Registered",
        bg: "bg-status-active-bg/20 border-status-active-bg/40",
        text: "text-status-active-text",
        badge: "bg-status-active-bg/15 text-status-active-text border-status-active-bg/30",
        iconText: "text-status-active-text",
        icon: <Sparkles className="h-3.5 w-3.5" />,
      };
    case "updated":
    case "update":
    case "edit":
      return {
        label: "Specifications Updated",
        bg: "bg-category-av-bg/20 border-category-av-bg/40",
        text: "text-category-av-bg",
        badge: "bg-category-av-bg/15 text-category-av-bg border-category-av-bg/30",
        iconText: "text-category-av-bg",
        icon: <Edit3 className="h-3.5 w-3.5" />,
      };
    default:
      return {
        label: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        bg: "bg-bg-subtle border-border",
        text: "text-text-secondary",
        badge: "bg-bg-subtle text-text-secondary border-border",
        iconText: "text-text-secondary",
        icon: <History className="h-3.5 w-3.5" />,
      };
  }
}

export function ConsumableAuditDetailPanel({
  consumable,
  isOpen,
  onClose,
}: ConsumableAuditDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { getCategoryStyle } = useCategoryStyleMap();

  // List queries omit the bulky history JSONB for performance. Fetch full record with full history on panel open.
  const { data: detailItem, isLoading: detailLoading } = useConsumableQuery(
    consumable?.id ?? "",
    { enabled: Boolean(isOpen && consumable?.id) }
  );
  const activeConsumable = detailItem ?? consumable;

  // Fetch general audit logs for this specific consumable by UUID and itemCode
  const { data: auditEventsById = [] } = useAuditLogsQuery(
    consumable?.id ? { entityId: consumable.id } : undefined
  );
  const { data: auditEventsByCode = [] } = useAuditLogsQuery(
    consumable?.itemCode ? { entityId: consumable.itemCode } : undefined
  );

  // Fetch active purchase lots for batch breakdown
  const { data: purchaseLots = [] } = usePurchaseLotsQuery(
    consumable?.id ? { consumableId: consumable.id } : { enabled: false }
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Combine activeConsumable.history with general audit logs
  const combinedLogs: MergedConsumableLog[] = useMemo(() => {
    if (!activeConsumable) return [];

    const list: MergedConsumableLog[] = [];
    const seenIds = new Set<string>();

    // 1. Add StockHistory movements (Accountability history) from full detail query
    if (Array.isArray(activeConsumable.history)) {
      activeConsumable.history.forEach((h) => {
        if (!seenIds.has(h.id)) {
          seenIds.add(h.id);
          list.push({
            id: h.id,
            date: h.date,
            type: h.type,
            quantityChange: h.quantityChange,
            actor: h.actor,
            reason: h.reason,
            notes: h.notes,
            unitCost: h.unitCost,
            supplierName: h.supplierName,
            lotCode: h.lotCode,
            recipientName: h.recipientName,
            totalCost: h.totalCost,
          });
        }
      });
    }

    // 2. Add audit_logs entries from both UUID and itemCode queries
    const allAudit = [...auditEventsById, ...auditEventsByCode];
    allAudit.forEach((a) => {
      if (!seenIds.has(a.id)) {
        seenIds.add(a.id);
        const meta = a.metadata as Record<string, unknown> | null;
        list.push({
          id: a.id,
          date: new Date(a.timestamp).toISOString(),
          type: a.action,
          actor: a.actorName,
          notes: a.notes || undefined,
          quantityChange: typeof meta?.quantity === "number" ? meta.quantity : undefined,
          unitCost: typeof meta?.unitCost === "string" || typeof meta?.unitCost === "number" ? meta.unitCost : undefined,
          supplierName: typeof meta?.supplierName === "string" ? meta.supplierName : undefined,
          recipientName: typeof meta?.recipientName === "string" ? meta.recipientName : undefined,
          reason: typeof meta?.reason === "string" ? meta.reason : undefined,
          changes: meta?.changes as Record<string, { from: unknown; to: unknown }> | undefined,
        });
      }
    });

    // 3. Ensure initial registration event is recorded
    if (!list.some((l) => l.type === "created" || l.type === "create")) {
      list.push({
        id: `created-${activeConsumable.id}`,
        date:
          activeConsumable.lastRestocked && activeConsumable.lastRestocked !== "—"
            ? activeConsumable.lastRestocked
            : new Date().toISOString(),
        type: "created",
        actor: "System Administrator",
        reason: "Initial Inventory Setup",
        notes: `Registered ${activeConsumable.name} (${activeConsumable.itemCode}) into inventory stock registry.`,
      });
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [activeConsumable, auditEventsById, auditEventsByCode]);

  // Financial and volume metrics
  const { totalInflow, totalOutflow } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    combinedLogs.forEach((l) => {
      if (l.type === "restock" && typeof l.quantityChange === "number") {
        inflow += Math.abs(l.quantityChange);
      } else if ((l.type === "checkout" || l.type === "release") && typeof l.quantityChange === "number") {
        outflow += Math.abs(l.quantityChange);
      }
    });
    return { totalInflow: inflow, totalOutflow: outflow };
  }, [combinedLogs]);

  if (!isOpen || !consumable) return null;

  const currentItem = activeConsumable || consumable;
  const catStyle = getCategoryStyle(currentItem.category);
  const isLowStock = currentItem.currentQty <= currentItem.minThreshold && currentItem.currentQty > 0;
  const isOutOfStock = currentItem.currentQty === 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="con-audit-heading"
        className={cn(
          "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out"
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="con-audit-heading" className="font-mono text-lg font-bold tracking-tight text-text">
                {currentItem.itemCode}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border",
                  isOutOfStock
                    ? "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                    : isLowStock
                    ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                    : "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                )}
              >
                {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
              </span>
            </div>
            <p className="text-xs text-text-secondary font-medium mt-0.5 truncate">
              Consumable Accountability Log • <strong className="text-text font-semibold">{currentItem.name}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Item Identity Card */}
          <div className="p-4 rounded-xl border border-border bg-bg space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-text">{currentItem.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      catStyle.bg,
                      catStyle.text
                    )}
                  >
                    {catStyle.label}
                  </span>
                  <span className="text-xs text-text-secondary font-medium">
                    Unit: {currentItem.unit}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-text-secondary block font-medium">Available Stock</span>
                <span className="text-xl font-bold text-text">
                  {currentItem.currentQty} <span className="text-xs text-text-secondary font-normal">{currentItem.unit}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-border text-xs">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{currentItem.location}</span>
              </div>
              <div className="flex items-center gap-1.5 text-text-secondary">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Min Threshold: <strong className="text-text">{currentItem.minThreshold} {currentItem.unit}</strong></span>
              </div>
              {currentItem.supplier && (
                <div className="col-span-2 flex items-center justify-between text-[11px] text-text-secondary pt-1">
                  <span>Primary Supplier:</span>
                  <span className="font-semibold text-text">{currentItem.supplier}</span>
                </div>
              )}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-lg border border-border bg-bg-subtle/60">
              <span className="text-[10px] font-semibold text-text-secondary uppercase block">
                Total Restocked
              </span>
              {detailLoading ? (
                <div className="h-5 w-16 bg-bg-subtle rounded-md mx-auto mt-1 animate-pulse" />
              ) : (
                <span className="text-sm font-bold text-status-active-text mt-0.5 block">
                  +{totalInflow} {currentItem.unit}
                </span>
              )}
            </div>
            <div className="p-3 rounded-lg border border-border bg-bg-subtle/60">
              <span className="text-[10px] font-semibold text-text-secondary uppercase block">
                Total Issued
              </span>
              {detailLoading ? (
                <div className="h-5 w-16 bg-bg-subtle rounded-md mx-auto mt-1 animate-pulse" />
              ) : (
                <span className="text-sm font-bold text-status-repair-text mt-0.5 block">
                  -{totalOutflow} {currentItem.unit}
                </span>
              )}
            </div>
            <div className="p-3 rounded-lg border border-border bg-bg-subtle/60">
              <span className="text-[10px] font-semibold text-text-secondary uppercase block">
                Active Batches
              </span>
              {detailLoading ? (
                <div className="h-5 w-12 bg-bg-subtle rounded-md mx-auto mt-1 animate-pulse" />
              ) : (
                <span className="text-sm font-bold text-text mt-0.5 block">
                  {purchaseLots.length} {purchaseLots.length === 1 ? "Lot" : "Lots"}
                </span>
              )}
            </div>
          </div>

          {/* Full Accountability Log Timeline (matching Consumables Page design) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Accountability Log {!detailLoading && `(${combinedLogs.length})`}
              </h3>
              {detailLoading ? (
                <span className="text-[11px] font-semibold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-accent" />
                  <span>Preparing full history…</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-text-secondary bg-bg-subtle px-2 py-0.5 rounded-full border border-border">
                  Full Audit Trail
                </span>
              )}
            </div>

            {detailLoading ? (
              <LoadingState
                variant="card"
                icon="layers"
                message="Loading complete accountability history…"
                subtitle="Retrieving stock movements, restocks, lot allocations, and releases"
              />
            ) : combinedLogs.length === 0 ? (
              <div className="p-4 rounded-lg border border-border bg-bg text-center text-xs text-text-secondary">
                No stock movements or accountability logs recorded yet.
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border bg-bg shadow-xs">
                <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                  {combinedLogs.map((h) => {
                    const style = getAccountabilityStyle(h.type, h.quantityChange);
                    const isPositive = typeof h.quantityChange === "number" && h.quantityChange > 0;
                    const changes = h.changes;
                    const hasChanges = changes && Object.keys(changes).length > 0;

                    return (
                      <li key={h.id} className="relative pl-6">
                        {/* Node Icon */}
                        <span
                          className={cn(
                            "absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-bg shadow-sm z-10",
                            style.bg,
                            style.iconText
                          )}
                        >
                          {style.icon}
                        </span>

                        {/* Title, Quantity Badge & Date */}
                        <div className="flex items-start justify-between gap-2 text-xs pt-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("font-bold capitalize", style.text)}>
                              {style.label}
                            </span>
                            {typeof h.quantityChange === "number" && (
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border",
                                  style.badge
                                )}
                              >
                                {isPositive ? "+" : ""}
                                {h.quantityChange} {currentItem.unit}
                              </span>
                            )}
                          </div>
                          <time className="text-[11px] text-text-secondary shrink-0 font-medium">
                            {formatDateTime(h.date)}
                          </time>
                        </div>

                        {/* Actor & Recipient */}
                        <p className="text-xs text-text-secondary mt-0.5 font-medium">
                          By <span className="font-semibold text-text">{h.actor}</span>
                          {h.recipientName ? (
                            <> · to <span className="font-semibold text-text">{h.recipientName}</span></>
                          ) : null}
                        </p>

                        {/* Lot, Supplier & Costing Box (Exact Accountability Log data) */}
                        {(h.lotCode || h.supplierName || h.unitCost || h.totalCost) && (
                          <div className="mt-1.5 text-[11px] space-y-0.5 rounded border border-border bg-bg-subtle px-2.5 py-1.5">
                            {h.lotCode && (
                              <p className="flex items-center gap-1.5">
                                <span className="text-text-secondary">Lot Code:</span>
                                <span className="font-mono font-bold text-text">{h.lotCode}</span>
                              </p>
                            )}
                            {h.supplierName && (
                              <p className="flex items-center gap-1.5">
                                <span className="text-text-secondary">Supplier:</span>
                                <span className="font-semibold text-text">{h.supplierName}</span>
                              </p>
                            )}
                            {(h.unitCost || h.totalCost) && (
                              <p className="flex items-center gap-2 pt-0.5">
                                {h.unitCost && (
                                  <span>
                                    <span className="text-text-secondary">Unit: </span>
                                    <strong className="text-text">{formatPhp(h.unitCost)}</strong>
                                  </span>
                                )}
                                {h.totalCost && (
                                  <span>
                                    <span className="text-text-secondary">· Total Line: </span>
                                    <strong className="text-text">{formatPhp(h.totalCost)}</strong>
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Accountability Reason */}
                        {h.reason && (
                          <p className="text-[11px] text-text-secondary font-medium mt-1">
                            <span className="font-semibold text-text">Accountability Reason:</span>{" "}
                            {h.reason}
                          </p>
                        )}

                        {/* Notes / Narrative */}
                        {h.notes && (
                          <p className="text-xs text-text bg-bg-subtle p-2 rounded mt-1.5 border border-border">
                            {h.notes}
                          </p>
                        )}

                        {/* Attribute Modifications Diff (for update events) */}
                        {hasChanges && (
                          <div className="mt-2 p-2.5 rounded-lg border border-border bg-bg-subtle/80 space-y-1.5 text-xs">
                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                              Modified Attributes
                            </span>
                            <div className="space-y-1">
                              {Object.entries(changes).map(([field, change]) => (
                                <div key={field} className="flex items-center justify-between text-[11px] gap-2">
                                  <span className="font-semibold text-text capitalize">
                                    {field.replace(/([A-Z])/g, " $1")}
                                  </span>
                                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                    <span className="text-text-secondary line-through">
                                      {String(change.from || "none")}
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-text-secondary shrink-0" />
                                    <span className="font-bold text-text">
                                      {String(change.to || "none")}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>

          {/* Active FIFO Purchase Batches Snapshot */}
          {purchaseLots.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                Active FIFO Purchase Batches ({purchaseLots.length})
              </h3>
              <div className="rounded-lg border border-border bg-bg overflow-hidden divide-y divide-border text-xs">
                {purchaseLots.map((lot) => (
                  <div key={lot.id} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-text">{lot.lotCode}</span>
                        {lot.supplierName && (
                          <span className="text-text-secondary">• {lot.supplierName}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-text-secondary mt-0.5 block">
                        Purchased: {lot.purchasedOn} • Initial: {lot.quantity} {currentItem.unit}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-text block">
                        {lot.quantityRemaining} <span className="text-text-secondary font-normal text-[10px]">{currentItem.unit} left</span>
                      </span>
                      <span className="font-mono text-[10px] text-text-secondary">
                        @ {formatPhp(lot.unitCost)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between shrink-0">
          <span className="text-xs text-text-secondary">Immutable Consumable Inventory Audit</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
