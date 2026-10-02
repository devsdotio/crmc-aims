import { describe, expect, it } from "vitest";

import {
  hasConsumableCategoryClass,
  normalizeConsumableCategoryClass,
  resolveConsumableCategoryClassLabel,
} from "@/lib/consumable-category-class";

describe("consumable category class helpers", () => {
  it("normalizes blank and whitespace values", () => {
    expect(normalizeConsumableCategoryClass(null)).toBe("");
    expect(normalizeConsumableCategoryClass(undefined)).toBe("");
    expect(normalizeConsumableCategoryClass("  ")).toBe("");
    expect(normalizeConsumableCategoryClass(" Stationery ")).toBe("Stationery");
  });

  it("detects whether a general class is set", () => {
    expect(hasConsumableCategoryClass("")).toBe(false);
    expect(hasConsumableCategoryClass("Stationery")).toBe(true);
  });

  it("prefers explicit class over parent fallback", () => {
    expect(
      resolveConsumableCategoryClassLabel("Stationery", "Medical")
    ).toBe("Stationery");
    expect(resolveConsumableCategoryClassLabel("", "Medical")).toBe("Medical");
    expect(resolveConsumableCategoryClassLabel(null, null)).toBe("");
  });

  it("keeps supply|material distinct from general category class labels", () => {
    expect(normalizeConsumableCategoryClass("supply")).toBe("supply");
    expect(normalizeConsumableCategoryClass("Stationery")).toBe("Stationery");
    expect(normalizeConsumableCategoryClass("supply")).not.toBe("Stationery");
  });
});
