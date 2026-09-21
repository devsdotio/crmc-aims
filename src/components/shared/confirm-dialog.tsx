"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "warning";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDestructive = variant === "destructive";

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="absolute inset-0"
        onClick={isLoading ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm rounded-xl border border-border bg-bg p-5 shadow-xl z-10 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        <div className="space-y-2">
          <h3
            id="confirm-dialog-title"
            className="text-base font-bold text-text leading-snug"
          >
            {title}
          </h3>
          <div className="text-xs text-text-secondary leading-relaxed [&_strong]:text-text [&_strong]:font-semibold">
            {description}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/70 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-8 px-3.5 text-xs font-semibold text-text-secondary hover:text-text rounded-lg border border-border bg-bg hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLoading}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 h-8 min-w-24 px-3.5 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.98]",
              isDestructive
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-accent text-accent-foreground hover:opacity-90"
            )}
          >
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
