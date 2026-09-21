import React from "react";
import { cn } from "@/lib/utils";
import {
  Send,
  Check,
  CheckCircle,
  X,
  XCircle,
  PackageCheck,
  PackageMinus,
  RotateCcw,
  History,
  ShoppingCart,
  PlusCircle,
  Edit,
  Trash2,
  Wrench,
  UserCheck,
  UserX,
  FileText,
  User,
} from "lucide-react";

export type AuditActionMeta = {
  label: string;
  bg: string;
  text: string;
  iconText?: string;
  borderClass: string;
  badgeClass: string;
  icon: React.ReactNode;
};

export function getActionIcon(rawAction: string): React.ReactNode {
  const action = rawAction.toLowerCase().trim();
  switch (action) {
    case "pending":
    case "submitted":
    case "created":
    case "create":
      return <FileText className="h-3.5 w-3.5" />;
    case "approved":
    case "activated":
      return <Check className="h-3.5 w-3.5" />;
    case "rejected":
    case "cancelled":
    case "declined":
    case "deleted":
    case "delete":
      return <X className="h-3.5 w-3.5" />;
    case "released":
    case "check_out":
    case "checked_out":
      return <Send className="h-3.5 w-3.5 ml-0.5" />;
    case "returned":
    case "check_in":
    case "checked_in":
      return <RotateCcw className="h-3.5 w-3.5" />;
    case "approval_undone":
    case "unapproved":
      return <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
    case "purchased":
    case "purchase_lot_created":
      return <ShoppingCart className="h-3.5 w-3.5" />;
    case "flagged_repair":
    case "maintenance":
      return <Wrench className="h-3.5 w-3.5" />;
    case "update":
    case "updated":
    case "edited":
    case "modified":
      return <Edit className="h-3.5 w-3.5" />;
    case "deactivated":
      return <UserX className="h-3.5 w-3.5" />;
    default:
      return <History className="h-3.5 w-3.5" />;
  }
}

export function getActionStyle(rawAction: string): { bg: string; text: string; iconText?: string; borderClass: string; label: string } {
  const action = rawAction.toLowerCase().trim();
  switch (action) {
    // Submission — slate
    case "submitted":
    case "pending":
    case "created":
    case "create":
      return {
        label: action === "create" || action === "created" ? "Created" : "Submitted",
        bg: "bg-slate-500/10 border-slate-400/25",
        text: "text-slate-600 dark:text-slate-300",
        borderClass: "border-slate-400/30",
      };
    // Approval — emerald
    case "approved":
      return {
        label: "Approved",
        bg: "bg-emerald-500/12 border-emerald-500/25",
        text: "text-emerald-700 dark:text-emerald-300",
        borderClass: "border-emerald-500/30",
      };
    // Rejection — red
    case "rejected":
    case "declined":
      return {
        label: "Rejected",
        bg: "bg-red-500/10 border-red-500/25",
        text: "text-red-700 dark:text-red-400",
        iconText: "text-red-600 dark:text-red-400",
        borderClass: "border-red-500/30",
      };
    // Cancellation — orange
    case "cancelled":
      return {
        label: "Cancelled",
        bg: "bg-orange-500/10 border-orange-400/25",
        text: "text-orange-700 dark:text-orange-300",
        iconText: "text-orange-600 dark:text-orange-300",
        borderClass: "border-orange-400/30",
      };
    // Released / Issued — blue/indigo
    case "released":
    case "check_out":
    case "checked_out":
      return {
        label: "Released",
        bg: "bg-blue-500/10 border-blue-500/25",
        text: "text-blue-700 dark:text-blue-300",
        borderClass: "border-blue-500/30",
      };
    // Unreleased — amber
    case "unreleased":
      return {
        label: "Unreleased",
        bg: "bg-amber-500/10 border-amber-400/25",
        text: "text-amber-700 dark:text-amber-300",
        borderClass: "border-amber-400/30",
      };
    // Approval Undone — amber
    case "approval_undone":
    case "unapproved":
      return {
        label: "Approval Undone",
        bg: "bg-amber-500/10 border-amber-400/25",
        text: "text-amber-700 dark:text-amber-300",
        iconText: "text-amber-600 dark:text-amber-400",
        borderClass: "border-amber-400/30",
      };
    // Returned — teal (distinct from emerald approval)
    case "returned":
    case "check_in":
    case "checked_in":
      return {
        label: "Returned",
        bg: "bg-teal-500/10 border-teal-500/25",
        text: "text-teal-700 dark:text-teal-300",
        borderClass: "border-teal-500/30",
      };
    case "purchased":
    case "purchase_lot_created":
      return {
        label: "Purchased",
        bg: "bg-category-av-bg/20 border-category-av-bg/30",
        text: "text-category-av-bg",
        borderClass: "border-category-av-bg/40",
      };
    case "update":
    case "updated":
    case "edited":
    case "modified":
      return {
        label: action === "edited" || action === "modified" ? "Edited by Staff" : "Updated",
        bg: "bg-amber-500/15 border-amber-500/30",
        text: "text-amber-600 dark:text-amber-400 font-semibold",
        borderClass: "border-amber-500/40",
      };
    // Deleted — rose (lighter than rejection red)
    case "delete":
    case "deleted":
      return {
        label: "Deleted",
        bg: "bg-rose-500/10 border-rose-500/25",
        text: "text-rose-700 dark:text-rose-400",
        iconText: "text-rose-600 dark:text-rose-400",
        borderClass: "border-rose-500/30",
      };
    case "flagged_repair":
    case "maintenance":
      return {
        label: "Maintenance Flag",
        bg: "bg-status-repair-bg/20 border-status-repair-bg/30",
        text: "text-status-repair-text",
        borderClass: "border-status-repair-bg/40",
      };
    // Resolved — sky (distinct from emerald approval and teal return)
    case "resolved":
      return {
        label: "Resolved",
        bg: "bg-sky-500/10 border-sky-500/25",
        text: "text-sky-700 dark:text-sky-300",
        borderClass: "border-sky-500/30",
      };
    case "deactivated":
      return {
        label: "Deactivated",
        bg: "bg-status-retired-bg/20 border-status-retired-bg/30",
        text: "text-status-retired-text",
        borderClass: "border-status-retired-bg/40",
      };
    // Activated — emerald (same family as Approved)
    case "activated":
      return {
        label: "Activated",
        bg: "bg-emerald-500/12 border-emerald-500/25",
        text: "text-emerald-700 dark:text-emerald-300",
        borderClass: "border-emerald-500/30",
      };
    default:
      return {
        label: rawAction.replace(/_/g, " "),
        bg: "bg-bg-subtle border-border",
        text: "text-text-secondary",
        borderClass: "border-border",
      };
  }
}

