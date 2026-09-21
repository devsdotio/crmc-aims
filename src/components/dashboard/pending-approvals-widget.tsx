"use client";

import Link from "next/link";
import { Check, ChevronRight, ArrowRight, Eye, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PendingRequest {
  id: string;
  requesterName: string;
  department: string;
  itemDescription: string;
  requestedAt: string;
  relativeTime: string;
  kind?: "borrow" | "assign" | "supply";
}

export interface PendingApprovalsWidgetProps {
  requests: PendingRequest[];
  loading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-border", className)}
      aria-hidden="true"
    />
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border/60 last:border-0">
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-52" />
      </div>
      <div className="shrink-0">
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PendingApprovalsWidget({
  requests,
  loading = false,
}: PendingApprovalsWidgetProps) {
  return (
    <section
      className="flex flex-col rounded-lg border border-border bg-card overflow-hidden shadow-xs"
      aria-labelledby="pending-approvals-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-status-repair-bg/15 border border-status-repair-bg/30 flex items-center justify-center text-status-repair-text">
            <Hourglass className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="pending-approvals-heading"
              className="text-sm font-bold text-text leading-none"
            >
              Pending Approvals
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              {loading
                ? "Checking the queue…"
                : requests.length === 0
                  ? "All requests reviewed"
                  : `${requests.length} awaiting custodian review`}
            </p>
          </div>
        </div>
        <Link
          href="/borrow-requests/assign?status=pending"
          className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md px-1.5 py-0.5"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Body */}
      <div className="divide-y divide-border/60">
        {loading ? (
          <div className="px-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-5 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-status-active-bg/15 border border-status-active-bg/30 text-status-active-text shadow-xs">
              <Check className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <div>
              <p className="text-sm font-bold text-text">All requests reviewed</p>
              <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                No borrow, assignment, or supply requests are awaiting custodian review.
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-active-text bg-status-active-bg/10 border border-status-active-bg/25 px-2.5 py-0.5 rounded-full mt-3">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Queue Clear
              </span>
            </div>
          </div>
        ) : (
          <ul className="px-5 divide-y divide-border/60" aria-label="Pending requests">
            {requests.slice(0, 5).map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between gap-4 py-3.5 group hover:bg-bg-subtle/40 -mx-5 px-5 transition-colors"
              >
                {/* Info */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-text truncate">
                    {req.requesterName}
                    <span className="ml-1.5 text-xs font-medium text-text-secondary">
                      · {req.department}
                    </span>
                  </span>
                  <span className="text-xs text-text-secondary truncate">
                    {req.itemDescription}
                    <span className="mx-1.5 opacity-40">·</span>
                    <time title={req.requestedAt}>{req.relativeTime}</time>
                  </span>
                </div>

                {/* Single View Request Action */}
                <div className="shrink-0">
                  <Link
                    href={`/borrow-requests/${
                      req.kind === "supply"
                        ? "supplies"
                        : req.kind === "assign"
                          ? "assign"
                          : "borrow"
                    }?requestId=${req.id}&status=pending`}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
                      "bg-accent text-accent-foreground shadow-xs hover:opacity-90 transition-opacity",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    )}
                  >
                    View Request
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
