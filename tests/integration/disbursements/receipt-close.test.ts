import { beforeEach, describe, expect, it } from "vitest";

import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { VoucherService } from "@/server/modules/vouchers/voucher.service";
import { BadRequestError } from "@/server/shared/errors";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import {
  seedCoreFixtures,
  testPoPurpose,
  type TestFixtures,
} from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

const RECEIPT_URL = "https://example.test/receipts/po-toner.pdf";

describeIntegration("disbursements / receipt unlock + close", () => {
  const pos = new PurchaseLotService();
  const vouchers = new VoucherService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  async function createOpenSupplyPo() {
    const purpose = testPoPurpose(fx.departmentName);
    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-22",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            name: "Receipt Path Toner",
            category: fx.consumableCategory,
            classification: "supply",
            unit: "carton",
            location: "Store",
            quantity: 2,
            unitCost: 1500,
            purpose,
          },
        ],
      },
      fx.actor
    );
    return lot;
  }

  async function advanceToDisbursed(voucherId: string) {
    await vouchers.updateStatus(
      voucherId,
      { status: "pending_approval" },
      fx.actor
    );
    await vouchers.updateStatus(voucherId, { status: "approved" }, fx.actor);
    return vouchers.updateStatus(
      voucherId,
      { status: "disbursed" },
      fx.actor
    );
  }

  it("blocks receipt until the PO voucher is disbursed, then closes claim on upload", async () => {
    const lot = await createOpenSupplyPo();
    expect(lot.poNumber).toBeTruthy();
    expect(lot.receiptUrl).toBeFalsy();

    // No claim yet — receipt locked
    await expect(
      pos.updatePurchaseOrder(
        lot.id,
        { receiptUrl: RECEIPT_URL },
        fx.actor
      )
    ).rejects.toBeInstanceOf(BadRequestError);

    const voucher = await vouchers.create(
      {
        voucherDate: "2026-09-22",
        payeeName: fx.supplierName,
        amount: 3000,
        departmentId: fx.departmentId,
        purchaseOrderNumber: lot.poNumber,
        supplierId: fx.supplierId,
        supplierName: fx.supplierName,
        particulars: `PO ${lot.poNumber} — Receipt Path Toner × 2`,
        purpose: testPoPurpose(fx.departmentName),
      },
      fx.actor
    );
    expect(voucher.status).toBe("draft");

    // Draft claim still locks receipt
    await expect(
      pos.updatePurchaseOrder(
        lot.id,
        { receiptUrl: RECEIPT_URL },
        fx.actor
      )
    ).rejects.toBeInstanceOf(BadRequestError);

    await vouchers.updateStatus(
      voucher.id,
      { status: "pending_approval" },
      fx.actor
    );
    await vouchers.updateStatus(voucher.id, { status: "approved" }, fx.actor);

    // Approved but not disbursed — still locked
    await expect(
      pos.updatePurchaseOrder(
        lot.id,
        { receiptUrl: RECEIPT_URL },
        fx.actor
      )
    ).rejects.toBeInstanceOf(BadRequestError);

    const disbursed = await vouchers.updateStatus(
      voucher.id,
      { status: "disbursed" },
      fx.actor
    );
    // PO has no receipt yet → stays at disbursed awaiting receipt close
    expect(disbursed.status).toBe("disbursed");
    expect(disbursed.completedByName).toBe(fx.actor.displayName);

    // Cannot manually jump to completed
    await expect(
      vouchers.updateStatus(voucher.id, { status: "completed" }, fx.actor)
    ).rejects.toBeInstanceOf(BadRequestError);

    const withReceipt = await pos.updatePurchaseOrder(
      lot.id,
      { receiptUrl: RECEIPT_URL },
      fx.actor
    );
    expect(withReceipt.receiptUrl).toBe(RECEIPT_URL);

    const closed = await vouchers.getById(voucher.id, fx.actor.tenantId);
    expect(closed.status).toBe("completed");

    // Removing receipt reopens claim to disbursed
    const cleared = await pos.updatePurchaseOrder(
      lot.id,
      { receiptUrl: null },
      fx.actor
    );
    expect(cleared.receiptUrl).toBeFalsy();

    const reopened = await vouchers.getById(voucher.id, fx.actor.tenantId);
    expect(reopened.status).toBe("disbursed");
  });

  it("rejects illegal voucher status jumps on the cash-release FSM", async () => {
    const lot = await createOpenSupplyPo();
    const voucher = await vouchers.create(
      {
        voucherDate: "2026-09-23",
        payeeName: fx.supplierName,
        amount: 3000,
        departmentId: fx.departmentId,
        purchaseOrderNumber: lot.poNumber,
      },
      fx.actor
    );

    await expect(
      vouchers.updateStatus(voucher.id, { status: "disbursed" }, fx.actor)
    ).rejects.toBeInstanceOf(BadRequestError);

    await expect(
      vouchers.updateStatus(voucher.id, { status: "approved" }, fx.actor)
    ).rejects.toBeInstanceOf(BadRequestError);

    const pending = await vouchers.updateStatus(
      voucher.id,
      { status: "pending_approval" },
      fx.actor
    );
    expect(pending.status).toBe("pending_approval");

    await expect(
      vouchers.updateStatus(voucher.id, { status: "disbursed" }, fx.actor)
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("stays disbursed until receipt is filed, then closes to completed", async () => {
    const lot = await createOpenSupplyPo();

    const voucher = await vouchers.create(
      {
        voucherDate: "2026-09-24",
        payeeName: fx.supplierName,
        amount: 3000,
        departmentId: fx.departmentId,
        purchaseOrderNumber: lot.poNumber,
      },
      fx.actor
    );

    const disbursed = await advanceToDisbursed(voucher.id);
    expect(disbursed.status).toBe("disbursed");

    await pos.updatePurchaseOrder(
      lot.id,
      { receiptUrl: RECEIPT_URL },
      fx.actor
    );
    const closed = await vouchers.getById(voucher.id, fx.actor.tenantId);
    expect(closed.status).toBe("completed");
  });
});
