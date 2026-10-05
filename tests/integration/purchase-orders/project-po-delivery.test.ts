import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { consumables, stockMovements } from "@/server/db/schema";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { ProjectService } from "@/server/modules/projects/project.service";
import { ProjectExpenseService } from "@/server/modules/projects/project-expense.service";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import {
  seedCoreFixtures,
  testPoPurpose,
  type TestFixtures,
} from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("purchase orders / project delivery intake", () => {
  const pos = new PurchaseLotService();
  const projects = new ProjectService();
  const expenses = new ProjectExpenseService();
  const consumableSvc = new ConsumableService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("delivers a project materials PO: restock+issue, expense line, net stock flat", async () => {
    const project = await projects.create(
      {
        name: "Gym Renovation",
        description: "Project PO intake regression",
        status: "active",
      },
      fx.actor
    );
    const purpose = testPoPurpose(fx.departmentName);

    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-20",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        projectId: project.id,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            name: "Project Rebar Bundle",
            category: fx.consumableCategory,
            classification: "material",
            unit: "bundle",
            location: "Yard",
            quantity: 4,
            unitCost: 1800,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.status).toBe("pending_approval");
    expect(lot.projectId).toBe(project.id);
    expect(lot.itemType).toBe("consumable");
    expect(lot.quantity).toBe(4);
    expect(lot.consumableId).toBeFalsy();

    const delivered = await pos.updatePOStatus(
      lot.id,
      { status: "delivered" },
      fx.actor
    );
    expect(delivered.status).toBe("delivered");
    expect(delivered.projectId).toBe(project.id);
    expect(delivered.consumableId).toBeTruthy();
    expect(delivered.quantityRemaining).toBe(0);

    const item = await consumableSvc.getById(
      delivered.consumableId!,
      fx.actor.tenantId
    );
    expect(item.name).toBe("Project Rebar Bundle");
    expect(item.classification).toBe("material");
    expect(item.unit).toBe("bundle");
    // Dual credit: intake then auto-issue → on-hand unchanged for a new item.
    expect(item.currentQty).toBe(0);

    const db = getDb();
    const moves = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    const restock = moves.find(
      (m) => m.direction === "in" && m.reason === "restock"
    );
    const issue = moves.find(
      (m) => m.direction === "out" && m.reason === "issue"
    );
    expect(restock).toBeTruthy();
    expect(restock!.qty).toBe(4);
    expect(issue).toBeTruthy();
    expect(issue!.qty).toBe(4);
    expect(issue!.projectId).toBe(project.id);
    expect(issue!.notes).toMatch(/Direct project delivery|Gym Renovation|PO/i);

    const lines = await expenses.listForProject(project.id, fx.actor.tenantId);
    const auto = lines.find(
      (l) =>
        l.lineType === "consumable" &&
        l.consumableId === item.id &&
        (l.notes ?? "").toLowerCase().includes("auto-credited")
    );
    expect(auto).toBeTruthy();
    expect(Number(auto!.quantity)).toBe(4);
    expect(Number(auto!.amount)).toBe(7200);
    expect(auto!.description).toMatch(/Project Rebar Bundle/);
    expect(auto!.description).toMatch(/PO:/);
    expect(auto!.consumableName).toBe("Project Rebar Bundle");
    expect(auto!.consumableCode).toBeTruthy();
  });

  it("delivers a project PO against an existing material and leaves warehouse qty unchanged", async () => {
    const project = await projects.create(
      { name: "Library Fit-out", status: "active" },
      fx.actor
    );
    const existing = await consumableSvc.create(
      {
        name: "Paint Gallons",
        category: fx.consumableCategory,
        classification: "material",
        unit: "gal",
        currentQty: 6,
        unitCost: 500,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );
    const purpose = testPoPurpose(fx.departmentName);

    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-21",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        projectId: project.id,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            consumableId: existing.id,
            name: existing.name,
            category: fx.consumableCategory,
            classification: "material",
            unit: "gal",
            quantity: 2,
            unitCost: 500,
            purpose,
          },
        ],
      },
      fx.actor
    );

    await pos.updatePOStatus(lot.id, { status: "delivered" }, fx.actor);

    const after = await consumableSvc.getById(existing.id, fx.actor.tenantId);
    expect(after.currentQty).toBe(6);

    const moves = await getDb()
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.consumableId, existing.id),
          eq(stockMovements.reason, "issue")
        )
      );
    expect(moves.some((m) => m.projectId === project.id && m.qty === 2)).toBe(
      true
    );

    const [row] = await getDb()
      .select()
      .from(consumables)
      .where(eq(consumables.id, existing.id));
    expect(row.classification).toBe("material");

    const lines = await expenses.listForProject(project.id, fx.actor.tenantId);
    const auto = lines.find(
      (l) =>
        l.lineType === "consumable" &&
        l.consumableId === existing.id &&
        (l.notes ?? "").toLowerCase().includes("auto-credited")
    );
    expect(auto).toBeTruthy();
    expect(Number(auto!.quantity)).toBe(2);
    expect(auto!.consumableName).toBe("Paint Gallons");
  });
});
