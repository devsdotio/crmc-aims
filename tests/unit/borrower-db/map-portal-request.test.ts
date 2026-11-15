import { describe, expect, it } from "vitest";

import {
  mapBorrowRequestToPortal,
  mapConsumableRequestToPortal,
  portalKindFromConsumableRequest,
  portalRequestKindLabel,
} from "@/components/borrower-db/map-portal-request";
import type { ConsumableRequest } from "@/features/consumable-requests/client/consumable-requests-api";
import type { BorrowRequest } from "@/types/borrow-requests";

function baseConsumableRequest(
  overrides: Partial<ConsumableRequest> = {}
): ConsumableRequest {
  return {
    id: "crq-1",
    requestCode: "CRQ-001",
    requesterName: "IT Office",
    requesterEmail: "it@crmc.edu",
    requesterPhone: "",
    departmentId: "dept-it",
    department: "Information Technology",
    purpose: "Office restock",
    status: "pending",
    requestedAt: "2026-11-10T08:00:00.000Z",
    relativeTime: "today",
    totalCost: "0.00",
    lines: [],
    allocations: [],
    history: [],
    ...overrides,
  };
}

function baseBorrowRequest(
  overrides: Partial<BorrowRequest> = {}
): BorrowRequest {
  return {
    id: "brq-1",
    requestCode: "REQ-001",
    requesterName: "IT Office",
    requesterEmail: "it@crmc.edu",
    requesterPhone: "",
    departmentId: "dept-it",
    department: "Information Technology",
    requestType: "borrowable",
    items: [],
    purpose: "Projector setup",
    requestedAt: "2026-11-10T08:00:00.000Z",
    relativeTime: "today",
    expectedReturnDate: "2026-11-15",
    status: "pending",
    history: [],
    ...overrides,
  };
}

describe("borrower portal request mappers", () => {
  it("derives supply, material, and mixed kinds from consumable requests", () => {
    const supplyReq = baseConsumableRequest({
      lines: [
        {
          id: "l1",
          lineNo: 1,
          consumableId: "c1",
          itemCode: "CON-001",
          itemName: "Bond Paper",
          category: "Office Supplies",
          unit: "ream",
          quantityRequested: 5,
          quantityReleased: 0,
          quantityRemaining: 5,
          classification: "supply",
          purpose: "Exam printing",
        },
      ],
    });
    const materialReq = baseConsumableRequest({
      id: "crq-2",
      lines: [
        {
          id: "l2",
          lineNo: 1,
          consumableId: "c2",
          itemCode: "CON-002",
          itemName: "Latex Paint",
          category: "Paints & Coatings",
          unit: "gal",
          quantityRequested: 2,
          quantityReleased: 0,
          quantityRemaining: 2,
          classification: "material",
          purpose: "Lab repainting",
        },
      ],
    });
    const mixedReq = baseConsumableRequest({
      id: "crq-3",
      classification: "mixed",
      lines: [...supplyReq.lines, ...materialReq.lines],
    });

    expect(portalKindFromConsumableRequest(supplyReq)).toBe("supply");
    expect(portalKindFromConsumableRequest(materialReq)).toBe("material");
    expect(portalKindFromConsumableRequest(mixedReq)).toBe("mixed");

    const mappedSupply = mapConsumableRequestToPortal(supplyReq);
    const mappedMaterial = mapConsumableRequestToPortal(materialReq);
    const mappedMixed = mapConsumableRequestToPortal(mixedReq);

    expect(mappedSupply.departmentId).toBe("dept-it");
    expect(mappedMaterial.items[0]?.classification).toBe("material");
    expect(mappedMixed.portalKind).toBe("mixed");

    expect(portalRequestKindLabel(mappedSupply)).toBe("Supplies");
    expect(portalRequestKindLabel(mappedMaterial)).toBe("Materials");
    expect(portalRequestKindLabel(mappedMixed)).toBe("Mixed");
  });

  it("never classifies an empty-items borrow request as Supplies", () => {
    const emptyBorrow = mapBorrowRequestToPortal(
      baseBorrowRequest({ requestType: "borrowable", items: [] })
    );
    const emptyAssign = mapBorrowRequestToPortal(
      baseBorrowRequest({ requestType: "assignable", items: [] })
    );

    expect(portalRequestKindLabel(emptyBorrow)).toBe("Borrow");
    expect(portalRequestKindLabel(emptyAssign)).toBe("Assignment");
  });
});

