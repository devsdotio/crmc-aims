"use client";

/**
 * TEMPORARY: PO force-delete impact dialog — remove when cleanup window ends.
 * Compact, non-scrolling confirm pattern (aligned with ConfirmDialog).
 */

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import type {
  PoDeleteImpact,
  PoDeleteLineEffect,
} from "@/types/purchase-lots";
import { purchaseLotsApi } from "@/features/purchase-lots/client/purchase-lots-api";
import { useDeletePurchaseOrderByPoMutation } from "@/features/purchase-lots/client/use-purchase-lots";
import { useConfirm } from "@/components/providers/confirm-context";
import { useToast } from "@/components/providers/toast-context";
import { cn } from "@/lib/utils";

export type DeletePoImpactDialogProps = {
  poNumber: string | null;
  itemCount?: number;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
};

/** Max visible line rows so the dialog stays viewport-safe without scrolling. */
const MAX_VISIBLE_LINES = 6;
const MAX_VISIBLE_BLOCKERS = 3;

type EffectPart = {
  label: string;
  tone: "danger" | "warn" | "info" | "muted";
};

function lineEffectParts(line: PoDeleteLineEffect): EffectPart[] {
  const parts: EffectPart[] = [];
  if (line.qtyToReverse != null && line.qtyToReverse > 0) {
    parts.push({ label: `−${line.qtyToReverse} on-hand`, tone: "warn" });
  }
  const assetCount = line.assetsToDelete?.length ?? 0;
  if (assetCount > 0) {
    parts.push({
      label:
        assetCount === 1
          ? `delete ${line.assetsToDelete![0].assetCode}`
          : `delete ${assetCount} units`,
      tone: "danger",
    });
  }
  if ((line.movementsToRemove ?? 0) > 0) {
    parts.push({
      label: `remove ${line.movementsToRemove} stock record${line.movementsToRemove === 1 ? "" : "s"}`,
      tone: "muted",
    });
  }
  if ((line.expensesToRemove ?? 0) > 0) {
    parts.push({
      label: `remove ${line.expensesToRemove} expense${line.expensesToRemove === 1 ? "" : "s"}`,
      tone: "muted",
    });
  }
  if (
    line.projectId &&
    line.status === "delivered" &&
    line.itemType === "consumable" &&
    !(line.qtyToReverse != null && line.qtyToReverse > 0)
  ) {
    parts.push({ label: "on-hand unchanged", tone: "info" });
  }
  parts.push({ label: "delete PO lot", tone: "danger" });
  return parts;
}

function effectToneClass(tone: EffectPart["tone"]): string {
  if (tone === "danger") {
    return "bg-destructive/15 text-destructive border-destructive/35 font-semibold";
  }
  if (tone === "warn") {
    return "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/35 font-semibold";
  }
  if (tone === "info") {
    return "bg-sky-500/10 text-sky-800 dark:text-sky-200 border-sky-500/25";
  }
  return "bg-bg-subtle text-text-secondary border-border/80";
}

function LineEffects({ line }: { line: PoDeleteLineEffect }) {
  const parts = lineEffectParts(line);
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1 max-w-[60%]">
      {parts.map((part) => (
        <span
          key={part.label}
          className={cn(
            "inline-flex items-center rounded px-1.5 py-px text-[10px] leading-tight border",
            effectToneClass(part.tone)
          )}
        >
          {part.label}
        </span>
      ))}
    </span>
  );
}

function buildOverview(impact: PoDeleteImpact): string {
  let qty = 0;
  let assets = 0;
  let movements = 0;
  let expenses = 0;
  for (const line of impact.lines) {
    qty += line.qtyToReverse ?? 0;
    assets += line.assetsToDelete?.length ?? 0;
    movements += line.movementsToRemove ?? 0;
    expenses += line.expensesToRemove ?? 0;
  }
  const bits: string[] = [
    `${impact.lineCount} lot${impact.lineCount === 1 ? "" : "s"}`,
  ];
  if (qty > 0) bits.push(`−${qty} on-hand`);
  if (assets > 0) bits.push(`${assets} unit${assets === 1 ? "" : "s"}`);
  if (movements > 0) bits.push(`${movements} movement${movements === 1 ? "" : "s"}`);
  if (expenses > 0) bits.push(`${expenses} expense${expenses === 1 ? "" : "s"}`);
  return bits.join(" · ");
}

