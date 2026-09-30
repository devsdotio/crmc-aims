import { describe, expect, it } from "vitest";

import { assetCategoryCodePrefix } from "@/lib/asset-category";

describe("assetCategoryCodePrefix", () => {
  it("uses preset prefixes for known categories", () => {
    expect(assetCategoryCodePrefix("Computing")).toBe("CP");
    expect(assetCategoryCodePrefix("Transport")).toBe("TR");
    expect(assetCategoryCodePrefix("AV Equipment")).toBe("AV");
    expect(assetCategoryCodePrefix("Furniture")).toBe("FN");
  });

  it("derives initials from multi-word labels", () => {
    expect(assetCategoryCodePrefix("Lab Equipment")).toBe("LE");
  });

  it("falls back to first two letters for single-word labels", () => {
    expect(assetCategoryCodePrefix("Printers")).toBe("PR");
  });

  it("defaults when empty", () => {
    expect(assetCategoryCodePrefix("   ")).toBe("AS");
  });
});
