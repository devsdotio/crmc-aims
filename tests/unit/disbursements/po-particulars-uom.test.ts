import { describe, expect, it } from "vitest";

import {
  draftFromPurchaseOrderLines,
  particularsFromPurchaseOrderLines,
  resolveParticularUnitOfMeasure,
} from "@/lib/voucher-particulars";

describe("PO → disbursement UoM mapping", () => {
  it("maps purchase-lot unit into particular unitOfMeasure", () => {
    const items = particularsFromPurchaseOrderLines([
      {
        itemName: "Bond Paper",
        quantity: 5,
        unit: "ream",
        unitCost: 250,
        totalCost: 1250,
        purpose: "[Admin] Restock",
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].unitOfMeasure).toBe("ream");
    expect(items[0].quantity).toBe("5");
    expect(items[0].description).toBe("Bond Paper");
  });

  it("prefers explicit unitOfMeasure over lot unit", () => {
    expect(
      resolveParticularUnitOfMeasure({
        unitOfMeasure: "box",
        unit: "pcs",
      })
    ).toBe("box");
  });

  it("does not invent pcs when the PO line has no UoM", () => {
    const items = particularsFromPurchaseOrderLines([
      {
        itemName: "Mystery Item",
        quantity: 2,
        unitCost: 10,
        totalCost: 20,
      },
    ]);
    expect(items[0].unitOfMeasure).toBeUndefined();
  });

  it("draftFromPurchaseOrderLines carries UoM into editable disbursement lines", () => {
    const draft = draftFromPurchaseOrderLines([
      {
        itemName: "Toner Cartons",
        quantity: 2,
        unit: "carton",
        unitCost: 1500,
        totalCost: 3000,
        purpose: "[IT] Printer supplies",
      },
      {
        itemName: "Projector",
        quantity: 1,
        unit: "unit",
        unitCost: 18000,
        totalCost: 18000,
        purpose: "[IT] AV gear",
      },
    ]);

    expect(draft.lines).toHaveLength(2);
    expect(draft.lines[0].unitOfMeasure).toBe("carton");
    expect(draft.lines[1].unitOfMeasure).toBe("unit");
    expect(draft.lines[0].unitOfMeasure).not.toBe("pcs");
  });
});
