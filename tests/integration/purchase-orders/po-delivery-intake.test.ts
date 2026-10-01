import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { assets, consumables, purchaseLots, stockMovements } from "@/server/db/schema";
import { AssetService } from "@/server/modules/assets/asset.service";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { resolvePoMintedAssets } from "@/server/modules/purchase-lots/purchase-lot-delete-impact";
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
  const assetSvc = new AssetService();
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

  it("delivers a warehouse material PO into materials inventory with stock movement", async () => {
    const purpose = testPoPurpose(fx.departmentName);
    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-04",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            isNewItem: true,
            name: "PO Cement Bags",
            category: fx.consumableCategory,
            classification: "material",
            unit: "bag",
            location: "Materials Yard",
            quantity: 12,
            unitCost: 310,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.classification).toBe("material");
    expect(lot.unit).toBe("bag");
    expect(lot.consumableId).toBeFalsy();

    const delivered = await pos.updatePOStatus(
      lot.id,
      { status: "delivered" },
      fx.actor
    );
    expect(delivered.status).toBe("delivered");
    expect(delivered.consumableId).toBeTruthy();
    expect(delivered.quantityRemaining).toBe(12);
    expect(delivered.unit).toBe("bag");
    expect(delivered.classification).toBe("material");

    const db = getDb();
    const [item] = await db
      .select()
      .from(consumables)
      .where(eq(consumables.id, delivered.consumableId!));
    expect(item).toBeTruthy();
    expect(item.name).toBe("PO Cement Bags");
    expect(item.classification).toBe("material");
    expect(item.unit).toBe("bag");
    expect(item.currentQty).toBe(12);

    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    const restock = movements.find(
      (m) => m.direction === "in" && m.reason === "restock"
    );
    expect(restock).toBeTruthy();
    expect(restock!.qty).toBe(12);
  });

  it("intakes actual received quantity for a supply PO (partial delivery)", async () => {
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
            name: "PO Partial Toner",
            category: fx.consumableCategory,
            classification: "supply",
            unit: "cart",
            location: "Store Room",
            quantity: 10,
            unitCost: 900,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.quantity).toBe(10);

    const delivered = await pos.updatePOStatus(
      lot.id,
      { status: "delivered", receivedQuantity: 7 },
      fx.actor
    );
    expect(delivered.status).toBe("delivered");
    expect(delivered.quantity).toBe(7);
    expect(delivered.quantityRemaining).toBe(7);
    expect(delivered.orderedQuantity).toBe(10);
    expect(delivered.receivedQuantity).toBe(7);
    expect(delivered.unit).toBe("cart");

    const db = getDb();
    const [item] = await db
      .select()
      .from(consumables)
      .where(eq(consumables.id, delivered.consumableId!));
    expect(item.currentQty).toBe(7);
    expect(item.unit).toBe("cart");

    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    const restock = movements.find(
      (m) => m.direction === "in" && m.reason === "restock"
    );
    expect(restock).toBeTruthy();
    expect(restock!.qty).toBe(7);
    expect(restock!.notes).toMatch(/received 7 of 10/i);
  });

  it("intakes actual received quantity for an asset PO and keeps free-text UoM", async () => {
    const purpose = testPoPurpose(fx.departmentName);
    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-06",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "asset",
            name: "PO Conference Table Set",
            category: fx.assetCategory,
            classification: fx.assetClassification,
            assignmentType: "borrowable",
            location: "Depot",
            unit: "set",
            quantity: 4,
            unitCost: 22000,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.unit).toBe("set");
    expect(lot.quantity).toBe(4);

    const delivered = await pos.updatePOStatus(
      lot.id,
      { status: "delivered", receivedQuantity: 2 },
      fx.actor
    );
    expect(delivered.status).toBe("delivered");
    expect(delivered.quantity).toBe(2);
    expect(delivered.quantityRemaining).toBe(2);
    expect(delivered.orderedQuantity).toBe(4);
    expect(delivered.receivedQuantity).toBe(2);
    expect(delivered.unit).toBe("set");
    expect(delivered.assetId).toBeTruthy();

    const db = getDb();
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.tenantId, fx.actor.tenantId));
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.name).toBe("PO Conference Table Set");
      expect(row.unit).toBe("set");
      expect(row.status).toBe("active");
    }

    const listed = await pos.list({}, fx.actor.tenantId);
    const found = listed.find((row) => row.id === lot.id);
    expect(found?.unit).toBe("set");
    expect(found?.receivedQuantity).toBe(2);
    expect(found?.orderedQuantity).toBe(4);
  });

  it("keeps a pre-existing catalog asset when delivering a PO for more of the same item", async () => {
    // Regression: existing IE-001 / "10126" must not disappear when a PO for
    // qty 2 of the same product is marked delivered — mint 2 NEW units instead.
    const existing = await assetSvc.createAsset(
      {
        name: "10126",
        category: fx.assetCategory,
        classification: fx.assetClassification,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );
    expect(existing.assetCode).toMatch(/^CP-\d{3}$/);
    const existingCode = existing.assetCode;
    const existingId = existing.id;

    const purpose = testPoPurpose(fx.departmentName);
    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-07",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "asset",
            assetId: existing.id,
            name: existing.name,
            category: fx.assetCategory,
            classification: fx.assetClassification,
            assignmentType: "borrowable",
            location: "Depot",
            quantity: 2,
            unitCost: 1500,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.assetId).toBe(existing.id);
    expect(lot.status).toBe("pending_approval");

    const delivered = await pos.updatePOStatus(
      lot.id,
      { status: "delivered" },
      fx.actor
    );
    expect(delivered.status).toBe("delivered");
    expect(delivered.quantity).toBe(2);
    // Lot should link to a newly minted unit, not the pre-existing catalog row.
    expect(delivered.assetId).toBeTruthy();
    expect(delivered.assetId).not.toBe(existingId);

    const db = getDb();
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.tenantId, fx.actor.tenantId));
    expect(rows).toHaveLength(3);

    const kept = rows.find((r) => r.id === existingId);
    expect(kept).toBeTruthy();
    expect(kept!.assetCode).toBe(existingCode);
    expect(kept!.name).toBe("10126");
    expect(kept!.status).toBe("active");
    // Original must not carry the PO acquisition marker (not minted by this PO).
    expect(kept!.notes ?? "").not.toMatch(/Acquired via PO/i);

    const minted = rows.filter((r) => r.id !== existingId);
    expect(minted).toHaveLength(2);
    for (const row of minted) {
      expect(row.name).toBe("10126");
      expect(row.status).toBe("active");
      expect(row.notes ?? "").toMatch(/Acquired via PO/i);
      expect(row.assetCode).not.toBe(existingCode);
    }

    const [lotRow] = await db
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.id, lot.id));
    const mintedResolved = await resolvePoMintedAssets(
      lotRow,
      delivered.poNumber
    );
    expect(mintedResolved.map((u) => u.id).sort()).toEqual(
      minted.map((r) => r.id).sort()
    );
    expect(mintedResolved.some((u) => u.id === existingId)).toBe(false);

    // Deleting the PO must reverse only minted units — never the original catalog asset.
    await pos.deleteByPoNumberWithRevert(delivered.poNumber, fx.actor);
    const afterDelete = await db
      .select()
      .from(assets)
      .where(eq(assets.tenantId, fx.actor.tenantId));
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].id).toBe(existingId);
    expect(afterDelete[0].assetCode).toBe(existingCode);
  });

  it("mints additional units when a new-item asset PO name already exists (never deletes the original)", async () => {
    const existing = await assetSvc.createAsset(
      {
        name: "10126 Dup Name",
        category: fx.assetCategory,
        classification: fx.assetClassification,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );
    const existingId = existing.id;
    const existingCode = existing.assetCode;

    const purpose = testPoPurpose(fx.departmentName);
    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-08",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "asset",
            isNewItem: true,
            name: "10126 Dup Name",
            category: fx.assetCategory,
            classification: fx.assetClassification,
            assignmentType: "borrowable",
            location: "Depot",
            quantity: 2,
            unitCost: 1800,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.assetId).toBeFalsy();

    const delivered = await pos.updatePOStatus(
      lot.id,
      { status: "delivered" },
      fx.actor
    );
    expect(delivered.status).toBe("delivered");
    expect(delivered.assetId).not.toBe(existingId);

    const db = getDb();
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.tenantId, fx.actor.tenantId));
    expect(rows).toHaveLength(3);

    const kept = rows.find((r) => r.id === existingId);
    expect(kept).toBeTruthy();
    expect(kept!.assetCode).toBe(existingCode);
    expect(kept!.notes ?? "").not.toMatch(/Acquired via PO/i);

    const minted = rows.filter((r) => r.id !== existingId);
    expect(minted).toHaveLength(2);
    for (const row of minted) {
      expect(row.name).toBe("10126 Dup Name");
      expect(row.notes ?? "").toMatch(/Acquired via PO/i);
    }
  });
});
