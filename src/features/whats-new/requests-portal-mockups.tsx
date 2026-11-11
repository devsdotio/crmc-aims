"use client";

import {
  Boxes,
  Wrench,
  Layers,
  ShoppingCart,
  Pencil,
  Package,
  RefreshCw,
  Filter,
  ArrowRight,
  X,
} from "lucide-react";

type RequestsPortalMockupType =
  | "supplies-materials-ui"
  | "cart-wizard-ui"
  | "pending-edit-ui"
  | "issued-history-ui";

export function RequestsPortalMockup({ type }: { type: RequestsPortalMockupType }) {
  if (type === "supplies-materials-ui") {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden select-none text-[10px]">
        <div className="px-3 py-2 bg-bg-subtle border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-text">
            <Filter className="h-3 w-3 text-accent" />
            <span>Requests &amp; Portal Views</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold">
              Supplies
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
              Materials
            </span>
            <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300 font-bold">
              Mixed
            </span>
          </div>
        </div>

        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-bg/60">
          {/* Sidebar Mini Preview */}
          <div className="rounded-lg border border-border bg-bg p-2 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-text-secondary px-1">
              Separated Sidebar Groups
            </p>
            <div className="flex items-center justify-between px-2 py-1 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Boxes className="h-3 w-3" /> Requests · Supplies
              </span>
              <span className="px-1 rounded-full bg-teal-500/20 text-[9px] font-bold">2</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Wrench className="h-3 w-3" /> Requests · Materials
              </span>
              <span className="px-1 rounded-full bg-amber-500/20 text-[9px] font-bold">1</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded bg-bg-subtle text-text font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-violet-500" /> Inventory · Issued Views
              </span>
              <span className="px-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                Separated
              </span>
            </div>
          </div>

          {/* Request Cards Preview */}
          <div className="space-y-1.5">
            <div className="rounded-lg border border-border bg-bg p-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-text truncate">CRQ-2026-041 · Printer Ink</p>
                <p className="text-[9px] text-text-secondary">Issued Supplies</p>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold shrink-0">
                Supplies
              </span>
            </div>
            <div className="rounded-lg border border-border bg-bg p-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-text truncate">CRQ-2026-042 · PVC Conduit</p>
                <p className="text-[9px] text-text-secondary">Issued Materials</p>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                Materials
              </span>
            </div>
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-text truncate">CRQ-2026-043 · Combined Kit</p>
                <p className="text-[9px] text-text-secondary">Paper + Electrical tape</p>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300 font-bold shrink-0">
                Mixed
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "cart-wizard-ui") {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden select-none text-[10px]">
        <div className="px-3 py-2 bg-bg-subtle border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-text">
            <ShoppingCart className="h-3 w-3 text-accent" />
            <span>Combined Cart → Separated Wizard Bundles</span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent font-bold text-[9px]">
            Add all to Purpose 1
          </span>
        </div>

        <div className="p-3 space-y-2.5 bg-bg/60">
          {/* Separated Bundles inside Wizard */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-bg p-2 space-y-1">
              <span className="inline-block px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[9px] font-bold">
                Borrow
              </span>
              <p className="font-semibold text-text truncate">Projector</p>
              <p className="text-[9px] text-text-secondary">Purpose 1 · 1 unit</p>
            </div>
            <div className="rounded-lg border border-border bg-bg p-2 space-y-1">
              <span className="inline-block px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 text-[9px] font-bold">
                Supplies
              </span>
              <p className="font-semibold text-text truncate">Bond Paper</p>
              <p className="text-[9px] text-text-secondary font-mono">2 reams</p>
            </div>
            <div className="rounded-lg border border-border bg-bg p-2 space-y-1">
              <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                Materials
              </span>
              <p className="font-semibold text-text truncate">Copper Wire</p>
              <p className="text-[9px] text-text-secondary font-mono">1.5 m</p>
            </div>
          </div>

          {/* Sticky Request Cart Strip */}
          <div className="rounded-lg border border-accent/30 bg-primary text-primary-foreground px-3 py-2 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-white/15 font-bold">3 items</span>
              <span className="truncate text-white/90">
                1 Borrow · 1 Supply · 1 Material
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent text-white font-bold shrink-0">
              Checkout <ArrowRight className="h-2.5 w-2.5" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "pending-edit-ui") {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden select-none text-[10px]">
        <div className="px-3 py-2 bg-bg-subtle border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text">REQ-2026-089</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[9px]">
              Pending
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/15 text-accent font-bold">
            <Pencil className="h-2.5 w-2.5" /> Edit Request
          </span>
        </div>

        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-bg/60">
          <div className="rounded-lg border border-border bg-bg p-2.5 space-y-1.5">
            <p className="font-bold text-text">Requester Portal</p>
            <p className="text-[9px] text-text-secondary leading-snug">
              Owners can update purpose, dates, assignee, or item quantities while Pending.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[9px]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                Owner: Edit / Cancel
              </span>
              <span className="px-1.5 py-0.5 rounded bg-bg-subtle text-text-secondary">
                Others: View only
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-accent/30 bg-accent/5 p-2.5 space-y-1.5">
            <p className="font-bold text-text">Admin Office Queue</p>
            <p className="text-[9px] text-text-secondary leading-snug">
              Edit any requester&apos;s pending Borrow, Assign, Supplies, Materials, or Mixed lines.
            </p>
            <div className="pt-1 flex items-center justify-between text-[9px] font-mono bg-bg rounded border border-border px-2 py-1">
              <span className="text-text-secondary">Requested: 10</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Issued: 10
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden select-none text-[10px]">
      <div className="px-3 py-2 bg-bg-subtle border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-text">
          <Package className="h-3 w-3 text-accent" />
          <span>Issued Views &amp; Custody History</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-bold">
            All
          </span>
          <span className="px-1.5 py-0.5 rounded bg-bg border border-border text-text-secondary">
            Borrowed
          </span>
          <span className="px-1.5 py-0.5 rounded bg-bg border border-border text-text-secondary">
            Assigned
          </span>
        </div>
      </div>

      <div className="p-3 space-y-2 bg-bg/60">
        <div className="rounded-lg border border-border bg-bg p-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-text truncate">Alcohol 70% (500mL) · Supply</p>
            <p className="text-[9px] text-amber-700 dark:text-amber-300 font-semibold">
              Out of stock — still requestable (Admin restocks)
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/15 text-accent font-bold shrink-0">
            <RefreshCw className="h-2.5 w-2.5" /> Request again
          </span>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-bg px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[9px] text-text-secondary">
            Request Details Drawer · Mobile Footer
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-bg-subtle text-text font-semibold">
            <X className="h-2.5 w-2.5" /> Close
          </span>
        </div>
      </div>
    </div>
  );
}

