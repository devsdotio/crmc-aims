import { beforeEach, describe, expect, it } from "vitest";

import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { VoucherService } from "@/server/modules/vouchers/voucher.service";
import { PettyCashService } from "@/server/modules/petty-cash/petty-cash.service";
import { ConflictError } from "@/server/shared/errors";
import {
  particularsFromPurchaseOrderLines,
  serializeParticulars,
} from "@/lib/voucher-particulars";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import {
  seedCoreFixtures,
  testPoPurpose,
  type TestFixtures,
} from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("disbursements / PO-linked voucher + PCV", () => {
  const pos = new PurchaseLotService();
  const vouchers = new VoucherService();
  const pettyCash = new PettyCashService();
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
            name: "Linked Toner Cartons",
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

  it("links a disbursement voucher to a PO and blocks a second claim on the same PO", async () => {
    const lot = await createOpenSupplyPo();
    expect(lot.poNumber).toBeTruthy();
    expect(lot.unit).toBe("carton");

    const listed = await pos.list({}, fx.actor.tenantId);
    const found = listed.find((row) => row.id === lot.id);
    expect(found?.unit).toBe("carton");

    // Same mapping the create-voucher / create-PCV dialogs use when a PO is selected.
    const particulars = particularsFromPurchaseOrderLines([found ?? lot]);
    expect(particulars[0].unitOfMeasure).toBe("carton");
    expect(particulars[0].unitOfMeasure).not.toBe("pcs");

    const voucher = await vouchers.create(
      {
        voucherDate: "2026-09-22",
        payeeName: fx.supplierName,
        amount: 3000,
        departmentId: fx.departmentId,
        purchaseOrderNumber: lot.poNumber,
        supplierId: fx.supplierId,
        supplierName: fx.supplierName,
        particulars: serializeParticulars(particulars),
        purpose: testPoPurpose(fx.departmentName),
      },
      fx.actor
    );

    expect(voucher.purchaseOrderNumber).toBe(lot.poNumber);
    expect(voucher.payeeName).toBe(fx.supplierName);
    expect(voucher.amount).toBe("3000.00");
    expect(voucher.departmentId).toBe(fx.departmentId);
    expect(voucher.status).toBe("draft");
    expect(voucher.particulars).toContain("carton");
    expect(voucher.particulars).not.toMatch(/"unitOfMeasure"\s*:\s*"pcs"/);

    await expect(
      vouchers.create(
        {
          voucherDate: "2026-09-22",
          payeeName: "Duplicate Claimant",
          amount: 100,
          departmentId: fx.departmentId,
          purchaseOrderNumber: lot.poNumber,
        },
        fx.actor
      )
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(
      pettyCash.create(
        {
          voucherDate: "2026-09-22",
          payeeName: "PCV Duplicate",
          amount: 100,
          departmentId: fx.departmentId,
          purchaseOrderNumber: lot.poNumber,
          category: "supplies",
        },
        fx.actor
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("links a petty cash voucher to a PO and blocks a second voucher claim", async () => {
    const lot = await createOpenSupplyPo();

    const pcv = await pettyCash.create(
      {
        voucherDate: "2026-09-23",
        payeeName: "Cash Runner",
        amount: 500,
        departmentId: fx.departmentId,
        purchaseOrderNumber: lot.poNumber,
        category: "supplies",
        particulars: `PO ${lot.poNumber} petty cash advance`,
        purpose: testPoPurpose(fx.departmentName),
      },
      fx.actor
    );

    expect(pcv.purchaseOrderNumber).toBe(lot.poNumber);
    expect(pcv.amount).toBe("500.00");
    expect(pcv.category).toBe("supplies");
    expect(pcv.status).toBe("draft");

    await expect(
      vouchers.create(
        {
          voucherDate: "2026-09-23",
          payeeName: "Should Fail",
          amount: 50,
          departmentId: fx.departmentId,
          purchaseOrderNumber: lot.poNumber,
        },
        fx.actor
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
