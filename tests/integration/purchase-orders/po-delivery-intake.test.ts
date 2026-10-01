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

const PO_OR_LOT = /^(PO|LOT)-\d{4}-[A-F0-9]{8}$/i;

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
    expect(lot.itemType).toBe("asset");
    expect(lot.itemName).toBe("PO Projector Unit");
    expect(lot.quantity).toBe(2);
    expect(lot.departmentId).toBe(fx.departmentId);
    expect(lot.supplierId).toBe(fx.supplierId);
    expect(lot.lotCode).toMatch(PO_OR_LOT);
    expect(lot.purpose).toBe(purpose);

    const delivered = await pos.updatePOStatus(
      lot.id,
      { status: "delivered" },
      fx.actor
    );
    expect(delivered.status).toBe("delivered");
    expect(delivered.quantity).toBe(2);

    const db = getDb();
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.tenantId, fx.actor.tenantId));
    expect(rows).toHaveLength(2);
    const codes = rows.map((r) => r.assetCode);
    expect(new Set(codes).size).toBe(2);
    for (const row of rows) {
      expect(row.assetCode).toMatch(/^CP-\d{3}$/);
      expect(row.name).toBe("PO Projector Unit");
      expect(row.category).toBe(fx.assetCategory);
      expect(row.classification).toBe(fx.assetClassification);
      expect(row.assignmentType).toBe("borrowable");
      expect(row.status).toBe("active");
      expect(row.location).toBe("Depot");
      expect(row.currentHolder).toBeNull();
    }
  });

  it("stores asset classification on undelivered draft PO lines", async () => {
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
            itemType: "asset",
            name: "PO Monitor Draft",
            category: fx.assetCategory,
            classification: fx.assetClassification,
            assignmentType: "borrowable",
            location: "Depot",
            quantity: 1,
            unitCost: 9000,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.itemType).toBe("asset");
    expect(lot.classification).toBe(fx.assetClassification);
    expect(lot.assetId).toBeFalsy();
  });

  it("files a new material PO with classification material (not supply)", async () => {
    const purpose = testPoPurpose(fx.departmentName);
    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-03",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            isNewItem: true,
            name: "PO Rebar Bundle",
            category: fx.consumableCategory,
            classification: "material",
            unit: "pcs",
            location: "Materials Yard",
            quantity: 8,
            unitCost: 420,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.itemType).toBe("consumable");
    expect(lot.consumableId).toBeFalsy();
    expect(lot.classification).toBe("material");
    expect(lot.unit).toBe("pcs");
    // Materials must not stick on supplier history / supplies-adjacent vendor lists.
    expect(lot.supplierId).toBeNull();

    const listed = await pos.list({}, fx.actor.tenantId);
    const found = listed.find((row) => row.id === lot.id);
    expect(found).toBeTruthy();
    expect(found?.classification).toBe("material");
    expect(found?.classification).not.toBe("supply");
    expect(found?.unit).toBe("pcs");
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

    expect(lot.itemType).toBe("consumable");
    expect(lot.itemName).toBe("PO Bond Paper Ream");
    expect(lot.quantity).toBe(5);
    expect(lot.status).toBe("pending_approval");
    expect(lot.consumableId).toBeFalsy();
    expect(lot.classification).toBe("supply");
    expect(lot.unit).toBe("ream");

    const delivered = await pos.updatePOStatus(
      lot.id,
      { status: "delivered" },
      fx.actor
    );
    expect(delivered.status).toBe("delivered");
    expect(delivered.consumableId).toBeTruthy();
    expect(delivered.quantityRemaining).toBe(5);

    const listedAfter = await pos.list({}, fx.actor.tenantId);
    const deliveredListed = listedAfter.find((row) => row.id === lot.id);
    expect(deliveredListed?.classification).toBe("supply");
    expect(deliveredListed?.unit).toBe("ream");

    const db = getDb();
    const [item] = await db
      .select()
      .from(consumables)
      .where(eq(consumables.tenantId, fx.actor.tenantId));
    expect(item).toBeTruthy();
    expect(item.id).toBe(delivered.consumableId);
    expect(item.name).toBe("PO Bond Paper Ream");
    expect(item.currentQty).toBe(5);
    expect(item.classification).toBe("supply");
    expect(item.unit).toBe("ream");
    expect(item.category).toBe(fx.consumableCategory);
    expect(item.location).toBe("Store Room");

    const lots = await db
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.tenantId, fx.actor.tenantId));
    expect(lots).toHaveLength(1);
    expect(lots[0].consumableId).toBe(item.id);
    expect(lots[0].quantity).toBe(5);
    expect(lots[0].quantityRemaining).toBe(5);
    expect(Number(lots[0].unitCost)).toBe(250);

    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    const restock = movements.find(
      (m) => m.direction === "in" && m.reason === "restock"
    );
    expect(restock).toBeTruthy();
    expect(restock!.qty).toBe(5);
  });
});
