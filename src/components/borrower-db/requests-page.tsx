"use client";

import { MyRequestsTab, type RequestKindFilter } from "./my-requests-tab";

const COPY: Record<RequestKindFilter, { title: string; subtitle: string }> = {
  all: {
    title: "Requests",
    subtitle:
      "Track borrow, assignment, and supply requests in one place. Status updates appear as staff act on them.",
  },
  borrow: {
    title: "Borrow Requests",
    subtitle: "Temporary equipment loans with a return due date.",
  },
  assign: {
    title: "Assignment Requests",
    subtitle: "Long-term department equipment with open custody (no due date).",
  },
  supply: {
    title: "Supply Requests",
    subtitle: "Consumable requisitions issued from stock when approved.",
  },
};

export function RequestsPage({ kind }: { kind: RequestKindFilter }) {
  const copy = COPY[kind];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle gap-3">
      <div className="rounded-xl border border-border bg-card px-5 py-4 shrink-0 shadow-xs">
        <h1 className="text-xl font-bold tracking-tight text-text">{copy.title}</h1>
        <p className="text-xs text-text-secondary mt-0.5">{copy.subtitle}</p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <MyRequestsTab kind={kind} />
      </div>
    </div>
  );
}
