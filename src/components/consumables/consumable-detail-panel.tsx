"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FilePlus2,
  SlidersHorizontal,
  MapPin,
  Truck,
  History,
  Tag,
  PackageMinus,
  PackagePlus,
  QrCode,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  Boxes,
  Layers,
  StickyNote,
  Printer,
} from "lucide-react";

import { IndividualConsumablePrintableReport } from "@/components/reports/print/individual/IndividualConsumablePrintableReport";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/providers/loading-context";
import type { ConsumableItem } from "@/types/inventory";
import { consumableClassificationLabel } from "@/lib/consumable-classification";
import type { PurchaseLot } from "@/types/purchase-lots";
import { useConsumableQuery } from "@/features/consumables/client/use-consumables";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client";
import { useConsumableMovementsQuery } from "@/features/stock-movements/client";
import type { StockMovement } from "@/features/stock-movements/client";
import { formatPhp } from "@/components/projects/format-money";
import { StockLevelBar } from "./stock-level-bar";
import { LotQrCodeDisplay } from "./lot-qr-code-display";
import { AuditNoteDisplay } from "@/components/audit-logs/audit-log-utils";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  const date = dateStr.includes("T") ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface ConsumableDetailPanelProps {
  item: ConsumableItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderPO?: (item: ConsumableItem) => void;
  onAdjust?: (item: ConsumableItem) => void;
  onRelease?: (item: ConsumableItem, lot?: PurchaseLot | null) => void;
  onEdit?: (item: ConsumableItem) => void;
  onDelete?: (item: ConsumableItem) => void;
}

function movementReasonLabel(reason: StockMovement["reason"]) {
  if (reason === "restock") return "Restock";
  if (reason === "issue") return "Issue";
  return "Adjustment";
}

function getMovementIcon(reason: StockMovement["reason"]) {
  switch (reason) {
    case "restock":
      return <PackagePlus className="h-3.5 w-3.5" />;
    case "issue":
      return <PackageMinus className="h-3.5 w-3.5" />;
    default:
      return <SlidersHorizontal className="h-3.5 w-3.5" />;
  }
}

function getMovementStyle(
  reason: StockMovement["reason"],
  direction: StockMovement["direction"]
) {
  if (reason === "restock" || (reason === "adjust" && direction === "in")) {
    return {
      bg: "bg-status-active-bg/20 border-status-active-bg/40",
      text: "text-status-active-text",
      badge:
        "bg-status-active-bg/15 text-status-active-text border-status-active-bg/30",
      iconText: "text-status-active-text",
    };
  }
  if (reason === "issue") {
    return {
      bg: "bg-primary/15 border-primary/30",
      text: "text-primary dark:text-primary-foreground",
      badge:
        "bg-primary/10 text-primary dark:text-primary-foreground border-primary/25",
      iconText: "text-primary dark:text-primary-foreground",
    };
  }
  return {
    bg: "bg-status-repair-bg/20 border-status-repair-bg/40",
    text: "text-status-repair-text",
    badge:
      "bg-status-repair-bg/15 text-status-repair-text border-status-repair-bg/30",
    iconText: "text-status-repair-text",
  };
}

