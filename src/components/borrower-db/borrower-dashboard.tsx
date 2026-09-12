"use client";



import {
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Tag,
  ChevronRight,
  TrendingUp,
  Zap,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { useBorrowerPortal } from "./context";
import {
  PortalSummaryStats,
  PortalBorrowRequest,
  PortalBorrowLogRecord,
} from "./types";
import { useDashboardSnapshotQuery } from "@/features/dashboard/client/use-dashboard";
import { useMeQuery } from "@/features/users/client";
import { useBorrowerRealtimeSync } from "@/hooks/use-borrower-realtime-sync";
import type { DashboardPendingRequest } from "@/server/modules/dashboard/dashboard.service";
import { calendarDaysUntil } from "@/lib/format-relative-time";

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value?: number;
  subtext: string;
  icon: React.ElementType;
  tone?: "blue" | "amber" | "danger" | "purple" | "success" | "default";
  isLoading?: boolean;
}

function DashStatCard({ label, value, subtext, icon: Icon, tone = "default", isLoading }: StatCardProps) {
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
      badgeText: "Good",
    },
  };

  const styles = toneStyles[tone];
  const showBadge = Boolean(styles.badgeText);

  return (
    <div
      className={cn(
        "rounded-lg border p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-sm",
        styles.card
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105", styles.icon)}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        {showBadge && (
          <span className={cn("text-[10px] font-bold uppercase tracking-wider border px-2.5 py-0.5 rounded-full font-sans", styles.badge)}>
            {styles.badgeText}
          </span>
        )}
      </div>
      <div>
        {isLoading ? (
          <div className="h-9 w-12 bg-border/60 animate-pulse rounded my-1" />
        ) : (
          <p className={cn("text-3xl font-bold tabular-nums tracking-tight", styles.value)}>{value ?? 0}</p>
        )}
        <p className="text-sm font-semibold text-text mt-0.5">{label}</p>
        <p className="text-xs text-text-secondary mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}

// ─── Active Borrow Card ────────────────────────────────────────────────────────

function ActiveBorrowCard({ record }: { record: PortalBorrowLogRecord }) {
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
              ? `${record.daysOverdue}d overdue`
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
            isOverdue ? "text-status-outofservice-bg dark:text-status-outofservice-text" : "text-text"
          )}
        >
          {record.dueDate ?? "Open assignment"}
        </p>
      </div>
    </div>
  );
}

function ActiveBorrowCardSkeleton() {
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

// ─── Pending Request Card ─────────────────────────────────────────────────────

function PendingRequestCard({ request }: { request: DashboardPendingRequest }) {
  const isApproved = false; // Snapshot pending requests are always pending
  const isRejected = false;

  const statusBadge = { label: "Pending", className: "bg-status-repair-bg/15 text-status-repair-text border-status-repair-bg/30" };

  const itemTitle =
    request.itemDescription ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request as any).items?.[0]?.itemDescription ||
    "Pending Request";

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-subtle/50 transition-colors duration-150 border-l-4",
      "border-l-status-repair-bg/60"
    )}>
      <div className={cn("h-8 w-8 shrink-0 rounded-lg flex items-center justify-center", "bg-office-bg text-office-text")}>
        <Tag className={cn("h-3.5 w-3.5", "text-office-text")} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">
          {itemTitle}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs text-text-secondary font-mono">{request.id.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
          statusBadge.className
        )}
      >
        {statusBadge.label}
      </span>
    </div>
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

// ─── Quick Action Button ───────────────────────────────────────────────────────