export function getActionMeta(rawAction: string): AuditActionMeta {
  const style = getActionStyle(rawAction);
  const icon = getActionIcon(rawAction);
  return {
    label: style.label,
    bg: style.bg,
    text: style.text,
    iconText: style.iconText,
    borderClass: style.borderClass,
    badgeClass: `${style.bg} ${style.text} border`,
    icon,
  };
}

/**
 * Maps an action key to a human-readable note label prefix shown inside the
 * note chip. Return `null` to suppress the note entirely (e.g. boilerplate).
 */
function getNoteLabel(rawAction: string): string | null {
  switch (rawAction.toLowerCase().trim()) {
    case "rejected":        return "Rejection reason:";
    case "cancelled":       return "Cancellation reason:";
    case "approval_undone": return "Reason:";
    case "unapproved":      return "Reason:";
    case "edited":          return "Edit reason:";
    case "modified":        return "Edit reason:";
    case "approved":        return "Approval note:";
    case "unreleased":      return "Reason:";
    case "submitted":
    case "pending":
    case "created":         return null; // suppress boilerplate notes
    default:                return "Note:";
  }
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString || isoString === "—" || isoString === "none" || isoString === "null") return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString || isoString === "—" || isoString === "none" || isoString === "null") return "No activity";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateTime(isoString);
  } catch {
    return isoString;
  }
}

export function stripAnsiArtifacts(str: string): string {
  if (!str) return "";
  return str
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "") // ANSI escape sequences
    .replace(/\[[0-9;]*m/g, "") // Orphaned bracket codes like "[m", "[0m", "[32m"
    .replace(/\s+/g, " ")
    .trim();
}

