import { describe, expect, it } from "vitest";

import {
  buildPoSlipBodyHtml,
  getPoSlipPurposeGroups,
  resolvePoSlipUnit,
  type PoSlipRenderData,
} from "@/components/purchase-orders/po-official-slip";
import { groupLotsByPO } from "@/types/grouped-purchase-order";
import type { PurchaseLot } from "@/types/purchase-lots";

function baseLot(overrides: Partial<PurchaseLot> = {}): PurchaseLot {
  return {
    id: "lot-1",
    poNumber: "PO-2026-TEST0001",
    lotCode: "LOT-2026-TEST0001",
    status: "ordered",
    itemType: "consumable",
    consumableId: null,
    assetId: null,
    itemCode: "ITM-1",
    itemName: "Bond Paper",
    supplierId: null,
    supplierName: "Office Mart",
    quantity: 5,
    quantityRemaining: 0,
    orderedQuantity: 5,
    receivedQuantity: null,
    unit: "ream",
    unitCost: "250.00",
    totalCost: "1250.00",
    purchasedOn: "2026-09-01",
    reference: null,
    purpose: "[Ops] Restock",
    departmentId: null,
    departmentName: null,
    projectId: null,
    projectName: null,
    classification: "supply",
    notes: null,
    receiptUrl: null,
    recordedByUserId: "u1",
    recordedByName: "Tester",
    approvedByName: null,
    approvedAt: null,
    orderedAt: null,
    deliveredAt: null,
    cancellationReason: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    qrPayload: "CRMC-AIMS-LOT:LOT-2026-TEST0001",
    disbursement: null,
    ...overrides,
  };
}

describe("PO official slip UoM", () => {
  it("resolves free-text and default units for slip display", () => {
    expect(resolvePoSlipUnit("consumable", "ream")).toBe("ream");
    expect(resolvePoSlipUnit("consumable", null)).toBe("pcs");
    expect(resolvePoSlipUnit("asset", "set")).toBe("set");
    expect(resolvePoSlipUnit("asset", "")).toBe("unit");
  });

  it("embeds per-line UoM next to quantity in slip HTML", () => {
    const lot = baseLot({
      items: [
        {
          id: "line-1",
          itemType: "consumable",
          consumableId: null,
          assetId: null,
          itemCode: "ITM-1",
          itemName: "Bond Paper",
          quantity: 5,
          unit: "ream",
          unitCost: "250.00",
          totalCost: "1250.00",
          purpose: "[Ops] Restock",
          suggestedDealer: "Office Mart",
          lotCode: "LOT-2026-TEST0001",
        },
        {
          id: "line-2",
          itemType: "asset",
          consumableId: null,
          assetId: null,
          itemCode: "AST-1",
          itemName: "Conference Table",
          quantity: 2,
          unit: "set",
          unitCost: "18000.00",
          totalCost: "36000.00",
          purpose: "[Ops] Restock",
          suggestedDealer: "Office Mart",
          lotCode: "LOT-2026-TEST0002",
        },
      ],
    });

    const data: PoSlipRenderData = {
      lot,
      requestedBy: "Tester",
      requestedByTitle: "Staff",
      poDate: "September 1, 2026",
      poTimestamp: "09:00 AM",
      displayDealer: "Office Mart",
      displayLotCode: lot.lotCode,
      logoUrl: "/logo.png",
    };

    const html = buildPoSlipBodyHtml(data);
    expect(html).toContain(">5 <span");
    expect(html).toContain("ream");
    expect(html).toContain(">2 <span");
    expect(html).toContain("set");
    expect(html).not.toMatch(/>5<\/td>/);
  });

  it("carries resolved UoM through slip purpose groups for preview parity", () => {
    const lot = baseLot({ unit: null, itemType: "consumable" });
    const groups = getPoSlipPurposeGroups(lot);
    expect(groups).toHaveLength(1);
    expect(groups[0].lines[0].unit).toBe("pcs");
  });

  it("groups multi-line POs with resolved UoM on each item", () => {
    const supply = baseLot({
      id: "lot-a",
      unit: "carton",
      itemName: "Folders",
      quantity: 3,
      totalCost: "450.00",
    });
    const asset = baseLot({
      id: "lot-b",
      itemType: "asset",
      itemCode: "AST-9",
      itemName: "Chairs",
      unit: "pair",
      quantity: 6,
      totalCost: "12000.00",
    });

    const [group] = groupLotsByPO([supply, asset]);
    expect(group.representative.items).toHaveLength(2);
    expect(group.representative.items?.[0].unit).toBe("carton");
    expect(group.representative.items?.[1].unit).toBe("pair");
  });
});
