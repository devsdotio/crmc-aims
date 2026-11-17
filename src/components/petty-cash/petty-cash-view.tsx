"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  FilePlus2,
  Search,
  X,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Banknote,
  Tag,
  Calendar,
  RotateCcw,
} from "lucide-react";
import {
  usePettyCashListQuery,
  usePettyCashRealtimeSync,
} from "@/features/petty-cash/client";
import type { PettyCashVoucher, PettyCashStatus } from "@/types/petty-cash";
import { PETTY_CASH_CATEGORIES } from "@/types/petty-cash";
import { formatPhp } from "@/components/projects/format-money";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { PettyCashTable } from "./petty-cash-table";
import { CreatePettyCashDialog } from "./create-petty-cash-dialog";
import { PettyCashDetailSheet } from "./petty-cash-detail-sheet";
import { DisbursementPrintSlipDialog } from "@/components/disbursements/disbursement-print-slip-dialog";

export function PettyCashView() {
  // Real-time synchronization via Supabase postgres_changes
  usePettyCashRealtimeSync();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PettyCashStatus | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<PettyCashVoucher | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [printVoucher, setPrintVoucher] = useState<PettyCashVoucher | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 275);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch petty cash vouchers (realtime sync handles live updates)
  const {
    data,
    isLoading,
    refetch,
  } = usePettyCashListQuery({
    search: debouncedSearch || undefined,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    category: selectedCategory === "all" ? undefined : selectedCategory,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    pageSize,
  });

  const vouchers = useMemo(() => data?.vouchers ?? [], [data?.vouchers]);
  const totalCount = data?.meta?.total ?? data?.total ?? vouchers.length;
  const totalPages = data?.meta?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));

  // Summary statistics calculated globally via server aggregates when available
  const stats = useMemo(() => {
    if (data?.meta?.stats) {
      const s = data.meta.stats;
      const hasRestrictedAmounts =
        vouchers.length > 0 && vouchers.every((v) => v.amount == null);
      return {
        total: s.total,
        pendingCount: s.pendingCount,
        approvedCount: s.approvedCount,
        awaitingReceiptCount: s.awaitingReceiptCount,
        completedCount: s.completedCount,
        totalDisbursed: s.totalDisbursed,
        hasRestrictedAmounts,
      };
    }

    let pendingCount = 0;
    let approvedCount = 0;
    let awaitingReceiptCount = 0;
    let completedCount = 0;
    let totalDisbursed = 0;

    for (const v of vouchers) {
      if (v.status === "pending_approval") pendingCount++;
      if (v.status === "approved") approvedCount++;
      if (v.status === "disbursed") awaitingReceiptCount++;
      if (v.status === "completed") completedCount++;
      if (v.status === "disbursed" || v.status === "completed") {
        totalDisbursed += parseFloat(v.amount ?? "0") || 0;
      }
    }

    const hasRestrictedAmounts =
      vouchers.length > 0 && vouchers.every((v) => v.amount == null);

    return {
      total: totalCount,
      pendingCount,
      approvedCount,
      awaitingReceiptCount,
      completedCount,
      totalDisbursed,
      hasRestrictedAmounts,
    };
  }, [data?.meta?.stats, vouchers, totalCount]);

  const handleSelectVoucher = (voucher: PettyCashVoucher) => {
    setSelectedVoucher(voucher);
    setIsDetailOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedStatus("all");
    setSelectedCategory("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      selectedStatus !== "all" ||
      selectedCategory !== "all" ||
      startDate ||
      endDate
  );

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg rounded-lg border border-border shadow-2xs">
      {/* Page Header Bar (flush at top with border-b) */}
      <div className="px-4 md:px-6 py-3.5 bg-bg shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text">
              Petty Cash Vouchers
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
              {isLoading ? "Loading records…" : `${totalCount} record${totalCount === 1 ? "" : "s"}`}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Petty cash micro-disbursement records for immediate small expenses and urgent cash purchases.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>New Petty Cash</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="px-4 md:px-6 py-2.5 bg-bg border-b border-border shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PCV#, claimant, category, receipt, particulars..."
            className="w-full h-8.5 rounded-lg border border-border bg-bg-subtle/50 pl-8.5 pr-8 text-xs text-text placeholder:text-text-secondary/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-bg transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setPage(1);
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text cursor-pointer p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by expense category"
            className="h-8.5 rounded-lg border border-border bg-bg px-2.5 text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
          >
            <option value="all">All Categories</option>
            {PETTY_CASH_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as PettyCashStatus | "all");
              setPage(1);
            }}
            aria-label="Filter by petty cash status"
            className="h-8.5 rounded-lg border border-border bg-bg px-2.5 text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="disbursed">Awaiting receipt</option>
            <option value="completed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Date range filter */}
          <div className="flex items-center gap-1.5 bg-bg-subtle/50 px-2 py-1 rounded-lg border border-border">
            <Calendar className="h-3.5 w-3.5 text-text-secondary" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              title="From date"
              className="bg-transparent text-xs text-text focus:outline-hidden cursor-pointer"
            />
            <span className="text-[10px] text-text-secondary font-medium">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              title="To date"
              className="bg-transparent text-xs text-text focus:outline-hidden cursor-pointer"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="inline-flex items-center gap-1 h-8.5 px-2.5 rounded-lg border border-border bg-bg text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Region with Stat Cards and Table */}
      <main className="flex-1 overflow-hidden min-h-0 p-3.5 md:p-4 bg-bg flex flex-col gap-3">
        {/* Summary Stat Cards */}
        <StatCardGrid columns={4} className="gap-3 shrink-0">
          <StatCard
            title="Total Petty Cash Vouchers"
            value={stats.total}
            subtitle="All recorded PCVs"
            icon={Wallet}
            tone="accent"
          />
          <StatCard
            title="Pending Approval"
            value={stats.pendingCount}
            subtitle="Awaiting custodian sign-off"
            icon={Clock}
            tone="amber"
          />
          <StatCard
            title="Approved"
            value={stats.approvedCount}
            subtitle="Ready for disbursement"
            icon={ShieldCheck}
            tone="blue"
          />
          <StatCard
            title="Total Disbursed"
            value={
              stats.hasRestrictedAmounts
                ? "Restricted"
                : formatPhp(stats.totalDisbursed)
            }
            subtitle={`${stats.awaitingReceiptCount} awaiting receipt · ${stats.completedCount} closed`}
            icon={Banknote}
            tone="emerald"
          />
        </StatCardGrid>

        {/* Table / Empty State Container */}
        <div className="flex-1 min-h-0 flex flex-col">
          <PettyCashTable
            vouchers={vouchers}
            loading={isLoading}
            total={totalCount}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
            }}
            onSelectVoucher={handleSelectVoucher}
            onPrintSlip={setPrintVoucher}
            onResetFilters={handleResetFilters}
            onCreateVoucher={() => setIsCreateOpen(true)}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      </main>

      {/* Detail Slide-out Sheet */}
      <PettyCashDetailSheet
        voucher={selectedVoucher}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedVoucher(null);
        }}
        onPrintSlip={setPrintVoucher}
      />

      <DisbursementPrintSlipDialog
        target={printVoucher ? { kind: "petty_cash", record: printVoucher } : null}
        isOpen={Boolean(printVoucher)}
        onClose={() => setPrintVoucher(null)}
        onUpdated={(record) => {
          if ("pcvNumber" in record) setPrintVoucher(record);
        }}
      />

      {/* Create Dialog */}
      <CreatePettyCashDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}
