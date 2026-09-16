"use client";

import React, { useState, useMemo } from "react";
import {
  Receipt,
  FilePlus2,
  Search,
  X,
  Filter,
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import { useVouchersQuery, useVouchersRealtimeSync } from "@/features/vouchers/client";
import type { Voucher, VoucherStatus } from "@/types/vouchers";
import { formatPhp } from "@/components/projects/format-money";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { VouchersTable } from "./vouchers-table";
import { CreateVoucherDialog } from "./create-voucher-dialog";
import { VoucherDetailSheet } from "./voucher-detail-sheet";
import { cn } from "@/lib/utils";

export function VouchersView() {
  // Real-time synchronization via Supabase postgres_changes
  useVouchersRealtimeSync();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<VoucherStatus | "all">("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch vouchers query (specifically for disbursement vouchers with live polling)
  const {
    data,
    isLoading,
    refetch,
  } = useVouchersQuery({
    search: search.trim() || undefined,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    type: "disbursement",
    limit: 100,
  });

  const vouchers = useMemo(() => data?.vouchers ?? [], [data?.vouchers]);

  // Summary statistics calculated across current results
  const stats = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let completedCount = 0;
    let totalDisbursed = 0;

    for (const v of vouchers) {
      if (v.status === "pending_approval") pendingCount++;
      if (v.status === "approved") approvedCount++;
      if (v.status === "completed") {
        completedCount++;
        totalDisbursed += parseFloat(v.amount) || 0;
      }
    }

    return {
      total: vouchers.length,
      pendingCount,
      approvedCount,
      completedCount,
      totalDisbursed,
    };
  }, [vouchers]);

  const handleSelectVoucher = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setIsDetailOpen(true);
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg rounded-lg border border-border shadow-2xs">
      {/* Page Header Bar (flush at top with border-b) */}
      <div className="px-4 md:px-6 py-3.5 bg-bg shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text">
              Disbursement Vouchers
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
              {isLoading ? "Loading vouchers…" : `${vouchers.length} voucher${vouchers.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Custodian disbursement records for purchasing items and settling purchase orders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>New Voucher</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar (flush below header with border-b, matching assets/consumables) */}
      <div className="px-4 md:px-6 py-2.5 bg-bg border-b border-border shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, payee, PO#, asset..."
            className="w-full h-8.5 rounded-lg border border-border bg-bg-subtle/50 pl-8.5 pr-8 text-xs text-text placeholder:text-text-secondary/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-bg transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Classification Indicator */}
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Receipt className="h-3.5 w-3.5" />
            <span>Disbursement Voucher (DV)</span>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as VoucherStatus | "all")}
            className="h-8.5 rounded-lg border border-border bg-bg px-2.5 text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed / Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Content Region with Stat Cards and Table */}
      <main className="flex-1 overflow-y-auto min-h-0 p-3.5 md:p-4 bg-bg flex flex-col gap-3">
        {/* Summary Stat Cards */}
        <StatCardGrid columns={4} className="gap-3 shrink-0">
          <StatCard
            title="Total Disbursement Vouchers"
            value={stats.total}
            subtitle="All recorded vouchers"
            icon={Receipt}
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
            value={formatPhp(stats.totalDisbursed)}
            subtitle={`${stats.completedCount} completed voucher(s)`}
            icon={Banknote}
            tone="emerald"
          />
        </StatCardGrid>

        {/* Table / Empty State Container */}
        <div className="flex-1 min-h-0 flex flex-col">
          <VouchersTable
            vouchers={vouchers}
            loading={isLoading}
            onSelectVoucher={handleSelectVoucher}
          />
        </div>
      </main>

      {/* Detail Slide-out Sheet */}
      <VoucherDetailSheet
        voucher={selectedVoucher}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedVoucher(null);
        }}
        onRefresh={() => refetch()}
      />

      {/* Create Voucher Dialog */}
      <CreateVoucherDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
