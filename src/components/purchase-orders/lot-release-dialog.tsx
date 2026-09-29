"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Send,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { PurchaseLot } from "@/types/purchase-lots";
import { useReleaseFromLotMutation } from "@/features/purchase-lots/client/use-purchase-lots";
import { useDepartmentsQuery } from "@/features/departments/client";
import { useProjectsQuery } from "@/features/projects/client";
import { useToast } from "@/components/providers/toast-context";
import { cn } from "@/lib/utils";
import {
  filterUnsignedIntInput,
  parseUnsignedInt,
} from "@/lib/numeric-input";
import { formatPhp } from "@/components/projects/format-money";
import { SearchableSelect } from "@/components/ui/searchable-select";

type DestinationKind = "department" | "project";

function isReleasableLot(lot: PurchaseLot): boolean {
  return (
    lot.itemType === "consumable" &&
    lot.status === "delivered" &&
    lot.quantityRemaining > 0
  );
}

interface LotReleaseDialogProps {
  /** Initially selected lot (QR scan or chosen PO line). */
  lot: PurchaseLot | null;
  /**
   * Sibling releasable lots from the same multi-item PO.
   * When more than one candidate is available, a line/lot picker is shown.
   * Single-lot QR scan should omit this (or pass a one-item list).
   */
  candidateLots?: PurchaseLot[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LotReleaseDialog({
  lot,
  candidateLots,
  isOpen,
  onClose,
  onSuccess,
}: LotReleaseDialogProps) {
  const toast = useToast();
  const releaseMutation = useReleaseFromLotMutation();
  const {
    data: departments = [],
    isLoading: departmentsLoading,
    error: departmentsError,
  } = useDepartmentsQuery({ enabled: isOpen });
  const { data: projects = [] } = useProjectsQuery({ enabled: isOpen });
  const mutableProjects = useMemo(
    () => projects.filter((p) => p.status !== "completed"),
    [projects]
  );

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: d.id,
        label: `${d.name} (${d.code})`,
        keywords: d.code,
      })),
    [departments]
  );

  const projectOptions = useMemo(
    () =>
      mutableProjects.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.projectCode})`,
        keywords: p.projectCode,
      })),
    [mutableProjects]
  );

  const selectableLots = useMemo(() => {
    const byId = new Map<string, PurchaseLot>();
    for (const candidate of candidateLots ?? []) {
      if (isReleasableLot(candidate)) byId.set(candidate.id, candidate);
    }
    if (lot && isReleasableLot(lot)) byId.set(lot.id, lot);
    else if (lot && !byId.has(lot.id)) byId.set(lot.id, lot);
    return Array.from(byId.values());
  }, [candidateLots, lot]);

  const showLinePicker = selectableLots.length > 1;

  const lotOptions = useMemo(
    () =>
      selectableLots.map((l, idx) => ({
        value: l.id,
        label: `Line ${idx + 1} · ${l.itemName} · ${l.lotCode} (${l.quantityRemaining} avail.)`,
        keywords: `${l.lotCode} ${l.itemCode} ${l.itemName}`,
      })),
    [selectableLots]
  );

  const [selectedLotId, setSelectedLotId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [destinationKind, setDestinationKind] =
    useState<DestinationKind>("department");
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !lot) return;
    setSelectedLotId(lot.id);
    setQuantity("1");
    setDestinationKind("department");
    setRecipientName("");
    setReason("");
    setErrorMsg(null);
  }, [isOpen, lot]);

  useEffect(() => {
    if (!isOpen || selectableLots.length === 0) return;
    setSelectedLotId((prev) => {
      if (prev && selectableLots.some((l) => l.id === prev)) return prev;
      if (lot && selectableLots.some((l) => l.id === lot.id)) return lot.id;
      return selectableLots[0].id;
    });
  }, [isOpen, selectableLots, lot]);

  useEffect(() => {
    if (!isOpen) return;
    if (departments.length === 0) {
      setDepartmentId("");
      return;
    }
    setDepartmentId((prev) =>
      prev && departments.some((d) => d.id === prev) ? prev : departments[0].id
    );
  }, [isOpen, departments]);

  useEffect(() => {
    if (!isOpen) return;
    if (mutableProjects.length === 0) {
      setProjectId("");
      return;
    }
    setProjectId((prev) =>
      prev && mutableProjects.some((p) => p.id === prev)
        ? prev
        : mutableProjects[0].id
    );
  }, [isOpen, mutableProjects]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const activeLot =
    selectableLots.find((l) => l.id === selectedLotId) ??
    (lot && selectedLotId === lot.id ? lot : null) ??
    lot;

  if (!isOpen || !activeLot) return null;

  const maxQty = activeLot.quantityRemaining;
  const qtyValue = parseUnsignedInt(quantity, 0);
  const unitCostNum = parseFloat(activeLot.unitCost) || 0;
  const totalReleaseValue = qtyValue * unitCostNum;

  const handleLotChange = (nextId: string) => {
    setSelectedLotId(nextId);
    setQuantity("1");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activeLot.itemType !== "consumable") {
      setErrorMsg("Only supply lots can be released from this screen.");
      return;
    }

    if (qtyValue < 1) {
      setErrorMsg("Please enter a valid quantity of at least 1.");
      return;
    }

    if (qtyValue > maxQty) {
      setErrorMsg(
        `Cannot release more than available lot balance (${maxQty} units).`
      );
      return;
    }

    if (destinationKind === "department" && !departmentId) {
      setErrorMsg(
        departmentsLoading
          ? "Still loading departments. Please wait a moment."
          : departmentsError
            ? "Could not load departments. Check Settings → Departments."
            : "Select a department."
      );
      return;
    }

    if (destinationKind === "project" && !projectId) {
      setErrorMsg("Select a project.");
      return;
    }

    try {
      await releaseMutation.mutateAsync({
        code: activeLot.lotCode,
        quantity: qtyValue,
        recipientName: recipientName.trim() || undefined,
        reason: reason.trim() || undefined,
        departmentId:
          destinationKind === "department" ? departmentId : undefined,
        projectId: destinationKind === "project" ? projectId : undefined,
      });

      toast.success(
        `Released ${qtyValue}× ${activeLot.itemName} from lot ${activeLot.lotCode}.`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to release stock from lot.";
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-bg shadow-2xl z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-category-transport-bg" />
            <h2
              id="release-dialog-title"
              className="text-sm font-bold text-text"
            >
              Release stock from lot
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-border/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 text-status-outofservice-text flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {showLinePicker && (
            <div className="space-y-1.5">
              <label htmlFor="release-lot-line" className="font-semibold text-text">
                PO line / lot <span className="text-accent">*</span>
              </label>
              <SearchableSelect
                id="release-lot-line"
                value={selectedLotId}
                onValueChange={handleLotChange}
                options={lotOptions}
                placeholder="Select a line to release from…"
                clearLabel="Select a line to release from…"
                emptyMessage="No releasable lots on this PO"
                aria-required="true"
              />
              <p className="text-[11px] text-text-secondary">
                Each line defaults to its own supplier lot. Switch lines to release a different item.
              </p>
            </div>
          )}

          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
                {activeLot.lotCode}
              </span>
              <span className="font-bold text-status-active-text">
                {activeLot.quantityRemaining} available
              </span>
            </div>
            <p className="text-sm font-bold text-text">{activeLot.itemName}</p>
            <div className="flex items-center justify-between text-text-secondary text-[11px] pt-1 border-t border-border">
              <span>Cost snapshot:</span>
              <span className="font-mono font-medium text-text">
                {formatPhp(unitCostNum)} / unit
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDestinationKind("department")}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-lg border cursor-pointer",
                destinationKind === "department"
                  ? "border-primary bg-primary/5 text-text"
                  : "border-border text-text-secondary"
              )}
            >
              Department
            </button>
            <button
              type="button"
              onClick={() => setDestinationKind("project")}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-lg border cursor-pointer",
                destinationKind === "project"
                  ? "border-primary bg-primary/5 text-text"
                  : "border-border text-text-secondary"
              )}
            >
              Project
            </button>
          </div>

          {destinationKind === "department" ? (
            <div className="space-y-1.5">
              <label htmlFor="release-dept" className="font-semibold text-text">
                Department <span className="text-accent">*</span>
              </label>
              {departmentsLoading ? (
                <p className="text-xs text-text-secondary animate-pulse py-2">
                  Loading departments…
                </p>
              ) : departmentsError ? (
                <p className="text-status-outofservice-text">
                  Failed to load departments. Check Settings → Departments.
                </p>
              ) : (
                <SearchableSelect
                  id="release-dept"
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  options={departmentOptions}
                  placeholder={
                    departments.length === 0
                      ? "No departments configured"
                      : "Select a department…"
                  }
                  clearLabel={
                    departments.length === 0
                      ? undefined
                      : "Select a department…"
                  }
                  emptyMessage="No departments configured"
                  aria-required="true"
                />
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label
                htmlFor="release-project"
                className="font-semibold text-text"
              >
                Project <span className="text-accent">*</span>
              </label>
              <SearchableSelect
                id="release-project"
                value={projectId}
                onValueChange={setProjectId}
                options={projectOptions}
                placeholder={
                  mutableProjects.length === 0
                    ? "No active projects available"
                    : "Select a project…"
                }
                clearLabel={
                  mutableProjects.length === 0
                    ? undefined
                    : "Select a project…"
                }
                emptyMessage="No active projects available"
                aria-required="true"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="release-qty" className="font-semibold text-text">
                Quantity to release <span className="text-accent">*</span>
              </label>
              <span className="text-[11px] text-text-secondary">
                Max: <strong>{maxQty}</strong>
              </span>
            </div>
            <input
              id="release-qty"
              type="text"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => {
                const next = filterUnsignedIntInput(e.target.value);
                if (next !== null) setQuantity(next);
              }}
              placeholder="1"
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-subtle text-text text-sm font-bold font-mono focus:bg-bg focus:ring-1 focus:ring-ring focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="release-recipient"
              className="font-semibold text-text"
            >
              Received by (optional)
            </label>
            <input
              id="release-recipient"
              type="text"
              placeholder="e.g. Dr. Santos"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-subtle text-text text-xs focus:bg-bg focus:ring-1 focus:ring-ring focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="release-reason" className="font-semibold text-text">
              Purpose / notes (optional)
            </label>
            <textarea
              id="release-reason"
              rows={2}
              placeholder="e.g. Emergency ER replenishment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-subtle text-text text-xs focus:bg-bg focus:ring-1 focus:ring-ring focus:outline-hidden resize-none"
            />
          </div>

          <div className="p-3 rounded-lg bg-bg-subtle/70 border border-border flex items-center justify-between">
            <span className="text-text-secondary font-medium">
              Total cost deduction:
            </span>
            <span className="font-mono font-bold text-status-active-text text-sm">
              {formatPhp(totalReleaseValue)}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                releaseMutation.isPending ||
                qtyValue < 1 ||
                qtyValue > maxQty ||
                activeLot.itemType !== "consumable"
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-category-transport-bg text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {releaseMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Confirm release</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
