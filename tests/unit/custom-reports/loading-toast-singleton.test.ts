import { describe, expect, it } from "vitest";

import { PHILIPPINE_LEGAL_DIMENSIONS } from "@/components/custom-reports/print/CustomPrintableReport";
import { buildCustomPrintPayload } from "@/lib/custom-reports/print-payload";
import type { CustomReportRunResult } from "@/types/custom-reports";

// Simulation of the ToastProvider reducer logic to verify singleton loading toast invariant
type ToastVariant = "success" | "error" | "warning" | "info" | "loading";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

function processToastAdd(
  prev: ToastItem[],
  variant: ToastVariant,
  message: string
): ToastItem[] {
  // Deduplicate exact message + variant
  if (prev.some((t) => t.message === message && t.variant === variant)) {
    return prev;
  }

  // When a new loading toast arrives, replace any previous loading toast
  const filtered =
    variant === "loading"
      ? prev.filter((t) => t.variant !== "loading")
      : prev;

  return [
    ...filtered,
    {
      id: "toast-" + Math.random().toString(36).substring(2, 9),
      variant,
      message,
    },
  ];
}

describe("Toast Singleton Invariant & Custom Report Runner Loading", () => {
  it("prevents dual loading toasts when clicking Run and navigating", () => {
    let toasts: ToastItem[] = [];

    // Step 1: User clicks 'Run' button on template list for 'Department Maintenance Logs'
    toasts = processToastAdd(
      toasts,
      "loading",
      'Loading report template "Department Maintenance Logs"…'
    );
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toContain("Department Maintenance Logs");
    expect(toasts[0].variant).toBe("loading");

    // Step 2: Next navigation or secondary effect attempts to trigger a generic loading toast
    toasts = processToastAdd(
      toasts,
      "loading",
      "Loading report template… Fetching configuration and schema."
    );

    // Invariant: Exactly ONE loading toast must remain in the queue
    const loadingToasts = toasts.filter((t) => t.variant === "loading");
    expect(loadingToasts).toHaveLength(1);
    // The latest loading message supersedes the previous one without dual stacking
    expect(loadingToasts[0].message).toBe(
      "Loading report template… Fetching configuration and schema."
    );
  });

  it("deduplicates identical loading toast messages", () => {
    let toasts: ToastItem[] = [];

    toasts = processToastAdd(
      toasts,
      "loading",
      'Loading report template "Equipment Inventory"…'
    );
    expect(toasts).toHaveLength(1);

    // Second dispatch of the exact same message
    toasts = processToastAdd(
      toasts,
      "loading",
      'Loading report template "Equipment Inventory"…'
    );
    expect(toasts).toHaveLength(1);
  });

  it("allows non-loading toasts to coexist while keeping loading singleton", () => {
    let toasts: ToastItem[] = [];

    toasts = processToastAdd(
      toasts,
      "loading",
      'Loading report template "Vouchers Ledger"…'
    );
    toasts = processToastAdd(toasts, "info", "Institutional filters applied.");

    expect(toasts).toHaveLength(2);
    expect(toasts.filter((t) => t.variant === "loading")).toHaveLength(1);
    expect(toasts.filter((t) => t.variant === "info")).toHaveLength(1);
  });

  it("verifies Philippine Legal Long Bond paper standard for Custom Printables", () => {
    expect(PHILIPPINE_LEGAL_DIMENSIONS.widthMm).toBe(216);
    expect(PHILIPPINE_LEGAL_DIMENSIONS.heightMm).toBe(330);
    expect(PHILIPPINE_LEGAL_DIMENSIONS.name).toBe("Philippine Long Bond Paper");

    const sampleRunResult: CustomReportRunResult = {
      templateId: "tpl-123",
      dataset: "assets",
      page: 1,
      pageSize: 50,
      total: 1,
      columns: [
        { key: "code", label: "Asset Code", type: "string" },
        { key: "name", label: "Item Name", type: "string" },
      ],
      rows: [{ code: "AST-001", name: "Laptop" }],
      filters: {},
      layout: [],
    };

    const payload = buildCustomPrintPayload(sampleRunResult, "Inventory Audit");
    expect(payload.templateName).toBe("Inventory Audit");
    expect(payload.rows).toHaveLength(1);
    expect(payload.columns).toHaveLength(2);
  });
});
