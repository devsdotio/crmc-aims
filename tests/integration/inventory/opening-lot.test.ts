import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { purchaseLots, stockMovements } from "@/server/db/schema";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { StockMovementService } from "@/server/modules/stock-movements/stock-movement.service";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

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
    expect(item.currentQty).toBe(0);

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

    const db = getDb();
    const lots = await db
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.consumableId, item.id));
    expect(lots).toHaveLength(1);
    expect(lots[0].quantity).toBe(10);
    expect(lots[0].reference?.toLowerCase() ?? "").toMatch(/initial|opening/i);

    const ledger = await movements.listByConsumable(item.id, fx.actor.tenantId);
    expect(ledger.some((m) => m.direction === "in" && m.reason === "restock")).toBe(
      true
    );

    const rawMoves = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    expect(rawMoves.length).toBeGreaterThanOrEqual(1);
  });
});
