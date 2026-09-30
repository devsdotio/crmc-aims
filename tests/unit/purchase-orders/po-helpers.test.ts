import { describe, expect, it } from "vitest";

import type { PurchaseLotRow } from "@/server/db/schema";
import {
  deriveLotCode,
  derivePONumber,
  parseNotesMetadata,
  serializeNotesMetadata,
  supplierLinkForMaterialLot,
  toPurchaseLotDTO,
} from "@/server/modules/purchase-lots/purchase-lot.service";

describe("purchase order code helpers", () => {
  it("derives PO numbers from lot codes and opening-balance references", () => {
    expect(derivePONumber("LOT-2026-ABCD1234")).toBe("PO-2026-ABCD1234");
    expect(derivePONumber("PO-2026-ABCD1234")).toBe("PO-2026-ABCD1234");
    expect(derivePONumber("CUSTOM-1", "PO-CUSTOM")).toBe("PO-CUSTOM");
    expect(derivePONumber("LOT-1", "Initial stock")).toBe("Opening balance");
    expect(derivePONumber("LOT-1", "Opening balance — create")).toBe(
      "Opening balance"
    );
  });

  it("derives lot codes from PO numbers", () => {
    expect(deriveLotCode("PO-2026-ABCD1234")).toBe("LOT-2026-ABCD1234");
    expect(deriveLotCode("LOT-2026-ABCD1234")).toBe("LOT-2026-ABCD1234");
  });
});

describe("purchase order notes metadata", () => {
  it("defaults status to pending_approval (never silently delivered)", () => {
    expect(parseNotesMetadata(null).status).toBe("pending_approval");
    expect(parseNotesMetadata("plain note").status).toBe("pending_approval");
  });

  it("round-trips JSON metadata", () => {
    const serialized = serializeNotesMetadata({
      notes: "Need toner",
      status: "ordered",
      purpose: "[IT] Toner restock",
      orderedQuantity: 10,
      draftItem: {
        category: "Office Supplies",
        classification: "supply",
        unit: "pcs",
        location: "Store",
      },
    });
    const parsed = parseNotesMetadata(serialized);
    expect(parsed.status).toBe("ordered");
    expect(parsed.cleanNotes).toBe("Need toner");
    expect(parsed.purpose).toBe("[IT] Toner restock");
    expect(parsed.orderedQuantity).toBe(10);
    expect(parsed.draftItem?.classification).toBe("supply");
    expect(parsed.draftItem?.category).toBe("Office Supplies");
  });

  it("parses legacy bracket status tags", () => {
    const parsed = parseNotesMetadata(
      "[STATUS: approved] [PURPOSE: Restock] hello"
    );
    expect(parsed.status).toBe("approved");
    expect(parsed.purpose).toBe("Restock");
  });
});

describe("toPurchaseLotDTO classification", () => {
  function baseRow(
    overrides: Partial<PurchaseLotRow> & { notes: string }
  ): PurchaseLotRow {
    return {
      id: "11111111-1111-1111-1111-111111111111",
      tenantId: "00000000-0000-0000-0000-000000000001",
      lotCode: "LOT-2026-ABCD1234",
      itemType: "consumable",
      consumableId: null,
      assetId: null,
      itemCode: "ITM-PENDING",
      itemName: "New Rebar Bundle",
      supplierId: null,
      supplierName: "Steel Co",
      departmentId: null,
      departmentName: null,
      projectId: null,
      projectName: null,
      quantity: 10,
      quantityRemaining: 0,
      unitCost: "100.00",
      totalCost: "1000.00",
      purchasedOn: "2026-09-30",
      reference: "PO-2026-ABCD1234",
      receiptUrl: null,
      recordedByUserId: "22222222-2222-2222-2222-222222222222",
      recordedByName: "Tester",
      createdAt: new Date("2026-09-30T00:00:00.000Z"),
      updatedAt: new Date("2026-09-30T00:00:00.000Z"),
      ...overrides,
    };
  }

  it("exposes material classification from deferred new-item draft metadata", () => {
    const notes = serializeNotesMetadata({
      notes: null,
      status: "pending_approval",
      purpose: "[Ops] Site materials",
      draftItem: {
        category: "Construction",
        classification: "material",
        unit: "pcs",
        location: "Yard",
      },
    });
    const dto = toPurchaseLotDTO(baseRow({ notes }));
    expect(dto.classification).toBe("material");
    expect(dto.consumableId).toBeNull();
  });

  it("exposes supply classification from deferred new-item draft metadata", () => {
    const notes = serializeNotesMetadata({
      notes: null,
      status: "pending_approval",
      purpose: "[Ops] Office restock",
      draftItem: {
        category: "Office Supplies",
        classification: "supply",
        unit: "ream",
      },
    });
    const dto = toPurchaseLotDTO(
      baseRow({ notes, itemName: "Bond Paper", itemCode: "ITM-1" })
    );
    expect(dto.classification).toBe("supply");
  });
});

describe("supplierLinkForMaterialLot", () => {
  it("clears supplier id for material / project lots", () => {
    expect(
      supplierLinkForMaterialLot({
        supplierId: "11111111-1111-1111-1111-111111111111",
        classification: "material",
      })
    ).toBeNull();
    expect(
      supplierLinkForMaterialLot({
        supplierId: "11111111-1111-1111-1111-111111111111",
        projectId: "22222222-2222-2222-2222-222222222222",
      })
    ).toBeNull();
  });

  it("keeps supplier id for supply lots", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    expect(
      supplierLinkForMaterialLot({
        supplierId: id,
        classification: "supply",
      })
    ).toBe(id);
  });
});
