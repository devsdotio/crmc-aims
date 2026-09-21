"use client";

import { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  Box,
  Package,
  Calendar,
  Building2,
  User,
  Clock,
  Tag,
  FileText,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  StickyNote,
  Undo2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhp } from "@/components/projects/format-money";

export interface IssueDetailRecord {
  id: string;
  code: string;
  kind: "asset" | "supply";
  itemLabel: string;
  itemCode: string;
  destination: string;
  qtyLabel: string;
  when: string;
  actor: string;
  source?: string;
  extra?: string;
  department?: string;
  borrowerName?: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  category?: string;
  status?: string;
  dueDate?: string | null;
  returnedAt?: string | null;
  lotCode?: string | null;
  unitCost?: string | null;
  lineTotal?: string | null;
  unit?: string | null;
  notes?: string | null;
  requestCode?: string | null;
  custodyKind?: string;
  voided?: boolean;
  reversalMovementCode?: string | null;
  /** Real stock_movements.id for void API (supply issues). */
  movementId?: string;
}

interface IssueDetailSheetProps {
  record: IssueDetailRecord | null;
  isOpen: boolean;
  onClose: () => void;
  canOperate?: boolean;
  onVoidIssue?: (record: IssueDetailRecord, reason: string) => Promise<void>;
}

export function IssueDetailSheet({
  record,
  isOpen,
  onClose,
  canOperate = false,
  onVoidIssue,
}: IssueDetailSheetProps) {
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

  if (!isOpen || !record) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(record.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAsset = record.kind === "asset";
  const canUndoSupply =
    !isAsset &&
    canOperate &&
    !record.voided &&
    Boolean(onVoidIssue) &&
    Boolean(record.movementId);

  const formattedDate = new Date(record.when).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        <div className="p-5 border-b border-border bg-bg-subtle/50 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider",
                  isAsset
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                    : "bg-status-active-bg/20 text-status-active-text border border-status-active-bg/30"
                )}
              >
                {isAsset ? <Box className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                {isAsset ? "Asset Custody Issue" : "Supply Issue"}
              </span>
              {record.voided && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-status-repair-bg/15 text-status-repair-text border-status-repair-bg/30">
                  Voided
                </span>
              )}
              {record.source && (
                <span className="text-[11px] font-semibold text-text-secondary px-2 py-0.5 rounded bg-bg border border-border">
                  {record.source}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              aria-label="Close transaction details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-black text-text tracking-wide">
                {record.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1 rounded text-text-secondary hover:text-text hover:bg-bg transition-colors cursor-pointer"
                title="Copy transaction code"
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
              Issued on {formattedDate}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="p-4 rounded-xl border border-border bg-bg space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-accent" />
              Item Specifications
            </h4>
            <div className="space-y-1.5">
              <p className="text-base font-bold text-text">{record.itemLabel}</p>
              <span className="font-mono text-xs font-bold text-text-secondary bg-bg-subtle px-2 py-0.5 rounded border border-border inline-block">
                Code: {record.itemCode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
              <div>
                <span className="text-text-secondary block text-[11px]">Quantity</span>
                <span className="font-bold text-text font-mono text-sm">{record.qtyLabel}</span>
              </div>
              {record.lotCode && (
                <div>
                  <span className="text-text-secondary block text-[11px]">Source Lot</span>
                  <span className="font-bold text-text font-mono">{record.lotCode}</span>
                </div>
              )}
              {record.unitCost && (
                <div>
                  <span className="text-text-secondary block text-[11px]">Unit Valuation</span>
                  <span className="font-bold text-text font-mono">
                    {formatPhp(Number(record.unitCost))}
                  </span>
                </div>
              )}
              {record.lineTotal && (
                <div>
                  <span className="text-text-secondary block text-[11px]">Total Dispatched Value</span>
                  <span className="font-bold text-status-active-text font-mono">
                    {formatPhp(Number(record.lineTotal))}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-bg space-y-3 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-accent" />
              Destination
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-text-secondary text-[11px] block">Department / Project</span>
                <p className="font-bold text-text">{record.destination || "—"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-text-secondary text-[11px] block">Issued By</span>
                <p className="font-bold text-text flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-text-secondary" />
                  {record.actor || "System"}
                </p>
              </div>
              {record.requestCode && (
                <div className="space-y-1">
                  <span className="text-text-secondary text-[11px] block">Originating Request</span>
                  <span className="font-mono font-bold text-text bg-bg-subtle px-2 py-0.5 rounded border border-border inline-block">
                    {record.requestCode}
                  </span>
                </div>
              )}
              {record.voided && record.reversalMovementCode && (
                <div className="space-y-1">
                  <span className="text-text-secondary text-[11px] block">Restock Movement</span>
                  <span className="font-mono font-bold text-status-active-text bg-bg-subtle px-2 py-0.5 rounded border border-border inline-block">
                    {record.reversalMovementCode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {isAsset && (
            <div className="space-y-3">
              <h4 className="font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5 text-sky-500" />
                Custody Timeline
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Released Date */}
                <div className="p-3.5 rounded-xl border border-sky-500/25 bg-sky-500/5 dark:bg-sky-950/20 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                    <span className="p-1 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
                      <Calendar className="h-3 w-3" />
                    </span>
                    Released Date
                  </div>
                  <div>
                    <span className="font-bold text-sm text-text block">
                      {formattedDate}
                    </span>
                    <span className="text-[10px] text-text-secondary font-medium">
                      Dispatched to borrower
                    </span>
                  </div>
                </div>

                {/* Expected Return / Due */}
                {record.dueDate && (
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
                          Expected Return
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
                          Past scheduled return
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/25 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                        <span className="p-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                        </span>
                        Expected Return
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
                          Scheduled check-in
                        </span>
                      </div>
                    </div>
                  )
                )}

                {/* Returned Date */}
                {record.returnedAt && (
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 dark:bg-emerald-950/20 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                      <span className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                      Returned Date
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
                        Returned to inventory
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {record.notes && (
            <div className="space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5 text-amber-500" />
                Transaction Notes & Remarks
              </h4>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 dark:bg-amber-950/20 p-4 space-y-2 text-xs shadow-xs">
                <p className="text-xs text-text font-medium leading-relaxed">
                  {record.notes}
                </p>
              </div>
            </div>
          )}

          {showVoidForm && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Undo2 className="h-3.5 w-3.5" />
                Undo Supply Issue
              </h4>
              <p className="text-text-secondary leading-relaxed">
                This restocks the issued quantity back into inventory
                {record.lotCode ? ` (lot ${record.lotCode})` : ""}. The original MOV
                stays for audit; a compensating restock is recorded.
              </p>
              <div className="space-y-1">
                <label htmlFor="supply-void-reason" className="text-[11px] font-semibold text-text">
                  Reason (optional)
                </label>
                <textarea
                  id="supply-void-reason"
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
                    if (!onVoidIssue) return;
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
                      Restocking…
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

        <div className="p-4 border-t border-border bg-bg-subtle shrink-0 flex items-center justify-between gap-3">
          <div>
            {canUndoSupply && !showVoidForm ? (
              <button
                type="button"
                onClick={() => setShowVoidForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo Issue
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-border bg-bg hover:bg-bg-subtle transition-colors cursor-pointer text-text"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
