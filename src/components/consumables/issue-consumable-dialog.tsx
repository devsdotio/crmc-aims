"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageMinus, Search, X } from "lucide-react";
import type { ConsumableItem } from "@/types/inventory";
import { useDepartmentsQuery } from "@/features/departments/client";
import { useProjectsQuery } from "@/features/projects/client";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client/use-purchase-lots";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";
import { useQueryClient } from "@tanstack/react-query";
import {
  STOCK_DOMAINS,
  invalidateDomains,
} from "@/features/shared/cache-invalidation";
import { formatPhp } from "@/components/projects/format-money";
import { availableQty } from "@/components/consumables/utils";
import { cn } from "@/lib/utils";
import {
  filterUnsignedIntInput,
  parseUnsignedInt,
} from "@/lib/numeric-input";
import { SearchableSelect } from "@/components/ui/searchable-select";

const ISSUE_TIMEOUT_MS = 60_000;

export interface IssueConsumableDialogProps {
  /** Pre-selected supply (e.g. from detail panel). When null, user picks from catalog. */
  item: ConsumableItem | null;
  /** Catalog for supply picker when not opened from a specific item. */
  allItems?: ConsumableItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  initialLotId?: string;
}

type DestinationKind = "department" | "project";

export function IssueConsumableDialog({
  item: lockedItem,
  allItems = [],
  isOpen,
  onClose,
  onSuccess,
  initialLotId,
}: IssueConsumableDialogProps) {
  const qc = useQueryClient();
  const {
    data: departments = [],
    isLoading: departmentsLoading,
    isError: departmentsError,
  } = useDepartmentsQuery({ enabled: isOpen });
  const { data: projects = [] } = useProjectsQuery();
  const mutableProjects = useMemo(
    () => projects.filter((p) => p.status !== "completed" && p.status !== "cancelled"),
    [projects]
  );

  const stockedItems = useMemo(() => {
    const list = allItems.length > 0 ? allItems : lockedItem ? [lockedItem] : [];
    return list.filter((i) => availableQty(i) > 0);
  }, [allItems, lockedItem]);

  const itemLocked = Boolean(lockedItem);
  const [supplySearch, setSupplySearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [destinationKind, setDestinationKind] =
    useState<DestinationKind>("department");
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [lotId, setLotId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [receivedBy, setReceivedBy] = useState("");
  const [requestedByName, setRequestedByName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const filteredSupplies = useMemo(() => {
    if (!supplySearch.trim()) return stockedItems;
    const q = supplySearch.toLowerCase().trim();
    return stockedItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.itemCode.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [stockedItems, supplySearch]);

  const supplyOptions = useMemo(
    () =>
      filteredSupplies.map((i) => ({
        value: i.id,
        label: `${i.name} (${i.itemCode}) — ${availableQty(i)} ${i.unit}`,
        keywords: `${i.itemCode} ${i.name}`,
      })),
    [filteredSupplies]
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

  const selectedItem = useMemo(() => {
    if (lockedItem) return lockedItem;
    return (
      stockedItems.find((i) => i.id === selectedItemId) ??
      filteredSupplies.find((i) => i.id === selectedItemId) ??
      null
    );
  }, [lockedItem, stockedItems, filteredSupplies, selectedItemId]);

  const { data: lots = [], isLoading: lotsLoading } = usePurchaseLotsQuery({
    consumableId: selectedItem?.id,
    itemType: "consumable",
    enabled: isOpen && Boolean(selectedItem?.id),
  });
  const availableLots = useMemo(
    () => lots.filter((lot) => lot.quantityRemaining > 0),
    [lots]
  );

  const lotOptions = useMemo(
    () =>
      availableLots.map((lot) => ({
        value: lot.id,
        label: `${lot.lotCode} · ${lot.quantityRemaining} remaining (${formatPhp(Number(lot.unitCost))}/unit)`,
        keywords: lot.lotCode,
      })),
    [availableLots]
  );

  const selectedLot = availableLots.find((lot) => lot.id === lotId) ?? null;

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setQuantity("1");
    setReceivedBy("");
    setRequestedByName("");
    setNotes("");
    setSupplySearch("");
    setSelectedItemId(lockedItem?.id ?? "");
    setLotId(initialLotId ?? "");
    setDestinationKind("department");
    setPending(false);
  }, [isOpen, lockedItem, initialLotId]);

  // Keep destination IDs in sync once catalogs load (avoid empty controlled select).
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

  // When supply changes (user picker), clear lot unless initialLot matches
  useEffect(() => {
    if (!isOpen || !selectedItemId) return;
    if (initialLotId && lockedItem?.id === selectedItemId) return;
    setLotId("");
    setQuantity("1");
  }, [isOpen, selectedItemId, initialLotId, lockedItem?.id]);

  // Prefill first available lot when lots load
  useEffect(() => {
    if (!isOpen || !selectedItemId) return;
    if (lotId && availableLots.some((l) => l.id === lotId)) return;
    if (initialLotId && availableLots.some((l) => l.id === initialLotId)) {
      setLotId(initialLotId);
      return;
    }
    if (availableLots.length > 0) {
      setLotId(availableLots[0].id);
    }
  }, [availableLots, isOpen, selectedItemId, initialLotId, lotId]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, pending, onClose]);

  if (!isOpen) return null;

  const freeQty = selectedItem
    ? (selectedItem.availableQty ?? availableQty(selectedItem))
    : 0;
  const maxQty = selectedLot
    ? Math.min(selectedLot.quantityRemaining, freeQty)
    : freeQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedItem) {
      setError("Select a supply item to issue.");
      return;
    }
    if (destinationKind === "department" && !departmentId) {
      setError(
        departmentsLoading
          ? "Still loading departments. Please wait a moment."
          : departmentsError
            ? "Could not load departments. Close and try again."
            : "Select a department."
      );
      return;
    }
    if (destinationKind === "project" && !projectId) {
      setError("Select a project.");
      return;
    }
    if (!lotId || !selectedLot) {
      setError("Select a purchase lot to issue from.");
      return;
    }
    const qty = parseUnsignedInt(quantity, 0);
    if (qty < 1) {
      setError("Quantity must be at least 1.");
      return;
    }
    if (qty > selectedLot.quantityRemaining) {
      setError(
        `Selected lot only has ${selectedLot.quantityRemaining} ${selectedItem.unit} remaining.`
      );
      return;
    }
    if (freeQty < 1) {
      setError(
        (selectedItem.reservedQty ?? 0) > 0
          ? "On-hand stock is reserved for approved supply requests."
          : "Not on hand. Restock first."
      );
      return;
    }
    if (qty > freeQty) {
      setError(
        `Not on hand. Available: ${freeQty} ${selectedItem.unit}${(selectedItem.reservedQty ?? 0) > 0 ? ` (${selectedItem.reservedQty} reserved)` : ""}.`
      );
      return;
    }

    setPending(true);
    try {
      const payload: Record<string, unknown> = {
        quantity: qty,
        lotId,
      };
      if (destinationKind === "department") {
        payload.departmentId = departmentId;
      } else {
        payload.projectId = projectId;
      }
      if (receivedBy.trim()) payload.receivedBy = receivedBy.trim();
      if (requestedByName.trim()) payload.requestedByName = requestedByName.trim();
      if (notes.trim()) payload.notes = notes.trim();

      await fetchJson<ApiResponse<ConsumableItem>>(
        `/api/consumables/${selectedItem.id}/issue`,
        {
          method: "POST",
          body: JSON.stringify(payload),
          timeoutMs: ISSUE_TIMEOUT_MS,
        }
      );
      void invalidateDomains(qc, [
        ...STOCK_DOMAINS,
        "projects",
      ]);
      onSuccess?.(
        `${selectedItem.itemCode} issued (${qty} ${selectedItem.unit}).`
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Issue failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !pending && onClose()}
      />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-border bg-bg shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-bold text-text">Issue supplies</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {selectedItem
                ? `${selectedItem.itemCode} · ${freeQty} ${selectedItem.unit} available`
                : "Select a supply, then the lot to issue from"}
              {selectedItem && (selectedItem.reservedQty ?? 0) > 0
                ? ` (${selectedItem.reservedQty} reserved)`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="p-1 rounded hover:bg-bg-subtle text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-text-secondary">
            Manual issue from a specific purchase lot. Destination is exactly one
            department or project. Consumables are not returned.
          </p>

          {/* Supply picker — shown when not opened from a locked detail item */}
          {!itemLocked && (
            <div className="space-y-2">
              <label className="block space-y-1">
                <span className="text-[11px] font-bold uppercase text-text-secondary">
                  Supply item <span className="text-accent">*</span>
                </span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                  <input
                    type="search"
                    value={supplySearch}
                    onChange={(e) => setSupplySearch(e.target.value)}
                    placeholder="Search by name or code…"
                    className="w-full h-9 pl-8.5 pr-3 text-sm border border-border rounded-lg bg-bg"
                  />
                </div>
              </label>
              {stockedItems.length === 0 ? (
                <p className="text-xs text-status-repair-text">
                  No supplies with available stock. Restock first.
                </p>
              ) : (
                <SearchableSelect
                  value={selectedItemId}
                  onValueChange={setSelectedItemId}
                  options={supplyOptions}
                  placeholder="Select a supply…"
                  clearLabel="Select a supply…"
                  emptyMessage="No supplies match your search"
                  inputClassName="text-sm font-normal"
                  aria-required="true"
                />
              )}
            </div>
          )}

          {itemLocked && selectedItem && (
            <div className="rounded-lg border border-border bg-bg-subtle/50 px-3 py-2.5 text-xs">
              <p className="font-bold text-text">{selectedItem.name}</p>
              <p className="text-text-secondary font-mono mt-0.5">
                {selectedItem.itemCode} · {selectedItem.category}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDestinationKind("department")}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-lg border",
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
                "flex-1 py-2 text-xs font-semibold rounded-lg border",
                destinationKind === "project"
                  ? "border-primary bg-primary/5 text-text"
                  : "border-border text-text-secondary"
              )}
            >
              Project
            </button>
          </div>

          {destinationKind === "department" ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-bold uppercase text-text-secondary">
                Department <span className="text-accent">*</span>
              </span>
              {departmentsLoading ? (
                <p className="text-xs text-text-secondary animate-pulse py-2">
                  Loading departments…
                </p>
              ) : departmentsError ? (
                <p className="text-xs text-status-outofservice-text">
                  Failed to load departments. Check Settings → Departments, then retry.
                </p>
              ) : (
                <SearchableSelect
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
                  inputClassName="text-sm font-normal"
                  aria-required="true"
                />
              )}
            </label>
          ) : (
            <label className="block space-y-1">
              <span className="text-[11px] font-bold uppercase text-text-secondary">
                Project <span className="text-accent">*</span>
              </span>
              <SearchableSelect
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
                inputClassName="text-sm font-normal"
                aria-required="true"
              />
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase text-text-secondary">
              Purchase lot <span className="text-accent">*</span>
            </span>
            {!selectedItem ? (
              <p className="text-xs text-text-secondary py-2">
                Select a supply first to see its lots.
              </p>
            ) : lotsLoading ? (
              <p className="text-xs text-text-secondary animate-pulse py-2">
                Loading lots…
              </p>
            ) : (
              <SearchableSelect
                value={lotId}
                onValueChange={setLotId}
                options={lotOptions}
                placeholder="Select a lot…"
                clearLabel="Select a lot…"
                emptyMessage="No lots with remaining stock"
                inputClassName="text-sm font-normal"
                aria-required="true"
              />
            )}
            {selectedItem && !lotsLoading && availableLots.length === 0 && (
              <p className="text-[11px] text-status-repair-text">
                No lots with remaining stock for this item. Restock first.
              </p>
            )}
          </label>

          <label className="block space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-text-secondary">
                Quantity
              </span>
              {selectedLot && selectedItem && (
                <span className="text-[10px] text-text-secondary">
                  Max: {maxQty} {selectedItem.unit}
                </span>
              )}
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => {
                const next = filterUnsignedIntInput(e.target.value);
                if (next !== null) setQuantity(next);
              }}
              disabled={!selectedItem || !selectedLot}
              placeholder="1"
              className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-bg font-mono disabled:opacity-50"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase text-text-secondary">
              Received by (optional)
            </span>
            <input
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Person who picked up"
              className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-bg"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase text-text-secondary">
              Requested by (optional)
            </span>
            <input
              value={requestedByName}
              onChange={(e) => setRequestedByName(e.target.value)}
              placeholder="Person on paper slip"
              className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-bg"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase text-text-secondary">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg resize-none"
            />
          </label>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              pending ||
              !selectedItem ||
              !lotId ||
              freeQty < 1 ||
              availableLots.length === 0 ||
              (destinationKind === "department" &&
                (!departmentId || departmentsLoading)) ||
              (destinationKind === "project" && !projectId)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            <PackageMinus className="h-3.5 w-3.5" />
            {pending ? "Issuing…" : "Confirm issue"}
          </button>
        </div>
      </form>
    </div>
  );
}
