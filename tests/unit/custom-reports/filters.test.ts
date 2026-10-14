import { describe, expect, it } from "vitest";

import { filtersSchema } from "@/server/modules/custom-reports/custom-report.validation";
import { listDatasetMetadata } from "@/server/modules/custom-reports/dataset-registry";
import {
  normalizeCustomReportFilters,
  summarizeCustomReportFilters,
} from "@/types/custom-reports";

describe("custom report filters", () => {
  it("normalizes legacy single values into multi-select arrays", () => {
    const normalized = normalizeCustomReportFilters({
      search: "proj",
      departmentId: "d1",
      department: "ICT",
      category: "Paper",
      classification: "supply",
      status: "active",
    });

    expect(normalized.departmentIds).toEqual(["d1"]);
    expect(normalized.departmentNames).toEqual(["ICT"]);
    expect(normalized.categories).toEqual(["Paper"]);
    expect(normalized.classifications).toEqual(["supply"]);
    expect(normalized.statuses).toEqual(["active"]);
    expect(normalized.search).toBe("proj");
  });

  it("keeps multi-select arrays and comma-separated strings", () => {
    const normalized = normalizeCustomReportFilters({
      categories: ["A", "B"],
      statuses: "open,resolved",
      projectIds: ["p1", "p2"],
    });
    expect(normalized.categories).toEqual(["A", "B"]);
    expect(normalized.statuses).toEqual(["open", "resolved"]);
    expect(normalized.projectIds).toEqual(["p1", "p2"]);
  });

  it("parses filter schema arrays from JSON body shapes", () => {
    const parsed = filtersSchema.parse({
      departmentIds: ["d1", "d2"],
      categories: "Monitors,Laptops",
      statuses: ["active"],
      startDate: "2026-01-01",
    });
    expect(parsed.departmentIds).toEqual(["d1", "d2"]);
    expect(parsed.categories).toEqual(["Monitors", "Laptops"]);
    expect(parsed.statuses).toEqual(["active"]);
    expect(parsed.startDate).toBe("2026-01-01");
  });

  it("defaults missing filters to an empty object", () => {
    expect(filtersSchema.parse(undefined)).toEqual({});
  });

  it("summarizes applied filters for print/PDF", () => {
    const summary = summarizeCustomReportFilters({
      search: "AST",
      departmentIds: ["d1"],
      categories: ["Monitors"],
      statuses: ["active", "needs_repair"],
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });
    expect(summary).toContain("search: AST");
    expect(summary).toContain("categories: Monitors");
    expect(summary).toContain("statuses: active, needs_repair");
    expect(summary).toContain("2026-01-01");
  });

  it("exposes multi-select filter fields on every dataset including stock movements", () => {
    const datasets = listDatasetMetadata();
    const keys = datasets.map((d) => d.key);
    expect(keys).toContain("stock-movements");
    expect(keys).toContain("maintenance");
    expect(keys).toContain("assets");

    for (const dataset of datasets) {
      expect(dataset.filterFields.length).toBeGreaterThan(0);
      const multi = dataset.filterFields.filter((f) => f.control === "multi");
      expect(multi.length).toBeGreaterThan(0);
    }

    const maintenance = datasets.find((d) => d.key === "maintenance");
    expect(maintenance?.filterFields.some((f) => f.key === "departments")).toBe(
      true
    );
    expect(maintenance?.filterFields.some((f) => f.key === "assets")).toBe(true);

    const movements = datasets.find((d) => d.key === "stock-movements");
    expect(movements?.filterFields.some((f) => f.key === "departments")).toBe(
      true
    );
    expect(movements?.filterFields.some((f) => f.key === "reasons")).toBe(true);
  });
});
