import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { assets, consumables, purchaseLots, stockMovements } from "@/server/db/schema";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import {
  seedCoreFixtures,
  testPoPurpose,
  type TestFixtures,
} from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("purchase orders / delivery intake (integration)", () => {
  const pos = new PurchaseLotService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("delivers a new asset PO into the assets registry with unique codes", async () => {
    const purpose = testPoPurpose(fx.departmentName);
    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-01",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "asset",
            name: "PO Projector Unit",
            category: fx.assetCategory,
            assignmentType: "borrowable",
            location: "Depot",
            quantity: 2,
            unitCost: 15000,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.status).toBe("pending_approval");
    expect(lot.assetId).toBeFalsy();

    const delivered = await pos.updatePOStatus(
      lot.id,
      { status: "delivered" },
      fx.actor
    );
    expect(delivered.status).toBe("delivered");

    const db = getDb();
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.tenantId, fx.actor.tenantId));
    expect(rows).toHaveLength(2);
    const codes = rows.map((r) => r.assetCode);
    expect(new Set(codes).size).toBe(2);
    expect(codes.every((c) => c.startsWith("CP-"))).toBe(true);
  });

  it("delivers a new supply PO into consumables with stock movement", async () => {
    const purpose = testPoPurpose(fx.departmentName);
    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-02",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            name: "PO Bond Paper Ream",
            category: fx.consumableCategory,
            classification: "supply",
            unit: "ream",
            location: "Store Room",
            quantity: 5,
            unitCost: 250,
            purpose,
          },
        ],
      },
      fx.actor
    );

    await pos.updatePOStatus(lot.id, { status: "delivered" }, fx.actor);

    const db = getDb();
    const [item] = await db
      .select()
      .from(consumables)
      .where(eq(consumables.tenantId, fx.actor.tenantId));
    expect(item).toBeTruthy();
    expect(item.currentQty).toBe(5);
    expect(item.classification).toBe("supply");

    const lots = await db
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.tenantId, fx.actor.tenantId));
    expect(lots).toHaveLength(1);
    expect(lots[0].consumableId).toBe(item.id);

    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    expect(movements.some((m) => m.direction === "in" && m.reason === "restock")).toBe(
      true
    );
  });
});
