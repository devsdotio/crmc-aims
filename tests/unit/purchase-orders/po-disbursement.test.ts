import { describe, expect, it } from "vitest";

import {
  assertCashReleaseTransition,
  receiptUploadBlockReason,
  type PoDisbursementClaim,
} from "@/server/modules/purchase-lots/po-disbursement";
import { BadRequestError } from "@/server/shared/errors";

function claim(
  overrides: Partial<PoDisbursementClaim> = {}
): PoDisbursementClaim {
  return {
    kind: "voucher",
    id: "11111111-1111-1111-1111-111111111111",
    code: "DV-2026-TEST0001",
    status: "draft",
    purchaseOrderNumber: "PO-2026-TEST0001",
    ...overrides,
  };
}

describe("receiptUploadBlockReason", () => {
  it("blocks when no disbursement claim exists", () => {
    expect(receiptUploadBlockReason(null)).toMatch(/locked until.*disbursed/i);
  });

  it("blocks until the claim reaches disbursed or completed", () => {
    expect(receiptUploadBlockReason(claim({ status: "draft" }))).toMatch(
      /DV-2026-TEST0001.*disbursed/i
    );
    expect(
      receiptUploadBlockReason(claim({ status: "pending_approval" }))
    ).toMatch(/disbursed/i);
    expect(receiptUploadBlockReason(claim({ status: "approved" }))).toMatch(
      /disbursed/i
    );
  });

  it("allows upload once disbursed or completed", () => {
    expect(receiptUploadBlockReason(claim({ status: "disbursed" }))).toBeNull();
    expect(receiptUploadBlockReason(claim({ status: "completed" }))).toBeNull();
  });

  it("labels petty cash claims distinctly", () => {
    expect(
      receiptUploadBlockReason(
        claim({
          kind: "petty_cash",
          code: "PCV-1",
          status: "approved",
        })
      )
    ).toMatch(/petty cash voucher PCV-1/i);
  });
});

describe("assertCashReleaseTransition", () => {
  it("allows the draft → pending → approved → disbursed path", () => {
    expect(() =>
      assertCashReleaseTransition("draft", "pending_approval")
    ).not.toThrow();
    expect(() =>
      assertCashReleaseTransition("pending_approval", "approved")
    ).not.toThrow();
    expect(() =>
      assertCashReleaseTransition("approved", "disbursed")
    ).not.toThrow();
  });

  it("allows cancel from open statuses", () => {
    expect(() =>
      assertCashReleaseTransition("draft", "cancelled")
    ).not.toThrow();
    expect(() =>
      assertCashReleaseTransition("pending_approval", "cancelled")
    ).not.toThrow();
    expect(() =>
      assertCashReleaseTransition("approved", "cancelled")
    ).not.toThrow();
  });

  it("rejects skips and terminal reopen", () => {
    expect(() =>
      assertCashReleaseTransition("draft", "disbursed")
    ).toThrow(BadRequestError);
    expect(() =>
      assertCashReleaseTransition("draft", "approved")
    ).toThrow(BadRequestError);
    expect(() =>
      assertCashReleaseTransition("pending_approval", "disbursed")
    ).toThrow(BadRequestError);
    expect(() =>
      assertCashReleaseTransition("disbursed", "approved")
    ).toThrow(BadRequestError);
    expect(() =>
      assertCashReleaseTransition("completed", "disbursed")
    ).toThrow(BadRequestError);
  });

  it("tells operators that completed is receipt-driven", () => {
    expect(() =>
      assertCashReleaseTransition("disbursed", "completed")
    ).toThrow(/receipt is uploaded/i);
  });
});
