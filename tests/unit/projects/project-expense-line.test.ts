import { describe, expect, it } from "vitest";

import {
  isInventoryExpenseLine,
  isManualMaterialExpenseLine,
} from "@/lib/project-expense-line";

describe("project expense line inventory vs manual", () => {
  it("treats lineType consumable as inventory stock", () => {
    expect(
      isInventoryExpenseLine({ lineType: "consumable", consumableId: "c1" })
    ).toBe(true);
    expect(
      isManualMaterialExpenseLine({
        lineType: "consumable",
        consumableId: "c1",
      })
    ).toBe(false);
  });

  it("treats legacy PO deliveries (material + consumableId) as inventory", () => {
    expect(
      isInventoryExpenseLine({ lineType: "material", consumableId: "c1" })
    ).toBe(true);
    expect(
      isManualMaterialExpenseLine({
        lineType: "material",
        consumableId: "c1",
      })
    ).toBe(false);
  });

  it("treats off-inventory material entries as manual", () => {
    expect(
      isInventoryExpenseLine({ lineType: "material", consumableId: null })
    ).toBe(false);
    expect(
      isManualMaterialExpenseLine({
        lineType: "material",
        consumableId: null,
      })
    ).toBe(true);
  });
});
