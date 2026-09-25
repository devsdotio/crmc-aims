"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, QrCode } from "lucide-react";
import {
  useAssetsQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
} from "@/features/assets/client/use-assets";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import type { Asset, ViewMode, AssetFilterState, AssetStatus } from "@/types/assets";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetViewToggle } from "@/components/assets/asset-view-toggle";
import { AssetGrid } from "@/components/assets/asset-grid";
import { AssetTable } from "@/components/assets/asset-table";
import { AssetDetailPanel } from "@/components/assets/asset-detail-panel";
import { AddEditAssetDialog } from "@/components/assets/add-edit-asset-dialog";
import { ScanAssetDialog } from "@/components/assets/scan-asset-dialog";
import { IssueAssetDialog } from "@/components/assets/issue-asset-dialog";
import { FlagMaintenanceDialog } from "@/components/assets/flag-maintenance-dialog";
import { ResolveMaintenanceDialog } from "@/components/maintenance-logs/resolve-maintenance-dialog";
import { useResolveMaintenanceLogMutation } from "@/features/maintenance-logs/client";
import type { MaintenanceLogRecord } from "@/types/maintenance-logs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import { OperatorReadOnlyBanner } from "@/components/shared/operator-read-only-banner";
import { useToast } from "@/components/providers/toast-context";
import { useAssetOperator } from "@/hooks/use-asset-operator";
import { isAssetAvailableForRequest } from "@/lib/assets-custody";

