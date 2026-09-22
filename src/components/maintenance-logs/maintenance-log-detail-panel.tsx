"use client";

import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Tag,
  ExternalLink,
  Calendar,
  User,
  FileText,
  FilePenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceLogRecord } from "@/types/maintenance-logs";
import { ConditionTag } from "./condition-tag";
import { DocumentMaintenanceDialog } from "./document-maintenance-dialog";

export interface MaintenanceLogDetailPanelProps {
  record: MaintenanceLogRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve?: (record: MaintenanceLogRecord) => void;
  canDocument?: boolean;
  onDocumentSaved?: (message: string) => void;
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
  canDocument = false,
  onDocumentSaved,
}: MaintenanceLogDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { getCategoryStyle } = useCategoryStyleMap();
  const [documentOpen, setDocumentOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !documentOpen) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, documentOpen]);

  if (!isOpen || !record) return null;

  const categoryMeta = getCategoryStyle(record.category);
  const effectiveCondition = record.isResolved ? "resolved" : record.condition;
  const notesDisplay = record.notes?.trim() || "No notes provided.";
  const parts = record.repairParts ?? [];
  const hasDocs =
    Boolean(record.workNotes?.trim()) ||
    parts.length > 0 ||
    (record.repairCost != null && record.repairCost !== "") ||
    Boolean(record.scheduledDate);

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0 gap-3">
          <div className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
            <h2
              id="mnt-detail-heading"
              className="text-lg font-extrabold tracking-tight text-primary truncate min-w-0 leading-tight"
            >
              {record.assetName}
            </h2>
            <ConditionTag condition={effectiveCondition} />
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            {!record.isResolved && canDocument && (
              <button
                type="button"
                onClick={() => setDocumentOpen(true)}
                aria-label={
                  hasDocs ? "Update repair documentation" : "Document repair"
                }
                className="relative group inline-flex items-center justify-center p-1.5 rounded-md border border-border bg-bg text-text hover:bg-bg-subtle cursor-pointer shadow-xs shrink-0"
              >
                <FilePenLine className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-neutral-900/95 text-white px-2 py-0.5 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {hasDocs ? "Update documentation" : "Document repair"}
                </span>
              </button>
            )}
            {!record.isResolved && onResolve && (
              <button
                type="button"
                onClick={() => onResolve(record)}
                aria-label="Mark serviceable"
                className="relative group inline-flex items-center justify-center p-1.5 rounded-md bg-status-active-bg text-white hover:opacity-90 cursor-pointer shadow-xs shrink-0"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-neutral-900/95 text-white px-2 py-0.5 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Mark serviceable
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Asset &amp; log
            </h3>
            <dl className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-bg-subtle/40">
              <Field label="Log code">
                <span className="font-mono font-extrabold text-status-repair-text">
                  {record.logCode}
                </span>
              </Field>
              <Field label="Asset code">
                <span className="font-mono font-extrabold text-primary">
                  {record.assetCode}
                </span>
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
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Calendar className="h-3.5 w-3.5 text-accent" />
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
              <Field label="Source">
                <span className="font-semibold text-text">
                  {sourceLabel(record.source)}
                </span>
              </Field>
              <Field label="Logged by">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <User className="h-3.5 w-3.5 text-primary" />
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
                <Field label="Target service date">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-accent/15 text-accent border border-accent/25">
                    {record.scheduledDate}
                  </span>
                </Field>
              )}
            </dl>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-status-repair-text flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Issue description
            </h3>
            <div className="p-3.5 rounded-xl border border-status-repair-bg/35 bg-status-repair-bg/10 text-sm font-semibold text-text leading-relaxed whitespace-pre-wrap shadow-xs">
              {notesDisplay}
            </div>
          </section>

          {!record.isResolved && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Repair documentation
                </h3>
                {canDocument && (
                  <button
                    type="button"
                    onClick={() => setDocumentOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-status-repair-text hover:underline cursor-pointer"
                  >
                    <FilePenLine className="h-3 w-3" />
                    {hasDocs ? "Update" : "Document repair"}
                  </button>
                )}
              </div>
              {hasDocs ? (
                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-2.5 text-xs shadow-xs">
                  {record.workNotes?.trim() && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">
                        Work performed
                      </p>
                      <p className="font-medium text-text whitespace-pre-wrap">
                        {record.workNotes}
                      </p>
                    </div>
                  )}
                  {record.scheduledDate && (
                    <p>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        Target date
                      </span>
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-accent/15 text-accent border border-accent/25">
                        {record.scheduledDate}
                      </span>
                    </p>
                  )}
                  {parts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                        Parts &amp; materials
                      </p>
                      <ul className="space-y-1.5">
                        {parts.map((part, idx) => (
                          <li
                            key={`${part.name}-${idx}`}
                            className="flex justify-between gap-2 rounded-lg bg-bg border border-border/60 px-2.5 py-1.5"
                          >
                            <span className="font-semibold truncate">
                              {part.name}
                            </span>
                            <span className="font-mono font-bold text-accent shrink-0">
                              {formatPhp(part.cost)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {record.repairCost != null && record.repairCost !== "" && (
                    <p className="pt-2 border-t border-primary/20 flex justify-between gap-2 items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        Overall cost
                      </span>
                      <span className="text-base font-extrabold font-mono text-accent">
                        {formatPhp(record.repairCost)}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-status-repair-text/80 font-medium rounded-lg border border-dashed border-status-repair-bg/40 bg-status-repair-bg/10 px-3 py-2">
                  No repair documentation recorded yet.
                </p>
              )}
            </section>
          )}

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
          <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-end gap-2 shrink-0">
            {canDocument && (
              <button
                type="button"
                onClick={() => setDocumentOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle cursor-pointer"
              >
                <FilePenLine className="h-4 w-4" />
                {hasDocs ? "Update documentation" : "Document repair"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onResolve(record)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
              Mark Serviceable
            </button>
          </div>
        )}
      </aside>

      {canDocument && (
        <DocumentMaintenanceDialog
          record={record}
          isOpen={documentOpen}
          onClose={() => setDocumentOpen(false)}
          onSaved={onDocumentSaved}
        />
      )}
    </div>
  );
}
