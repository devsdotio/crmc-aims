"use client";

import { BrowseTab } from "@/components/borrower-db/browse-tab";

export default function BorrowerCatalogPage() {
  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-bg-subtle gap-3 p-1">
      <div className="rounded-xl border border-border bg-card px-5 py-4 shrink-0 shadow-xs">
        <h1 className="text-xl font-bold tracking-tight text-text">Browse Catalog</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Explore assets, supplies, and materials available for department loan or requisition. Select items to submit a request.
        </p>
      </div>

      <div className="flex-1 min-h-0 pb-16">
        <BrowseTab />
      </div>
    </div>
  );
}
