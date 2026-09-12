"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Edit3,
  MapPin,
  User,
  Tag,
  Calendar,
  Truck,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  PackageCheck,
  PackageMinus,
  RotateCcw,
  History,
  Wrench,
  Clock,
  ArrowRight,
  Phone,
  Mail,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Box,
  QrCode,
  Layers,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { custodyBadgeLabel, isProjectCustody } from "@/lib/assets-custody";
import Link from "next/link";

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "Unrecorded";
  const date = dateStr.includes("T") ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
import type { Asset, AssetStatus, MaintenanceLogEntry } from "@/types/assets";
import type { BorrowRequest, ActionHistoryLog } from "@/types/borrow-requests";
import { useSuppliersQuery } from "@/features/suppliers/client";
import {
  useAssetLifecycleQuery,
  type AssetLifecycleEvent,
  type AssetChangesMap,
} from "@/features/assets/client";
import { QRCodeDisplay } from "./qr-code-display";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { useBorrowRequests } from "@/features/borrow-requests/client";
import { AuditNoteDisplay } from "@/components/audit-logs/audit-log-utils";
import { LoadingState } from "@/components/providers/loading-context";

function getTimelineIcon(status: string) {
  switch (status.toLowerCase()) {
    case "pending":
    case "submitted":
      return <Send className="h-3.5 w-3.5" />;
    case "approved":
    case "created":
      return <CheckCircle className="h-3.5 w-3.5" />;
    case "rejected":
    case "cancelled":
    case "out_of_service":
    case "deleted":
      return <XCircle className="h-3.5 w-3.5" />;
    case "released":
      return <PackageCheck className="h-3.5 w-3.5" />;
    case "unreleased":
      return <PackageMinus className="h-3.5 w-3.5" />;
    case "returned":
      return <RotateCcw className="h-3.5 w-3.5" />;
    case "maintenance":
    case "needs_repair":
    case "flagged_maintenance":
      return <Wrench className="h-3.5 w-3.5" />;
    case "updated":
    case "status_changed":
      return <FileText className="h-3.5 w-3.5" />;
    default:
      return <History className="h-3.5 w-3.5" />;
  }
}

function getTimelineStyle(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
    case "released":
    case "created":
      return {
        bg: "bg-status-active-bg text-white border-status-active-bg",
        text: "text-status-active-text",
        badge: "bg-status-active-bg text-white border-transparent",
        iconText: "text-white",
      };
    case "pending":
    case "submitted":
    case "borrow":
      return {
        bg: "bg-primary text-white border-primary",
        text: "text-primary dark:text-blue-400",
        badge: "bg-primary text-white border-transparent",
        iconText: "text-white",
      };
    case "returned":
      return {
        bg: "bg-category-computing-bg text-white border-category-computing-bg",
        text: "text-sky-700 dark:text-sky-400",
        badge: "bg-category-computing-bg text-white border-transparent",
        iconText: "text-white",
      };
    case "voided":
      return {
        bg: "bg-status-repair-bg text-white border-status-repair-bg",
        text: "text-status-repair-text",
        badge: "bg-status-repair-bg text-white border-transparent",
        iconText: "text-white",
      };
    case "maintenance":
    case "needs_repair":
    case "flagged_maintenance":
    case "unreleased":
      return {
        bg: "bg-status-repair-bg text-white border-status-repair-bg",
        text: "text-status-repair-text",
        badge: "bg-status-repair-bg text-white border-transparent",
        iconText: "text-white",
      };
    case "rejected":
    case "cancelled":
    case "out_of_service":
    case "deleted":
      return {
        bg: "bg-status-outofservice-bg text-white border-status-outofservice-bg",
        text: "text-status-outofservice-text",
        badge: "bg-status-outofservice-bg text-white border-transparent",
        iconText: "text-white",
      };
    case "updated":
    case "status_changed":
      return {
        bg: "bg-indigo-600 text-white border-indigo-600",
        text: "text-indigo-600 dark:text-indigo-400",
        badge: "bg-indigo-600 text-white border-transparent",
        iconText: "text-white",
      };
    default:
      return {
        bg: "bg-slate-700 text-white border-slate-700",
        text: "text-text",
        badge: "bg-slate-700 text-white border-transparent",
        iconText: "text-white",
      };
  }
}

const FIELD_LABELS: Record<string, string> = {
  assetCode: "Asset Code",
  name: "Asset Name",
  category: "Category",
  status: "Status",
  assignmentType: "Assignment Type",
  modelId: "Product Model",
  serialNumber: "Serial Number",
  location: "Location",
  currentHolder: "Custody / Holder",
  department: "Department",
  purchaseDate: "Acquisition Date",
  value: "Inventory Value",
  supplierId: "Supplier",
  imageUrl: "Image URL",
  notes: "Custody / Item Notes",
};

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "None";
  }
  if (key === "value" && (typeof value === "number" || typeof value === "string")) {
    const num = Number(value);
    if (!isNaN(num)) {
      return `₱${num.toLocaleString()}`;
    }
  }
  return String(value);
}

