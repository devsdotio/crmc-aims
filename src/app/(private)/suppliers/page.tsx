"use client";

import { useMemo, useState } from "react";
import { Truck, AlertCircle } from "lucide-react";
import type { Supplier, SupplierFilterState } from "@/types/suppliers";
import { SupplierFilters } from "@/components/suppliers/supplier-filters";
import { SupplierTable } from "@/components/suppliers/supplier-table";
import { SupplierDetailPanel } from "@/components/suppliers/supplier-detail-panel";
import {
  AddEditSupplierDialog,
  type SupplierFormInput,
} from "@/components/suppliers/add-edit-supplier-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useCreateSupplierMutation,
  useDeactivateSupplierMutation,
  useSuppliersQuery,
  useUpdateSupplierMutation,
} from "@/features/suppliers/client";
import { useToast } from "@/components/providers/toast-context";
import { OperatorReadOnlyBanner } from "@/components/shared/operator-read-only-banner";
import { useAssetOperator } from "@/hooks/use-asset-operator";

export default function SuppliersPage() {
  const {
    data: suppliers = [],
    isLoading,
    error,
    isFetching,
  } = useSuppliersQuery();
  const createSupplier = useCreateSupplierMutation();
  const updateSupplier = useUpdateSupplierMutation();
  const deactivateSupplier = useDeactivateSupplierMutation();
  const toast = useToast();
  const { canOperate } = useAssetOperator();

  const [filters, setFilters] = useState<SupplierFilterState>({
    searchQuery: "",
    status: "all",
  });
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [editTarget, setEditTarget] = useState<Supplier | null | undefined>(
    undefined
  );
  const [deactivateTarget, setDeactivateTarget] = useState<Supplier | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (filters.searchQuery?.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const hay = [
          s.name,
          s.supplierCode,
          s.contactName ?? "",
          s.contactEmail ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status !== "all" && s.status !== filters.status) return false;
      return true;
    });
  }, [suppliers, filters]);

  const selectedSynced = useMemo(() => {
    if (!selected) return null;
    return suppliers.find((s) => s.id === selected.id) ?? selected;
  }, [suppliers, selected]);

  const handleSubmit = async (input: SupplierFormInput) => {
    setPageError(null);
    const payload = {
      name: input.name,
      contactName: input.contactName || null,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      address: input.address || null,
      notes: input.notes || null,
      status: input.status,
    };
    try {
      if (editTarget) {
        const saved = await updateSupplier.mutateAsync({
          id: editTarget.id,
          payload,
        });
        setSelected((prev) => (prev?.id === saved.id ? saved : prev));
        toast.success("Supplier updated.");
      } else {
        await createSupplier.mutateAsync(payload);
        toast.success("Supplier created.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save supplier.");
      throw err;
    }
  };

  const handleDeactivate = (s: Supplier) => {
    setDeactivateTarget(s);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setPageError(null);
    try {
      const saved = await deactivateSupplier.mutateAsync(deactivateTarget.id);
      setSelected((prev) => (prev?.id === saved.id ? saved : prev));
      toast.success(`Supplier "${deactivateTarget.name}" deactivated.`);
      setDeactivateTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate supplier.");
    }
  };

  const loadError = error?.message || pageError;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md">
      <div className="px-4 md:px-6 pt-5 pb-3 bg-bg shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text">
              Suppliers
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
              {isLoading
                ? "Loading suppliers…"
                : `${filtered.length} of ${suppliers.length}`}
              {isFetching && !isLoading ? " · updating…" : ""}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Vendor registry for multi-price restocks and asset acquisition cost history.
          </p>
        </div>
        {canOperate && (
          <button
            type="button"
            onClick={() => setEditTarget(null)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Truck className="h-4 w-4" strokeWidth={2.5} />
            Add Supplier
          </button>
        )}
      </div>

      {!canOperate && <OperatorReadOnlyBanner />}

      {loadError && (
        <div className="mx-4 md:mx-6 mt-3 flex items-start gap-2 rounded-lg border border-status-outofservice-bg/40 bg-status-outofservice-bg/10 px-3 py-2 text-xs text-status-outofservice-text">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      <SupplierFilters
        filters={filters}
        onFilterChange={(u) => setFilters((p) => ({ ...p, ...u }))}
        onResetFilters={() => setFilters({ searchQuery: "", status: "all" })}
      />

      <main className="flex-1 overflow-y-auto min-h-0 bg-bg">
        <SupplierTable
          suppliers={filtered}
          loading={isLoading && !error}
          deactivatingSupplierId={
            deactivateSupplier.isPending ? deactivateSupplier.variables : null
          }
          onSelect={setSelected}
          onEdit={canOperate ? (s) => setEditTarget(s) : undefined}
          onDeactivate={canOperate ? handleDeactivate : undefined}
        />
      </main>

      <SupplierDetailPanel
        supplier={selectedSynced}
        isOpen={Boolean(selectedSynced)}
        onClose={() => setSelected(null)}
        onEdit={
          canOperate
            ? (s) => {
                setSelected(null);
                setEditTarget(s);
              }
            : undefined
        }
      />

      {canOperate && (
        <AddEditSupplierDialog
          isOpen={editTarget !== undefined}
          supplier={editTarget ?? null}
          onClose={() => setEditTarget(undefined)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deactivateTarget)}
        title="Deactivate Supplier?"
        description={
          deactivateTarget
            ? `Are you sure you want to deactivate "${deactivateTarget.name}" (${deactivateTarget.supplierCode})? Purchase lot and restock history will remain intact.`
            : ""
        }
        confirmLabel="Deactivate"
        variant="warning"
        isLoading={deactivateSupplier.isPending}
        onConfirm={handleConfirmDeactivate}
        onClose={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