function AssetsViewContent() {
  const searchParams = useSearchParams();
  const searchParamQuery = searchParams.get("search");
  const { getCategoryStyle } = useCategoryStyleMap();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [filters, setFilters] = useState<AssetFilterState>({
    searchQuery: "",
    categories: [],
    statuses: [],
    availability: "all",
    assignmentType: "all",
    sortBy: "name",
    sortOrder: "asc",
  });

  const serverStatus =
    filters.statuses.length === 1 ? filters.statuses[0] : undefined;
  const serverCategory =
    filters.categories.length === 1 ? filters.categories[0] : undefined;

  const {
    data: assets = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useAssetsQuery(serverStatus, {
    search: filters.searchQuery?.trim() || undefined,
    category: serverCategory,
    availableOnly: filters.availability === "available" ? true : undefined,
    assignmentType:
      filters.assignmentType !== "all" ? filters.assignmentType : undefined,
  });
  const createMutation = useCreateAssetMutation();
  const updateMutation = useUpdateAssetMutation();
  const deleteMutation = useDeleteAssetMutation();
  const resolveMaintenanceMutation = useResolveMaintenanceLogMutation();
  const toast = useToast();
  const { canOperate } = useAssetOperator();

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [addEditState, setAddEditState] = useState<{ isOpen: boolean; asset: Asset | null }>({
    isOpen: false,
    asset: null,
  });
  const [scanOpen, setScanOpen] = useState(false);
  const [issueAsset, setIssueAsset] = useState<Asset | null>(null);
  const [maintenanceAsset, setMaintenanceAsset] = useState<Asset | null>(null);
  const [resolveLog, setResolveLog] = useState<MaintenanceLogRecord | null>(null);

  useEffect(() => {
    if (searchParamQuery) {
      setFilters((prev) => ({ ...prev, searchQuery: searchParamQuery }));
      const q = searchParamQuery.toLowerCase().trim();
      const matched = assets.find(
        (a) =>
          a.assetCode.toLowerCase().trim() === q ||
          a.name.toLowerCase().trim() === q
      );
      if (matched) {
        setSelectedAsset(matched);
      }
    }
  }, [searchParamQuery, assets]);

  const filteredAssets = useMemo(() => {
    const result = assets.filter((asset) => {
      // Multi-select category/status still need client filtering; single values
      // and search / availableOnly / assignmentType are applied server-side.
      if (
        filters.categories.length > 1 &&
        !filters.categories.includes(asset.category)
      ) {
        return false;
      }

      if (
        filters.statuses.length > 1 &&
        !filters.statuses.includes(asset.status)
      ) {
        return false;
      }

      if (
        filters.availability === "available" &&
        !isAssetAvailableForRequest(asset)
      ) {
        return false;
      }

      if (
        filters.assignmentType !== "all" &&
        asset.assignmentType !== filters.assignmentType
      ) {
        return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (filters.sortBy === "code") {
        return a.assetCode.localeCompare(b.assetCode);
      }
      if (filters.sortBy === "date") {
        return b.lastUpdated.localeCompare(a.lastUpdated);
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [assets, filters]);

  const handleFilterChange = (updated: Partial<AssetFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      categories: [],
      statuses: [],
      availability: "all",
      assignmentType: "all",
      sortBy: "name",
      sortOrder: "asc",
    });
  };

  const assignmentTypeCounts = useMemo(
    () => ({
      all: assets.length,
      borrowable: assets.filter((a) => a.assignmentType === "borrowable").length,
      assignable: assets.filter((a) => a.assignmentType === "assignable").length,
    }),
    [assets]
  );

  const handleSaveAsset = async (assetData: Partial<Asset>) => {
    try {
      if (addEditState.asset) {
        await updateMutation.mutateAsync({
          id: addEditState.asset.id,
          payload: {
            name: assetData.name,
            category: assetData.category,
            status: assetData.status,
            assignmentType: assetData.assignmentType as
              | "borrowable"
              | "assignable"
              | undefined,
            serialNumber: assetData.serialNumber,
            location: assetData.location,
            department: assetData.department,
            purchaseDate: assetData.purchaseDate,
            value: assetData.value,
            supplierId:
              assetData.supplierId === undefined
                ? undefined
                : assetData.supplierId || null,
            notes: assetData.notes,
          },
        });
        if (selectedAsset?.id === addEditState.asset.id) {
          setSelectedAsset(null);
        }
        toast.success("Asset updated successfully.");
      } else {
        await createMutation.mutateAsync({
          assetCode: assetData.assetCode || `ASSET-${Date.now()}`,
          name: assetData.name || "New Asset",
          category: (assetData.category as string) || "",
          status: (assetData.status as AssetStatus) || "active",
          assignmentType:
            (assetData.assignmentType as "borrowable" | "assignable") ||
            "borrowable",
          serialNumber: assetData.serialNumber,
          location: assetData.location || "Central Storage",
          department: assetData.department,
          purchaseDate: assetData.purchaseDate,
          value: assetData.value,
          supplierId: assetData.supplierId || undefined,
          notes: assetData.notes,
        });
        toast.success("Asset created successfully.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save asset.");
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return;
    try {
      await deleteMutation.mutateAsync(assetToDelete.id);
      if (selectedAsset?.id === assetToDelete.id) {
        setSelectedAsset(null);
      }
      toast.success(`Asset "${assetToDelete.name}" (${assetToDelete.assetCode}) was deleted.`);
      setAssetToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete asset.");
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md print:h-auto print:overflow-visible print:bg-white" data-theme="light">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden print:hidden">
        <div className="px-4 md:px-6 pt-5 pb-3 bg-bg shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text">
                Institutional Assets Registry
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
                {isLoading
                  ? "Loading items…"
                  : `${filteredAssets.length} of ${assets.length} items`}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Fixed-asset registry for QR-tagged capital equipment, AV gear, vehicles, and furniture.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {canOperate && (
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer shadow-xs"
              >
                <QrCode className="h-4 w-4" strokeWidth={2.5} />
                Scan Code
              </button>
            )}
            {canOperate && (
              <button
                type="button"
                onClick={() => setAddEditState({ isOpen: true, asset: null })}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Add Asset
              </button>
            )}

            <AssetViewToggle viewMode={viewMode} onViewChange={setViewMode} />
          </div>
        </div>

        <AssetFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          totalAssetsCount={assets.length}
          filteredAssetsCount={filteredAssets.length}
          assignmentTypeCounts={assignmentTypeCounts}
        />

        {!canOperate && <OperatorReadOnlyBanner />}

        {isError && (
          <QueryErrorBanner
            message={error?.message || "Failed to load assets."}
            onRetry={() => void refetch()}
          />
        )}

        <main className="flex-1 overflow-y-auto min-h-0 bg-bg">
          {viewMode === "grid" ? (
            <AssetGrid
              assets={filteredAssets}
              loading={isLoading && !isError}
              onSelect={setSelectedAsset}
              getCategoryStyle={getCategoryStyle}
            />
          ) : (
            <AssetTable
              assets={filteredAssets}
              loading={isLoading && !isError}
              onSelect={setSelectedAsset}
              getCategoryStyle={getCategoryStyle}
            />
          )}
        </main>
      </div>

      <AssetDetailPanel
        asset={selectedAsset}
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        onEdit={
          canOperate
            ? (asset) => {
                setSelectedAsset(null);
                setAddEditState({ isOpen: true, asset });
              }
            : undefined
        }
        onIssue={
          canOperate
            ? (asset) => {
                setSelectedAsset(null);
                setIssueAsset(asset);
              }
            : undefined
        }
        onFlagMaintenance={
          canOperate
            ? (asset) => {
                setSelectedAsset(null);
                setMaintenanceAsset(asset);
              }
            : undefined
        }
        onMarkServiceable={
          canOperate
            ? (log) => {
                setResolveLog(log);
              }
            : undefined
        }
        onRepairProgressSaved={(message) => toast.success(message)}
        onDelete={
          canOperate
            ? (asset) => {
                setAssetToDelete(asset);
              }
            : undefined
        }
      />

      {canOperate && (
        <>
          <IssueAssetDialog
            asset={issueAsset}
            isOpen={Boolean(issueAsset)}
            onClose={() => setIssueAsset(null)}
            onSuccess={(message) => toast.success(message)}
          />

          <FlagMaintenanceDialog
            asset={maintenanceAsset}
            isOpen={Boolean(maintenanceAsset)}
            onClose={() => setMaintenanceAsset(null)}
            onSuccess={(message) => toast.success(message)}
          />

          <ResolveMaintenanceDialog
            record={resolveLog}
            isOpen={Boolean(resolveLog)}
            onClose={() => setResolveLog(null)}
            onConfirmResolve={async (rec, payload) => {
              await resolveMaintenanceMutation.mutateAsync({
                id: rec.id,
                resolutionNotes: payload.resolutionNotes,
                technician: payload.technician,
                resolutionDate: payload.resolutionDate,
                repairCost: payload.repairCost,
                repairParts: payload.repairParts,
                noPartsUsed: payload.noPartsUsed,
              });
              toast.success("Asset marked serviceable.");
              setResolveLog(null);
              setSelectedAsset(null);
            }}
          />

          <AddEditAssetDialog
            isOpen={addEditState.isOpen}
            initialAsset={addEditState.asset}
            onClose={() => setAddEditState({ isOpen: false, asset: null })}
            onSave={handleSaveAsset}
          />

          <ScanAssetDialog
            isOpen={scanOpen}
            onClose={() => setScanOpen(false)}
            onSuccess={(message) => toast.success(message)}
          />

          <ConfirmDialog
            isOpen={Boolean(assetToDelete)}
            title="Delete Asset?"
            description={
              assetToDelete ? (
                <>
                  Are you sure you want to delete asset{" "}
                  <strong className="font-bold text-text">
                    &ldquo;{assetToDelete.name}&rdquo; ({assetToDelete.assetCode})
                  </strong>
                  ? This action cannot be undone.
                </>
              ) : (
                ""
              )
            }
            confirmLabel="Delete Asset"
            variant="destructive"
            isLoading={deleteMutation.isPending}
            onConfirm={handleConfirmDelete}
            onClose={() => setAssetToDelete(null)}
          />
        </>
      )}
    </div>
  );
}

/** Shared assets registry shell (admin + borrower browse). */
export function AssetsView() {
  return (
    <Suspense fallback={null}>
      <AssetsViewContent />
    </Suspense>
  );
}
