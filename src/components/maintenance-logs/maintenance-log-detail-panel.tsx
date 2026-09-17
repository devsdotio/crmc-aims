"use client";

import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  X,
  CheckCircle2,
  Tag,
  ExternalLink,
  Wrench,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceLogRecord } from "@/types/maintenance-logs";
import { ConditionTag } from "./condition-tag";

export interface MaintenanceLogDetailPanelProps {
  record: MaintenanceLogRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve?: (record: MaintenanceLogRecord) => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-text">{children}</dd>
    </div>
  );
}

function formatPhp(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sourceLabel(source: MaintenanceLogRecord["source"]): string {
  if (source === "return_checkout") return "Borrow return check-in";
  if (source === "project_assignment") return "Project asset damage";
  return "Manual custodian flag";
}

export function MaintenanceLogDetailPanel({
  record,
  isOpen,
  onClose,
  onResolve,
}: MaintenanceLogDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { getCategoryStyle } = useCategoryStyleMap();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const categoryMeta = getCategoryStyle(record.category);
  const effectiveCondition = record.isResolved ? "resolved" : record.condition;
  const notesDisplay = record.notes?.trim() || "No notes provided.";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mnt-detail-heading"
        className={cn(
          "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out"
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-repair-bg/15 text-status-repair-text shrink-0">
                <Wrench className="h-4 w-4" />
              </span>
              <h2
                id="mnt-detail-heading"
                className="font-mono text-lg font-bold tracking-tight text-text"
              >
                {record.logCode}
              </h2>
              <ConditionTag condition={effectiveCondition} />
            </div>
            <p className="text-xs text-text-secondary font-medium mt-1 truncate">
              {record.assetName} ·{" "}
              <span className="font-mono text-text">{record.assetCode}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close maintenance detail panel"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Asset
            </h3>
            <dl className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-bg-subtle/40">
              <Field label="Name">
                <span className="font-semibold">{record.assetName}</span>
              </Field>
              <Field label="Asset code">
                <span className="font-mono font-bold">{record.assetCode}</span>
              </Field>
              <Field label="Category">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                    categoryMeta.bg,
                    categoryMeta.text
                  )}
                >
                  <Tag className="h-2.5 w-2.5" />
                  {categoryMeta.label}
                </span>
              </Field>
              <Field label="Date logged">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                  {record.dateLogged}
                </span>
              </Field>
            </dl>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Logging context
            </h3>
            <dl className="grid grid-cols-1 gap-3 p-4 rounded-xl border border-border bg-bg">
              <Field label="Source">{sourceLabel(record.source)}</Field>
              <Field label="Logged by">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-text-secondary" />
                  {record.loggedBy}
                </span>
              </Field>
              {record.relatedBorrowLogCode && (
                <Field label="Related checkout">
                  <Link
                    href="/borrow-log"
                    className="inline-flex items-center gap-1 font-mono font-bold text-accent hover:underline"
                  >
                    {record.relatedBorrowLogCode}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Field>
              )}
              {record.scheduledDate && (
                <Field label="Target service date">{record.scheduledDate}</Field>
              )}
            </dl>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Issue description / flag notes
            </h3>
            <div className="p-3.5 rounded-xl border border-border bg-bg text-sm text-text leading-relaxed whitespace-pre-wrap">
              {notesDisplay}
            </div>
          </section>

          {record.isResolved && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-status-active-text flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Resolution
              </h3>
              <div className="p-4 rounded-xl border border-status-active-bg/30 bg-status-active-bg/10 space-y-3 text-sm">
                <dl className="grid grid-cols-2 gap-3">
                  <Field label="Date resolved">
                    {record.resolutionDate ?? "—"}
                  </Field>
                  <Field label="Assigned to">
                    {record.resolvedBy ?? "—"}
                  </Field>
                </dl>

                {record.repairParts && record.repairParts.length > 0 && (
                  <div className="pt-2 border-t border-status-active-bg/20 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      Parts &amp; materials
                    </p>
                    <ul className="space-y-1">
                      {record.repairParts.map((part, idx) => (
                        <li
                          key={`${part.name}-${idx}`}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-text truncate">{part.name}</span>
                          <span className="font-mono font-bold text-text shrink-0">
                            {formatPhp(part.cost)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(record.repairCost != null && record.repairCost !== "") && (
                  <div className="flex items-center justify-between pt-2 border-t border-status-active-bg/20 text-xs">
                    <span className="text-text-secondary font-semibold">
                      Overall repair cost
                    </span>
                    <span className="font-bold font-mono text-text">
                      {formatPhp(record.repairCost)}
                    </span>
                  </div>
                )}

                {record.resolutionNotes && (
                  <div className="pt-2 border-t border-status-active-bg/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Resolution notes
                    </p>
                    <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">
                      {record.resolutionNotes}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {!record.isResolved && onResolve && (
          <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={() => onResolve(record)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
              Resolve Maintenance Flag
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