function QuickActionBtn({
  icon: Icon,
  label,
  description,
  onClick,
  href,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick?: () => void;
  href?: string;
  tone?: "accent" | "default";
}) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-4 w-full text-left cursor-pointer",
        "hover:border-text-secondary/30 transition-colors duration-150",
        tone === "accent"
          ? "border-accent/30 bg-accent/5 hover:bg-accent/10"
          : "border-border bg-card hover:bg-bg-subtle"
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          tone === "accent" ? "bg-accent text-accent-foreground" : "bg-bg-subtle text-text-secondary"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", tone === "accent" ? "text-accent" : "text-text")}>
          {label}
        </p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-text-secondary shrink-0" aria-hidden />
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return <button type="button" onClick={onClick}>{inner}</button>;
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export function BorrowerDashboard() {
  const { openWizard } = useBorrowerPortal();
  const { data: me } = useMeQuery();
  useBorrowerRealtimeSync({ enabled: Boolean(me?.id) });
  const { data: snapshot, isLoading, isError, refetch } = useDashboardSnapshotQuery({
    refetchInterval: 30_000,
  });
  const loading = isLoading && !snapshot;

  const defaultSummary = {
    activeBorrows: 0,
    pendingApprovals: 0,
    lowStockItems: 0,
    overdueAssets: 0,
    totalRequests: 0,
  };

  const stats = snapshot?.summary ?? defaultSummary;
  const overdueAssets = snapshot?.overdueAssets || [];
  const rawPending = snapshot?.pendingRequests || [];

  const activeItemsMapped = overdueAssets.map((asset) => ({
    id: asset.id,
    assetCode: asset.assetCode,
    assetName: asset.assetName,
    category: "computing" as const, // Fallback category since snapshot doesn't include it in OverdueAsset
    status: "overdue" as const,
    dueDate: asset.dueSince.split("T")[0],
    daysOverdue: asset.daysOverdue,
  }));

  const pendingRequestsMapped = rawPending;

  const statCards: StatCardProps[] = [
    {
      label: "Active Borrowings",
      value: stats?.activeBorrows,
      subtext: "Items currently out on loan",
      icon: Package,
      tone: "blue",
      isLoading: loading,
    },
    {
      label: "Pending Requests",
      value: stats?.pendingApprovals,
      subtext: stats?.pendingApprovals ? "Awaiting staff approval" : "No pending requests",
      icon: Clock,
      tone: "amber",
      isLoading: loading,
    },
    {
      label: "Overdue Items",
      value: stats?.overdueAssets,
      subtext: stats?.overdueAssets ? "Past due date — return immediately" : "All items on time",
      icon: AlertTriangle,
      tone: "danger",
      isLoading: loading,
    },
    {
      label: "Total Requests",
      value: stats?.totalRequests,
      subtext: "All requests submitted by this account",
      icon: FileText,
      tone: "purple",
      isLoading: loading,
    },
  ];

  return (
    <div className="h-full flex flex-col min-h-0 gap-3 bg-bg-subtle max-w-full" data-theme="light">

      {/* ── Greeting Banner ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
        <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <TrendingUp className="h-6 w-6 text-accent" aria-hidden />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-text">
            {me?.department ? `${me.department} Requester Portal` : "Requester Portal"}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Submit and track equipment, borrow, and supply requests for your department. You have{" "}
            {loading ? (
              <span className="inline-block w-12 h-3.5 bg-border animate-pulse rounded align-middle" />
            ) : (
              <span className="font-semibold text-text">{stats?.activeBorrows ?? 0} item{stats?.activeBorrows !== 1 ? "s" : ""}</span>
            )} currently on loan
            {(!loading && stats && stats.overdueAssets > 0) && (
              <> and <span className="font-bold text-status-outofservice-bg dark:text-status-outofservice-text">{stats.overdueAssets} overdue</span></>
            )}.
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-xs cursor-pointer"
          >
            <Package className="h-4 w-4" aria-hidden />
            New Request
          </button>
        </div>
      </div>

      {isError && !snapshot && (
        <div className="rounded-lg border border-status-repair-bg/40 bg-status-repair-bg/10 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-status-repair-text shrink-0">
          <span>Failed to load live dashboard statistics. Default values are shown.</span>
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

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <section aria-label="Borrowing overview" className="shrink-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <DashStatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      {/* ── Row 2: Active Items + Recent Requests ──────────────────────── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 flex-1 min-h-0">

        {/* Active Borrowings (Showing Overdue from Snapshot for now) */}
        <section aria-labelledby="active-borrowings-heading" className="h-full min-h-0 flex flex-col">
          <div className="rounded-lg border border-border bg-card overflow-hidden h-full flex flex-col min-h-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 id="active-borrowings-heading" className="text-sm font-bold text-text">
                Attention Required (Overdue)
              </h2>
              <Link
                href="/borrower-db/inventory"
                className="text-xs text-accent font-semibold hover:underline inline-flex items-center gap-1"
              >
                View inventory <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ActiveBorrowCardSkeleton />
                <ActiveBorrowCardSkeleton />
                <ActiveBorrowCardSkeleton />
              </div>
            ) : activeItemsMapped.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 text-center px-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-status-active-bg/15 border border-status-active-bg/30 text-status-active-text shadow-xs mb-3">
                  <CheckCircle2 className="h-6 w-6" strokeWidth={2.2} aria-hidden />
                </span>
                <p className="text-sm font-bold text-text">All caught up!</p>
                <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                  You have no overdue items. Check your history for all active borrowings.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                {activeItemsMapped.map((record) => (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <ActiveBorrowCard key={record.id} record={record as any} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Requests */}
        <section aria-labelledby="recent-requests-heading" className="h-full min-h-0 flex flex-col">
          <div className="rounded-lg border border-border bg-card overflow-hidden h-full flex flex-col min-h-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 id="recent-requests-heading" className="text-sm font-bold text-text">
                Recent Pending Requests
              </h2>
              <Link
                href="/borrower-db/requests"
                className="text-xs text-accent font-semibold hover:underline inline-flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <PendingRequestCardSkeleton />
                <PendingRequestCardSkeleton />
                <PendingRequestCardSkeleton />
              </div>
            ) : pendingRequestsMapped.length === 0 ? (
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
                {pendingRequestsMapped.slice(0, 5).map((req) => (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <PendingRequestCard key={req.id} request={req as any} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
