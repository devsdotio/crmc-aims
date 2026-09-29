import { beforeEach, describe, expect, it } from "vitest";

import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import {
  seedCoreFixtures,
  testPoPurpose,
  type TestFixtures,
} from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("audit injection (integration)", () => {
  const pos = new PurchaseLotService();
  const audit = new AuditLogService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("injects actor/entity/action/notes when a PO is created and delivered", async () => {
    const purpose = testPoPurpose(fx.departmentName);
    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-05",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            name: "Audit Toner Cartridge",
            category: fx.consumableCategory,
            classification: "supply",
            unit: "pcs",
            location: "Store",
            quantity: 2,
            unitCost: 900,
            purpose,
          },
        ],
      },
      fx.actor
    );

    await pos.updatePOStatus(lot.id, { status: "delivered" }, fx.actor);

    const createdLogs = await audit.list(
      {
        entityType: AUDIT_ENTITY.purchaseOrder,
        action: "purchase_order_created",
      },
      fx.actor
    );
    expect(createdLogs.length).toBeGreaterThanOrEqual(1);
    const created = createdLogs[0];
    expect(created.actorUserId).toBe(fx.actor.userId);
    expect(created.actorName).toBe(fx.actor.displayName);
    expect(created.entityType).toBe(AUDIT_ENTITY.purchaseOrder);
    expect(created.notes).toBeTruthy();
    expect(created.timestamp).toBeTruthy();

    const deliveredLogs = await audit.list(
      {
        entityType: AUDIT_ENTITY.purchaseOrder,
        action: "purchase_order_delivered",
      },
      fx.actor
    );
    expect(deliveredLogs.length).toBeGreaterThanOrEqual(1);
    expect(deliveredLogs[0].actorUserId).toBe(fx.actor.userId);
  });
});
