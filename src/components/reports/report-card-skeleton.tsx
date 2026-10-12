"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-border/40 shimmer-skeleton",
        className
      )}
    />
  );
}

/** ── Asset Card Skeleton (matches 3-col asset register card) ─────────── */
export function AssetCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 space-y-4 shadow-2xs">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-4.5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4.5 w-4/5 rounded-md mb-1.5" />
        <Skeleton className="h-3 w-28 rounded-md mb-3" />
        <div className="flex gap-1.5">
          <Skeleton className="h-4.5 w-20 rounded-md" />
          <Skeleton className="h-4.5 w-16 rounded-md" />
        </div>
        <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
          <Skeleton className="h-3.5 w-3/4 rounded-md" />
          <Skeleton className="h-3.5 w-1/2 rounded-md" />
        </div>
      </div>
      <div className="pt-3 border-t border-border/50 flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-4 w-14 rounded-md" />
      </div>
    </div>
  );
}

/** ── Consumable Card Skeleton (matches 3-col consumable SKU card) ─────── */
export function ConsumableCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 space-y-4 shadow-2xs">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-4.5 w-18 rounded-full" />
        </div>
        <Skeleton className="h-4.5 w-4/5 rounded-md mb-2" />
        <div className="flex gap-1.5 mb-2.5">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
        <Skeleton className="h-3.5 w-32 rounded-md mb-3" />
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/40">
          <div className="p-2 rounded-lg bg-bg-subtle/50 border border-border/50 flex flex-col items-center gap-1.5">
            <Skeleton className="h-2.5 w-10 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <div className="p-2 rounded-lg bg-bg-subtle/50 border border-border/50 flex flex-col items-center gap-1.5">
            <Skeleton className="h-2.5 w-12 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>
          <div className="p-2 rounded-lg bg-bg-subtle/50 border border-border/50 flex flex-col items-center gap-1.5">
            <Skeleton className="h-2.5 w-12 rounded" />
            <Skeleton className="h-4 w-8 rounded" />
          </div>
        </div>
      </div>
      <div className="pt-3 border-t border-border/50 flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-4 w-14 rounded-md" />
      </div>
    </div>
  );
}

/** ── Maintenance Card Skeleton (matches fixed h-82.5 2-col card) ──── */
export function MaintenanceCardSkeleton() {
  return (
    <div className="h-82.5 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs flex flex-col justify-between gap-3">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between mb-2.5">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-4.5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4.5 w-3/4 rounded-md mb-1.5" />
        <Skeleton className="h-3.5 w-1/2 rounded-md mb-3" />
      </div>
      <div className="flex-1 min-h-24 rounded-xl bg-bg-subtle/60 border border-border/60 p-3 space-y-2">
        <Skeleton className="h-3 w-36 rounded" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-6 rounded-lg" />
          <Skeleton className="h-6 rounded-lg" />
        </div>
      </div>
      <div className="pt-3 border-t border-border/50 flex items-center justify-between shrink-0">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-4 w-16 rounded-md" />
      </div>
    </div>
  );
}

/** ── Department Card Skeleton (matches 3-col 4-stat metric card) ──────── */
export function DepartmentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-4 w-4 rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-border/60 bg-bg-subtle/40 p-2.5 space-y-1.5">
            <Skeleton className="h-2.5 w-12 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </div>
          <div className="rounded-xl border border-border/60 bg-bg-subtle/40 p-2.5 space-y-1.5">
            <Skeleton className="h-2.5 w-12 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </div>
          <div className="rounded-xl border border-border/60 bg-bg-subtle/40 p-2.5 space-y-1.5">
            <Skeleton className="h-2.5 w-12 rounded" />
            <Skeleton className="h-4 w-8 rounded" />
            <Skeleton className="h-2.5 w-14 rounded" />
          </div>
          <div className="rounded-xl border border-border/60 bg-bg-subtle/40 p-2.5 space-y-1.5">
            <Skeleton className="h-2.5 w-14 rounded" />
            <Skeleton className="h-4 w-8 rounded" />
            <Skeleton className="h-2.5 w-12 rounded" />
          </div>
        </div>
      </div>
      <div className="pt-2.5 border-t border-border/50 flex items-center justify-between">
        <Skeleton className="h-3.5 w-20 rounded-md" />
        <Skeleton className="h-3.5 w-24 rounded-md" />
      </div>
    </div>
  );
}

/** ── Project Card Skeleton (matches 3-col project card) ───────────────── */
export function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 space-y-4 shadow-2xs">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-4.5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4.5 w-4/5 rounded-md mb-1.5" />
        <Skeleton className="h-3 w-3/5 rounded-md mb-3" />
        <div className="space-y-1.5 mb-3">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="h-3.5 w-36 rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/40">
          <div className="p-2 rounded-lg bg-bg-subtle/50 border border-border/50 flex flex-col items-center gap-1.5">
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>
          <div className="p-2 rounded-lg bg-bg-subtle/50 border border-border/50 flex flex-col items-center gap-1.5">
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>
        </div>
      </div>
      <div className="pt-2.5 border-t border-border/50 flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-4 w-14 rounded-md" />
      </div>
    </div>
  );
}

/** ── Purchase Order Card Skeleton ─────────────────────────────────────── */
export function PurchaseOrderCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 space-y-4 shadow-2xs">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-4.5 w-18 rounded-full" />
        </div>
        <Skeleton className="h-4.5 w-4/5 rounded-md mb-2" />
        <Skeleton className="h-4 w-20 rounded-md mb-2.5" />
        <Skeleton className="h-3.5 w-full rounded-md mb-1.5" />
        <Skeleton className="h-3.5 w-3/4 rounded-md mb-3" />
        <div className="pt-2.5 border-t border-border/40 space-y-1.5">
          <Skeleton className="h-3.5 w-1/2 rounded-md" />
          <Skeleton className="h-3.5 w-2/3 rounded-md" />
        </div>
      </div>
      <div className="pt-2.5 border-t border-border/50 flex items-center justify-between">
        <Skeleton className="h-3.5 w-16 rounded-md" />
        <Skeleton className="h-4.5 w-24 rounded-md" />
      </div>
    </div>
  );
}

/** ── Request Card Skeleton ────────────────────────────────────────────── */
export function RequestCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 space-y-4 shadow-2xs">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-4.5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4.5 w-3/4 rounded-md mb-1" />
        <Skeleton className="h-3.5 w-1/2 rounded-md mb-3" />
        <div className="p-2.5 rounded-lg bg-bg-subtle/50 border border-border/50 space-y-2">
          <Skeleton className="h-3.5 w-4/5 rounded" />
          <Skeleton className="h-3 w-3/5 rounded" />
        </div>
      </div>
      <div className="pt-2.5 border-t border-border/50 flex items-center justify-between">
        <Skeleton className="h-3.5 w-20 rounded-md" />
        <Skeleton className="h-3.5 w-16 rounded-md" />
      </div>
    </div>
  );
}
