"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Copy,
  Check,
  Calendar,
  User,
  Building2,
  FileText,
  Code2,
  History,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActionStyle,
  getActionIcon,
  formatDateTime,
  formatRelativeTime,
  formatEntityDisplayCode,
  parseAuditNote,
} from "./audit-log-utils";
import type { FlattenedLog, AuditLogRecord } from "@/features/audit-logs/client/audit-logs-api";

export type GroupedGeneralAuditRecord = {
  entityId: string;
  entityType: string;
  latestAction: string;
  latestActorName: string;
  latestActorUserId?: string | null;
  latestTimestamp: string;
  latestNotes?: string | null;
  latestMetadata?: Record<string, unknown> | null;
  history: AuditLogRecord[];
};

export type AuditDetailItem =
  | {
      type: "flattened";
      data: FlattenedLog;
    }
  | {
      type: "general";
      data: AuditLogRecord;
    }
  | {
      type: "grouped-general";
      data: GroupedGeneralAuditRecord;
    };

interface AuditLogDetailPanelProps {
  item: AuditDetailItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditLogDetailPanel({
  item,
  isOpen,
  onClose,
}: AuditLogDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const isGrouped = item.type === "grouped-general";
  const isFlattened = item.type === "flattened";
  const flatData = isFlattened ? item.data : null;
  const genData = item.type === "general" ? item.data : null;
  const groupData = isGrouped ? item.data : null;

  const rawEntityCode = isGrouped
    ? groupData?.entityId || "AUDIT-ENTITY"
    : isFlattened
    ? flatData?.requestCode || flatData?.id || "LOG-EVENT"
    : genData?.entityId || genData?.id || "AUDIT-EVENT";

  const departmentOrEntity = isGrouped
    ? groupData?.entityType
    : isFlattened
    ? flatData?.department
    : genData?.entityType;

  const metadata = isGrouped
    ? groupData?.latestMetadata
    : (genData?.metadata as Record<string, unknown> | null | undefined);

  const codeOrId = formatEntityDisplayCode(
    departmentOrEntity || "entity",
    rawEntityCode,
    metadata
  );

  const action = isGrouped
    ? groupData?.latestAction || "action"
    : isFlattened
    ? flatData?.action || "action"
    : genData?.action || "action";

  const actor = isGrouped
    ? groupData?.latestActorName || "System"
    : isFlattened
    ? flatData?.actor || "Unknown Actor"
    : genData?.actorName || "System";

  const timestamp = isGrouped
    ? groupData?.latestTimestamp || ""
    : isFlattened
    ? flatData?.timestamp || ""
    : genData?.timestamp
    ? new Date(genData.timestamp).toISOString()
    : "";

  const notes = isGrouped
    ? groupData?.latestNotes
    : isFlattened
    ? flatData?.note
    : genData?.notes;

  const historyList = isGrouped ? groupData?.history || [] : [];

  const style = getActionStyle(action);
  const icon = getActionIcon(action);
  const { picker, description } = parseAuditNote(action, notes);
  const isRejected =
    action.toLowerCase() === "rejected" ||
    action.toLowerCase() === "cancelled" ||
    action.toLowerCase() === "deleted";

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-detail-heading"
        className={cn(
          "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out"
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="audit-detail-heading" className="font-mono text-lg font-bold tracking-tight text-text">
                {codeOrId}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold border",
                  style.bg,
                  style.text
                )}
              >
                {style.label}
              </span>
            </div>
            <p className="text-xs text-text-secondary font-medium mt-0.5 truncate">
              System Audit Trail • <span className="text-text font-semibold capitalize">{departmentOrEntity || "General"}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit detail panel"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Status & Date Banner */}
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-border bg-bg-subtle flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
                  Latest Activity
                </span>
                <span className="font-bold text-text text-sm block mt-0.5">
                  {formatDateTime(timestamp)}
                </span>
                <span className="text-[11px] text-text-secondary">
                  {formatRelativeTime(timestamp)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(timestamp, "timestamp")}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-text px-2 py-1 bg-bg rounded border border-border transition-colors cursor-pointer"
                title="Copy ISO Timestamp"
              >
                {copiedKey === "timestamp" ? (
                  <Check className="h-3 w-3 text-status-active-text" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copy
              </button>
            </div>

            {/* Rejection / Cancellation Callout Banner */}
            {isRejected && notes && (
              <div className="p-3.5 rounded-lg border border-destructive bg-destructive/10 text-destructive text-xs">
                <span className="font-bold block mb-1">Rejection / Cancellation Reason:</span>
                {notes}
              </div>
            )}
          </div>

          {/* Action History / Lifecycle Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Action History
              </h3>
              {isGrouped && (
                <span className="text-[11px] font-semibold text-text-secondary bg-bg-subtle px-2 py-0.5 rounded-full border border-border">
                  {historyList.length} {historyList.length === 1 ? "event" : "events"}
                </span>
              )}
            </div>
            <div className="p-4 rounded-lg border border-border bg-bg">
              <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                {isGrouped && historyList.length > 0 ? (
                  historyList.map((h) => {
                    const hStyle = getActionStyle(h.action);
                    const hIcon = getActionIcon(h.action);
                    const hasHMeta = Boolean(
                      h.metadata && Object.keys(h.metadata as Record<string, unknown>).length > 0
                    );
                    const isHRejected =
                      h.action.toLowerCase() === "rejected" ||
                      h.action.toLowerCase() === "deleted" ||
                      h.action.toLowerCase() === "cancelled";

                    return (
                      <li key={h.id} className="pl-6 relative">
                        <span
                          className={cn(
                            "absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-bg shadow-sm z-10",
                            hStyle.bg,
                            hStyle.iconText || hStyle.text
                          )}
                        >
                          {hIcon}
                        </span>
                        <div className="flex flex-col gap-0.5 pt-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className={cn("font-bold capitalize", hStyle.text)}>
                              {hStyle.label}
                            </span>
                            <time className="text-[11px] text-text-secondary font-medium">
                              {formatDateTime(new Date(h.timestamp).toISOString())}
                            </time>
                          </div>
                          <p className="text-xs text-text-secondary font-medium">By {h.actorName}</p>
                        </div>

                        {h.notes && (
                          <div className="mt-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-xs max-w-full",
                                hStyle.bg,
                                isHRejected ? "text-white" : "text-text"
                              )}
                            >
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="truncate whitespace-normal leading-tight">{h.notes}</span>
                            </span>
                          </div>
                        )}

                        {hasHMeta && (
                          <div className="mt-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold uppercase">
                              <span className="flex items-center gap-1">
                                <Code2 className="h-3 w-3" /> Event Payload
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(JSON.stringify(h.metadata, null, 2), h.id)}
                                className="text-accent hover:underline cursor-pointer"
                              >
                                {copiedKey === h.id ? "Copied" : "Copy JSON"}
                              </button>
                            </div>
                            <pre className="p-2.5 rounded-lg border border-border bg-bg-subtle text-[10px] font-mono text-text overflow-x-auto max-h-36 leading-tight">
                              {JSON.stringify(h.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li className="pl-6 relative">
                    <span
                      className={cn(
                        "absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-bg shadow-sm z-10",
                        style.bg,
                        style.iconText || style.text
                      )}
                    >
                      {icon}
                    </span>
                    <div className="flex flex-col gap-0.5 pt-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={cn("font-bold capitalize", style.text)}>
                          {style.label}
                        </span>
                        <time className="text-[11px] text-text-secondary font-medium">
                          {formatDateTime(timestamp)}
                        </time>
                      </div>
                      <p className="text-xs text-text-secondary font-medium">By {actor}</p>
                    </div>

                    {(picker || description) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {picker && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-bg-subtle text-text-secondary border border-border shadow-xs">
                            <User className="h-3 w-3" />
                            {action === "returned" ? "Returned by: " : "Picked up by: "} {picker}
                          </span>
                        )}
                        {description && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-xs max-w-full",
                              style.bg,
                              isRejected ? "text-white" : "text-text"
                            )}
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate whitespace-normal leading-tight">{description}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                )}
              </ol>
            </div>
          </div>

          {/* Actor & Authority Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Actor & Context Information
            </h3>
            <div className="p-4 rounded-lg border border-border bg-bg space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Latest Actor:</span>
                <span className="font-bold text-text">{actor}</span>
              </div>
              {departmentOrEntity && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-text-secondary">
                    {isFlattened ? "Department:" : "Entity Type:"}
                  </span>
                  <span className="font-semibold text-text capitalize">
                    {isFlattened ? `${departmentOrEntity} Department` : departmentOrEntity.replace(/_/g, " ")}
                  </span>
                </div>
              )}
              {(groupData?.latestActorUserId || genData?.actorUserId) && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-text-secondary">User ID:</span>
                  <span className="font-mono text-[11px] text-text-secondary truncate max-w-50">
                    {groupData?.latestActorUserId || genData?.actorUserId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Purpose & Notes */}
          {notes && !isRejected && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                Notes & Context
              </h3>
              <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-950/20 p-4 space-y-2 text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    Audit Note
                  </span>
                </div>
                <p className="text-sm font-semibold text-text leading-relaxed pl-0.5">
                  {notes}
                </p>
              </div>
            </div>
          )}

          {/* Structured Metadata / JSON Payload (if single event view) */}
          {!isGrouped && metadata && Object.keys(metadata).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5" />
                  Structured Metadata Payload
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(metadata, null, 2), "json")}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-text px-2 py-0.5 bg-bg rounded border border-border transition-colors cursor-pointer"
                >
                  {copiedKey === "json" ? (
                    <Check className="h-3 w-3 text-status-active-text" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy JSON
                </button>
              </div>
              <pre className="p-3.5 rounded-lg border border-border bg-bg-subtle text-[11px] font-mono text-text overflow-x-auto max-h-60 leading-tight">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Audit Trace Record Identifier */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Audit Entity Identifier
            </h3>
            <div className="p-3 rounded-lg border border-border bg-bg space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Entity Code / ID:</span>
                <button
                  type="button"
                  onClick={() => handleCopy(codeOrId, "id")}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline cursor-pointer"
                >
                  <span className="truncate max-w-50">{codeOrId}</span>
                  {copiedKey === "id" ? (
                    <Check className="h-3 w-3 text-status-active-text" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between shrink-0">
          <span className="text-xs text-text-secondary">
            Immutable Audit Trail ({isGrouped ? `${historyList.length} total events` : "1 event"})
          </span>
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
