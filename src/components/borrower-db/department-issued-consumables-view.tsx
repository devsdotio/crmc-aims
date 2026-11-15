"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Calendar,
  Package,
  RefreshCw,
  Search,
  Tag,
  Wrench,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeQuery } from "@/features/users/client";
import { useBorrowerPortal } from "@/components/borrower-db/context";
import type { BrowseConsumableItem } from "@/components/borrower-db/types";
import {
  useConsumableCatalogQuery,
} from "@/features/consumables/client/use-consumables";
import type { ConsumableItem } from "@/features/consumables/client/consumables-api";
import { availableQty } from "@/components/consumables/utils";
import {
  useStockMovementsQuery,
  type StockMovement,
} from "@/features/stock-movements/client";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import type { ConsumableClassification } from "@/lib/consumable-classification";
import { displayQty } from "@/lib/qty";

function formatDisplayDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function IssueCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-bg p-4 flex flex-col gap-3 animate-pulse h-full min-h-[192px]">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-border shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-4 w-36 rounded bg-border" />
          <div className="h-3 w-24 rounded bg-border" />
        </div>
        <div className="h-5 w-16 rounded-full bg-border shrink-0" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-5 w-24 rounded-md bg-border" />
        <div className="h-5 w-16 rounded-full bg-border" />
      </div>
      <div className="mt-auto pt-3 border-t border-border/60 flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="h-3 w-28 rounded bg-border" />
          <div className="h-3 w-20 rounded bg-border" />
        </div>
        <div className="h-11 sm:h-9 w-28 rounded-lg bg-border shrink-0" />
      </div>
    </div>
  );
}

function cleanMovementNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const cleaned = notes
    .replace(/\[VOIDED\]/gi, "")
    .replace(/\[REVERSES:[0-9a-f-]{36}\]/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^\.\s*|\s*\.$/g, "")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