export function DeletePoImpactDialog({
  poNumber,
  itemCount,
  isOpen,
  onClose,
  onDeleted,
}: DeletePoImpactDialogProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const deleteMutation = useDeletePurchaseOrderByPoMutation();
  const [impact, setImpact] = useState<PoDeleteImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !poNumber) {
      setImpact(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoadingImpact(true);
    setLoadError(null);
    setImpact(null);

    void purchaseLotsApi
      .getDeleteImpact(poNumber)
      .then((data) => {
        if (!cancelled) setImpact(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load delete impact."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingImpact(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, poNumber]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleteMutation.isPending) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, deleteMutation.isPending, onClose]);

  const overview = useMemo(
    () => (impact ? buildOverview(impact) : null),
    [impact]
  );

  if (!isOpen || !poNumber) return null;

  const canDelete = Boolean(impact?.canDelete) && !loadingImpact && !loadError;
  const isBusy = loadingImpact || deleteMutation.isPending;
  const lines = impact?.lines ?? [];
  const visibleLines = lines.slice(0, MAX_VISIBLE_LINES);
  const hiddenLineCount = Math.max(0, lines.length - MAX_VISIBLE_LINES);
  const blockers = impact?.blockers ?? [];
  const visibleBlockers = blockers.slice(0, MAX_VISIBLE_BLOCKERS);
  const hiddenBlockerCount = Math.max(0, blockers.length - MAX_VISIBLE_BLOCKERS);

  const performDelete = async () => {
    if (!canDelete || !poNumber) return;
    try {
      await deleteMutation.mutateAsync(poNumber);
      toast.success(
        `Purchase Order "${poNumber}" deleted and inventory reverted.`
      );
      onDeleted?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete Purchase Order."
      );
      throw err;
    }
  };

  const handleConfirm = async () => {
    if (!canDelete || !poNumber || !overview) return;

    await confirm({
      title: "Permanently delete this PO?",
      description: (
        <div className="space-y-2">
          <p>
            You are about to permanently delete{" "}
            <strong className="font-mono">{poNumber}</strong>.
          </p>
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-destructive">
            <strong>This action cannot be reversed.</strong> It will remove{" "}
            {overview}.
          </div>
          <p>Choose “Delete permanently” only if these changes are correct.</p>
        </div>
      ),
      confirmLabel: "Delete permanently",
      cancelLabel: "Go back",
      variant: "destructive",
      action: performDelete,
    });
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="absolute inset-0"
        onClick={isBusy ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-po-impact-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-bg p-5 shadow-xl z-10 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <h3
              id="delete-po-impact-title"
              className="text-base font-bold text-text leading-snug"
            >
              Review deletion impact
            </h3>
            <p className="text-xs text-text-secondary leading-snug">
              <span className="font-mono font-semibold text-text">{poNumber}</span>
              {(itemCount != null || impact) && (
                <>
                  {" · "}
                  {itemCount ?? impact!.lineCount} line
                  {(itemCount ?? impact!.lineCount) === 1 ? "" : "s"}
                </>
              )}
              {" · "}
              Review every affected record before continuing.
            </p>
          </div>

          {loadingImpact && (
            <div className="flex items-center gap-2 text-xs text-text-secondary py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Calculating impact…
            </div>
          )}

          {loadError && (
            <p
              role="alert"
              className="text-xs text-destructive leading-snug flex gap-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
              <span>{loadError}</span>
            </p>
          )}

          {impact && !loadingImpact && (
            <div className="space-y-2.5">
              {blockers.length > 0 && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/35 bg-destructive/5 px-2.5 py-2"
                >
                  <p className="text-[11px] font-bold text-destructive mb-1">
                    Blocked — resolve first
                  </p>
                  <ul className="space-y-0.5">
                    {visibleBlockers.map((b, i) => (
                      <li
                        key={`${b.lotId}-${b.code}-${i}`}
                        className="text-[11px] text-destructive/90 leading-snug"
                      >
                        · {b.message}
                      </li>
                    ))}
                    {hiddenBlockerCount > 0 && (
                      <li className="text-[11px] text-destructive/70">
                        · +{hiddenBlockerCount} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {impact.warnings.length > 0 && (
                <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-snug">
                  {impact.warnings[0]}
                  {impact.warnings.length > 1
                    ? ` (+${impact.warnings.length - 1} more)`
                    : ""}
                </p>
              )}

              {overview && (
                <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-2.5 py-2">
                  <p className="text-[11px] leading-snug">
                    <span className="font-semibold text-destructive">
                      {impact.canDelete
                        ? "This deletion will remove:"
                        : "If allowed, this would remove:"}
                    </span>{" "}
                    <span className="text-text">{overview}</span>
                  </p>
                </div>
              )}

              <ul className="rounded-lg border border-border divide-y divide-border/80">
                {visibleLines.map((line) => (
                  <li
                    key={line.lotId}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-text truncate block">
                        {line.itemName}
                      </span>
                      <span className="text-[10px] text-text-secondary truncate block">
                        {line.lotCode}
                        {" · "}
                        {line.projectName?.trim() || "Warehouse"}
                      </span>
                    </span>
                    <LineEffects line={line} />
                  </li>
                ))}
                {hiddenLineCount > 0 && (
                  <li className="px-2.5 py-1.5 text-[11px] text-text-secondary">
                    +{hiddenLineCount} more line
                    {hiddenLineCount === 1 ? "" : "s"} (same treatment)
                  </li>
                )}
              </ul>

              <p className="text-[11px] text-text-secondary leading-snug">
                {impact.canDelete
                  ? "You will be asked to confirm once more before anything is deleted."
                  : "Delete stays disabled until blockers are cleared."}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/70 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="h-8 px-3.5 text-xs font-semibold text-text-secondary hover:text-text rounded-lg border border-border bg-bg hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            Keep order
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canDelete || isBusy}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 h-8 min-w-24 px-3.5 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.98]",
              "bg-destructive text-white hover:bg-destructive/90"
            )}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Review & delete
          </button>
        </div>
      </div>
    </div>
  );
}
