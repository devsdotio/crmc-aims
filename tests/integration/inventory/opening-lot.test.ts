import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { purchaseLots, stockMovements } from "@/server/db/schema";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { StockMovementService } from "@/server/modules/stock-movements/stock-movement.service";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

const CON_CODE = /^CON-\d{4}-[A-F0-9]{8}$/i;
const LOT_CODE = /^LOT-\d{4}-[A-F0-9]{8}$/i;

describeIntegration("inventory / opening lot (integration)", () => {
  const consumables = new ConsumableService();
  const movements = new StockMovementService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("creates a consumable with zero qty and no opening lot", async () => {
    const item = await consumables.create(
      {
        name: "Empty Toner",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "pcs",
        currentQty: 0,
        location: "Store",
      },
      fx.actor
    );
    expect(item.name).toBe("Empty Toner");
    expect(item.category).toBe(fx.consumableCategory);
    expect(item.classification).toBe("supply");
    expect(item.unit).toBe("pcs");
    expect(item.currentQty).toBe(0);
    expect(item.itemCode).toMatch(CON_CODE);
    expect(item.location).toBe("Store");

    const db = getDb();
    const lots = await db
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.consumableId, item.id));
    expect(lots).toHaveLength(0);

    const ledger = await movements.listByConsumable(item.id, fx.actor.tenantId);
    expect(ledger).toHaveLength(0);
  });

  it("registers an opening purchase lot and ledger line when qty > 0", async () => {
    const item = await consumables.create(
      {
        name: "Starter Pens",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "box",
        currentQty: 10,
        unitCost: 45,
        supplierId: fx.supplierId,
        supplier: fx.supplierName,
        location: "Store",
      },
      fx.actor
    );
    expect(item.currentQty).toBe(10);
    expect(item.itemCode).toMatch(CON_CODE);
    expect(item.classification).toBe("supply");
    expect(item.unit).toBe("box");
    expect(item.supplier).toBe(fx.supplierName);

    const db = getDb();
    const lots = await db
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.consumableId, item.id));
    expect(lots).toHaveLength(1);
    expect(lots[0].lotCode).toMatch(LOT_CODE);
    expect(lots[0].itemType).toBe("consumable");
    expect(lots[0].itemCode).toBe(item.itemCode);
    expect(lots[0].itemName).toBe("Starter Pens");
    expect(lots[0].quantity).toBe(10);
    expect(lots[0].quantityRemaining).toBe(10);
    expect(Number(lots[0].unitCost)).toBe(45);
    expect(lots[0].reference).toBe("Initial stock");
    expect(lots[0].supplierId).toBe(fx.supplierId);

    const ledger = await movements.listByConsumable(item.id, fx.actor.tenantId);
    const opening = ledger.find(
      (m) => m.direction === "in" && m.reason === "restock"
    );
    expect(opening).toBeTruthy();
    expect(opening!.qty).toBe(10);
    expect(opening!.consumableId).toBe(item.id);
    expect(opening!.lotCode).toBe(lots[0].lotCode);

    const rawMoves = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    expect(rawMoves).toHaveLength(1);
  });
});
