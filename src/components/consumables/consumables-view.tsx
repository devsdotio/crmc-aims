"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, PackageMinus, Boxes, HardHat, Package } from "lucide-react";
import {
  useConsumablesQuery,
  useCreateConsumableMutation,
  useUpdateConsumableMutation,
  useAdjustConsumableMutation,
  useDeleteConsumableMutation,
  type StockAdjustPayload,
} from "@/features/consumables/client/use-consumables";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import type { ConsumableItem, ConsumableFilterState } from "@/types/inventory";
import { getStockSeverity } from "@/components/consumables/utils";
import { ConsumableFilters } from "@/components/consumables/consumable-filters";
import { AssetViewToggle } from "@/components/assets/asset-view-toggle";
import { ConsumableGrid } from "@/components/consumables/consumable-grid";
import { ConsumableTable } from "@/components/consumables/consumable-table";
import { ConsumableDetailPanel } from "@/components/consumables/consumable-detail-panel";
import { AddEditConsumableDialog } from "@/components/consumables/add-edit-consumable-dialog";
import { AdjustStockDialog } from "@/components/consumables/adjust-stock-dialog";
import { IssueConsumableDialog } from "@/components/consumables/issue-consumable-dialog";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import { OperatorReadOnlyBanner } from "@/components/shared/operator-read-only-banner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/providers/toast-context";
import { useAssetOperator } from "@/hooks/use-asset-operator";

export interface ConsumablesViewProps {
  lockedClassification?: "supply" | "material";
}