export function parseAuditNote(action?: string | null, note?: string | null): {
  picker: string | null;
  description: string | null;
  actionType: "released" | "returned" | null;
} {
  if (!note) return { picker: null, description: null, actionType: null };

  const cleanedNote = stripAnsiArtifacts(note);
  if (!cleanedNote) return { picker: null, description: null, actionType: null };

  let picker: string | null = null;
  let description: string | null = cleanedNote;
  let actionType: "released" | "returned" | null = null;

  const act = (action || "").toLowerCase().trim();

  if (
    cleanedNote.toLowerCase().startsWith("released to:") ||
    act === "released" ||
    act === "checkout" ||
    act === "issue"
  ) {
    actionType = "released";
    if (/^released to:\s*/i.test(cleanedNote)) {
      const parts = cleanedNote.split(". ");
      picker = parts[0].replace(/^released to:\s*/i, "").trim();
      const rest = parts.slice(1).join(". ").trim();
      description = stripAnsiArtifacts(rest) || null;
    }
  } else if (
    cleanedNote.toLowerCase().startsWith("returned by:") ||
    act === "returned" ||
    act === "checkin"
  ) {
    actionType = "returned";
    if (/^returned by:\s*/i.test(cleanedNote)) {
      const parts = cleanedNote.split(". ");
      picker = parts[0].replace(/^returned by:\s*/i, "").trim();
      const rest = parts.slice(1).join(". ").trim();
      description = stripAnsiArtifacts(rest) || null;
    }
  }

  // Fallback pattern detection if action wasn't matched above
  if (!actionType) {
    if (/^released to:\s*/i.test(cleanedNote)) {
      actionType = "released";
      const parts = cleanedNote.split(". ");
      picker = parts[0].replace(/^released to:\s*/i, "").trim();
      const rest = parts.slice(1).join(". ").trim();
      description = stripAnsiArtifacts(rest) || null;
    } else if (/^returned by:\s*/i.test(cleanedNote)) {
      actionType = "returned";
      const parts = cleanedNote.split(". ");
      picker = parts[0].replace(/^returned by:\s*/i, "").trim();
      const rest = parts.slice(1).join(". ").trim();
      description = stripAnsiArtifacts(rest) || null;
    }
  }

  return { picker, description, actionType };
}

export function AuditNoteDisplay({
  action,
  note,
  className,
}: {
  action?: string | null;
  note?: string | null;
  className?: string;
}) {
  if (!note) return null;

  const { picker, description, actionType } = parseAuditNote(action, note);

  if (!picker && !description) return null;

  const isRelease = actionType === "released";
  const isReturn = actionType === "returned";
  const act = action?.toLowerCase() ?? "";
  const isRejection = act === "rejected";
  const isCancelled = act === "cancelled";
  const isApproval = act === "approved";
  const isEdit = act === "edited" || act === "modified";

  // Note chip color matches the action's own hue family
  const noteChipClass = isRejection
    ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25"
    : isCancelled
    ? "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-400/25"
    : isApproval
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
    : isRelease
    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25"
    : isReturn
    ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25"
    : isEdit
    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
    : "bg-bg-subtle text-text border-border";

  return (
    <div className={cn("mt-2 flex flex-col gap-1.5", className)}>
      {picker && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border shadow-2xs w-fit",
            isReturn
              ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25"
              : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25"
          )}
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span>
            {isReturn ? "Returned by: " : "Received by: "}
          </span>
          <strong className="font-bold bg-bg text-text px-1.5 py-0.5 rounded border border-border/70 inline-block leading-none">
            {picker}
          </strong>
        </span>
      )}
      {description && (
        <span
          className={cn(
            "inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border shadow-2xs w-fit max-w-full leading-relaxed",
            noteChipClass
          )}
        >
          <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="leading-snug whitespace-normal wrap-break-word">{description}</span>
        </span>
      )}
    </div>
  );
}

/**
 * Shared action history timeline used across borrow request and consumable
 * request detail panels. Renders a color-coded vertical timeline with
 * rich actor, receiver, and note chips.
 */
export interface HistoryEntry {
  id?: string;
  action: string;
  actor: string;
  timestamp: string;
  note?: string | null;
}

