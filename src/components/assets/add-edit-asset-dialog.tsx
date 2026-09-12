"use client";

import { useState, useEffect, useMemo } from "react";
import { X, PackagePlus, Edit } from "lucide-react";

import type {
  Asset,
  AssetCategory,
  AssetStatus,
  AssetAssignmentType,
} from "@/types/assets";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import { useSuppliersQuery } from "@/features/suppliers/client";
import { assetsApi } from "@/features/assets/client";
import Link from "next/link";
import { QRCodeDisplay } from "./qr-code-display";

export interface AddEditAssetDialogProps {
  isOpen: boolean;
  initialAsset?: Asset | null;
  onClose: () => void;
  onSave: (assetData: Partial<Asset>) => Promise<void> | void;
}

interface AddEditAssetDialogFormProps {
  initialAsset?: Asset | null;
  onClose: () => void;
  onSave: (assetData: Partial<Asset>) => Promise<void> | void;
}

function AddEditAssetDialogForm({
  initialAsset,
  onClose,
  onSave,
}: AddEditAssetDialogFormProps) {
  const isEditing = Boolean(initialAsset);
  const { data: allCategories = [], isLoading: categoriesLoading } =
    useCategoriesQuery();
  const { data: suppliers = [], isLoading: suppliersLoading } =
    useSuppliersQuery({ activeOnly: true });
  const assetCategories = useMemo(() => {
    const fromSettings = allCategories.filter((c) => c.type === "asset");
    // Keep edit form usable if asset has a label not currently in Settings.
    const current = initialAsset?.category?.trim();
    if (
      current &&
      !fromSettings.some(
        (c) => c.name.toLowerCase() === current.toLowerCase()
      )
    ) {
      return [
        { id: `legacy-${current}`, name: current, type: "asset" as const },
        ...fromSettings,
      ];
    }
    return fromSettings;
  }, [allCategories, initialAsset?.category]);

  const [name, setName] = useState(() => initialAsset?.name ?? "");
  const [category, setCategory] = useState(
    () => initialAsset?.category ?? ""
  );
  const [status, setStatus] = useState<AssetStatus | "">(
    () => initialAsset?.status ?? "active"
  );
  const [assignmentType, setAssignmentType] = useState<AssetAssignmentType>(
    () => initialAsset?.assignmentType ?? "borrowable"
  );
  const [assetCode, setAssetCode] = useState(
    () => initialAsset?.assetCode ?? ""
  );
  const [codeLoading, setCodeLoading] = useState(false);
  const [serialNumber, setSerialNumber] = useState(
    () => initialAsset?.serialNumber ?? ""
  );
  const [location, setLocation] = useState(
    () => initialAsset?.location ?? ""
  );
  const [department] = useState(() => initialAsset?.department ?? "");
  const [notes, setNotes] = useState(() => initialAsset?.notes ?? "");
  const [isSandbox, setIsSandbox] = useState(() => initialAsset?.isSandbox ?? false);
  const [value, setValue] = useState(() =>
    initialAsset?.value != null ? String(initialAsset.value) : ""
  );
  const [purchaseDate, setPurchaseDate] = useState(
    () => initialAsset?.purchaseDate ?? ""
  );
  const [supplierId, setSupplierId] = useState(
    () => initialAsset?.supplierId ?? ""
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default select to first taxonomy option when loaded (create only).
  useEffect(() => {
    if (isEditing || category || assetCategories.length === 0) return;
    setCategory(assetCategories[0].name);
  }, [assetCategories, category, isEditing]);

  // Server-allocated preview so the code is unique against current inventory.
  useEffect(() => {
    if (isEditing || !category) return;
    let cancelled = false;
    setCodeLoading(true);
    void assetsApi
      .peekNextAssetCode(category)
      .then((result) => {
        if (!cancelled) setAssetCode(result.assetCode);
      })
      .catch(() => {
        if (!cancelled) setAssetCode("");
      })
      .finally(() => {
        if (!cancelled) setCodeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, isEditing]);

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (!isEditing) {
      setAssetCode("");
    }
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter the asset name.");
      return;
    }
    if (!category) {
      setError(
        assetCategories.length === 0
          ? "No asset categories yet. Add them under Settings → Categories."
          : "Please select an asset category."
      );
      return;
    }
    if (!status) {
      setError("Please select an initial condition.");
      return;
    }
    if (!location.trim()) {
      setError("Please enter the asset location.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      // Prefer a fresh server allocation right before save so a long-open form
      // does not submit a code another user already claimed.
      let code = assetCode.trim().toUpperCase();
      if (!isEditing) {
        try {
          const fresh = await assetsApi.peekNextAssetCode(category);
          code = fresh.assetCode;
          setAssetCode(fresh.assetCode);
        } catch {
          // Fall through — server will allocate if code is missing/stale.
        }
      }

      await onSave({
        id: initialAsset?.id,
        ...(isEditing
          ? { assetCode: code }
          : code
            ? { assetCode: code }
            : {}),
        name: name.trim(),
        category: category as AssetCategory,
        status: status as AssetStatus,
        assignmentType,
        serialNumber: serialNumber.trim() || undefined,
        location: location.trim(),
        department: department.trim() || undefined,
        notes: notes.trim() || undefined,
        isSandbox,
        value: value.trim() !== "" ? Number(value) : undefined,
        purchaseDate: purchaseDate || undefined,
        supplierId: supplierId || null,
        lastUpdated: new Date().toISOString().split("T")[0],
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while saving. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto">
      <div
        className="absolute inset-0"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative w-full max-w-4xl rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 my-8"
      >
        <div className="flex items-center justify-between gap-3 mb-5 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
              {isEditing ? (
                <Edit className="h-5 w-5" />
              ) : (
                <PackagePlus className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3
                id="dialog-title"
                className="text-base font-bold text-text leading-tight"
              >
                {isEditing ? "Edit Asset Record" : "Register New Asset"}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Categories come from Settings → Category Management.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="text-xs font-bold text-status-outofservice-text bg-status-outofservice-bg/15 border border-status-outofservice-bg/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="asset-name"
                  className="block text-xs font-semibold text-text"
                >
                  Asset Name <span className="text-accent">*</span>
                </label>
                <input
                  id="asset-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="category-select"
                    className="block text-xs font-semibold text-text"
                  >
                    Asset Category <span className="text-accent">*</span>
                  </label>
                  <select
                    id="category-select"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={isSubmitting || categoriesLoading}
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-medium focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {categoriesLoading ? (
                      <option value="">Loading…</option>
                    ) : assetCategories.length === 0 ? (
                      <option value="">No categories — add in Settings</option>
                    ) : (
                      <>
                        <option value="" disabled>
                          Select a category…
                        </option>
                        {assetCategories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="status-select"
                    className="block text-xs font-semibold text-text"
                  >
                    Condition <span className="text-accent">*</span>
                  </label>
                  <select
                    id="status-select"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as AssetStatus | "")
                    }
                    disabled={isSubmitting}
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-medium focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="active">Active (Serviceable)</option>
                    <option
                      value="needs_repair"
                      disabled={Boolean(initialAsset?.currentHolder)}
                    >
                      Needs Repair
                    </option>
                    <option value="out_of_service">Out of Service</option>
                    <option value="retired">Retired</option>
                    <option value="missing">Missing</option>
                  </select>
                  {status === "needs_repair" && (
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      {initialAsset?.currentHolder
                        ? "This asset is in custody — return it with a repair condition instead of editing status here."
                        : "This opens a Maintenance Logs entry so the asset can be marked serviceable again after repair."}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-xs font-semibold text-text">
                  Assignment Type <span className="text-accent">*</span>
                </span>
                <div className="flex flex-wrap gap-4 items-center min-h-9">
                  <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentType"
                      value="borrowable"
                      checked={assignmentType === "borrowable"}
                      onChange={(e) =>
                        setAssignmentType(
                          e.target.value as AssetAssignmentType
                        )
                      }
                      disabled={isSubmitting}
                    />
                    Borrowable
                  </label>
                  <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentType"
                      value="assignable"
                      checked={assignmentType === "assignable"}
                      onChange={(e) =>
                        setAssignmentType(
                          e.target.value as AssetAssignmentType
                        )
                      }
                      disabled={isSubmitting}
                    />
                    Assignable (projects)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="serial-input"
                    className="block text-xs font-semibold text-text"
                  >
                    Serial Number
                  </label>
                  <input
                    id="serial-input"
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg font-mono text-text focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="location-input"
                    className="block text-xs font-semibold text-text"
                  >
                    Location <span className="text-accent">*</span>
                  </label>
                  <input
                    id="location-input"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="purchase-date"
                    className="block text-xs font-semibold text-text"
                  >
                    Purchase Date
                  </label>
                  <input
                    id="purchase-date"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="value-input"
                    className="block text-xs font-semibold text-text"
                  >
                    Value (₱)
                  </label>
                  <input
                    id="value-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg font-mono text-text focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="supplier-select"
                  className="block text-xs font-semibold text-text"
                >
                  Supplier
                </label>
                <select
                  id="supplier-select"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  disabled={isSubmitting || suppliersLoading}
                  className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">None / unspecified</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.supplierCode ? ` (${s.supplierCode})` : ""}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && !suppliersLoading ? (
                  <p className="text-[11px] text-text-secondary">
                    No active suppliers.{" "}
                    <Link
                      href="/suppliers"
                      className="text-accent font-semibold underline-offset-2 hover:underline"
                    >
                      Register a supplier
                    </Link>{" "}
                    to track who you bought this unit from. When value is set on
                    create, acquisition cost + supplier snap into a purchase lot.
                  </p>
                ) : (
                  <p className="text-[11px] text-text-secondary">
                    Links to the Suppliers registry. With value set on create, a
                    purchase lot is recorded for cost history.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="notes-input"
                  className="block text-xs font-semibold text-text"
                >
                  Notes
                </label>
                <textarea
                  id="notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full p-2.5 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <label className="flex items-start gap-2.5 rounded-lg border border-border bg-bg-subtle/50 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSandbox}
                  onChange={(e) => setIsSandbox(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>
                  <span className="block text-xs font-semibold text-text">
                    Sandbox (testing only)
                  </span>
                  <span className="block text-[11px] text-text-secondary mt-0.5">
                    Hidden from normal users unless a superadmin turns on sandbox visibility.
                  </span>
                </span>
              </label>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="asset-code"
                    className="block text-xs font-semibold text-text"
                  >
                    Asset Code
                  </label>
                  <span className="text-[10px] font-medium text-text-secondary">
                    {isEditing
                      ? "Fixed identifier"
                      : codeLoading
                        ? "Reserving…"
                        : "Next available"}
                  </span>
                </div>
                <input
                  id="asset-code"
                  type="text"
                  value={
                    assetCode ||
                    (codeLoading ? "Looking up next code…" : "")
                  }
                  readOnly
                  tabIndex={-1}
                  disabled
                  className="w-full h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg font-mono font-semibold text-text-secondary cursor-not-allowed select-none"
                />
              </div>
              {assetCode ? (
                <div className="rounded-xl border border-border bg-bg-subtle/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-2">
                    QR preview
                  </p>
                  <QRCodeDisplay
                    assetCode={assetCode}
                    assetName={name.trim() || assetCode}
                    size={160}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || assetCategories.length === 0}
              className="h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting
                ? "Saving…"
                : isEditing
                  ? "Save changes"
                  : "Register asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddEditAssetDialog({
  isOpen,
  initialAsset,
  onClose,
  onSave,
}: AddEditAssetDialogProps) {
  if (!isOpen) return null;
  return (
    <AddEditAssetDialogForm
      key={initialAsset?.id ?? "new"}
      initialAsset={initialAsset}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
