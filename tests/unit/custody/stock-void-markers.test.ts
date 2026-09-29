import { describe, expect, it } from "vitest";

import {
  extractReversedId,
  isVoidedNotes,
  reversesMarker,
  voidedMarker,
} from "@/server/modules/stock-movements/stock-movement.repository";
import { allocationsToMovementLines } from "@/server/modules/stock-movements/stock-movement.service";

describe("stock void / reverse markers", () => {
  const movementId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("builds reverse and voided markers", () => {
    expect(reversesMarker(movementId)).toBe(`[REVERSES:${movementId}]`);
    expect(voidedMarker()).toBe("[VOIDED]");
  });

  it("detects voided notes", () => {
    expect(isVoidedNotes("Issued toner [VOIDED]")).toBe(true);
    expect(isVoidedNotes("Issued toner")).toBe(false);
    expect(isVoidedNotes(null)).toBe(false);
  });

  it("extracts reversed movement id", () => {
    expect(
      extractReversedId(`undo ${reversesMarker(movementId)} extra`)
    ).toBe(movementId);
    expect(extractReversedId("no marker")).toBeNull();
  });
});

describe("allocationsToMovementLines", () => {
  it("maps lot cost allocations into movement lines", () => {
    const lines = allocationsToMovementLines([
      {
        lotId: "11111111-1111-1111-1111-111111111111",
        lotCode: "LOT-2026-TEST0001",
        quantity: 3,
        unitCost: "12.50",
        total: "37.50",
      },
    ]);
    expect(lines).toEqual([
      {
        qty: 3,
        purchaseLotId: "11111111-1111-1111-1111-111111111111",
        lotCode: "LOT-2026-TEST0001",
        unitCost: "12.50",
        lineTotal: "37.50",
      },
    ]);
  });
});
