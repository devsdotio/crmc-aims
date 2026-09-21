"use client";

import React, { useEffect, useRef } from "react";
import {
  X,
  User,
  MapPin,
  Tag,
  Calendar,
  Wrench,
  FileText,
  History,
  ShieldCheck,
  CheckCircle2,
  Package,
  PackageCheck,
  PackageMinus,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { LoadingState } from "@/components/providers/loading-context";
import { useAssetLifecycleQuery, type AssetLifecycleEvent } from "@/features/assets/client";
import { formatDateTime, formatRelativeTime } from "./audit-log-utils";
import type { Asset } from "@/types/assets";

interface AssetAuditDetailPanelProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
}

function getLifecycleEventMeta(eventType: string) {
  switch (eventType.toLowerCase()) {
    case "created":
      return {
        label: "Asset Registered & Tagged",
        bg: "bg-status-active-bg/20",
        text: "text-status-active-text",
        icon: <Sparkles className="h-3 w-3" />,
      };
    case "released":
      return {
        label: "Borrowed / Released",
        bg: "bg-status-repair-bg/20",
        text: "text-status-repair-text",
        icon: <PackageMinus className="h-3 w-3" />,
      };
    case "returned":
      return {
        label: "Returned to Custody",
        bg: "bg-status-active-bg/20",
        text: "text-status-active-text",
        icon: <RotateCcw className="h-3 w-3" />,
      };
    case "updated":
      return {
        label: "Asset Details Updated",
        bg: "bg-category-computing-bg/20",
        text: "text-category-computing-bg",
        icon: <FileText className="h-3 w-3" />,
      };
    case "flagged_maintenance":
      return {
        label: "Flagged for Maintenance / Repair",
        bg: "bg-status-outofservice-bg/20",
        text: "text-status-outofservice-text",
        icon: <Wrench className="h-3 w-3" />,
      };
    case "status_changed":
      return {
        label: "Status Transition",
        bg: "bg-bg-subtle",
        text: "text-text",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    default:
      return {
        label: eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        bg: "bg-bg-subtle",
        text: "text-text-secondary",
        icon: <History className="h-3 w-3" />,
      };
  }
}

export function AssetAuditDetailPanel({
  asset,
  isOpen,
  onClose,
}: AssetAuditDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { getCategoryStyle } = useCategoryStyleMap();
  const { data: lifecycleEvents = [], isLoading: isLifecycleLoading } = useAssetLifecycleQuery(
    isOpen && asset?.id ? asset.id : ""
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

  if (!isOpen || !asset) return null;

  const catStyle = getCategoryStyle(asset.category);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-audit-heading"
        className={cn(
          "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out"
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="asset-audit-heading" className="font-mono text-lg font-bold tracking-tight text-text">
                {asset.assetCode}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border",
                  asset.status === "active"
                    ? "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                    : asset.status === "needs_repair"
                    ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                    : "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                )}
              >
                {asset.currentHolder ? "Borrowed / In-Use" : asset.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-text-secondary font-medium mt-0.5 truncate">
              Asset Lifecycle Audit Trail • <strong className="text-text font-semibold">{asset.name}</strong>
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
          {/* Asset Identity Card */}
          <div className="p-4 rounded-xl border border-border bg-bg space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-text">{asset.name}</h3>
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
                  <span className="text-xs text-text-secondary capitalize">
                    {asset.assignmentType}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{asset.location}</span>
              </div>
              <div className="flex items-center gap-1.5 text-text-secondary">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {asset.currentHolder ? (
                    <strong className="text-text">{asset.currentHolder}</strong>
                  ) : (
                    "Available in Storage"
                  )}
                </span>
              </div>
              {asset.serialNumber && (
                <div className="col-span-2 flex items-center justify-between text-[11px] text-text-secondary pt-1">
                  <span>Serial Number:</span>
                  <span className="font-mono font-semibold text-text">{asset.serialNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action History / Complete Lifecycle Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Complete Lifecycle History
              </h3>
              {isLifecycleLoading ? (
                <span className="text-[11px] font-semibold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-accent" />
                  <span>Preparing full history…</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-text-secondary bg-bg-subtle px-2 py-0.5 rounded-full border border-border">
                  {lifecycleEvents.length} {lifecycleEvents.length === 1 ? "event" : "events"}
                </span>
              )}
            </div>

            {isLifecycleLoading ? (
              <LoadingState
                variant="card"
                icon="package"
                message="Loading complete asset lifecycle history…"
                subtitle="Retrieving registration, checkout releases, returns, and maintenance logs"
              />
            ) : lifecycleEvents.length === 0 ? (
              <div className="p-4 rounded-lg border border-border bg-bg text-center text-xs text-text-secondary">
                No recorded lifecycle actions yet for this asset.
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-border bg-bg">
                <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                  {lifecycleEvents.map((evt) => {
                    const meta = getLifecycleEventMeta(evt.eventType);
                    const changes = evt.payload?.changes;
                    const hasChanges = changes && Object.keys(changes).length > 0;

                    return (
                      <li key={evt.id} className="pl-6 relative">
                        <span
                          className={cn(
                            "absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-bg shadow-sm z-10",
                            meta.bg,
                            meta.text
                          )}
                        >
                          {meta.icon}
                        </span>

                        <div className="flex flex-col gap-0.5 pt-1.5">
                          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                            <span className={cn("font-bold capitalize", meta.text)}>
                              {meta.label}
                            </span>
                            <time className="text-[11px] text-text-secondary font-medium">
                              {formatDateTime(evt.createdAt)}
                            </time>
                          </div>
                          <p className="text-xs text-text-secondary font-medium">
                            By {evt.actor.displayName}
                          </p>
                        </div>

                        {/* Event Context Badges */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {evt.toHolder && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-bg-subtle text-text border border-border shadow-xs">
                              <User className="h-3 w-3 text-text-secondary" />
                              Borrowed by: {evt.toHolder}
                            </span>
                          )}
                          {evt.fromHolder && evt.eventType === "returned" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-bg-subtle text-text border border-border shadow-xs">
                              <User className="h-3 w-3 text-text-secondary" />
                              Returned by: {evt.fromHolder}
                            </span>
                          )}
                          {evt.payload?.condition && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-bg-subtle text-text border border-border shadow-xs capitalize">
                              <Wrench className="h-3 w-3 text-text-secondary" />
                              Condition: {evt.payload.condition}
                            </span>
                          )}
                          {evt.payload?.expectedReturnDate && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-bg-subtle text-text-secondary border border-border shadow-xs">
                              <Calendar className="h-3 w-3" />
                              Expected: {evt.payload.expectedReturnDate}
                            </span>
                          )}
                          {evt.payload?.notes && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-xs max-w-full bg-bg-subtle text-text border-border">
                              <FileText className="h-3 w-3 shrink-0 text-text-secondary" />
                              <span className="truncate whitespace-normal leading-tight">
                                {evt.payload.notes}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Field Changes Table (if update event) */}
                        {hasChanges && (
                          <div className="mt-2.5 p-2.5 rounded-lg border border-border bg-bg-subtle/80 space-y-1.5 text-xs">
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

          {/* Maintenance Logs Snapshot */}
          {asset.maintenanceHistory && asset.maintenanceHistory.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Maintenance & Repair Ledger
              </h3>
              <div className="rounded-lg border border-border bg-bg overflow-hidden divide-y divide-border">
                {asset.maintenanceHistory.map((m) => (
                  <div key={m.id} className="p-3 text-xs flex items-start justify-between gap-3">
                    <div>
                      <span className="font-bold text-text capitalize block">{m.type}</span>
                      <p className="text-text-secondary mt-0.5">{m.description}</p>
                      <span className="text-[10px] text-text-secondary mt-1 block">
                        Technician: {m.technician} • {m.date}
                      </span>
                    </div>
                    {typeof m.cost === "number" && (
                      <span className="font-mono font-bold text-text shrink-0">
                        ₱{m.cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between shrink-0">
          <span className="text-xs text-text-secondary">Immutable Asset Audit Trail</span>
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
