"use client";

import { BrowseTab } from "@/components/borrower-db/browse-tab";

export default function BorrowerCatalogPage() {
  return (
    <div className="flex flex-col min-h-0 bg-bg-subtle gap-3 p-1">
      <div className="rounded-xl border border-border bg-card px-5 py-4 shrink-0 shadow-xs">
        <h1 className="text-xl font-bold tracking-tight text-text">Browse Catalog</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Explore assets, supplies, and materials available for department loan, assignment, or requisition. Add items to your request cart to submit.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <BrowseTab />
      </div>
    </div>
  );
}