type UnifiedTimelineItem =
  | {
      id: string;
      kind: "request";
      date: Date;
      title: string;
      subtitle: string;
      department?: string;
      status: string;
      iconType: string;
      request: BorrowRequest;
    }
  | {
      id: string;
      kind: "lifecycle";
      date: Date;
      title: string;
      subtitle: string;
      department?: string;
      status: string;
      iconType: string;
      event: AssetLifecycleEvent;
      changes?: AssetChangesMap;
    }
  | {
      id: string;
      kind: "maintenance";
      date: Date;
      title: string;
      subtitle: string;
      department?: string;
      status: string;
      iconType: string;
      maintenance: MaintenanceLogEntry;
    };

function RequestDetailsSection({ request }: { request: BorrowRequest }) {
  const historyLogs = Array.isArray(request.history) ? request.history : [];

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border/80 bg-bg-subtle/60 p-3 text-xs">
      {/* Request Meta Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text">
        {request.purpose && (
          <div className="col-span-full">
            <span className="font-semibold text-text-secondary text-[10px] uppercase tracking-wider block mb-0.5">
              Purpose
            </span>
            <p className="text-text leading-relaxed font-medium bg-bg/70 px-2.5 py-1.5 rounded border border-border/50">
              {request.purpose}
            </p>
          </div>
        )}

        <div>
          <span className="font-semibold text-text-secondary text-[10px] uppercase tracking-wider block mb-0.5">
            Requester Contact
          </span>
          <div className="space-y-0.5 text-text-secondary">
            {request.requesterEmail && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{request.requesterEmail}</span>
              </div>
            )}
            {request.requesterPhone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{request.requesterPhone}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <span className="font-semibold text-text-secondary text-[10px] uppercase tracking-wider block mb-0.5">
            Dates & Handover
          </span>
          <div className="space-y-0.5 text-text-secondary">
            {request.expectedReturnDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>Expected Return: {request.expectedReturnDate}</span>
              </div>
            )}
            {request.pickedUpBy && (
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 shrink-0" />
                <span>Picked up by: {request.pickedUpBy}</span>
              </div>
            )}
          </div>
        </div>

        {request.rejectionReason && (
          <div className="col-span-full rounded bg-destructive/10 border border-destructive/20 p-2 text-destructive">
            <div className="flex items-center gap-1.5 font-bold mb-0.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Rejection Reason:
            </div>
            <p className="leading-relaxed">{request.rejectionReason}</p>
          </div>
        )}

        {request.notes && !request.rejectionReason && (
          <div className="col-span-full">
            <span className="font-semibold text-text-secondary text-[10px] uppercase tracking-wider block mb-0.5">
              Request Notes
            </span>
            <p className="text-text-secondary bg-bg/50 px-2 py-1 rounded border border-border/40">
              {request.notes}
            </p>
          </div>
        )}
      </div>

      {/* Step-by-Step History Sub-timeline */}
      {historyLogs.length > 0 && (
        <div className="pt-2 border-t border-border/60">
          <span className="font-bold text-text-secondary text-[10px] uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Clock className="h-3 w-3" />
            Request Action History ({historyLogs.length} events)
          </span>
          <div className="space-y-2 relative border-l-2 border-border/60 ml-2 pl-3">
            {historyLogs.map((log, idx) => {
              const stepStyle = getTimelineStyle(log.action);
              const logDate = log.timestamp ? new Date(log.timestamp) : null;
              return (
                <div key={log.id || `step-${idx}`} className="relative group">
                  <div
                    className={cn(
                      "absolute -left-4.75 top-1 h-3 w-3 rounded-full border-2 bg-bg",
                      stepStyle.bg.replace("text-white", "")
                    )}
                  />
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("font-bold text-[11px] capitalize", stepStyle.text)}>
                        {log.action}
                      </span>
                      <span className="text-[11px] text-text-secondary font-medium">
                        by {log.actor}
                      </span>
                    </div>
                    {logDate && (
                      <time className="text-[10px] text-text-secondary font-mono">
                        {logDate.toLocaleDateString()} {logDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    )}
                  </div>
                  {log.note && (
                    <AuditNoteDisplay action={log.action} note={log.note} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LifecycleDetailsSection({ item }: { item: Extract<UnifiedTimelineItem, { kind: "lifecycle" }> }) {
  const { event, changes } = item;
  const changesEntries = changes ? Object.entries(changes) : [];

  return (
    <div className="mt-3 space-y-2.5 rounded-lg border border-border/80 bg-bg-subtle/60 p-3 text-xs">
      {/* Performed by */}
      <div className="flex items-center justify-between text-[11px] text-text-secondary pb-1 border-b border-border/50">
        <div className="flex items-center gap-1.5 font-medium">
          <User className="h-3 w-3 text-text-secondary" />
          <span>Recorded by <strong className="text-text">{event.actor.displayName}</strong></span>
          {event.actor.email && <span className="opacity-70">({event.actor.email})</span>}
        </div>
      </div>

      {/* Field Level Changes Diffs */}
      {changesEntries.length > 0 && (
        <div className="space-y-1.5">
          <span className="font-bold text-text-secondary text-[10px] uppercase tracking-wider block mb-1">
            Changed Details ({changesEntries.length} {changesEntries.length === 1 ? "field" : "fields"})
          </span>
          <div className="space-y-1.5">
            {changesEntries.map(([fieldKey, diff]) => {
              const label = FIELD_LABELS[fieldKey] || fieldKey;
              return (
                <div
                  key={fieldKey}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded bg-bg border border-border/70 text-xs shadow-2xs"
                >
                  <span className="font-semibold text-text-secondary text-[11px]">
                    {label}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      title="Previous value"
                      className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-destructive/10 text-destructive line-through border border-destructive/20"
                    >
                      {formatFieldValue(fieldKey, diff.from)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-text-secondary shrink-0" />
                    <span
                      title="New updated value"
                      className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-status-active-bg/15 text-status-active-text border border-status-active-bg/30"
                    >
                      {formatFieldValue(fieldKey, diff.to)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Transition */}
      {(event.fromStatus || event.toStatus) && event.eventType !== "updated" && (
        <div className="flex items-center justify-between gap-2 p-2 rounded bg-bg border border-border/60">
          <span className="font-semibold text-text-secondary text-[11px]">Status Transition</span>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-bg-subtle text-text-secondary border border-border">
              {event.fromStatus || "—"}
            </span>
            <ArrowRight className="h-3 w-3 text-text-secondary" />
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-status-active-bg text-white">
              {event.toStatus || "—"}
            </span>
          </div>
        </div>
      )}

      {/* Custody Transition */}
      {(event.fromHolder || event.toHolder) && (
        <div className="flex items-center justify-between gap-2 p-2 rounded bg-bg border border-border/60">
          <span className="font-semibold text-text-secondary text-[11px]">Custody Handover</span>
          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary font-medium">
              {event.fromHolder ? event.fromHolder : "In Stock"}
            </span>
            <ArrowRight className="h-3 w-3 text-text-secondary" />
            <span className="font-bold text-text">
              {event.toHolder ? event.toHolder : "In Stock"}
            </span>
          </div>
        </div>
      )}

      {/* Event Notes or Conditions */}
      {(Boolean(
        event.payload.notes ||
          event.payload.conditionNotes ||
          event.payload.returnNotes ||
          event.payload.condition ||
          event.payload.description ||
          event.payload.logCode ||
          event.payload.maintenanceLogCode ||
          event.payload.requestCode ||
          event.payload.source ||
          event.payload.repairCost != null ||
          event.payload.resolutionNotes ||
          event.payload.technician ||
          event.payload.via ||
          event.payload.voided
      )) && (
        <div className="rounded bg-bg/80 p-2 border border-border/50 space-y-1">
          {event.payload.voided ? (
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Issue voided (undo)
            </p>
          ) : null}
          {event.payload.via != null && (
            <p className="text-text leading-relaxed text-[11px]">
              <strong className="text-text-secondary font-sans">Via:</strong>{" "}
              {String(event.payload.via)}
            </p>
          )}
          {event.payload.source != null && (
            <p className="text-text leading-relaxed text-[11px]">
              <strong className="text-text-secondary font-sans">Source:</strong>{" "}
              {String(event.payload.source) === "admin_manual"
                ? "Manual Issue"
                : String(event.payload.source) === "project_legacy"
                  ? "Project Issue"
                  : String(event.payload.source) === "manual_flag" ||
                      String(event.payload.source) === "return_checkout" ||
                      String(event.payload.source) === "project_assignment"
                    ? String(event.payload.source).replace(/_/g, " ")
                    : "Portal Request"}
            </p>
          )}
          {event.payload.logCode != null && (
            <p className="text-text leading-relaxed font-mono text-[11px]">
              <strong className="text-text-secondary font-sans">Custody code:</strong>{" "}
              {String(event.payload.logCode)}
            </p>
          )}
          {event.payload.maintenanceLogCode != null && (
            <p className="text-text leading-relaxed font-mono text-[11px]">
              <strong className="text-text-secondary font-sans">Maintenance log:</strong>{" "}
              {String(event.payload.maintenanceLogCode)}
            </p>
          )}
          {event.payload.requestCode != null && (
            <p className="text-text leading-relaxed font-mono text-[11px]">
              <strong className="text-text-secondary font-sans">Request:</strong>{" "}
              {String(event.payload.requestCode)}
            </p>
          )}
          {event.payload.technician != null && (
            <p className="text-text leading-relaxed text-[11px]">
              <strong className="text-text-secondary font-sans">Technician:</strong>{" "}
              {String(event.payload.technician)}
            </p>
          )}
          {event.payload.repairCost != null && event.payload.repairCost !== "" && (
            <p className="text-text leading-relaxed font-mono text-[11px]">
              <strong className="text-text-secondary font-sans">Repair cost:</strong>{" "}
              ₱
              {Number(event.payload.repairCost).toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
          {event.payload.description && (
            <p className="text-text leading-relaxed">
              <strong className="text-text-secondary">Description:</strong> {String(event.payload.description)}
            </p>
          )}
          {event.payload.condition && (
            <p className="text-text leading-relaxed">
              <strong className="text-text-secondary">Condition:</strong> {String(event.payload.condition)}
            </p>
          )}
          {Boolean(
            event.payload.notes ||
              event.payload.conditionNotes ||
              event.payload.returnNotes ||
              event.payload.resolutionNotes
          ) && (
            <div className="pt-1">
              <AuditNoteDisplay
                action={event.payload.voided ? "voided" : event.eventType}
                note={String(
                  event.payload.resolutionNotes ||
                    event.payload.notes ||
                    event.payload.conditionNotes ||
                    event.payload.returnNotes
                )}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MaintenanceDetailsSection({ maintenance }: { maintenance: MaintenanceLogEntry }) {
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border/80 bg-bg-subtle/60 p-3 text-xs text-text">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="font-semibold text-text-secondary text-[10px] uppercase tracking-wider block">
            Technician
          </span>
          <p className="font-medium text-text mt-0.5">{maintenance.technician}</p>
        </div>
        <div>
          <span className="font-semibold text-text-secondary text-[10px] uppercase tracking-wider block">
            Maintenance Type
          </span>
          <p className="font-medium text-text capitalize mt-0.5">{maintenance.type}</p>
        </div>
        {maintenance.cost !== undefined && maintenance.cost !== null && (
          <div>
            <span className="font-semibold text-text-secondary text-[10px] uppercase tracking-wider block">
              Repair / Service Cost
            </span>
            <p className="font-mono font-medium text-text mt-0.5">₱{maintenance.cost.toLocaleString()}</p>
          </div>
        )}
      </div>

      {maintenance.description && (
        <div className="pt-2 border-t border-border/50">
          <span className="font-semibold text-text-secondary text-[10px] uppercase tracking-wider block mb-0.5">
            Work Description
          </span>
          <p className="text-text bg-bg/80 p-2 rounded border border-border/50 leading-relaxed font-medium">
            {maintenance.description}
          </p>
        </div>
      )}
    </div>
  );
}

function requestIncludesAsset(
  request: BorrowRequest,
  asset: Pick<Asset, "id" | "assetCode">
): boolean {
  return request.items.some(
    (item) =>
      item.assetId === asset.id ||
      (Boolean(item.assetCode) && item.assetCode === asset.assetCode)
  );
}

function AssetHistoryTimeline({ asset }: { asset: Asset }) {
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  const { data: requestData, isLoading: isRequestsLoading } = useBorrowRequests({
    assetId: asset.id,
    limit: 50,
    enabled: Boolean(asset.id),
  });

  const { data: lifecycleData, isLoading: isLifecycleLoading } = useAssetLifecycleQuery(
    asset.id,
    100
  );

  useEffect(() => {
    setIsListExpanded(false);
    setExpandedItemIds(new Set());
  }, [asset.id]);

  const toggleItemExpansion = (id: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isLoading = isRequestsLoading || isLifecycleLoading;

  if (isLoading) {
    return (
      <LoadingState
        variant="card"
        icon="history"
        message="Loading asset lifecycle & history..."
        subtitle="Retrieving custody handovers, borrow records, and audit events"
      />
    );
  }

  const requests = (requestData?.data || []).filter((req) =>
    requestIncludesAsset(req, asset)
  );
  const lifecycleEvents = (lifecycleData || []).filter(
    (ev) => ev.assetId === asset.id
  );
  const timeline: UnifiedTimelineItem[] = [];

  // 1. Map Borrow Requests
  for (const req of requests) {
    timeline.push({
      id: `req-${req.id}`,
      kind: "request",
      date: new Date(req.requestedAt),
      title: req.requestCode,
      subtitle: `By ${req.requesterName}`,
      department: req.department,
      status: req.status,
      iconType: req.status,
      request: req,
    });
  }

  // 2. Map Real Lifecycle Events
  if (lifecycleEvents.length > 0) {
    for (const ev of lifecycleEvents) {
      let title = "Asset Activity";
      let statusLabel = ev.toStatus || ev.eventType;

      if (ev.eventType === "updated") {
        title = "Asset Updated";
        statusLabel = "updated";
      } else if (ev.eventType === "created") {
        title = "Asset Registered";
        statusLabel = "created";
      } else if (ev.eventType === "status_changed") {
        if (ev.payload?.via === "maintenance_resolved") {
          title = "Marked Serviceable (Repair Resolved)";
          statusLabel = "active";
        } else if (ev.payload?.via === "flagged_maintenance") {
          title = `Status Changed: ${ev.fromStatus || "—"} → ${ev.toStatus || "—"}`;
          statusLabel = ev.toStatus || "needs_repair";
        } else {
          title = `Status Changed: ${ev.fromStatus || "—"} → ${ev.toStatus || "—"}`;
          statusLabel = ev.toStatus || "status_changed";
        }
      } else if (ev.eventType === "released") {
        const releaseSource = ev.payload?.source;
        const sourceTag =
          releaseSource === "admin_manual"
            ? " · Manual"
            : releaseSource === "project_legacy"
              ? " · Project"
              : ev.payload?.requestCode
                ? " · Request"
                : "";
        title = `Released${ev.toHolder ? ` to ${ev.toHolder}` : ""}${sourceTag}`;
        statusLabel = "released";
      } else if (ev.eventType === "returned") {
        if (ev.payload?.voided) {
          title = "Issue Voided (Undo)";
          statusLabel = "voided";
        } else {
          const returnSource = ev.payload?.source;
          const sourceTag =
            returnSource === "admin_manual"
              ? " · Manual"
              : returnSource === "project_legacy"
                ? " · Project"
                : ev.payload?.requestCode || returnSource === "portal"
                  ? " · Request"
                  : "";
          title = `Returned${ev.fromHolder ? ` from ${ev.fromHolder}` : ""}${sourceTag}`;
          statusLabel = "returned";
        }
      } else if (ev.eventType === "flagged_maintenance") {
        title = "Flagged for Maintenance";
        statusLabel = "needs_repair";
      } else if (
        ev.eventType === "updated" &&
        ev.payload?.via === "maintenance_resolved"
      ) {
        title = "Maintenance Log Resolved";
        statusLabel = "maintenance";
      } else if (ev.eventType === "deleted") {
        title = "Asset Record Deleted";
        statusLabel = "deleted";
      }

      timeline.push({
        id: `lifecycle-${ev.id}`,
        kind: "lifecycle",
        date: new Date(ev.createdAt),
        title,
        subtitle: `By ${ev.actor.displayName}`,
        status: statusLabel,
        iconType: ev.eventType === "updated" ? "updated" : ev.eventType,
        event: ev,
        changes: ev.payload.changes,
      });
    }
  } else {
    // Fallback synthesis if lifecycle table has no historical records yet
    const creationDate = asset.purchaseDate
      ? new Date(asset.purchaseDate)
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1));

    timeline.push({
      id: "fallback-creation",
      kind: "lifecycle",
      date: creationDate,
      title: "Asset Created",
      subtitle: "System initialization",
      status: "created",
      iconType: "created",
      event: {
        id: "fallback-creation-ev",
        assetId: asset.id,
        assetCode: asset.assetCode,
        eventType: "created",
        actor: { userId: "", email: null, displayName: "System" },
        fromStatus: null,
        toStatus: asset.status,
        fromHolder: null,
        toHolder: asset.currentHolder || null,
        payload: {},
        createdAt: creationDate.toISOString(),
      },
    });

    if (asset.lastUpdated) {
      timeline.push({
        id: "fallback-update",
        kind: "lifecycle",
        date: new Date(asset.lastUpdated),
        title: "Last Updated",
        subtitle: "System record updated",
        status: "updated",
        iconType: "updated",
        event: {
          id: "fallback-update-ev",
          assetId: asset.id,
          assetCode: asset.assetCode,
          eventType: "updated",
          actor: { userId: "", email: null, displayName: "Staff" },
          fromStatus: null,
          toStatus: asset.status,
          fromHolder: null,
          toHolder: null,
          payload: {},
          createdAt: new Date(asset.lastUpdated).toISOString(),
        },
      });
    }
  }

  // 3. Standalone JSONB maintenance trail removed — lifecycle + maintenance_logs are source of truth.

  // Sort descending (newest first)
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  const displayedTimeline = isListExpanded ? timeline : timeline.slice(0, 4);

  if (timeline.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-text-secondary rounded-xl border border-border bg-bg">
        No history found for this asset.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-bg shadow-xs">
      <div className="relative">
        <ol className="relative border-l-2 border-border/60 ml-3 space-y-4">
          {displayedTimeline.map((item) => {
            const style = getTimelineStyle(item.iconType);
            const isExpanded = expandedItemIds.has(item.id);

            // Determine if item has rich expandable details
            const hasExpandableDetails =
              item.kind === "request" ||
              (item.kind === "lifecycle" &&
                (Boolean(item.changes && Object.keys(item.changes).length > 0) ||
                  Boolean(item.event.fromStatus || item.event.toStatus) ||
                  Boolean(item.event.fromHolder || item.event.toHolder) ||
                  Boolean(
                    item.event.payload.notes ||
                      item.event.payload.conditionNotes ||
                      item.event.payload.returnNotes ||
                      item.event.payload.resolutionNotes ||
                      item.event.payload.description ||
                      item.event.payload.condition ||
                      item.event.payload.logCode ||
                      item.event.payload.maintenanceLogCode ||
                      item.event.payload.requestCode ||
                      item.event.payload.source ||
                      item.event.payload.repairCost != null ||
                      item.event.payload.technician ||
                      item.event.payload.via ||
                      item.event.payload.voided
                  ))) ||
              item.kind === "maintenance";

            return (
              <li key={item.id} className="relative pl-6">
                <span
                  className={cn(
                    "absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center shadow-sm z-10",
                    style.bg,
                    style.iconText
                  )}
                >
                  {getTimelineIcon(item.iconType)}
                </span>

                <div
                  className={cn(
                    "rounded-lg transition-all duration-150",
                    hasExpandableDetails && "hover:bg-bg-subtle/40 -mx-1.5 px-1.5 py-1"
                  )}
                >
                  {/* Item Header / Clickable Toggle */}
                  <div
                    role={hasExpandableDetails ? "button" : undefined}
                    tabIndex={hasExpandableDetails ? 0 : undefined}
                    aria-expanded={hasExpandableDetails ? isExpanded : undefined}
                    onClick={() => hasExpandableDetails && toggleItemExpansion(item.id)}
                    onKeyDown={(e) => {
                      if (hasExpandableDetails && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        toggleItemExpansion(item.id);
                      }
                    }}
                    className={cn(
                      "flex items-start justify-between gap-2 text-xs select-none",
                      hasExpandableDetails && "cursor-pointer group"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "font-bold capitalize transition-colors",
                            style.text,
                            hasExpandableDetails && "group-hover:underline"
                          )}
                        >
                          {item.title}
                        </span>
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase inline-block shadow-2xs",
                            style.badge
                          )}
                        >
                          {item.status}
                        </span>

                        {item.kind === "lifecycle" && item.changes && Object.keys(item.changes).length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-text-secondary bg-bg-subtle px-1.5 py-0.5 rounded border border-border/60">
                            <Sparkles className="h-2.5 w-2.5 text-primary" />
                            {Object.keys(item.changes).length} {Object.keys(item.changes).length === 1 ? "change" : "changes"}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-secondary mt-0.5 font-medium">
                        {item.subtitle}
                        {item.department ? ` · ${item.department}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <time className="text-[11px] text-text-secondary font-medium">
                        {item.date.toLocaleDateString()}
                      </time>
                      {hasExpandableDetails && (
                        <span className="p-0.5 rounded text-text-secondary hover:text-text group-hover:bg-bg-subtle transition-colors">
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expandable Body */}
                  {isExpanded && (
                    <div className="animate-in fade-in-50 duration-150">
                      {item.kind === "request" && <RequestDetailsSection request={item.request} />}
                      {item.kind === "lifecycle" && <LifecycleDetailsSection item={item} />}
                      {item.kind === "maintenance" && (
                        <MaintenanceDetailsSection maintenance={item.maintenance} />
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {timeline.length > 4 && !isListExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-bg via-bg/85 to-transparent pointer-events-none" />
        )}
      </div>

      {timeline.length > 4 && (
        <div
          className={cn(
            "relative z-10 flex justify-center",
            !isListExpanded ? "-mt-4 pt-1" : "mt-4 pt-2"
          )}
        >
          <button
            type="button"
            onClick={() => setIsListExpanded(!isListExpanded)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-bg/90 backdrop-blur-xs hover:bg-primary/10 border border-border shadow-xs cursor-pointer py-1 px-3 rounded-full transition-all duration-150"
          >
            {isListExpanded ? (
              <>
                Show less <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                See more ({timeline.length - 4} more){" "}
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export interface AssetDetailPanelProps {
  asset: Asset | null;
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onEdit?: (asset: Asset) => void;
  onIssue?: (asset: Asset) => void;
  onFlagMaintenance?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
}

const STATUS_STYLES: Record<
  AssetStatus,
  { bg: string; text: string; label: string }
> = {
  active: {
    bg: "bg-status-active-bg",
    text: "text-white font-bold",
    label: "Active",
  },
  needs_repair: {
    bg: "bg-status-repair-bg",
    text: "text-white font-bold",
    label: "Needs Repair",
  },
  out_of_service: {
    bg: "bg-status-outofservice-bg",
    text: "text-white font-bold",
    label: "Out of Service",
  },
  retired: {
    bg: "bg-status-retired-bg",
    text: "text-white font-bold",
    label: "Retired",
  },
  missing: {
    bg: "bg-status-outofservice-bg",
    text: "text-white font-bold",
    label: "Missing",
  },
};

export function AssetDetailPanel({
  asset,
  isOpen,
  isLoading = false,
  onClose,
  onEdit,
  onIssue,
  onFlagMaintenance,
  onDelete,
}: AssetDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { getCategoryStyle } = useCategoryStyleMap();
  // Suppliers only needed when panel is open with a linked vendor — never on list paint.
  const { data: suppliers = [] } = useSuppliersQuery({
    enabled: Boolean(isOpen && asset?.supplierId),
  });

  const supplierName = asset?.supplierId
    ? (suppliers.find((s) => s.id === asset.supplierId)?.name ?? null)
    : null;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (isLoading || !asset) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Loading asset details"
          className={cn(
            "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
            "animate-in slide-in-from-right duration-250 ease-in-out"
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
            <div className="h-6 w-36 bg-border/60 rounded-md animate-pulse" />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <LoadingState
              variant="card"
              icon="package"
              message="Loading asset details..."
              subtitle="Retrieving hardware specifications, maintenance logs, and custody status"
            />
          </div>
        </aside>
      </div>
    );
  }

  const categoryMeta = getCategoryStyle(asset.category);
  const statusMeta = STATUS_STYLES[asset.status];
  const showMaintenanceAction =
    asset.status !== "retired" &&
    asset.status !== "missing" &&
    (asset.status === "needs_repair" || Boolean(onFlagMaintenance));
  const canFlagMaintenance =
    Boolean(onFlagMaintenance) &&
    !asset.currentHolder &&
    asset.status === "active";
  const maintenanceDisabledReason = asset.currentHolder
    ? isProjectCustody(asset.currentHolder)
      ? "On a project — use Report damage on the project panel"
      : `In custody (${asset.currentHolder}) — return it first`
    : asset.status !== "active" && asset.status !== "needs_repair"
      ? "Only active assets can be flagged for maintenance"
      : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-detail-heading"
        className={cn(
          "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out",
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-bg-subtle/50 shrink-0 gap-3">
          <div className="min-w-0 flex-1 pr-3">
            <h2
              id="asset-detail-heading"
              className="font-mono text-base font-bold tracking-tight text-text truncate leading-tight"
            >
              {asset.assetCode}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                <Box className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate max-w-45">{asset.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 shrink-0">
            {showMaintenanceAction &&
              (asset.status === "needs_repair" ? (
                <Link
                  href={`/maintenance-logs?assetCode=${encodeURIComponent(asset.assetCode)}`}
                  aria-label="Open maintenance log to mark serviceable"
                  className="relative group inline-flex items-center justify-center p-1.5 rounded-md bg-status-repair-bg hover:opacity-90 text-white transition-opacity cursor-pointer shadow-xs shrink-0"
                >
                  <Wrench className="h-4 w-4" />
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-md border border-white/10 opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 scale-95 group-hover:scale-100 transition-all duration-150"
                  >
                    Mark Serviceable
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (canFlagMaintenance && onFlagMaintenance) {
                      onFlagMaintenance(asset);
                    }
                  }}
                  disabled={!canFlagMaintenance}
                  aria-label={
                    canFlagMaintenance
                      ? "Flag asset for maintenance"
                      : maintenanceDisabledReason ??
                        "Flag for maintenance unavailable"
                  }
                  className={cn(
                    "relative group inline-flex items-center justify-center p-1.5 rounded-md text-white shadow-xs shrink-0",
                    canFlagMaintenance
                      ? "bg-status-repair-bg hover:opacity-90 cursor-pointer transition-opacity"
                      : "bg-status-repair-bg/55 cursor-not-allowed"
                  )}
                >
                  <Wrench className="h-4 w-4" />
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 max-w-56 whitespace-normal text-center rounded-md bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-md border border-white/10 opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 scale-95 group-hover:scale-100 transition-all duration-150"
                  >
                    {canFlagMaintenance
                      ? "Flag for Maintenance"
                      : maintenanceDisabledReason ?? "Unavailable"}
                  </span>
                </button>
              ))}
            {onIssue && !asset.currentHolder && asset.status === "active" && (
              <button
                type="button"
                onClick={() => onIssue(asset)}
                aria-label="Issue asset to department or project"
                className="relative group inline-flex items-center justify-center p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <PackageMinus className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-md border border-white/10 opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 scale-95 group-hover:scale-100 transition-all duration-150"
                >
                  Issue Asset
                </span>
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(asset)}
                aria-label="Edit asset details"
                className="relative group inline-flex items-center justify-center p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Edit3 className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-md border border-white/10 opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 scale-95 group-hover:scale-100 transition-all duration-150"
                >
                  Edit Details
                </span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(asset)}
                aria-label="Delete asset"
                className="relative group inline-flex items-center justify-center p-1.5 rounded-md bg-destructive text-white hover:bg-destructive/90 transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full mt-1.5 right-0 z-50 whitespace-nowrap rounded-md bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-md border border-white/10 opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 scale-95 group-hover:scale-100 transition-all duration-150 origin-top-right"
                >
                  Delete Asset
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* QR Code Tag Card */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-primary" />
              Physical QR Tag
            </h3>
            <QRCodeDisplay assetCode={asset.assetCode} assetName={asset.name} />
          </div>

          {/* Asset Record Card */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              Asset Record & Condition
            </h3>

            <div className="bg-bg rounded-xl border border-indigo-500/25 shadow-xs overflow-hidden">
              {/* Status Header */}
              <div className="p-4 border-b border-indigo-500/15 bg-indigo-500/5 dark:bg-indigo-950/20 flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  Current Condition & Custody
                </span>
                <div className="flex gap-2">
                  {asset.currentHolder ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white uppercase tracking-wider">
                      {custodyBadgeLabel(asset.currentHolder, asset.assignmentType)}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-active-bg/20 text-status-active-text border border-status-active-bg/30 uppercase tracking-wider">
                      Available
                    </span>
                  )}
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      statusMeta.bg,
                      statusMeta.text,
                    )}
                  >
                    {statusMeta.label}
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      asset.assignmentType === "assignable"
                        ? "bg-amber-600/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                        : "bg-bg-subtle text-text-secondary border border-border",
                    )}
                  >
                    {asset.assignmentType === "assignable"
                      ? "Assignable"
                      : "General"}
                  </span>
                </div>
              </div>

              {asset.status === "needs_repair" && (
                <div className="px-4 py-3 border-b border-status-repair-bg/25 bg-status-repair-bg/10 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-status-repair-text">
                    Open repair flag — resolve via Maintenance Logs to mark serviceable again.
                  </p>
                  <Link
                    href={`/maintenance-logs?assetCode=${encodeURIComponent(asset.assetCode)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-status-repair-text hover:underline shrink-0"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Open maintenance log
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

              {/* Grid Properties */}
              <div className="p-5 grid grid-cols-2 gap-4 text-xs">
                <div className="p-2.5 rounded-lg bg-bg-subtle/50 border border-border/50">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Serial Number
                  </p>
                  <p className="text-sm font-mono font-bold text-text">
                    {asset.serialNumber || "N/A"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-bg-subtle/50 border border-border/50">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-indigo-500" /> Location
                  </p>
                  <p
                    className="text-sm font-medium text-text truncate"
                    title={asset.location}
                  >
                    {asset.location}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-bg-subtle/50 border border-border/50">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-500" /> Custody
                  </p>
                  <p className="text-sm font-medium text-text truncate">
                    {asset.currentHolder ? (
                      <span
                        title={`${asset.currentHolder} ${asset.department ? `(${asset.department})` : ""}`}
                        className="font-semibold text-text"
                      >
                        {asset.currentHolder}
                      </span>
                    ) : (
                      <span className="text-status-active-text font-semibold">
                        Available In Stock
                      </span>
                    )}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-bg-subtle/50 border border-border/50">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Acquisition
                  </p>
                  <p className="text-sm font-semibold text-text">
                    {formatDisplayDate(asset.purchaseDate)}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-bg-subtle/50 border border-border/50">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-indigo-500" /> Supplier
                  </p>
                  <p className="text-sm font-medium text-text truncate">
                    {supplierName ||
                      (asset.supplierId
                        ? "Supplier record unavailable"
                        : "Unspecified")}
                  </p>
                </div>

                {asset.value != null && asset.value !== undefined && (
                  <div className="p-2.5 rounded-lg bg-bg-subtle/50 border border-border/50">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                      Inventory Value (₱)
                    </p>
                    <p className="text-sm font-mono font-bold text-text">
                      ₱{asset.value.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes Full Width */}
              {asset.notes && (
                <div className="p-4 border-t border-indigo-500/15 bg-indigo-500/5 dark:bg-indigo-950/20">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <StickyNote className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Custody Notes & Details
                    </span>
                  </div>
                  <AuditNoteDisplay note={asset.notes} className="mt-0" />
                </div>
              )}
            </div>
          </div>

          {/* Asset History Card */}
          <div className="space-y-3 pb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Asset History
              </h3>
            </div>
            <AssetHistoryTimeline asset={asset} />
          </div>
        </div>
      </aside>
    </div>
  );
}