function IssuedItemCard({
  row,
  classification,
  liveItem,
}: {
  row: StockMovement;
  classification: ConsumableClassification;
  liveItem?: ConsumableItem;
}) {
  const { openWizard } = useBorrowerPortal();
  const isMaterial = classification === "material";
  const qtyLabel = `${displayQty(row.qty)}${row.unit ? ` ${row.unit}` : ""}`;
  const isVoided = Boolean(row.voided);
  const isIssued = row.direction === "out" && !row.isReversal && !isVoided;
  const cleanNotes = cleanMovementNotes(row.notes);
  const sourceLabel = row.requestCode
    ? `Via ${row.requestCode}`
    : row.requestId
      ? "Via Request"
      : "Direct Issue";

  const liveFreeQty = liveItem
    ? (liveItem.availableQty ?? availableQty(liveItem))
    : undefined;
  const isOutOfStock = liveFreeQty !== undefined && liveFreeQty <= 0;
  const canRequestAgain =
    !row.voided && !row.isReversal && Boolean(row.consumableId);

  const requestAgain = () => {
    if (!canRequestAgain) return;
    const freeQty = liveFreeQty ?? 1;
    const status: BrowseConsumableItem["status"] = liveItem
      ? freeQty <= 0
        ? "out_of_stock"
        : freeQty <= (liveItem.minThreshold ?? 0)
          ? "low_stock"
          : "available"
      : "available";

    const item: BrowseConsumableItem = {
      type: "consumable",
      id: liveItem?.id ?? row.consumableId,
      name: liveItem?.name ?? row.itemName ?? "Consumable",
      category:
        liveItem?.category ?? (isMaterial ? "Material" : "Supply"),
      classification: liveItem?.classification ?? classification,
      status,
      itemCode: liveItem?.itemCode ?? row.itemCode ?? "",
      unit: liveItem?.unit ?? row.unit ?? "unit",
      currentQty: freeQty,
      location: liveItem?.location ?? "",
    };
    openWizard([item], isMaterial ? "material" : "supply");
  };

  return (
    <article
      className={cn(
        "rounded-xl border bg-bg p-4 h-full flex flex-col gap-3 transition-colors",
        isVoided
          ? "border-border/80 opacity-80"
          : isMaterial
            ? "border-border hover:border-teal-500/40"
            : "border-border hover:border-emerald-500/40"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg shrink-0 border shadow-2xs",
            isMaterial
              ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
          )}
        >
          {isMaterial ? (
            <Wrench className="h-4 w-4" strokeWidth={2.2} />
          ) : (
            <Boxes className="h-4 w-4" strokeWidth={2.2} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text truncate">
            {row.itemName ?? "Consumable"}
          </p>
          <p className="font-mono text-xs text-text-secondary tracking-tight mt-0.5">
            {row.itemCode ?? "—"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border shrink-0 tabular-nums",
            isMaterial
              ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
          )}
        >
          {qtyLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-bg-subtle text-text-secondary border border-border">
          <Tag className="h-2.5 w-2.5" />
          {row.movementCode}
        </span>
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border",
            row.requestId
              ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25"
              : "bg-bg-subtle text-text-secondary border-border"
          )}
        >
          {sourceLabel}
        </span>
        {!isVoided ? (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
              isIssued
                ? "bg-status-active-bg/15 text-status-active-text border-status-active-bg/30"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
            )}
          >
            {row.isReversal ? "Reversal" : "Issued"}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-status-outofservice-bg/15 text-status-outofservice-text border-status-outofservice-bg/30">
            Voided
          </span>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-border/60 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1 text-[11px] text-text-secondary">
          <p className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
            Issued {formatDisplayDate(row.createdAt)}
          </p>
          {row.actorName ? (
            <p className="truncate">By {row.actorName}</p>
          ) : null}
          {cleanNotes ? (
            <p className="line-clamp-2 text-text-secondary/90 leading-snug" title={cleanNotes}>
              {cleanNotes}
            </p>
          ) : null}
          {canRequestAgain && isOutOfStock && (
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 leading-snug">
              Out of stock — Admin will restock
            </p>
          )}
        </div>
        {canRequestAgain ? (
          <button
            type="button"
            onClick={requestAgain}
            className="ml-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-11 sm:min-h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:opacity-80 transition-opacity shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Request again</span>
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function DepartmentIssuedConsumablesView({
  classification,
}: {
  classification: ConsumableClassification;
}) {
  const { openWizard } = useBorrowerPortal();
  const isSupply = classification === "supply";
  const title = isSupply ? "Issued Supplies" : "Issued Materials";
  const subtitle = isSupply
    ? "Supplies released to your department. Request again to ask for more."
    : "Materials released to your department. Request again to ask for more.";

  const { data: me, isLoading: meLoading } = useMeQuery();
  const {
    data: movements = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useStockMovementsQuery({
    reason: "issue",
    classification,
    fetchAll: true,
    enabled: Boolean(me?.departmentId),
  });
  const { data: catalogData } = useConsumableCatalogQuery({
    catalog: true,
    classification,
    enabled: Boolean(me?.departmentId),
  });

  const catalogById = useMemo(
    () => new Map((catalogData?.data ?? []).map((item) => [item.id, item])),
    [catalogData?.data]
  );

  const [search, setSearch] = useState("");
  const [hideVoided, setHideVoided] = useState(true);

  const filtered = useMemo(() => {
    let list = movements;
    if (hideVoided) {
      list = list.filter((r) => !r.voided && !r.isReversal);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (r) =>
        (r.itemCode ?? "").toLowerCase().includes(q) ||
        (r.itemName ?? "").toLowerCase().includes(q) ||
        r.movementCode.toLowerCase().includes(q) ||
        (r.requestCode ?? "").toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q) ||
        (r.actorName ?? "").toLowerCase().includes(q)
    );
  }, [movements, search, hideVoided]);

  const deptLabel =
    me?.department?.trim() ||
    me?.departmentCode?.trim() ||
    "Your department";

  const loading = isLoading || meLoading;

  if (!meLoading && me && !me.departmentId) {
    return (
      <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle gap-3">
        <div className="rounded-xl border border-border bg-card px-5 py-4 shrink-0 shadow-xs">
          <h1 className="text-xl font-bold tracking-tight text-text">{title}</h1>
          <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg text-text-secondary mb-3">
            <Package className="h-7 w-7" strokeWidth={1.8} aria-hidden />
          </span>
          <h3 className="text-base font-bold text-text">No department linked</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
            Ask Property Custodian to assign your account to a department before
            viewing issued {isSupply ? "supplies" : "materials"}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle gap-3">
      <div className="rounded-xl border border-border bg-card px-5 py-4 shrink-0 shadow-xs space-y-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">{title}</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {subtitle} · {deptLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48 max-w-md">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={`Search issued ${isSupply ? "supplies" : "materials"}`}
              placeholder={`Search ${isSupply ? "supplies" : "materials"}…`}
              className="w-full h-9 pl-8 pr-8 rounded-lg border border-border bg-bg text-sm text-text placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded flex items-center justify-center text-text-secondary hover:text-text cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            aria-pressed={!hideVoided}
            onClick={() => setHideVoided((v) => !v)}
            className={cn(
              "min-h-11 sm:min-h-9 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              !hideVoided
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-bg text-text-secondary hover:bg-bg-subtle hover:text-text"
            )}
          >
            {hideVoided ? "Show voided & reversals" : "Showing voided & reversals"}
          </button>
        </div>
      </div>

      {isError ? (
        <QueryErrorBanner
          message={
            error instanceof Error
              ? error.message
              : "Failed to load issued items."
          }
          onRetry={() => void refetch()}
        />
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <IssueCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg text-text-secondary mb-3">
              {isSupply ? (
                <Boxes className="h-7 w-7" strokeWidth={1.8} aria-hidden />
              ) : (
                <Wrench className="h-7 w-7" strokeWidth={1.8} aria-hidden />
              )}
            </span>
            <h3 className="text-base font-bold text-text">
              No issued {isSupply ? "supplies" : "materials"}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
              {search.trim()
                ? "No issued items match your search query."
                : `When ${isSupply ? "supplies are" : "materials are"} released to ${deptLabel}, they will appear here.`}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="px-3.5 py-2 min-h-11 sm:min-h-9 rounded-lg border border-border bg-bg text-xs font-semibold text-text hover:bg-bg-subtle cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Clear search
                </button>
              )}
              <button
                type="button"
                onClick={() => openWizard(undefined, isSupply ? "supply" : "material")}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-11 sm:min-h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:opacity-80 transition-opacity shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Request {isSupply ? "Supplies" : "Materials"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-0.5 pb-4">
            {filtered.map((row) => (
              <IssuedItemCard
                key={row.id}
                row={row}
                classification={classification}
                liveItem={catalogById.get(row.consumableId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
