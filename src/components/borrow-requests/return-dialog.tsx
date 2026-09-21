"use client";

import { useEffect, useState } from "react";
import { Loader2, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatItemDescription } from "@/lib/sanitize-display";
import { useCategoryStyleResolver } from "@/features/categories/client/use-category-style";
import type { BorrowRequest } from "@/types/borrow-requests";

export interface ReturnDialogProps {
  request: BorrowRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    request: BorrowRequest,
    payload: { returnedBy: string; note?: string }
  ) => Promise<void>;
}

export function ReturnDialog({
  request,
  isOpen,
  onClose,
  onConfirm,
}: ReturnDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnedBy, setReturnedBy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const resolveCategoryStyle = useCategoryStyleResolver();

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen && request) {
      setReturnedBy("");
      setNote("");
      setError("");
    }
  }, [isOpen, request]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnedBy.trim()) {
      setError("Name is required");
      return;
    }
    
    setError("");
    setIsSubmitting(true);
    try {
      await onConfirm(request, { returnedBy: returnedBy.trim(), note: note.trim() || undefined });
      setReturnedBy("");
      setNote("");
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to return item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={() => !isSubmitting && onClose()} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-bg rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-border bg-bg-subtle/50">
          <h2 className="text-lg font-bold text-text">Return Item</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Returning {request.requestCode} -{" "}
            {request.items
              .map((i) =>
                formatItemDescription(
                  i.itemDescription,
                  resolveCategoryStyle(i.category).label,
                  i.itemType
                )
              )
              .join(", ")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 flex flex-col gap-5">
            <div className="space-y-2">
              <label htmlFor="returnedBy" className="text-sm font-semibold text-text">
                Returned By <span className="text-status-outofservice-text">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-text-secondary/60" />
                </div>
                <input
                  id="returnedBy"
                  type="text"
                  placeholder="Enter full name"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/50",
                    "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-shadow",
                    error && !returnedBy.trim() && "border-status-outofservice-bg focus:ring-status-outofservice-bg"
                  )}
                  value={returnedBy}
                  onChange={(e) => setReturnedBy(e.target.value)}
                />
              </div>
              {error && !returnedBy.trim() && (
                <p className="text-xs font-medium text-status-outofservice-text">
                  {error}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-semibold text-text">
                Return Notes (Optional)
              </label>
              <textarea
                id="note"
                placeholder="Any comments about the return condition (e.g. screen scratched, cable missing)..."
                disabled={isSubmitting}
                className={cn(
                  "w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/50 resize-none h-24",
                  "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-shadow"
                )}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            
            
            {error && returnedBy.trim() && (
              <p className="text-xs font-medium text-status-outofservice-text">
                {error}
              </p>
            )}
          </div>

          <div className="px-6 py-4 bg-bg-subtle/50 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle rounded-md transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center min-w-[120px] px-4 py-2 bg-accent text-accent-foreground text-sm font-semibold rounded-md shadow-xs hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Marking...
                </>
              ) : (
                "Mark as Returned"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
