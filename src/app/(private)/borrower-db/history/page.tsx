"use client";

import Link from "next/link";
import { BorrowHistoryTab } from "@/components/borrower-db/borrow-history-tab";

export default function HistoryPage() {
  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle gap-3">
      <div className="rounded-xl border border-border bg-card px-5 py-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">Equipment History</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Past equipment loans, active custody, and returns. Supply issues are listed under{" "}
            <Link
              href="/borrower-db/supplies"
              className="font-semibold text-accent hover:underline"
            >
              Issued Supplies
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <BorrowHistoryTab />
      </div>
    </div>
  );
}
