"use client";

import { useEffect, useState } from "react";
import {
  X,
  Copy,
  Check,
  Box,
  Calendar,
  Building2,
  User,
  Clock,
  Tag,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Undo2,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BorrowLogRecord } from "@/features/borrow-log/client";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { OverdueBadge } from "@/components/ui/overdue-badge";
import { LoadingState } from "@/components/providers/loading-context";
import { custodySourceLabel } from "@/lib/custody-source";

interface BorrowLogDetailSheetProps {
  record: BorrowLogRecord | null;
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onRecordReturn?: (record: BorrowLogRecord) => void;
  onVoidIssue?: (record: BorrowLogRecord, reason: string) => Promise<void>;
  onHardDelete?: (record: BorrowLogRecord) => void;
  canOperate?: boolean;
}

export function BorrowLogDetailSheet({
  record,
  isOpen,
  isLoading = false,
  onClose,
  onRecordReturn,
  onVoidIssue,
  onHardDelete,
  canOperate,
}: BorrowLogDetailSheetProps) {
  const { getCategoryStyle } = useCategoryStyleMap();
  const [copied, setCopied] = useState(false);
  const [isOverdue, setIsOverdue] = useState(false);
  const [showVoidForm, setShowVoidForm] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    if (!isOpen || !record?.dueDate) {
      setIsOverdue(false);
      return;
    }
    setIsOverdue(new Date(record.dueDate).getTime() < Date.now());
  }, [isOpen, record?.dueDate]);

  useEffect(() => {
    if (!isOpen) {
      setShowVoidForm(false);
      setVoidReason("");
      setIsVoiding(false);
    }
  }, [isOpen, record?.id]);

  if (!isOpen) return null;

  if (isLoading || !record) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Loading custody record"
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
              icon="layers"
              message="Loading custody log record..."
              subtitle="Retrieving checkout timestamp, borrower profile, and return status"
            />
          </div>
        </aside>
      </div>
    );
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(record.logCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categoryMeta = getCategoryStyle(rowCategoryOrDefault(record.category));
  const releasedDateStr = new Date(record.releasedAt).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <div className="relative z-10 w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border bg-bg-subtle/50 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                <Box className="h-3.5 w-3.5" />
                Asset Custody Log
              </span>
              <span
                className={cn(
                  "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                  record.status === "overdue"
                    ? "bg-status-outofservice-bg/15 text-status-outofservice-text border-status-outofservice-bg/30"
                    : record.status === "active"
                      ? "bg-status-active-bg/15 text-status-active-text border-status-active-bg/30"
                      : record.status === "voided"
                        ? "bg-status-repair-bg/15 text-status-repair-text border-status-repair-bg/30"
                        : "bg-bg-subtle text-text-secondary border-border"
                )}
              >
                {record.status === "overdue" ? (
                  <OverdueBadge daysOverdue={record.daysOverdue ?? 1} />
                ) : record.status === "returned" ? (
                  "Returned"
                ) : record.status === "voided" ? (
                  "Voided"
                ) : (
                  "Active Custody"
                )}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-bg-subtle text-text-secondary border-border">
                {custodySourceLabel(record.source)}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              aria-label="Close custody details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black text-text tracking-wide">
                  {record.logCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 rounded text-text-secondary hover:text-text hover:bg-bg transition-colors cursor-pointer"
                  title="Copy log code"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-status-active-text" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                {copied && (
                  <span className="text-[10px] font-bold text-status-active-text animate-in fade-in">
                    Copied!
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Released on {releasedDateStr}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Asset Info Card */}
          <div className="p-4 rounded-xl border border-border bg-bg space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-accent" />
              Asset Details
            </h4>
            <div className="space-y-1">
              <p className="text-base font-bold text-text">{record.assetName}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-text-secondary bg-bg-subtle px-2 py-0.5 rounded border border-border">
                  Code: {record.assetCode}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full border",
                    categoryMeta.bg,
                    categoryMeta.text
                  )}
                >
                  {categoryMeta.label}
                </span>
                <span className="text-xs text-text-secondary bg-bg-subtle px-2 py-0.5 rounded border border-border font-medium">
                  {record.custodyKind === "assignment" ? "Assignable Asset" : "Borrowable Asset"}
                </span>
              </div>
            </div>
          </div>

          {/* Accountable Holder / Recipient Card */}
          <div className="p-4 rounded-xl border border-border bg-bg space-y-3 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-accent" />
              Borrower & Department Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-text-secondary text-[11px] block">Primary Borrower</span>
                <p className="font-bold text-text">{record.borrowerName}</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-secondary text-[11px] block">Assigned Department</span>
                <p className="font-bold text-text flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-text-secondary" />
                  {record.department}
                </p>
              </div>

              {record.borrowerEmail && (
                <div className="space-y-1">
                  <span className="text-text-secondary text-[11px] block">Contact Email</span>
                  <p className="font-medium text-text flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-text-secondary" />
                    {record.borrowerEmail}
                  </p>
                </div>
              )}

              {record.borrowerPhone && (
                <div className="space-y-1">
                  <span className="text-text-secondary text-[11px] block">Phone / Mobile</span>
                  <p className="font-medium text-text flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-text-secondary" />
                    {record.borrowerPhone}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-text-secondary text-[11px] block">Released By (Custodian)</span>
                <p className="font-bold text-text">{record.releasedBy}</p>
              </div>

              {record.requestCode && (
                <div className="space-y-1">
                  <span className="text-text-secondary text-[11px] block">Originating Request</span>
                  <span className="font-mono font-bold text-text bg-bg-subtle px-2 py-0.5 rounded border border-border inline-block">
                    {record.requestCode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline & Due Dates */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-sky-500" />
              Custody Timeline
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Released At */}
              <div className="p-3.5 rounded-xl border border-sky-500/25 bg-sky-500/5 dark:bg-sky-950/20 shadow-xs flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                  <span className="p-1 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    <Calendar className="h-3 w-3" />
                  </span>
                  Released At
                </div>
                <div>
                  <span className="font-bold text-sm text-text block">
                    {new Date(record.releasedAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[10px] text-text-secondary font-medium">
                    {new Date(record.releasedAt).toLocaleTimeString("en-PH", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Due Date */}
              {record.dueDate ? (
                record.returnedAt ? (
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 dark:bg-emerald-950/20 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                      <span className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                      Due Date
                    </div>
                    <div>
                      <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300 block">
                        {new Date(record.dueDate).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                        Returned
                      </span>
                    </div>
                  </div>
                ) : isOverdue ? (
                  <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 dark:bg-destructive/15 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5 text-destructive font-bold text-[10px] uppercase tracking-wider">
                        <span className="p-1 rounded-md bg-destructive/15 text-destructive">
                          <AlertCircle className="h-3 w-3" />
                        </span>
                        Due Date
                      </div>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-destructive text-white uppercase tracking-wider">
                        Overdue
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-sm text-destructive block">
                        {new Date(record.dueDate).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-[10px] text-destructive/80 font-medium">
                        Past due date
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/25 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                      <span className="p-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                      </span>
                      Due Date
                    </div>
                    <div>
                      <span className="font-bold text-sm text-amber-900 dark:text-amber-200 block">
                        {new Date(record.dueDate).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                        Expected check-in
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3.5 rounded-xl border border-border bg-bg-subtle/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-text-secondary font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                    <span className="p-1 rounded-md bg-border text-text-secondary">
                      <Clock className="h-3 w-3" />
                    </span>
                    Due Date
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-text block">Open Custody</span>
                    <span className="text-[10px] text-text-secondary font-medium">No fixed due date</span>
                  </div>
                </div>
              )}

              {/* Returned At */}
              {record.returnedAt && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 dark:bg-emerald-950/20 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                    <span className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                    Returned At
                  </div>
                  <div>
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300 block">
                      {new Date(record.returnedAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                      {new Date(record.returnedAt).toLocaleTimeString("en-PH", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Return Condition */}
              {record.conditionOnReturn && (
                <div className="p-3.5 rounded-xl border border-border bg-bg-subtle/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-text-secondary font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                    <span className="p-1 rounded-md bg-border text-text-secondary">
                      <Tag className="h-3 w-3" />
                    </span>
                    Return Condition
                  </div>
                  <div>
                    <span className="font-bold text-sm capitalize text-text block">
                      {record.conditionOnReturn}
                    </span>
                    <span className="text-[10px] text-text-secondary font-medium">
                      Inspected condition
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Condition Notes */}
          {record.conditionNotes && (
            <div className="space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5 text-amber-500" />
                {record.status === "voided"
                  ? "Void Reason"
                  : "Return Inspection Notes"}
              </h4>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 dark:bg-amber-950/20 p-4 space-y-2 text-xs shadow-xs">
                <p className="text-xs text-text font-medium leading-relaxed">
                  {record.conditionNotes}
                </p>
              </div>
            </div>
          )}

          {showVoidForm && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Undo2 className="h-3.5 w-3.5" />
                Undo Manual Issue
              </h4>
              <p className="text-text-secondary leading-relaxed">
                This restores the asset to stock and marks the custody log as
                voided. Use for mistaken manual or project issues. The history
                entry is kept for audit — it is not hard-deleted.
              </p>
              <div className="space-y-1">
                <label htmlFor="void-reason" className="text-[11px] font-semibold text-text">
                  Reason (optional)
                </label>
                <textarea
                  id="void-reason"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Issued to wrong department"
                  className="w-full p-2 text-xs rounded-lg border border-border bg-bg text-text focus:ring-1 focus:ring-accent focus:outline-hidden resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isVoiding}
                  onClick={() => {
                    setShowVoidForm(false);
                    setVoidReason("");
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-bg-subtle text-text cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isVoiding || !onVoidIssue}
                  onClick={async () => {
                    if (!onVoidIssue || !record) return;
                    setIsVoiding(true);
                    try {
                      await onVoidIssue(record, voidReason.trim());
                      setShowVoidForm(false);
                      setVoidReason("");
                      onClose();
                    } finally {
                      setIsVoiding(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-status-repair-bg text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {isVoiding ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Voiding…
                    </>
                  ) : (
                    <>
                      <Undo2 className="h-3.5 w-3.5" />
                      Confirm Undo
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Action */}
        <div className="p-4 border-t border-border bg-bg-subtle shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canOperate &&
            record.status !== "returned" &&
            record.status !== "voided" &&
            onRecordReturn ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRecordReturn(record);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>
                  Record Return
                </span>
              </button>
            ) : null}

            {canOperate &&
            record.status !== "returned" &&
            record.status !== "voided" &&
            record.source !== "portal" &&
            onVoidIssue &&
            !showVoidForm ? (
              <button
                type="button"
                onClick={() => setShowVoidForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Undo Issue</span>
              </button>
            ) : null}

            {onHardDelete ? (
              <button
                type="button"
                onClick={() => onHardDelete(record)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Log</span>
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-border bg-bg hover:bg-bg-subtle transition-colors cursor-pointer text-text"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function rowCategoryOrDefault(cat?: string): string {
  if (cat === "electronics" || cat === "furniture" || cat === "machinery" || cat === "office" || cat === "medical" || cat === "vehicles" || cat === "tools") {
    return cat;
  }
  return "office";
}
