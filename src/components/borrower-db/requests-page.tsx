"use client";

import { Layers, Plus } from "lucide-react";
import { MyRequestsTab, type RequestKindFilter } from "./my-requests-tab";
import { useBorrowerPortal } from "./context";

const COPY: Record<
  RequestKindFilter,
  { title: string; subtitle: string; cta: string }
> = {
  all: {
    title: "Requests",
    subtitle:
      "Track borrow, assignment, and supply requests in one place. Status updates appear as staff act on them.",
    cta: "New Request",
  },
  borrow: {
    title: "Borrow Requests",
    subtitle: "Temporary equipment loans with a return due date.",
    cta: "New Borrow Request",
  },
  assign: {
    title: "Assign Requests",
    subtitle: "Long-term department equipment with open custody (no due date).",
    cta: "New Assign Request",
  },
  supply: {
    title: "Supply Requests",
    subtitle: "Consumable requisitions issued from stock when approved.",
    cta: "New Supply Request",
  },
};

function wizardTypeForKind(
  kind: RequestKindFilter
): "borrow" | "assign" | "requisition" | undefined {
  if (kind === "borrow") return "borrow";
  if (kind === "assign") return "assign";
  if (kind === "supply") return "requisition";
  return undefined;
}

export function RequestsPage({ kind }: { kind: RequestKindFilter }) {
  const copy = COPY[kind];
  const { openWizard } = useBorrowerPortal();
  const typedKind = kind !== "all";

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle gap-3">
      <div className="rounded-xl border border-border bg-card px-5 py-4 shrink-0 shadow-xs flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-text">{copy.title}</h1>
          <p className="text-xs text-text-secondary mt-0.5">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {typedKind && (
            <button
              type="button"
              onClick={() => openWizard(null)}
              title="File borrow, assignment, and/or supply in one submission"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-bg text-text text-xs font-semibold hover:bg-bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5" aria-hidden />
              Multi-type Request
            </button>
          )}
          <button
            type="button"
            onClick={() => openWizard(null, wizardTypeForKind(kind))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs cursor-pointer"
          >
            {typedKind ? (
              <Plus className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Layers className="h-3.5 w-3.5" aria-hidden />
            )}
            {typedKind ? copy.cta : "Multi-type Request"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <MyRequestsTab kind={kind} />
      </div>
    </div>
  );
}
