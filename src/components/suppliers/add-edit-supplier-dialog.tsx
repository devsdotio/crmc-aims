"use client";

import { useEffect, useState } from "react";
import {
  X,
  Truck,
  Pencil,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Supplier, SupplierStatus } from "@/types/suppliers";

export type SupplierFormInput = {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  notes: string;
  status: SupplierStatus;
};

export function AddEditSupplierDialog({
  isOpen,
  supplier,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSubmit: (input: SupplierFormInput) => void | Promise<void>;
}) {
  const isEdit = Boolean(supplier);
  const [form, setForm] = useState<SupplierFormInput>({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    notes: "",
    status: "active",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: supplier?.name ?? "",
      contactName: supplier?.contactName ?? "",
      contactEmail: supplier?.contactEmail ?? "",
      contactPhone: supplier?.contactPhone ?? "",
      address: supplier?.address ?? "",
      notes: supplier?.notes ?? "",
      status: supplier?.status ?? "active",
    });
    setError("");
    setIsSubmitting(false);
  }, [isOpen, supplier]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const fieldClass = cn(
    "w-full h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text",
    "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
  );
  const labelClass = "block text-[11px] font-bold text-text-secondary mb-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save supplier.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="absolute inset-0"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-dialog-heading"
        className="relative w-full max-w-lg bg-bg border border-border rounded-xl shadow-2xl z-10 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
              {isEdit ? <Pencil className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
            </div>
            <div>
              <h2 id="supplier-dialog-heading" className="text-sm font-bold text-text">
                {isEdit ? "Edit Supplier" : "Add Supplier"}
              </h2>
              <p className="text-[11px] font-mono text-text-secondary">
                {isEdit
                  ? supplier?.supplierCode
                  : "Auto-generated: SUP-YYYY-XXXX"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Supplier Name */}
          <div>
            <label htmlFor="sup-name" className={labelClass}>
              Supplier / Vendor Name <span className="text-accent">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                <Building2 className="h-4 w-4" />
              </span>
              <input
                id="sup-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={cn(fieldClass, "pl-9")}
                placeholder="e.g. PaperLine Philippines Inc."
                autoFocus
              />
            </div>
          </div>

          {/* Status Pill Toggle */}
          <div>
            <label className={labelClass}>Status</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-bg-subtle border border-border">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: "active" }))}
                className={cn(
                  "inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-bold transition-all cursor-pointer",
                  form.status === "active"
                    ? "bg-accent text-accent-foreground shadow-2xs"
                    : "text-text-secondary hover:text-text hover:bg-bg"
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: "inactive" }))}
                className={cn(
                  "inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-bold transition-all cursor-pointer",
                  form.status === "inactive"
                    ? "bg-accent text-accent-foreground shadow-2xs"
                    : "text-text-secondary hover:text-text hover:bg-bg"
                )}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sup-contact" className={labelClass}>
                Contact person
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                  <User className="h-3.5 w-3.5" />
                </span>
                <input
                  id="sup-contact"
                  value={form.contactName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactName: e.target.value }))
                  }
                  className={cn(fieldClass, "pl-8.5")}
                  placeholder="Account Rep Name"
                />
              </div>
            </div>
            <div>
              <label htmlFor="sup-phone" className={labelClass}>
                Phone number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                <input
                  id="sup-phone"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPhone: e.target.value }))
                  }
                  className={cn(fieldClass, "pl-8.5")}
                  placeholder="Landline / Mobile"
                />
              </div>
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="sup-email" className={labelClass}>
              Email address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                <Mail className="h-3.5 w-3.5" />
              </span>
              <input
                id="sup-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactEmail: e.target.value }))
                }
                className={cn(fieldClass, "pl-8.5")}
                placeholder="sales@vendor.com.ph"
              />
            </div>
          </div>

          {/* Business Address */}
          <div>
            <label htmlFor="sup-address" className={labelClass}>
              Business address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                <MapPin className="h-3.5 w-3.5" />
              </span>
              <input
                id="sup-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className={cn(fieldClass, "pl-8.5")}
                placeholder="Office or warehouse address"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="sup-notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="sup-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className={cn(fieldClass, "h-auto py-2 resize-y min-h-14")}
              placeholder="Payment terms, delivery schedules, warranty contacts…"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-status-outofservice-text bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 rounded-lg p-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isEdit ? (
                <Pencil className="h-3.5 w-3.5" />
              ) : (
                <Truck className="h-3.5 w-3.5" />
              )}
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
