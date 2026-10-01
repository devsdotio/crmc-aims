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
});