export function ActionHistoryTimeline({
  entries,
  emptyLabel = "No history recorded yet.",
}: {
  entries: HistoryEntry[];
  emptyLabel?: string;
}) {
  if (!entries.length) {
    return (
      <p className="text-sm text-text-secondary text-center py-4">{emptyLabel}</p>
    );
  }

  // Most-recent first
  const sorted = [...entries].reverse();

  return (
    <ol className="relative border-l-2 border-border/60 ml-3 space-y-0">
      {sorted.map((h, index) => {
        const style = getActionStyle(h.action);
        const icon = getActionIcon(h.action);
        const { picker, description, actionType } = parseAuditNote(h.action, h.note);
        const isLast = index === sorted.length - 1;
        const isRejection = h.action.toLowerCase() === "rejected";
        const isCancelled = h.action.toLowerCase() === "cancelled";
        const isReturn = actionType === "returned";
        const isRelease = actionType === "released";
        const isEdit =
          h.action.toLowerCase() === "edited" || h.action.toLowerCase() === "modified";
        const isApprovalUndone =
          h.action.toLowerCase() === "approval_undone" ||
          h.action.toLowerCase() === "unapproved";
        const isUnreleased = h.action.toLowerCase() === "unreleased";

        // Suppress boilerplate submission notes that add no information
        const BOILERPLATE_NOTES = ["request recorded", "consumable request recorded"];
        const suppressNote =
          (h.action.toLowerCase() === "submitted" ||
            h.action.toLowerCase() === "pending" ||
            h.action.toLowerCase() === "created") &&
          BOILERPLATE_NOTES.includes((h.note ?? "").toLowerCase().trim());

        // Note chip color inherits the action's hue family
        const noteChipClass = isRejection
          ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25"
          : isCancelled
          ? "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-400/25"
          : h.action.toLowerCase() === "approved"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
          : isRelease
          ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25"
          : isReturn
          ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25"
          : isEdit || isApprovalUndone || isUnreleased
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
          : "bg-bg-subtle text-text-secondary border-border";

        const hasExtras = Boolean(picker || (description && !suppressNote));

        return (
          <li
            key={h.id ?? index}
            className={cn("relative pl-6", isLast ? "pb-0" : "pb-5")}
          >
            {/* Timeline dot */}
            <span
              className={cn(
                "absolute -left-2.5 top-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center z-10 bg-bg shadow-2xs",
                style.bg,
                (style as Record<string, string>).iconText ?? style.text
              )}
            >
              <span className="scale-85">{icon}</span>
            </span>

            {/* Main row: badge + actor + timestamp */}
            <div className={cn("flex flex-wrap items-center gap-2", hasExtras && "mb-1.5")}>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide border",
                  style.bg,
                  style.text,
                  style.borderClass
                )}
              >
                {style.label}
              </span>
              <span className="text-xs text-text-secondary font-medium">by</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-text">
                <User className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                {h.actor}
              </span>
              <span className="flex flex-col items-end gap-0.5 ml-auto tabular-nums shrink-0">
                <span className="text-xs text-text-secondary font-medium leading-none">
                  {formatRelativeTime(h.timestamp)}
                </span>
                <span className="text-[10px] text-text-secondary/50 leading-none mt-0.5">
                  {formatDateTime(h.timestamp)}
                </span>
              </span>
            </div>

            {/* Receiver + note chips — only when present */}
            {hasExtras && (
              <div className="flex flex-wrap gap-1.5 pl-0.5 mt-1">
                {picker && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border",
                      isReturn
                        ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25"
                        : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25"
                    )}
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    {isReturn ? "Returned by:" : "Received by:"}
                    <strong className="font-bold ml-1">{picker}</strong>
                  </span>
                )}
                {description && !suppressNote && (() => {
                  const noteLabel = getNoteLabel(h.action);
                  return (
                    <span
                      className={cn(
                        "inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-md text-xs border max-w-full leading-relaxed",
                        noteChipClass
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="leading-snug wrap-break-word">
                        {noteLabel && (
                          <span className="font-bold opacity-75 mr-1">{noteLabel}</span>
                        )}
                        {description}
                      </span>
                    </span>
                  );
                })()}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function exportToCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '""';
          const stringVal = typeof val === "object" ? JSON.stringify(val) : String(val);
          const escaped = stringVal.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatEntityDisplayCode(
  entityType: string,
  rawIdOrCode: string,
  metadata?: Record<string, unknown> | null
): string {
  if (!rawIdOrCode) return "N/A";

  // 1. If not a UUID, return as-is
  if (!UUID_REGEX.test(rawIdOrCode)) {
    return rawIdOrCode;
  }

  // 2. Check metadata for human-readable codes
  if (metadata) {
    const metaCode =
      (metadata.assetCode as string) ||
      (metadata.itemCode as string) ||
      (metadata.requestCode as string) ||
      (metadata.lotCode as string) ||
      (metadata.logCode as string) ||
      (metadata.code as string);
    if (metaCode && !UUID_REGEX.test(metaCode)) {
      return metaCode;
    }
  }

  // 3. Fallback prefix code
  const type = entityType.toLowerCase().replace(/_/g, "");
  let prefix = "ENT";
  if (type.includes("asset")) prefix = "AST";
  else if (type.includes("consumable") || type.includes("inventory")) prefix = "CON";
  else if (type.includes("borrow") || type.includes("request")) prefix = "REQ";
  else if (type.includes("purchase") || type.includes("lot") || type.includes("order")) prefix = "LOT";
  else if (type.includes("maint")) prefix = "MNT";
  else if (type.includes("user") || type.includes("profile")) prefix = "USR";

  return `${prefix}-${rawIdOrCode.slice(0, 8).toUpperCase()}`;
}
