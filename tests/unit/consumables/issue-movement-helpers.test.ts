import { describe, expect, it } from "vitest";

import { combineIssueMovementNotes } from "@/server/modules/consumables/consumable.service";
import { stockMovementToDTO } from "@/server/modules/stock-movements/stock-movement.service";
import type { StockMovementListRow } from "@/server/modules/stock-movements/stock-movement.repository";

function makeRow(
  overrides: Partial<StockMovementListRow> = {}
): StockMovementListRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    tenantId: "00000000-0000-0000-0000-000000000001",
    movementCode: "MOV-2026-0001",
    consumableId: "22222222-2222-2222-2222-222222222222",
    qty: "5.00",
    direction: "out",
    reason: "issue",
    departmentId: "33333333-3333-3333-3333-333333333333",
    projectId: null,
    purchaseLotId: "44444444-4444-4444-4444-444444444444",
    lotCode: "LOT-2026-0001",
    unitCost: "100.00",
    lineTotal: "500.00",
    requestId: null,
    notes: null,
    actorUserId: "00000000-0000-0000-0000-000000000002",
    actorName: "Property Custodian",
    createdAt: new Date("2026-11-01T08:00:00.000Z"),
    itemCode: "CON-MAT-001",
    itemName: "Portland Cement",
    unit: "bags",
    classification: "material",
    requestCode: null,
    ...overrides,
  };
}

describe("combineIssueMovementNotes", () => {
  it("preserves destination, requester, recipient, and extra operator notes", () => {
    const destNote =
      "Classroom partition. Issued to department CE (Civil Eng). Requested by: Engr. Santos. Received by: Foreman Reyes";
    expect(combineIssueMovementNotes(destNote, "Delivered to Bldg B")).toBe(
      `${destNote}. Delivered to Bldg B`
    );
  });

  it("does not duplicate operator notes already included in destNote", () => {
    const destNote = "Urgent fix. Issued to department IT (Info Tech)";
    expect(combineIssueMovementNotes(destNote, "Urgent fix")).toBe(destNote);
  });

  it("returns standalone notes or null when destNote is empty", () => {
    expect(combineIssueMovementNotes("", "Manual note")).toBe("Manual note");
    expect(combineIssueMovementNotes("  ", "   ")).toBeNull();
  });
});

describe("stockMovementToDTO classification & requestCode", () => {
  const labels = new Map<string, string>([
    ["d:33333333-3333-3333-3333-333333333333", "Civil Engineering"],
  ]);

  it("normalizes material and blank/supply classifications and propagates requestCode", () => {
    const matDto = stockMovementToDTO(
      makeRow({
        classification: "material",
        requestId: "55555555-5555-5555-5555-555555555555",
        requestCode: "CRQ-2026-0042",
      }),
      labels
    );
    expect(matDto.classification).toBe("material");
    expect(matDto.requestCode).toBe("CRQ-2026-0042");
    expect(matDto.destinationLabel).toBe("Civil Engineering");

    const blankDto = stockMovementToDTO(
      makeRow({ classification: "", requestCode: undefined }),
      labels
    );
    expect(blankDto.classification).toBe("supply");
    expect(blankDto.requestCode).toBeNull();
  });

  it("keeps classification undefined when row omits joined classification", () => {
    const row = makeRow();
    delete row.classification;
    const dto = stockMovementToDTO(row, labels);
    expect(dto.classification).toBeUndefined();
  });
});

