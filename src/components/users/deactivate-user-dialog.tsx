"use client";

import { useEffect, useState } from "react";
import { X, UserX } from "lucide-react";
import type { UserAccount } from "@/types/users";

export interface DeactivateUserDialogProps {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDeactivate: (user: UserAccount) => void | Promise<void>;
}

export function DeactivateUserDialog({
  user,
  isOpen,
  onClose,
  onConfirmDeactivate,
}: DeactivateUserDialogProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen || !user) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await onConfirmDeactivate(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate user.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="absolute inset-0" onClick={isSubmitting ? undefined : onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-retired-bg/20 text-status-retired-text shrink-0">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <h3 id="deactivate-dialog-title" className="text-base font-bold text-text leading-tight">
                Deactivate Staff Account
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-mono">
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close deactivate dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl border border-border bg-bg-subtle text-xs space-y-2">
          <p className="text-text font-bold leading-snug">
            Are you sure you want to deactivate {`${user.name}'s`} account?
          </p>
          <ul className="list-disc list-inside space-y-1 text-text-secondary">
            <li>This account will lose system access immediately.</li>
            <li>All past approvals, releases, and maintenance logs remain in the audit trail.</li>
            <li>The account can be re-activated by an Admin at any time.</li>
          </ul>
        </div>

        {error && (
          <p className="text-xs font-bold text-status-outofservice-text">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-md border border-border bg-bg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-md border border-status-retired-bg bg-bg text-status-retired-text hover:bg-status-retired-bg/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Deactivating…" : "Confirm Deactivation"}
          </button>
        </div>
      </div>
    </div>
  );
}
