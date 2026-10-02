import { describe, expect, it } from "vitest";

import { baseReportQuerySchema } from "@/server/modules/reports/report.validation";

describe("baseReportQuerySchema classification", () => {
  it("parses a classification filter with the rest of the query", () => {
    const parsed = baseReportQuerySchema.parse({
      classification: "Computer Equipments",
      category: "Monitors",
    });

    expect(parsed.classification).toBe("Computer Equipments");
    expect(parsed.category).toBe("Monitors");
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(25);
  });

  it("allows a report query with no classification", () => {
    const parsed = baseReportQuerySchema.parse({});

    expect(parsed.classification).toBeUndefined();
  });

  it("rejects a page size above the maximum", () => {
    const result = baseReportQuerySchema.safeParse({ pageSize: "201" });

    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric page", () => {
    const result = baseReportQuerySchema.safeParse({ page: "first" });

    expect(result.success).toBe(false);
  });

  it("accepts an empty classification string", () => {
    const parsed = baseReportQuerySchema.parse({ classification: "" });

    expect(parsed.classification).toBe("");
  });
});
