"use client";

import { useMemo } from "react";
import {
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Tag,
  TrendingUp,
  FileText,
  PackageCheck,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { useBorrowerPortal } from "./context";
import type { PortalBorrowRequest } from "./types";
import {
  portalRequestKindLabel,
} from "./map-portal-request";
import { useDashboardSnapshotQuery } from "@/features/dashboard/client/use-dashboard";
import type { DashboardPendingRequest } from "@/features/dashboard/client/dashboard-api";
import { useMeQuery } from "@/features/users/client";
import { useBorrowLogQuery } from "@/features/borrow-log/client/use-borrow-log";
import type { BorrowLogRecord } from "@/features/borrow-log/client/borrow-log-api";
import {
  calendarDaysUntil,
  formatRelativeTime,
} from "@/lib/format-relative-time";

interface StatCardProps {
  label: string;
  value?: number;
  subtext: string;
  icon: React.ElementType;
  tone?: "blue" | "amber" | "danger" | "purple" | "success" | "default";
  badgeText?: string;
  isLoading?: boolean;
}

function DashStatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "default",
  badgeText,
  isLoading,
}: StatCardProps) {
  const toneStyles = {
    default: {
      card: "bg-white hover:bg-white border-border hover:border-text-secondary/40 shadow-xs",
      icon: "bg-slate-100 text-slate-700 border border-slate-200",
      value: "text-text font-bold",
      badge: "",
      badgeText: "",
    },
    blue: {
      card: "bg-white hover:bg-white border-blue-400/90 hover:border-blue-500 shadow-xs",
      icon: "bg-blue-600 text-white shadow-2xs",
      value: "text-text font-bold",
      badge: "text-blue-700 bg-blue-50 border-blue-200 shadow-2xs",
      badgeText: "Active",
    },
    amber: {
      card: "bg-white hover:bg-white border-amber-400/90 hover:border-amber-500 shadow-xs",
      icon: "bg-amber-500 text-white shadow-2xs",
      value: "text-text font-bold",
      badge: "text-amber-800 bg-amber-50 border-amber-200 shadow-2xs",
      badgeText: "Pending",
    },
    danger: {
      card: "bg-white hover:bg-white border-rose-400/90 hover:border-rose-500 shadow-xs",
      icon: "bg-rose-600 text-white shadow-2xs",
      value: "text-text font-bold",
      badge: "text-rose-800 bg-rose-50 border-rose-200 shadow-2xs",
      badgeText: "Overdue",
    },
    purple: {
      card: "bg-white hover:bg-white border-purple-400/90 hover:border-purple-500 shadow-xs",
      icon: "bg-purple-600 text-white shadow-2xs",
      value: "text-text font-bold",
      badge: "text-purple-800 bg-purple-50 border-purple-200 shadow-2xs",
      badgeText: "Total",
    },
    success: {
      card: "bg-white hover:bg-white border-emerald-400/90 hover:border-emerald-500 shadow-xs",
      icon: "bg-emerald-600 text-white shadow-2xs",
      value: "text-text font-bold",
      badge: "text-emerald-800 bg-emerald-50 border-emerald-200 shadow-2xs",
      badgeText: "On hand",
    },
  };

  const styles = toneStyles[tone];
  const chip = badgeText ?? styles.badgeText;
  const showBadge = Boolean(chip);

  return (
    <div
      className={cn(
        "rounded-lg border p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-sm",
        styles.card
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", styles.icon)}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        {showBadge && (
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider border px-2.5 py-0.5 rounded-full font-sans",
              styles.badge
            )}
          >
            {chip}
          </span>
        )}
      </div>
      <div>
        {isLoading ? (
          <div className="h-9 w-12 bg-border/60 animate-pulse rounded my-1" />
        ) : (
          <p className={cn("text-3xl font-bold tabular-nums tracking-tight", styles.value)}>
            {value ?? 0}
          </p>
        )}
        <p className="text-sm font-semibold text-text mt-0.5">{label}</p>
        <p className="text-xs text-text-secondary mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}