export function ConsumablesView({ lockedClassification }: ConsumablesViewProps) {
  const router = useRouter();
  const { getCategoryStyle } = useCategoryStyleMap();
  const {
    data: paginatedData,
    isLoading: isConsumablesLoading,
    isError,
    error,
    refetch,
  } = useConsumablesQuery({
    limit: 200,
    classification: lockedClassification,
  });

  const items = useMemo(
    () => paginatedData?.data ?? [],
    [paginatedData?.data]
  );

  const createMutation = useCreateConsumableMutation();
  const updateMutation = useUpdateConsumableMutation();
  const adjustMutation = useAdjustConsumableMutation();
  const deleteMutation = useDeleteConsumableMutation();
  const toast = useToast();
  const { canOperate } = useAssetOperator();

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [itemToDelete, setItemToDelete] = useState<ConsumableItem | null>(null);

  const isLoading = isConsumablesLoading;

  const [filters, setFilters] = useState<ConsumableFilterState>({
    searchQuery: "",
    category: "all",
    classification: lockedClassification ?? "all",
    stockLevel: "all",
    sortBy: "qty",
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  const [addEditState, setAddEditState] = useState<{
    isOpen: boolean;
    item: ConsumableItem | null;
  }>({ isOpen: false, item: null });
  const [adjustState, setAdjustState] = useState<{
    isOpen: boolean;
    item: ConsumableItem | null;
  }>({ isOpen: false, item: null });
  const [issueItem, setIssueItem] = useState<ConsumableItem | null>(null);
  const [issueLotId, setIssueLotId] = useState<string | undefined>(undefined);
  const [issueOpen, setIssueOpen] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  // Keep detail selection valid when list refreshes
  useEffect(() => {
    if (selectedId && !items.some((i) => i.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  const filteredItems = useMemo(() => {
    const result = items.filter((item) => {
      if (filters.searchQuery?.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCode = item.itemCode.toLowerCase().includes(query);
        if (!matchName && !matchCode) return false;
      }

      if (
        !lockedClassification &&
        filters.classification &&
        filters.classification !== "all" &&
        item.classification !== filters.classification
      ) {
        return false;
      }

      if (
        filters.category &&
        filters.category !== "all" &&
        item.category !== filters.category
      ) {
        return false;
      }

      if (filters.stockLevel && filters.stockLevel !== "all") {
        const severity = getStockSeverity(item.currentQty, item.minThreshold);
        if (severity !== filters.stockLevel) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (filters.sortBy === "qty") {
        if (a.currentQty !== b.currentQty) return a.currentQty - b.currentQty;
        return a.name.localeCompare(b.name);
      }
      if (filters.sortBy === "qty_desc") {
        if (b.currentQty !== a.currentQty) return b.currentQty - a.currentQty;
        return a.name.localeCompare(b.name);
      }
      if (filters.sortBy === "critical") {
        const sevOrder = { critical: 0, low: 1, healthy: 2 };
        const sevA = sevOrder[getStockSeverity(a.currentQty, a.minThreshold)];
        const sevB = sevOrder[getStockSeverity(b.currentQty, b.minThreshold)];
        if (sevA !== sevB) return sevA - sevB;
        const thrA = a.minThreshold || 1;
        const thrB = b.minThreshold || 1;
        return a.currentQty / thrA - b.currentQty / thrB;
      }
      if (filters.sortBy === "updated") {
        return b.lastRestocked.localeCompare(a.lastRestocked);
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [items, filters, lockedClassification]);

  const handleFilterChange = (updated: Partial<ConsumableFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      category: "all",
      classification: lockedClassification ?? "all",
      stockLevel: "all",
      sortBy: "qty",
    });
  };

  const handleSaveConsumable = async (itemData: {
    id?: string;
    itemCode?: string;
    name?: string;
    category?: ConsumableItem["category"];
    classification?: ConsumableItem["classification"];
    unit?: string;
    currentQty?: number;
    minThreshold?: number;
    location?: string;
    supplier?: string | null;
    supplierId?: string | null;
    unitCost?: string | number;
    notes?: string;
  }) => {
    try {
      if (addEditState.item) {
        await updateMutation.mutateAsync({
          id: addEditState.item.id,
          payload: {
            name: itemData.name,
            category: itemData.category,
            classification: itemData.classification || lockedClassification,
            unit: itemData.unit,
            minThreshold: itemData.minThreshold,
            location: itemData.location,
            supplier:
              itemData.supplier === undefined
                ? undefined
                : itemData.supplier || null,
            notes: itemData.notes,
          },
        });
        toast.success("Item updated successfully.");
      } else {
        const created = await createMutation.mutateAsync({
          itemCode: itemData.itemCode,
          name: itemData.name || (lockedClassification === "material" ? "New Material Item" : "New Supply Item"),
          category: itemData.category || "",
          classification: itemData.classification || lockedClassification || "supply",
          unit: itemData.unit || (lockedClassification === "material" ? "pcs" : "reams"),
          currentQty: Number(itemData.currentQty) || 0,
          minThreshold: itemData.minThreshold ?? 15,
          location: itemData.location || "Supply Storage",
          supplier: itemData.supplier || undefined,
          supplierId: itemData.supplierId || undefined,
          unitCost: itemData.unitCost,
          notes: itemData.notes,
        });
        setSelectedId(created.id);
        toast.success("Item created successfully.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save item.");
      throw err;
    }
  };

  const handleConfirmAdjust = async (
    itemId: string,
    payload: StockAdjustPayload
  ) => {
    try {
      await adjustMutation.mutateAsync({
        id: itemId,
        payload,
      });
      toast.success("Stock adjusted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed.");
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteMutation.mutateAsync(itemToDelete.id);
      toast.success(`Consumable item "${itemToDelete.name}" deleted.`);
      if (selectedId === itemToDelete.id) {
        setSelectedId(null);
      }
      setItemToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete item.");
    }
  };

  const pageTitle = lockedClassification === "supply"
    ? "Consumable Supplies"
    : lockedClassification === "material"
    ? "Consumable Materials"
    : "Consumables Inventory";

  const pageSubtitle = lockedClassification === "supply"
    ? "Office stationery, paper, cleaning supplies, and recurring administrative stock."
    : lockedClassification === "material"
    ? "Construction stock, hardware, lumber, electrical items, and direct project materials."
    : "Non-serialized stock (supplies, project materials). Issue from lots; all restocks via official POs.";

  const itemBadgeLabel = lockedClassification === "supply"
    ? "supply items"
    : lockedClassification === "material"
    ? "material items"
    : "items";

  const HeaderIcon = lockedClassification === "supply"
    ? Package
    : lockedClassification === "material"
    ? HardHat
    : Boxes;

  return (
    <div
      className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md print:h-auto print:overflow-visible print:bg-white"
      data-theme="light"
    >
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden print:hidden">
        <div className="px-4 md:px-6 pt-5 pb-3 bg-bg shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <HeaderIcon className="h-5 w-5 text-accent shrink-0" />
              <h1 className="text-xl font-bold tracking-tight text-text">
                {pageTitle}
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
                {isConsumablesLoading
                  ? `Loading ${itemBadgeLabel}…`
                  : `${filteredItems.length} of ${items.length} ${itemBadgeLabel}`}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {pageSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {canOperate && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIssueLotId(undefined);
                    setIssueItem(selectedItem);
                    setIssueOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <PackageMinus className="h-4 w-4" />
                  <span>Issue</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddEditState({ isOpen: true, item: null })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                  <span>Add {lockedClassification === "material" ? "material" : lockedClassification === "supply" ? "supply" : "item"}</span>
                </button>
              </>
            )}

            <AssetViewToggle viewMode={viewMode} onViewChange={setViewMode} />
          </div>
        </div>

        {!canOperate && <OperatorReadOnlyBanner />}

        {actionError && (
          <div className="px-4 md:px-6 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive shrink-0">
            {actionError}
          </div>
        )}

        <ConsumableFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          totalCount={items.length}
          filteredCount={filteredItems.length}
          hideClassificationFilter={Boolean(lockedClassification)}
        />

        {isError && (
          <QueryErrorBanner
            message={error?.message || "Failed to load inventory."}
            onRetry={() => void refetch()}
          />
        )}

        <main className="flex-1 overflow-y-auto min-h-0 bg-bg">
          {viewMode === "grid" ? (
            <ConsumableGrid
              items={filteredItems}
              loading={isLoading && !isError}
              onSelect={(item) => setSelectedId(item.id)}
              getCategoryStyle={getCategoryStyle}
              onAdjust={
                canOperate
                  ? (item) => setAdjustState({ isOpen: true, item })
                  : undefined
              }
              onDelete={
                canOperate
                  ? (item) => setItemToDelete(item)
                  : undefined
              }
            />
          ) : (
            <ConsumableTable
              items={filteredItems}
              loading={isLoading && !isError}
              onSelect={(item) => setSelectedId(item.id)}
              getCategoryStyle={getCategoryStyle}
              onAdjust={
                canOperate
                  ? (item) => setAdjustState({ isOpen: true, item })
                  : undefined
              }
              onDelete={
                canOperate
                  ? (item) => setItemToDelete(item)
                  : undefined
              }
            />
          )}
        </main>
      </div>

      <ConsumableDetailPanel
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedId(null)}
        onOrderPO={() => router.push("/purchase-orders")}
        onAdjust={
          canOperate
            ? (item) => setAdjustState({ isOpen: true, item })
            : undefined
        }
        onRelease={
          canOperate
            ? (item, lot) => {
                setIssueLotId(lot?.id);
                setIssueItem(item);
                setIssueOpen(true);
              }
            : undefined
        }
        onEdit={
          canOperate
            ? (item) => setAddEditState({ isOpen: true, item })
            : undefined
        }
        onDelete={
          canOperate
            ? (item) => setItemToDelete(item)
            : undefined
        }
      />

      {canOperate && (
        <>
          <AddEditConsumableDialog
            isOpen={addEditState.isOpen}
            initialItem={addEditState.item}
            defaultClassification={lockedClassification}
            onClose={() => setAddEditState({ isOpen: false, item: null })}
            onSave={handleSaveConsumable}
          />

          <AdjustStockDialog
            item={adjustState.item}
            isOpen={adjustState.isOpen}
            onClose={() => setAdjustState({ isOpen: false, item: null })}
            onConfirmAdjust={handleConfirmAdjust}
          />

          <IssueConsumableDialog
            item={issueItem}
            allItems={items}
            isOpen={issueOpen}
            initialLotId={issueLotId}
            onClose={() => {
              setIssueOpen(false);
              setIssueItem(null);
              setIssueLotId(undefined);
            }}
            onSuccess={(message) => toast.success(message)}
          />

          <ConfirmDialog
            isOpen={Boolean(itemToDelete)}
            title="Delete Consumable Item?"
            description={
              itemToDelete ? (
                <>
                  Are you sure you want to delete{" "}
                  <strong className="font-bold text-text">
                    &ldquo;{itemToDelete.name}&rdquo; ({itemToDelete.itemCode})
                  </strong>
                  ? This will remove all associated stock records and cannot be undone.
                </>
              ) : ""
            }
            confirmLabel="Delete Item"
            variant="destructive"
            isLoading={deleteMutation.isPending}
            onConfirm={handleConfirmDelete}
            onClose={() => setItemToDelete(null)}
          />
        </>
      )}
    </div>
  );
}
