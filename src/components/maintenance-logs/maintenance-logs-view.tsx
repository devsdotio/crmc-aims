"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Wrench } from "lucide-react";
import type { MaintenanceLogRecord, MaintenanceLogFilterState, ConditionState } from "@/types/maintenance-logs";
import type { AssetCategory } from "@/types/shared";
import {
  useMaintenanceLogsQuery,
  useCreateMaintenanceLogMutation,
  useResolveMaintenanceLogMutation,
} from "@/features/maintenance-logs/client/use-maintenance-logs";
import { useAssetsQuery } from "@/features/assets/client";
import { MaintenanceLogFilters } from "@/components/maintenance-logs/maintenance-log-filters";
import { MaintenanceLogList } from "@/components/maintenance-logs/maintenance-log-list";
import { MaintenanceLogDetailPanel } from "@/components/maintenance-logs/maintenance-log-detail-panel";
import { FlagForMaintenanceDialog } from "@/components/maintenance-logs/flag-for-maintenance-dialog";
import { ResolveMaintenanceDialog } from "@/components/maintenance-logs/resolve-maintenance-dialog";
import { useToast } from "@/components/providers/toast-context";
import { OperatorReadOnlyBanner } from "@/components/shared/operator-read-only-banner";
import { useAssetOperator } from "@/hooks/use-asset-operator";