export function ConsumableDetailPanel({
  item,
  isOpen,
  onClose,
  onOrderPO,
  onAdjust,
  onRelease,
  onEdit,
  onDelete,
}: ConsumableDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { getCategoryStyle } = useCategoryStyleMap();
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // List payload omits history for speed — load full record when the panel opens.
  const { data: detailItem, isLoading: detailLoading } = useConsumableQuery(
    item?.id ?? "",
    { enabled: Boolean(isOpen && item?.id) }
  );
  const displayItem = detailItem ?? item;

  const { data: lots = [], isLoading: lotsLoading } = usePurchaseLotsQuery({
    consumableId: item?.id,
    itemType: "consumable",
    enabled: Boolean(isOpen && item?.id),
  });
  const { data: movements = [], isLoading: movementsLoading } =
    useConsumableMovementsQuery(item?.id ?? "", {
      enabled: Boolean(isOpen && item?.id),
    });

  const openLots = useMemo(
    () => lots.filter((l) => l.quantityRemaining > 0),
    [lots]
  );

  const displayedMovements = isHistoryExpanded
    ? movements
    : movements.slice(0, 4);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setExpandedLotId(null);
    setIsHistoryExpanded(false);
  }, [item?.id]);

  if (!isOpen || !item || !displayItem) return null;

  const categoryMeta = getCategoryStyle(displayItem.category);

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200 print:hidden">
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

        <aside
          ref={panelRef}
          role="dialog"
          aria-modal="true"
        aria-labelledby="consumable-detail-heading"
        className={cn(
          "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out"
        )}
      >
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <h2
              id="consumable-detail-heading"
              className="font-mono text-base font-bold tracking-tight text-text leading-tight"
            >
              {displayItem.itemCode}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-bg border border-border text-text-secondary">
                {consumableClassificationLabel(displayItem.classification)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow-2xs",
                  categoryMeta.bg,
                  categoryMeta.text
                )}
              >
                <Tag className="h-2.5 w-2.5 shrink-0" />
                {categoryMeta.label}
              </span>
              <span className="text-text-secondary/40">•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                <Boxes className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate max-w-45">{displayItem.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Print SKU Report"
              className="relative group inline-flex items-center justify-center p-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <Printer className="h-4 w-4" />
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full mt-1.5 right-0 z-50 whitespace-nowrap rounded-md bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-md border border-white/10 opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 scale-95 group-hover:scale-100 transition-all duration-150 origin-top-right"
              >
                Print Report (PDF)
              </span>
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(displayItem)}
                aria-label="Delete item"
                className="relative group inline-flex items-center justify-center p-1.5 rounded-md bg-destructive text-white hover:bg-destructive/90 transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full mt-1.5 right-0 z-50 whitespace-nowrap rounded-md bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-md border border-white/10 opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 scale-95 group-hover:scale-100 transition-all duration-150 origin-top-right"
                >
                  Delete Item
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stock Level Card */}
          <div className="p-4 rounded-xl border border-border bg-bg-subtle space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block">
              Stock status
            </span>
            <StockLevelBar
              currentQty={displayItem.currentQty}
              minThreshold={displayItem.minThreshold}
              unit={displayItem.unit}
            />
            {(displayItem.reservedQty ?? 0) > 0 && (
              <p className="text-[11px] text-status-repair-text font-medium">
                {displayItem.reservedQty} {displayItem.unit} reserved for approved supply requests · {displayItem.availableQty ?? displayItem.currentQty - displayItem.reservedQty} available to issue
              </p>
            )}
          </div>

          {(onOrderPO || onRelease || onAdjust || onEdit) && (
            <div className="grid grid-cols-2 gap-2">
              {onOrderPO ? (
                <button
                  type="button"
                  onClick={() => onOrderPO(displayItem)}
                  className="inline-flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold bg-accent text-accent-foreground hover:opacity-90 cursor-pointer shadow-xs"
                >
                  <FilePlus2 className="h-4 w-4" />
                  Order via PO
                </button>
              ) : (
                <Link
                  href="/purchase-orders"
                  className="inline-flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold bg-accent text-accent-foreground hover:opacity-90 cursor-pointer shadow-xs"
                >
                  <FilePlus2 className="h-4 w-4" />
                  Order via PO
                </Link>
              )}
              {onRelease && (
                <button
                  type="button"
                  onClick={() => onRelease(displayItem)}
                  className="inline-flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-colors"
                >
                  <PackageMinus className="h-4 w-4" />
                  Issue
                </button>
              )}
              {onAdjust && (
                <button
                  type="button"
                  onClick={() => onAdjust(displayItem)}
                  className="inline-flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Adjust
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(displayItem)}
                  className="inline-flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
                >
                  Edit details
                </button>
              )}
            </div>
          )}

          {/* Specifications & Logistics */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              Specifications & Logistics
            </h3>
            <div className="p-4 rounded-xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-950/20 shadow-xs space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-bg/80 border border-indigo-500/15">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-400 block mb-0.5">
                    Measurement Unit
                  </span>
                  <span className="font-bold text-sm text-text capitalize">
                    {displayItem.unit}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-bg/80 border border-indigo-500/15">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-400 block mb-0.5">
                    Minimum Reorder Threshold
                  </span>
                  <span className="font-bold text-sm text-text">
                    {displayItem.minThreshold} {displayItem.unit}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-bg/80 border border-indigo-500/15">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-400 block mb-0.5">
                    Storage Location
                  </span>
                  <span className="font-semibold text-xs text-text flex items-center gap-1.5 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    {displayItem.location || "Unspecified"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-bg/80 border border-indigo-500/15">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-400 block mb-0.5">
                    Last Known Supplier
                  </span>
                  <span className="font-semibold text-xs text-text flex items-center gap-1.5 mt-0.5">
                    <Truck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    {displayItem.supplier || "Unspecified"}
                  </span>
                </div>
              </div>
              {displayItem.notes && (
                <div className="pt-2.5 border-t border-indigo-500/15">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <StickyNote className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Additional Notes
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary font-medium leading-relaxed pl-0.5">
                    {displayItem.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Supplier lots + QR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                Purchase lots (QR per supplier batch)
              </h3>
              <span className="text-[10px] font-semibold text-text-secondary">
                {openLots.length} open · {lots.length} total
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Each restock creates a lot with frozen unit cost and supplier.
              Print the lot QR for shelf tags — staff scan it to release
              quantity.
            </p>

            {lotsLoading ? (
              <LoadingState
                variant="card"
                icon="truck"
                message="Loading active purchase lots…"
                subtitle="Retrieving intake batches and lot allocations"
              />
            ) : lots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-xs text-text-secondary">
                  No purchase lots yet. Restock with a supplier and unit cost to
                  create one.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {lots.map((lot) => {
                  const expanded = expandedLotId === lot.id;
                  const depleted = lot.quantityRemaining <= 0;
                  return (
                    <li
                      key={lot.id}
                      className={cn(
                        "rounded-lg border border-border bg-bg overflow-hidden",
                        depleted && "opacity-70"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLotId(expanded ? null : lot.id)
                        }
                        className="w-full flex items-start gap-3 p-3 text-left hover:bg-bg-subtle/60 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-text">
                              {lot.lotCode}
                            </span>
                            {depleted ? (
                              <span className="text-[9px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-bg-subtle text-text-secondary border border-border">
                                Depleted
                              </span>
                            ) : (
                              <span className="text-[9px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-status-active-bg/15 text-status-active-text border border-status-active-bg/30">
                                Open
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-text-secondary truncate">
                            {lot.supplierName || "No supplier"} ·{" "}
                            {formatPhp(Number(lot.unitCost))}/{displayItem.unit}
                          </p>
                          <p className="text-[11px] text-text">
                            <span className="font-semibold">
                              {lot.quantityRemaining}
                            </span>
                            /{lot.quantity} remaining · received{" "}
                            {lot.purchasedOn}
                            {lot.recordedByName
                              ? ` · by ${lot.recordedByName}`
                              : ""}
                          </p>
                        </div>
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-text-secondary shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-text-secondary shrink-0 mt-0.5" />
                        )}
                      </button>

                      {expanded && (
                        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                          <LotQrCodeDisplay
                            lotCode={lot.lotCode}
                            qrPayload={lot.qrPayload}
                            label={`${lot.itemName} · ${lot.supplierName || "—"}`}
                            size={128}
                          />
                          {!depleted && onRelease && (
                            <button
                              type="button"
                              onClick={() => onRelease(displayItem, lot)}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <PackageMinus className="h-3.5 w-3.5" />
                              Issue from this lot
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Stock movement ledger */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Stock ledger
              </h3>
              <Link
                href={`/issue-history?item=${encodeURIComponent(displayItem.itemCode)}`}
                title="View issue history"
                className="p-1 rounded-md text-text-secondary hover:text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
                aria-label="View issue history"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>

            {movementsLoading && movements.length === 0 ? (
              <LoadingState
                variant="card"
                icon="layers"
                message="Loading stock ledger…"
                subtitle="Retrieving in/out movements"
              />
            ) : movements.length === 0 ? (
              <div className="p-4 rounded-xl border border-border bg-bg shadow-xs">
                <p className="text-xs text-text-secondary text-center py-3">
                  No stock movements logged yet.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border bg-bg shadow-xs">
                <>
                  <div className="relative">
                    <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                      {displayedMovements.map((m) => {
                        const signedQty =
                          m.direction === "out" ? -m.qty : m.qty;
                        const style = getMovementStyle(m.reason, m.direction);
                        return (
                          <li key={m.id} className="relative pl-6">
                            <span
                              className={cn(
                                "absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-bg shadow-sm z-10",
                                style.bg,
                                style.iconText
                              )}
                            >
                              {getMovementIcon(m.reason)}
                            </span>
                            <div className="flex items-start justify-between gap-2 text-xs pt-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={cn(
                                    "font-bold capitalize",
                                    style.text
                                  )}
                                >
                                  {movementReasonLabel(m.reason)}
                                </span>
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border",
                                    style.badge
                                  )}
                                >
                                  {signedQty > 0 ? "+" : ""}
                                  {signedQty} {displayItem.unit}
                                </span>
                                <span className="font-mono text-[10px] font-semibold text-text-secondary">
                                  {m.movementCode}
                                </span>
                              </div>
                              <time className="text-[11px] text-text-secondary shrink-0 font-medium">
                                {formatDisplayDate(m.createdAt)}
                              </time>
                            </div>
                            <p className="text-xs text-text-secondary mt-0.5 font-medium">
                              By{" "}
                              <span className="font-semibold text-text">
                                {m.actorName}
                              </span>
                              {m.destinationLabel
                                ? ` · ${m.destinationLabel}`
                                : null}
                            </p>
                            {(m.lotCode || m.unitCost || m.lineTotal) && (
                              <div className="mt-1.5 text-[11px] space-y-0.5 rounded border border-border bg-bg-subtle px-2 py-1.5">
                                {m.lotCode && (
                                  <p>
                                    <span className="text-text-secondary">
                                      Lot{" "}
                                    </span>
                                    <span className="font-mono font-semibold">
                                      {m.lotCode}
                                    </span>
                                  </p>
                                )}
                                {(m.unitCost || m.lineTotal) && (
                                  <p>
                                    {m.unitCost && (
                                      <>
                                        <span className="text-text-secondary">
                                          Unit{" "}
                                        </span>
                                        <span className="font-semibold">
                                          {formatPhp(Number(m.unitCost))}
                                        </span>
                                      </>
                                    )}
                                    {m.lineTotal && (
                                      <>
                                        <span className="text-text-secondary">
                                          {" "}
                                          · Line{" "}
                                        </span>
                                        <span className="font-semibold">
                                          {formatPhp(Number(m.lineTotal))}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                            {m.notes && (
                              <AuditNoteDisplay action={m.reason} note={m.notes} />
                            )}
                          </li>
                        );
                      })}
                    </ol>

                    {movements.length > 4 && !isHistoryExpanded && (
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-bg via-bg/85 to-transparent pointer-events-none" />
                    )}
                  </div>

                  {movements.length > 4 && (
                    <div
                      className={cn(
                        "relative z-10 flex justify-center",
                        !isHistoryExpanded ? "-mt-4 pt-1" : "mt-4 pt-2"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-bg/90 backdrop-blur-xs hover:bg-primary/10 border border-border shadow-xs cursor-pointer py-1 px-3 rounded-full transition-all duration-150"
                      >
                        {isHistoryExpanded ? (
                          <>
                            Show less <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            See more ({movements.length - 4} more){" "}
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>

    <div className="hidden print:block">
      <IndividualConsumablePrintableReport item={displayItem} lots={lots} movements={movements} />
    </div>
    </>
  );
}
