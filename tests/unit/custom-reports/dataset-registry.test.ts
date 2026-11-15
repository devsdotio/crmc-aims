import { describe, expect, it } from "vitest";

import {
  getDatasetDefinition,
  listDatasetMetadata,
  resolveDatasetColumns,
} from "@/server/modules/custom-reports/dataset-registry";
import {
  filtersSchema,
  runtimeFiltersSchema,
} from "@/server/modules/custom-reports/custom-report.validation";
import { summarizeCustomReportFilters } from "@/types/custom-reports";

describe("custom-reports dataset registry & filter schema (supplies vs materials)", () => {
  it("registers consumable-requests alongside consumables, stock-movements, and purchase-orders", () => {
    const metas = listDatasetMetadata();
    const keys = metas.map((m) => m.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "assets",
        "consumables",
        "stock-movements",
        "purchase-orders",
        "requests",
        "consumable-requests",
        "maintenance",
        "projects",
      ])
    );
  });

  it("exposes classification, categoryClass, availableQty, and low_stock filters on consumables", () => {
    const def = getDatasetDefinition("consumables");
    const colKeys = def.columns.map((c) => c.key);
    expect(colKeys).toEqual(
      expect.arrayContaining(["classification", "categoryClass", "availableQty", "reservedQty"])
    );
    const filterKeys = def.filterFields.map((f) => f.key);
    expect(filterKeys).toEqual(
      expect.arrayContaining(["classifications", "categoryClasses", "statuses"])
    );
    const classField = def.filterFields.find((f) => f.key === "classifications");
    expect(classField?.staticOptions?.map((o) => o.id)).toEqual(
      expect.arrayContaining(["supply", "material"])
    );
  });

  it("exposes classification, categoryClass, voided status filtering, and voided column on stock-movements", () => {
    const def = getDatasetDefinition("stock-movements");
    const colKeys = def.columns.map((c) => c.key);
    expect(colKeys).toEqual(
      expect.arrayContaining(["classification", "categoryClass", "voided"])
    );
    const filterKeys = def.filterFields.map((f) => f.key);
    expect(filterKeys).toEqual(
      expect.arrayContaining(["classifications", "categoryClasses", "statuses"])
    );
    const statusField = def.filterFields.find((f) => f.key === "statuses");
    expect(statusField?.staticOptions?.map((o) => o.id)).toEqual(
      expect.arrayContaining(["active", "voided"])
    );
  });

  it("exposes PO classification filter and real lifecycle statuses on purchase-orders", () => {
    const def = getDatasetDefinition("purchase-orders");
    const colKeys = def.columns.map((c) => c.key);
    expect(colKeys).toContain("classification");
    const statusField = def.filterFields.find((f) => f.key === "statuses");
    expect(statusField?.staticOptions?.map((o) => o.id)).toEqual(
      expect.arrayContaining([
        "pending_approval",
        "approved",
        "ordered",
        "delivered",
        "cancelled",
      ])
    );
  });

  it("defines the consumable-requests dataset with distinct supply, material, and mixed kinds", () => {
    const def = getDatasetDefinition("consumable-requests");
    const resolved = resolveDatasetColumns("consumable-requests", [
      "requestCode",
      "classification",
      "requesterName",
      "department",
      "status",
      "itemsCount",
      "suppliesCount",
      "materialsCount",
      "itemsSummary",
    ]);
    expect(resolved).toHaveLength(9);
    const classField = def.filterFields.find((f) => f.key === "classifications");
    expect(classField?.staticOptions?.map((o) => o.id)).toEqual(
      expect.arrayContaining(["supply", "material", "mixed"])
    );
  });

  it("preserves explicit empty clears in runtimeFiltersSchema alongside template filtersSchema", () => {
    const runtimeCleared = runtimeFiltersSchema.parse({
      classifications: [],
      categoryClasses: [],
      search: "",
    });
    expect(runtimeCleared.classifications).toEqual([]);
    expect(runtimeCleared.categoryClasses).toEqual([]);
    expect(runtimeCleared.search).toBe("");

    const savedParsed = filtersSchema.parse({
      classifications: ["supply", "material"],
      search: "printer",
    });
    expect(savedParsed.classifications).toEqual(["supply", "material"]);
    expect(savedParsed.search).toBe("printer");
  });

  it("humanizes classification filter labels in summarizeCustomReportFilters", () => {
    const summary = summarizeCustomReportFilters({
      classifications: ["supply", "material", "mixed"],
      categoryClasses: ["Office Consumables"],
    });
    expect(summary).toContain("Supplies");
    expect(summary).toContain("Materials");
    expect(summary).toContain("Mixed (Supplies + Materials)");
    expect(summary).toContain("Office Consumables");
  });
});
