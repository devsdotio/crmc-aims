import { describe, expect, it } from "vitest";

import type { PurchaseLot } from "@/types/purchase-lots";
import {
  STOCK_ADJUSTMENT_LOT_REFERENCE,
  groupLotsByPO,
  isNonPurchaseOrderLot,
  isStockAdjustmentLot,
} from "@/types/grouped-purchase-order";

function lot(partial: Partial<PurchaseLot> & Pick<PurchaseLot, "id" | "lotCode">): PurchaseLot {
  return {
    itemType: "consumable",
    consumableId: "c1",
    assetId: null,
    itemCode: "CON-1",
    itemName: "Test item",
    supplierId: null,
    supplierName: null,
    departmentId: null,
    departmentName: null,
    projectId: null,
    projectName: null,
    quantity: 5,
    quantityRemaining: 5,
    unitCost: "10.00",
    totalCost: "50.00",
    purchasedOn: "2026-01-01",
    reference: null,
    receiptUrl: null,
    recordedByUserId: "00000000-0000-0000-0000-000000000001",
    recordedByName: "Tester",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "delivered",
    poNumber: partial.reference ?? partial.lotCode,
    notes: null,
    purpose: null,
    unit: "pcs",
    ...partial,
  };
}

describe("isStockAdjustmentLot", () => {
  it("detects canonical stock adjustment lots", () => {
    const row = lot({
      id: "1",
      lotCode: "LOT-1",
      reference: STOCK_ADJUSTMENT_LOT_REFERENCE,
      notes: "Stock correction lot — Physical Count Correction",
    });
    expect(isStockAdjustmentLot(row)).toBe(true);
    expect(isNonPurchaseOrderLot(row)).toBe(true);
  });

  it("detects legacy lots that stored the reason in reference", () => {
    const row = lot({
      id: "2",
      lotCode: "LOT-2",
      reference: "Physical Count Correction",
      notes: "Stock correction lot",
    });
    expect(isStockAdjustmentLot(row)).toBe(true);
  });
});

describe("groupLotsByPO", () => {
  it("excludes stock adjustment lots from PO groups", () => {
    const formal = lot({
      id: "po-1",
      lotCode: "LOT-PO",
      reference: "PO-2026-001",
      poNumber: "PO-2026-001",
      status: "pending_approval",
    });
    const correction = lot({
      id: "adj-1",
      lotCode: "LOT-ADJ",
      reference: STOCK_ADJUSTMENT_LOT_REFERENCE,
      notes: "Stock correction lot — Found stock",
    });

    const groups = groupLotsByPO([formal, correction]);
    expect(groups).toHaveLength(1);
    expect(groups[0].poNumber).toBe("PO-2026-001");
  });
});