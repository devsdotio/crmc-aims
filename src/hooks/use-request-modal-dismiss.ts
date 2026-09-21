"use client";

import { useCallback, useEffect, useState } from "react";

export interface UseRequestModalDismissOptions {
  open: boolean;
  isPending?: boolean;
  isDirty?: boolean;
  /** Called when dismiss is allowed (not pending, and dirty confirmed or clean). */
  onRequestClose: () => void;
}

export interface UseRequestModalDismissResult {
  /** Call from Esc / backdrop / X / Cancel. */
  requestClose: () => void;
  onBackdropClick: () => void;
  discardConfirmOpen: boolean;
  confirmDiscard: () => void;
  keepEditing: () => void;
}

/**
 * Shared Esc / backdrop dismiss rules for borrower request modals:
 * - no-op while pending
 * - prompt discard when dirty
 * - otherwise close immediately
 */
export function useRequestModalDismiss({
  open,
  isPending = false,
  isDirty = false,
  onRequestClose,
}: UseRequestModalDismissOptions): UseRequestModalDismissResult {
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) setDiscardConfirmOpen(false);
  }, [open]);

  const requestClose = useCallback(() => {
    if (!open || isPending) return;
    if (isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onRequestClose();
  }, [open, isPending, isDirty, onRequestClose]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Nested ConfirmDialog owns Esc while discard prompt is open.
      if (discardConfirmOpen) return;
      e.preventDefault();
      requestClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, discardConfirmOpen, requestClose]);

  const confirmDiscard = useCallback(() => {
    setDiscardConfirmOpen(false);
    onRequestClose();
  }, [onRequestClose]);

  const keepEditing = useCallback(() => {
    setDiscardConfirmOpen(false);
  }, []);

  return {
    requestClose,
    onBackdropClick: requestClose,
    discardConfirmOpen,
    confirmDiscard,
    keepEditing,
  };
}
