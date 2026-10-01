import { describe, expect, it } from "vitest";

import {
  DEFAULT_ASSET_UNIT,
  DEFAULT_CONSUMABLE_UNIT,
  defaultPurchaseUnit,
  resolvePurchaseUnit,
} from "@/lib/purchase-unit";

describe("purchase unit helpers", () => {
  it("exposes distinct defaults for assets and consumables", () => {
    expect(DEFAULT_ASSET_UNIT).toBe("unit");
    expect(DEFAULT_CONSUMABLE_UNIT).toBe("pcs");
    expect(defaultPurchaseUnit("asset")).toBe("unit");
    expect(defaultPurchaseUnit("consumable")).toBe("pcs");
  });

  it("keeps free-text asset UoM instead of forcing unit", () => {
    expect(resolvePurchaseUnit("asset", "set")).toBe("set");
    expect(resolvePurchaseUnit("asset", " pair ")).toBe("pair");
    expect(resolvePurchaseUnit("asset", "pcs")).toBe("pcs");
  });

  it("falls back when unit is blank", () => {
    expect(resolvePurchaseUnit("asset", "")).toBe("unit");
    expect(resolvePurchaseUnit("asset", "   ")).toBe("unit");
    expect(resolvePurchaseUnit("asset", null)).toBe("unit");
    expect(resolvePurchaseUnit("consumable", undefined)).toBe("pcs");
  });
});