function CustodyItemCard({ record }: { record: BorrowLogRecord }) {
  const { getCategoryStyle } = useCategoryStyleMap();
  const categoryMeta = getCategoryStyle(record.category);
  const isOverdue = record.status === "overdue";
  const daysLeft = record.dueDate ? calendarDaysUntil(record.dueDate) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-subtle/50 transition-colors duration-150 border-l-4",
        isOverdue
          ? "border-l-status-outofservice-bg bg-status-outofservice-bg/5"
          : "border-l-status-active-bg/60"
      )}
    >
      <div
        className={cn(
          "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center",
          categoryMeta.bg
        )}
      >
        <Tag className={cn("h-4 w-4", categoryMeta.text)} aria-hidden />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{record.assetName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-xs text-text-secondary">{record.assetCode}</span>
          <span className="text-text-secondary/40">·</span>
          <span
            className={cn(
              "text-xs font-semibold",
              isOverdue
                ? "text-status-outofservice-bg dark:text-status-outofservice-text"
                : daysLeft !== null && daysLeft <= 2
                  ? "text-status-repair-text"
                  : "text-text-secondary"
            )}
          >
            {!record.dueDate
              ? "Assigned"
              : isOverdue
                ? `${record.daysOverdue ?? 0}d overdue`
                : daysLeft === 0
                  ? "Due today"
                  : daysLeft !== null && daysLeft < 0
                    ? "Overdue"
                    : `${daysLeft}d left`}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xs text-text-secondary">{record.dueDate ? "Due" : "Custody"}</p>
        <p
          className={cn(
            "text-xs font-bold",
            isOverdue
              ? "text-status-outofservice-bg dark:text-status-outofservice-text"
              : "text-text"
          )}
        >
          {record.dueDate ?? "Open assignment"}
        </p>
      </div>
    </div>
  );
}

function CustodyItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 border-l-4 border-l-transparent">
      <div className="h-9 w-9 shrink-0 rounded-lg bg-border animate-pulse" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-32 bg-border animate-pulse rounded" />
        <div className="h-3 w-24 bg-border animate-pulse rounded" />
      </div>
      <div className="shrink-0 text-right space-y-1">
        <div className="h-3 w-6 bg-border animate-pulse rounded ml-auto" />
        <div className="h-3 w-16 bg-border animate-pulse rounded" />
      </div>
    </div>
  );
}

function requestItemTitle(request: PortalBorrowRequest) {
  const first = request.items?.[0]?.itemDescription;
  if (!first) return request.purpose || "Pending request";
  if ((request.items?.length ?? 0) > 1) {
    return `${first} (+${request.items.length - 1} more)`;
  }
  return first;
}

function mapSnapshotPendingToPortal(
  row: DashboardPendingRequest
): PortalBorrowRequest {
  return {
    id: row.id,
    requestCode: row.requestCode ?? "",
    requesterName: row.requesterName,
    requesterEmail: "",
    requesterPhone: "",
    department: row.department,
    requestType:
      row.kind === "assign"
        ? "assignable"
        : row.kind === "borrow"
          ? "borrowable"
          : null,
    items: [
      {
        itemDescription: row.itemDescription,
        category: "office_supplies",
        quantity: 1,
        itemType: row.kind === "supply" ? "consumable" : "asset",
      },
    ],
    purpose: row.itemDescription,
    requestedAt: row.requestedAt,
    relativeTime: row.relativeTime,
    expectedReturnDate: null,
    status: "pending",
    history: [],
    requestedDateFrom: row.requestedAt.slice(0, 10),
    requestedDateTo: row.requestedAt.slice(0, 10),
    portalKind: row.kind === "supply" ? "supply" : undefined,
  };
}

function requestKindHref(kind: ReturnType<typeof portalRequestKindLabel>) {
  if (kind === "Supplies") return "/borrower-db/requests/supplies";
  if (kind === "Assignment") return "/borrower-db/requests/assignment";
  return "/borrower-db/requests/borrow";
}

function PendingRequestCard({ request }: { request: PortalBorrowRequest }) {
  const kind = portalRequestKindLabel(request);
  const kindClass =
    kind === "Supplies"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : kind === "Assignment"
        ? "bg-indigo-50 text-indigo-800 border-indigo-200"
        : "bg-blue-50 text-blue-800 border-blue-200";

  return (
    <Link
      href={requestKindHref(kind)}
      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-subtle/50 transition-colors duration-150 border-l-4 border-l-status-repair-bg/60"
    >
      <div className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center bg-office-bg text-office-text">
        <Tag className="h-3.5 w-3.5 text-office-text" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{requestItemTitle(request)}</p>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <p className="text-xs text-text-secondary font-mono truncate">
            {request.requestCode || request.id.slice(0, 8).toUpperCase()}
          </p>
          <span className="text-text-secondary/40">·</span>
          <p className="text-xs text-text-secondary truncate">
            {request.relativeTime || formatRelativeTime(request.requestedAt)}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
          kindClass
        )}
      >
        {kind}
      </span>
    </Link>
  );
}

function PendingRequestCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 border-l-4 border-l-transparent">
      <div className="h-8 w-8 shrink-0 rounded-lg bg-border animate-pulse" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-40 bg-border animate-pulse rounded" />
        <div className="h-3 w-20 bg-border animate-pulse rounded" />
      </div>
      <div className="h-5 w-16 rounded-full bg-border animate-pulse" />
    </div>
  );
}

function sortOnHand(a: BorrowLogRecord, b: BorrowLogRecord) {
  const aDue = a.dueDate ?? "9999-12-31";
  const bDue = b.dueDate ?? "9999-12-31";
  return aDue.localeCompare(bDue);
}

function sortOverdue(a: BorrowLogRecord, b: BorrowLogRecord) {
  return (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0);
}

export function BorrowerDashboard() {
  const { openWizard } = useBorrowerPortal();
  const { data: me } = useMeQuery();
  const {
    data: snapshot,
    isLoading: snapshotLoading,
    isError,
    refetch,
  } = useDashboardSnapshotQuery({
    refetchInterval: false,
  });
  const {
    data: custodyRows,
    isLoading: custodyQueryLoading,
  } = useBorrowLogQuery({
    scope: "department",
    enabled: Boolean(me?.departmentId),
  });

  const onHandItems = useMemo(
    () =>
      (custodyRows ?? [])
        .filter((row) => row.status === "active")
        .slice()
        .sort(sortOnHand),
    [custodyRows]
  );
  const overdueItems = useMemo(
    () =>
      (custodyRows ?? [])
        .filter((row) => row.status === "overdue")
        .slice()
        .sort(sortOverdue),
    [custodyRows]
  );
  const pendingRequests = useMemo(
    () => (snapshot?.pendingRequests ?? []).map(mapSnapshotPendingToPortal),
    [snapshot?.pendingRequests]
  );

  const snapshotSummary = snapshot?.summary;
  const hasCustody = Boolean(custodyRows);
  const hasSnapshotPending = Boolean(snapshot?.pendingRequests);

  const onHandCount = hasCustody
    ? onHandItems.length
    : Math.max(0, (snapshotSummary?.activeBorrows ?? 0) - (snapshotSummary?.overdueAssets ?? 0));
  const overdueCount = hasCustody
    ? overdueItems.length
    : (snapshotSummary?.overdueAssets ?? 0);
  const pendingCount = snapshotSummary?.pendingApprovals ?? pendingRequests.length;
  const totalRequests = snapshotSummary?.totalRequests ?? 0;

  const statsLoading = snapshotLoading && !snapshot && !hasCustody;
  const custodyLoading = Boolean(me?.departmentId) && custodyQueryLoading && !custodyRows;
  const pendingLoading = snapshotLoading && !hasSnapshotPending;

  const statCards: StatCardProps[] = [
    {
      label: "On Hand",
      value: onHandCount,
      subtext: onHandCount ? "Released to your department" : "No equipment in custody",
      icon: PackageCheck,
      tone: "success",
      isLoading: statsLoading || custodyLoading,
    },
    {
      label: "Overdue",
      value: overdueCount,
      subtext: overdueCount ? "Past due date — return immediately" : "All on-hand items on time",
      icon: AlertTriangle,
      tone: "danger",
      isLoading: statsLoading || custodyLoading,
    },
    {
      label: "Pending Requests",
      value: pendingCount,
      subtext: pendingCount ? "Awaiting staff approval" : "No pending requests",
      icon: Clock,
      tone: "amber",
      isLoading: statsLoading || pendingLoading,
    },
    {
      label: "Total Requests",
      value: totalRequests,
      subtext: "All requests submitted by this account",
      icon: FileText,
      tone: "purple",
      isLoading: statsLoading,
    },
  ];

  return (
    <div className="h-full flex flex-col min-h-0 gap-3 bg-bg-subtle max-w-full" data-theme="light">
      <div className="rounded-lg border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
        <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <TrendingUp className="h-6 w-6 text-accent" aria-hidden />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-text">
            {me?.department ? `${me.department} Requester Portal` : "Requester Portal"}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Submit and track equipment, borrow, and supply requests for your department. You have{" "}
            {statsLoading || custodyLoading ? (
              <span className="inline-block w-12 h-3.5 bg-border animate-pulse rounded align-middle" />
            ) : (
              <span className="font-semibold text-text">
                {onHandCount} item{onHandCount !== 1 ? "s" : ""}
              </span>
            )}{" "}
            on hand
            {!statsLoading && !custodyLoading && overdueCount > 0 && (
              <>
                {" "}
                and{" "}
                <span className="font-bold text-status-outofservice-bg dark:text-status-outofservice-text">
                  {overdueCount} overdue
                </span>
              </>
            )}
            .
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/borrower-db/inventory"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-bg text-text text-sm font-semibold hover:bg-bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-xs"
          >
            <Package className="h-4 w-4" aria-hidden />
            My Inventory
          </Link>
          <button
            type="button"
            onClick={() => openWizard(null)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs cursor-pointer"
          >
            <Package className="h-4 w-4" aria-hidden />
            Multi-type Request
          </button>
        </div>
      </div>

      {isError && !snapshot && !hasCustody && (
        <div className="rounded-lg border border-status-repair-bg/40 bg-status-repair-bg/10 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-status-repair-text shrink-0">
          <span>Failed to load dashboard statistics. Default values are shown.</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="font-bold underline hover:opacity-80 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {me && !me.departmentId && (
        <div className="rounded-lg border border-status-repair-bg/40 bg-status-repair-bg/10 px-4 py-3 text-xs text-status-repair-text shrink-0">
          This login is not linked to a department yet. Ask Property Custodian
          to assign a department before submitting requests.
        </div>
      )}

      <section aria-label="Borrowing overview" className="shrink-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <DashStatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 flex-1 min-h-0">
        <div className="flex flex-col gap-3 min-h-0 h-full">
          <section aria-labelledby="overdue-heading" className="flex-1 min-h-0 flex flex-col">
            <div className="rounded-lg border border-border bg-card overflow-hidden h-full flex flex-col min-h-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 gap-2">
                <h2 id="overdue-heading" className="text-sm font-bold text-text">
                  Overdue
                </h2>
                <Link
                  href="/borrower-db/inventory"
                  className="text-xs text-accent font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  View inventory <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {custodyLoading ? (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <CustodyItemSkeleton />
                  <CustodyItemSkeleton />
                </div>
              ) : overdueItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-8 text-center px-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-status-active-bg/15 border border-status-active-bg/30 text-status-active-text shadow-xs mb-3">
                    <CheckCircle2 className="h-6 w-6" strokeWidth={2.2} aria-hidden />
                  </span>
                  <p className="text-sm font-bold text-text">All caught up</p>
                  <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                    None of your on-hand items are past their due date.
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {overdueItems.slice(0, 8).map((record) => (
                    <CustodyItemCard key={record.id} record={record} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="on-hand-heading" className="flex-1 min-h-0 flex flex-col">
            <div className="rounded-lg border border-border bg-card overflow-hidden h-full flex flex-col min-h-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 gap-2">
                <h2 id="on-hand-heading" className="text-sm font-bold text-text">
                  On Hand
                </h2>
                <Link
                  href="/borrower-db/inventory"
                  className="text-xs text-accent font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  View inventory <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {custodyLoading ? (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <CustodyItemSkeleton />
                  <CustodyItemSkeleton />
                </div>
              ) : onHandItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-8 text-center px-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-status-active-bg/15 border border-status-active-bg/30 text-status-active-text shadow-xs mb-3">
                    <PackageCheck className="h-6 w-6" strokeWidth={2.2} aria-hidden />
                  </span>
                  <p className="text-sm font-bold text-text">Nothing on hand</p>
                  <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                    Equipment released to your department will show here.
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {onHandItems.slice(0, 8).map((record) => (
                    <CustodyItemCard key={record.id} record={record} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <section aria-labelledby="recent-requests-heading" className="h-full min-h-0 flex flex-col">
          <div className="rounded-lg border border-border bg-card overflow-hidden h-full flex flex-col min-h-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 gap-2">
              <h2 id="recent-requests-heading" className="text-sm font-bold text-text">
                Recent Pending
              </h2>
              <Link
                href="/borrower-db/requests"
                className="text-xs text-accent font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {pendingLoading ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <PendingRequestCardSkeleton />
                <PendingRequestCardSkeleton />
                <PendingRequestCardSkeleton />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 text-center px-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-bg-subtle border border-border text-text-secondary shadow-xs mb-3">
                  <Package className="h-6 w-6" strokeWidth={1.8} aria-hidden />
                </span>
                <p className="text-sm font-bold text-text">No pending requests</p>
                <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                  You don&apos;t have any requests waiting for approval.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                {pendingRequests.slice(0, 8).map((req) => (
                  <PendingRequestCard key={req.id} request={req} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
