"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Calendar,
  Package,
  Search,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeQuery } from "@/features/users/client";
import {
  useStockMovementsQuery,
  type StockMovement,
} from "@/features/stock-movements/client";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import type { ConsumableClassification } from "@/lib/consumable-classification";

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
    <div className="rounded-xl border border-border bg-bg p-4 flex gap-3 animate-pulse h-full">
      <div className="h-10 w-10 rounded-lg bg-border shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3.5 w-28 rounded bg-border" />
        <div className="h-3 w-48 rounded bg-border" />
        <div className="h-3 w-40 rounded bg-border" />
      </div>
    </div>
  );
}

function IssuedItemCard({ row }: { row: StockMovement }) {
  const qtyLabel = `${row.direction === "out" ? "−" : "+"}${row.qty}${
    row.unit ? ` ${row.unit}` : ""
  }`;

  return (
    <article className="rounded-xl border border-border bg-bg p-4 h-full flex flex-col gap-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 border shadow-2xs bg-status-active-bg/15 text-status-active-text border-status-active-bg/30">
          <Boxes className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-bold text-text tracking-tight">
            {row.itemCode ?? "—"}
          </p>
          <p className="text-sm font-semibold text-text truncate mt-0.5">
            {row.itemName ?? "Consumable"}
          </p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25 shrink-0">
          {qtyLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-bg-subtle text-text-secondary border border-border">
          <Tag className="h-2.5 w-2.5" />
          {row.movementCode}
        </span>
        {row.voided && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-status-outofservice-bg/15 text-status-outofservice-text border-status-outofservice-bg/30">
            Voided
          </span>
        )}
      </div>

      <div className="mt-auto space-y-1 text-[11px] text-text-secondary">
        <p className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3 shrink-0" />
          Issued {formatDisplayDate(row.createdAt)}
        </p>
        {row.actorName ? (
          <p className="truncate">By {row.actorName}</p>
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
  const isSupply = classification === "supply";
  const title = isSupply ? "Supplies" : "Materials";
  const subtitle = isSupply
    ? "Supplies issued to your department (view only)."
    : "Materials issued to your department (view only).";

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
    limit: 200,
    enabled: Boolean(me?.departmentId),
  });

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
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${isSupply ? "supplies" : "materials"}…`}
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-bg text-sm text-text placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <button
            type="button"
            onClick={() => setHideVoided((v) => !v)}
            className={cn(
              "h-9 px-3 rounded-lg border text-xs font-semibold transition-colors",
              hideVoided
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-bg text-text-secondary hover:bg-bg-subtle"
            )}
          >
            {hideVoided ? "Hiding voided" : "Showing voided"}
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
              <Boxes className="h-7 w-7" strokeWidth={1.8} aria-hidden />
            </span>
            <h3 className="text-base font-bold text-text">
              No issued {isSupply ? "supplies" : "materials"}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
              When stock is released to {deptLabel}, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-0.5 pb-4">
            {filtered.map((row) => (
              <IssuedItemCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