export function MaintenanceLogsView() {
  const searchParams = useSearchParams();
  const assetCodeParam = searchParams.get("assetCode")?.trim() ?? "";
  const { data: records = [], isLoading } = useMaintenanceLogsQuery();
  const { data: assets = [], isLoading: assetsLoading } = useAssetsQuery();
  const flagMutation = useCreateMaintenanceLogMutation();
  const resolveMutation = useResolveMaintenanceLogMutation();
  const toast = useToast();
  const { canOperate } = useAssetOperator();

  // Filter & Sort State — default to open queue; deep-link via ?assetCode=
  const [filters, setFilters] = useState<MaintenanceLogFilterState>({
    searchQuery: assetCodeParam,
    categories: [],
    conditions: [],
    startDate: "",
    endDate: "",
    openItemsOnly: true,
    sortBy: "open_first",
  });

  useEffect(() => {
    if (!assetCodeParam) return;
    setFilters((prev) => ({
      ...prev,
      searchQuery: assetCodeParam,
      openItemsOnly: true,
      sortBy: "open_first",
    }));
  }, [assetCodeParam]);

  // Modal / Drawer States
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceLogRecord | null>(null);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [resolveDialogRecord, setResolveDialogRecord] = useState<MaintenanceLogRecord | null>(null);

  // Compute live open items count
  const openCount = useMemo(
    () => records.filter((r) => !r.isResolved).length,
    [records]
  );

  // Filter & Sort Log Entries
  const filteredRecords = useMemo(() => {
    const result = records.filter((rec) => {
      // 1. Search Query (Asset Name, Asset Code, Log Code)
      if (filters.searchQuery?.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchName = rec.assetName.toLowerCase().includes(query);
        const matchAssetCode = rec.assetCode.toLowerCase().includes(query);
        const matchLogCode = rec.logCode.toLowerCase().includes(query);
        if (!matchName && !matchAssetCode && !matchLogCode) return false;
      }

      // 2. Category Filter (multi-select)
      if (filters.categories.length > 0 && !filters.categories.includes(rec.category)) {
        return false;
      }

      // 3. Condition Filter (multi-select)
      if (filters.conditions.length > 0) {
        const effectiveCondition = rec.isResolved ? "resolved" : rec.condition;
        if (!filters.conditions.includes(effectiveCondition)) return false;
      }

      // 4. Open Items Only Quick Filter
      if (filters.openItemsOnly && rec.isResolved) {
        return false;
      }

      // 5. Date Range Filter
      if (filters.startDate && rec.dateLogged < filters.startDate) return false;
      if (filters.endDate && rec.dateLogged > filters.endDate) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (filters.sortBy === "open_first") {
        if (a.isResolved !== b.isResolved) {
          return a.isResolved ? 1 : -1; // Unresolved first
        }
        return b.dateLogged.localeCompare(a.dateLogged);
      }
      if (filters.sortBy === "date_asc") {
        return a.dateLogged.localeCompare(b.dateLogged);
      }
      return b.dateLogged.localeCompare(a.dateLogged);
    });

    return result;
  }, [records, filters]);

  // Handlers
  const handleFilterChange = (updated: Partial<MaintenanceLogFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      categories: [],
      conditions: [],
      startDate: "",
      endDate: "",
      openItemsOnly: true,
      sortBy: "open_first",
    });
  };

  const handleConfirmFlag = async (flagData: {
    assetId: string;
    assetCode: string;
    assetName: string;
    category: AssetCategory;
    condition: ConditionState;
    notes: string;
    scheduledDate?: string;
  }) => {
    try {
      await flagMutation.mutateAsync({
        assetId: flagData.assetId,
        assetCode: flagData.assetCode,
        assetName: flagData.assetName,
        category: flagData.category as
          | "computing"
          | "transport"
          | "av"
          | "furniture",
        condition: flagData.condition,
        notes: flagData.notes,
        scheduledDate: flagData.scheduledDate,
      });
      toast.success("Asset flagged for maintenance.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to flag asset.");
      throw err;
    }
  };

  const handleConfirmResolve = async (
    rec: MaintenanceLogRecord,
    payload: {
      resolutionNotes: string;
      technician: string;
      resolutionDate: string;
      repairCost?: string | null;
    }
  ) => {
    try {
      await resolveMutation.mutateAsync({
        id: rec.id,
        resolutionNotes: payload.resolutionNotes,
        technician: payload.technician,
        resolutionDate: payload.resolutionDate,
        repairCost: payload.repairCost,
      });
      toast.success("Maintenance log resolved.");

      if (selectedRecord?.id === rec.id) {
        setSelectedRecord(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve maintenance log.");
      throw err;
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md" data-theme="light">
      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pt-5 pb-3 bg-bg shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text">
              Condition & Maintenance Logs
            </h1>
            {isLoading ? (
              <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
                Loading flags…
              </span>
            ) : openCount > 0 ? (
              <span className="px-2 py-0.5 text-xs font-bold bg-status-repair-bg/20 text-status-repair-text rounded-full border border-status-repair-bg/30">
                {openCount} open attention items
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-bold bg-status-active-bg/20 text-status-active-text rounded-full border border-status-active-bg/30">
                All maintenance flags resolved
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Open repair flags, resolutions, and optional repair costs for assets marked needs repair.
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5">
          {canOperate && (
          <button
            type="button"
            onClick={() => setFlagDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Wrench className="h-4 w-4" strokeWidth={2.5} />
            Flag for Maintenance
          </button>
          )}
        </div>
      </div>

      {!canOperate && <OperatorReadOnlyBanner />}

      {/* ── Search & Filter Controls ──────────────────────────────────── */}
      <MaintenanceLogFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        openCount={openCount}
      />

      {/* ── Internal Scrollable Log List Region ──────────────────────── */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-bg">
        <MaintenanceLogList
          records={filteredRecords}
          loading={isLoading}
          onSelect={setSelectedRecord}
          onResolve={canOperate ? setResolveDialogRecord : undefined}
        />
      </main>

      {/* ── Detail Slide-over Panel ──────────────────────────────────── */}
      <MaintenanceLogDetailPanel
        record={selectedRecord}
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        onResolve={
          canOperate
            ? (rec) => {
                setSelectedRecord(null);
                setResolveDialogRecord(rec);
              }
            : undefined
        }
      />

      {canOperate && (
      <>
      {/* ── Flag for Maintenance Dialog ─────────────────────────────── */}
      <FlagForMaintenanceDialog
        isOpen={flagDialogOpen}
        onClose={() => setFlagDialogOpen(false)}
        assets={assets}
        loadingAssets={assetsLoading}
        onConfirmFlag={handleConfirmFlag}
      />

      {/* ── Resolve Maintenance Dialog ──────────────────────────────── */}
      <ResolveMaintenanceDialog
        record={resolveDialogRecord}
        isOpen={Boolean(resolveDialogRecord)}
        onClose={() => setResolveDialogRecord(null)}
        onConfirmResolve={handleConfirmResolve}
      />
      </>
      )}
    </div>
  );
}
