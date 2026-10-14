import { afterEach, describe, expect, it } from "vitest";

import {
  buildCustomPrintPayload,
  buildCustomReportPrintUrl,
  clearCustomPrintPayload,
  CUSTOM_REPORT_PRINT_STORAGE_PREFIX,
  CUSTOM_REPORT_PRINT_TTL_MS,
  ensurePrintableLayout,
  isValidCustomPrintPayload,
  loadCustomPrintPayload,
  storeCustomPrintPayload,
  type CustomPrintPayload,
  type PrintStorage,
} from "@/lib/custom-reports/print-payload";
import type { CustomReportRunResult } from "@/types/custom-reports";

function memoryStorage(): PrintStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

function sampleRun(overrides: Partial<CustomReportRunResult> = {}): CustomReportRunResult {
  return {
    templateId: "11111111-1111-1111-1111-111111111111",
    dataset: "assets",
    columns: [
      { key: "assetCode", label: "Asset code", type: "string" },
      { key: "name", label: "Name", type: "string" },
    ],
    rows: [
      { assetCode: "AST-001", name: "Projector" },
      { assetCode: "AST-002", name: "Laptop" },
    ],
    total: 2,
    page: 1,
    pageSize: 2000,
    filters: {
      departmentIds: ["dept-1"],
      categories: ["Monitors", "Laptops"],
      statuses: ["active"],
    },
    layout: [
      { id: "header", type: "header", props: {} },
      { id: "title", type: "title", props: { title: "Active assets" } },
      { id: "filters_summary", type: "filters_summary", props: {} },
      { id: "table", type: "table", props: {} },
      { id: "footer", type: "footer", props: { footerText: "Footer" } },
    ],
    organizationName: "CRMC",
    organizationSubtitle: "Property Office",
    logoUrl: "/CRMC%20LOGO.png",
    ...overrides,
  };
}

describe("custom report print payload", () => {
  afterEach(() => {
    // no shared state
  });

  it("builds a printable payload from a run result", () => {
    const payload = buildCustomPrintPayload(sampleRun(), "Dept assets");
    expect(payload.templateName).toBe("Dept assets");
    expect(payload.columns).toHaveLength(2);
    expect(payload.rows).toHaveLength(2);
    expect(payload.filters.categories).toEqual(["Monitors", "Laptops"]);
    expect(payload.layout.some((b) => b.type === "table")).toBe(true);
    expect(payload.organizationName).toBe("CRMC");
  });

  it("defaults layout when the run has none", () => {
    const payload = buildCustomPrintPayload(
      sampleRun({ layout: [] }),
      "Untitled"
    );
    expect(payload.layout.length).toBeGreaterThan(0);
    expect(payload.layout.some((b) => b.type === "table")).toBe(true);
  });

  it("ensures a table block exists even if designer omitted it", () => {
    const layout = ensurePrintableLayout(
      [
        { id: "h", type: "header", props: {} },
        { id: "t", type: "title", props: { title: "X" } },
      ],
      "X"
    );
    expect(layout.some((b) => b.type === "table")).toBe(true);
  });

  it("round-trips payload through storage with a query key", () => {
    const storage = memoryStorage();
    const payload = buildCustomPrintPayload(sampleRun(), "Round trip");
    const key = storeCustomPrintPayload(payload, storage, 1_700_000_000_000);
    expect(key.startsWith(CUSTOM_REPORT_PRINT_STORAGE_PREFIX)).toBe(true);
    const url = new URL(buildCustomReportPrintUrl(key), "http://localhost");
    expect(url.pathname).toBe("/custom-reports/print");
    expect(url.searchParams.get("key")).toBe(key);

    const loaded = loadCustomPrintPayload(key, storage, 1_700_000_000_000);
    expect(loaded?.templateName).toBe("Round trip");
    expect(loaded?.rows).toHaveLength(2);
    expect(loaded?.filters.statuses).toEqual(["active"]);

    clearCustomPrintPayload(key, storage);
    expect(loadCustomPrintPayload(key, storage)).toBeNull();
  });

  it("rejects expired payloads", () => {
    const storage = memoryStorage();
    const payload = buildCustomPrintPayload(sampleRun(), "Expired");
    const createdAt = 1_700_000_000_000;
    const key = storeCustomPrintPayload(payload, storage, createdAt);
    const loaded = loadCustomPrintPayload(
      key,
      storage,
      createdAt + CUSTOM_REPORT_PRINT_TTL_MS + 1
    );
    expect(loaded).toBeNull();
    expect(storage.store.has(key)).toBe(false);
  });

  it("rejects invalid keys and corrupt payloads", () => {
    const storage = memoryStorage();
    expect(loadCustomPrintPayload("evil-key", storage)).toBeNull();
    storage.setItem(`${CUSTOM_REPORT_PRINT_STORAGE_PREFIX}bad`, "{not-json");
    expect(
      loadCustomPrintPayload(`${CUSTOM_REPORT_PRINT_STORAGE_PREFIX}bad`, storage)
    ).toBeNull();
  });

  it("validates payload shape", () => {
    const valid: CustomPrintPayload = buildCustomPrintPayload(sampleRun(), "V");
    expect(isValidCustomPrintPayload(valid)).toBe(true);
    expect(isValidCustomPrintPayload({ columns: [], rows: [] })).toBe(false);
    expect(isValidCustomPrintPayload(null)).toBe(false);
  });

  it("accepts a legacy raw payload without envelope wrapper", () => {
    const storage = memoryStorage();
    const key = `${CUSTOM_REPORT_PRINT_STORAGE_PREFIX}legacy`;
    const raw = buildCustomPrintPayload(sampleRun(), "Legacy");
    storage.setItem(key, JSON.stringify(raw));
    const loaded = loadCustomPrintPayload(key, storage);
    expect(loaded?.templateName).toBe("Legacy");
  });
});
