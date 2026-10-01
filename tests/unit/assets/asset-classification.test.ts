import { describe, expect, it } from "vitest";

import {
  hasAssetClassification,
  normalizeAssetClassification,
  resolveAssetClassificationLabel,
} from "@/lib/asset-classification";

describe("asset classification helpers", () => {
  it("normalizes blank and whitespace values", () => {
    expect(normalizeAssetClassification(null)).toBe("");
    expect(normalizeAssetClassification(undefined)).toBe("");
    expect(normalizeAssetClassification("  ")).toBe("");
    expect(normalizeAssetClassification(" Computer Equipments ")).toBe(
      "Computer Equipments"
    );
  });

  it("detects whether a classification is set", () => {
    expect(hasAssetClassification("")).toBe(false);
    expect(hasAssetClassification("Monitors")).toBe(true);
  });

  it("prefers explicit class over parent fallback", () => {
    expect(
      resolveAssetClassificationLabel("Computer Equipments", "Furniture")
    ).toBe("Computer Equipments");
    expect(resolveAssetClassificationLabel("", "Furniture")).toBe("Furniture");
    expect(resolveAssetClassificationLabel(null, null)).toBe("");
  });

  it("treats specific categories and general classes as distinct labels", () => {
    expect(
      resolveAssetClassificationLabel(undefined, "Computer Equipments")
    ).toBe("Computer Equipments");
    expect(normalizeAssetClassification("Monitors")).toBe("Monitors");
    expect(normalizeAssetClassification("Monitors")).not.toBe(
      "Computer Equipments"
    );
  });
});

describe("asset UoM defaults via purchase-unit helpers", () => {
  it("accepts free-text asset units on registry records", async () => {
    const { resolvePurchaseUnit } = await import("@/lib/purchase-unit");
    expect(resolvePurchaseUnit("asset", "set")).toBe("set");
    expect(resolvePurchaseUnit("asset", "")).toBe("unit");
  });
});
