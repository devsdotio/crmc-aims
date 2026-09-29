import { describe, expect, it } from "vitest";

import {
  AUDIT_ACTION,
  AUDIT_ENTITY,
  CRITICAL_AUDIT_ACTIONS,
  compactAuditMetadata,
} from "@/server/modules/audit-logs/audit-events";

describe("audit events", () => {
  it("marks request and PO lifecycle actions as critical", () => {
    expect(CRITICAL_AUDIT_ACTIONS.has(AUDIT_ACTION.approved)).toBe(true);
    expect(CRITICAL_AUDIT_ACTIONS.has(AUDIT_ACTION.rejected)).toBe(true);
    expect(CRITICAL_AUDIT_ACTIONS.has(AUDIT_ACTION.voided)).toBe(true);
    expect(CRITICAL_AUDIT_ACTIONS.has("purchase_order_delivered")).toBe(true);
    expect(CRITICAL_AUDIT_ACTIONS.has(AUDIT_ACTION.created)).toBe(false);
  });

  it("exposes core entity types", () => {
    expect(AUDIT_ENTITY.asset).toBe("asset");
    expect(AUDIT_ENTITY.borrowRequest).toBe("borrow_request");
    expect(AUDIT_ENTITY.purchaseOrder).toBe("purchase_order");
  });

  it("compacts metadata by dropping empty values", () => {
    expect(
      compactAuditMetadata({
        assetCode: "CP-001",
        note: "  ",
        qty: 1,
        missing: null,
        skip: undefined,
      })
    ).toEqual({ assetCode: "CP-001", qty: 1 });
    expect(compactAuditMetadata(null)).toBeNull();
    expect(compactAuditMetadata({})).toBeNull();
  });
});
