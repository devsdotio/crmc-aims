import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  projectExpenseLines,
  type ProjectExpenseMetadata,
} from "@/server/db/schema";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { ProjectService } from "@/server/modules/projects/project.service";
import { ProjectExpenseService } from "@/server/modules/projects/project-expense.service";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { StockMovementService } from "@/server/modules/stock-movements/stock-movement.service";
import { isVoidedNotes } from "@/server/modules/stock-movements/stock-movement.repository";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import {
  seedCoreFixtures,
  testPoPurpose,
  type TestFixtures,
} from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("PO lot release → department / project (integration)", () => {
  const consumables = new ConsumableService();
  const lots = new PurchaseLotService();
  const movements = new StockMovementService();
  const projects = new ProjectService();
  const expenses = new ProjectExpenseService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  async function deliverTwoLotsForItem() {
    const purpose = testPoPurpose(fx.departmentName);
    const created = await lots.createPurchaseOrder(
      {
        poDate: "2026-10-01",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            isNewItem: true,
            name: "Lot Release Paper",
            category: fx.consumableCategory,
            classification: "supply",
            unit: "ream",
            location: "Store",
            quantity: 10,
            unitCost: 100,
            purpose,
          },
        ],
      },
      fx.actor
    );
    const draftA = created[0];
    const deliveredA = await lots.updatePOStatus(
      draftA.id,
      { status: "delivered" },
      fx.actor
    );
    expect(deliveredA.consumableId).toBeTruthy();

    const second = await lots.createPurchaseOrder(
      {
        poDate: "2026-10-02",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            consumableId: deliveredA.consumableId!,
            name: "Lot Release Paper",
            category: fx.consumableCategory,
            classification: "supply",
            unit: "ream",
            location: "Store",
            quantity: 6,
            unitCost: 120,
            purpose,
          },
        ],
      },
      fx.actor
    );
    const draftB = second[0];
    await lots.updatePOStatus(draftB.id, { status: "delivered" }, fx.actor);

    const refreshedA = await lots.getById(draftA.id, fx.actor.tenantId);
    const refreshedB = await lots.getById(draftB.id, fx.actor.tenantId);
    return { lotA: refreshedA, lotB: refreshedB };
  }

  it("releases from a specific PO lot to a department without touching sibling lots", async () => {
    const { lotA, lotB } = await deliverTwoLotsForItem();
    expect(lotA.consumableId).toBeTruthy();
    expect(lotA.quantityRemaining).toBe(10);
    expect(lotB.quantityRemaining).toBe(6);

    const result = await consumables.releaseFromLot(
      {
        lotId: lotA.id,
        code: lotA.lotCode,
        quantity: 4,
        departmentId: fx.departmentId,
        recipientName: "Front Desk",
        reason: "Walk-up issue from PO lot",
      },
      fx.actor
    );

    expect(result.allocation.lotId).toBe(lotA.id);
    expect(result.allocation.quantity).toBe(4);
    expect(result.consumable.currentQty).toBe(12); // 16 delivered - 4

    const afterA = await lots.getById(lotA.id, fx.actor.tenantId);
    const afterB = await lots.getById(lotB.id, fx.actor.tenantId);
    expect(afterA.quantityRemaining).toBe(6);
    expect(afterB.quantityRemaining).toBe(6);

    const ledger = await movements.listByConsumable(
      lotA.consumableId!,
      fx.actor.tenantId
    );
    const issueMove = ledger.find(
      (m) =>
        m.direction === "out" &&
        m.reason === "issue" &&
        m.purchaseLotId === lotA.id &&
        !isVoidedNotes(m.notes)
    );
    expect(issueMove).toBeTruthy();
    expect(issueMove!.departmentId).toBe(fx.departmentId);
    expect(issueMove!.projectId).toBeFalsy();
    expect(issueMove!.qty).toBe(4);
    expect(issueMove!.notes ?? "").toMatch(/Front Desk/);
  });

  it("releases from a specific PO lot to a project and writes a project expense", async () => {
    const { lotA, lotB } = await deliverTwoLotsForItem();
    const project = await projects.create(
      {
        name: "Lot Release Project",
        description: "Verify PO lot → project issuance",
        status: "active",
      },
      fx.actor
    );

    const result = await consumables.releaseFromLot(
      {
        lotId: lotB.id,
        quantity: 2,
        projectId: project.id,
        recipientName: "Site Lead",
        reason: "Material draw for outreach",
      },
      fx.actor
    );

    expect(result.allocation.lotId).toBe(lotB.id);
    expect(result.consumable.currentQty).toBe(14); // 16 - 2

    const afterA = await lots.getById(lotA.id, fx.actor.tenantId);
    const afterB = await lots.getById(lotB.id, fx.actor.tenantId);
    expect(afterA.quantityRemaining).toBe(10);
    expect(afterB.quantityRemaining).toBe(4);

    const ledger = await movements.listByConsumable(
      lotA.consumableId!,
      fx.actor.tenantId
    );
    const issueMove = ledger.find(
      (m) =>
        m.direction === "out" &&
        m.reason === "issue" &&
        m.purchaseLotId === lotB.id &&
        !isVoidedNotes(m.notes)
    );
    expect(issueMove).toBeTruthy();
    expect(issueMove!.projectId).toBe(project.id);
    expect(issueMove!.departmentId).toBeFalsy();

    const projectLines = await expenses.listForProject(
      project.id,
      fx.actor.tenantId
    );
    const expense = projectLines.find(
      (line) => line.consumableId === lotA.consumableId
    );
    expect(expense).toBeTruthy();
    expect(Number(expense!.quantity)).toBe(2);

    const [expenseRow] = await getDb()
      .select()
      .from(projectExpenseLines)
      .where(eq(projectExpenseLines.id, expense!.id));
    expect(expenseRow.tenantId).toBe(fx.actor.tenantId);
    expect(expenseRow.projectId).toBe(project.id);
    expect(expenseRow.lineType).toBe("consumable");
    const meta = (expenseRow.metadata ?? {}) as ProjectExpenseMetadata;
    expect(meta.lotAllocations?.[0]?.lotId).toBe(lotB.id);
    expect(meta.stockMovementId).toBe(issueMove!.id);
    expect(meta.purchaseLotId).toBe(lotB.id);
  });

  it("rejects release without a department or project destination", async () => {
    const { lotA } = await deliverTwoLotsForItem();
    await expect(
      consumables.releaseFromLot(
        {
          code: lotA.lotCode,
          quantity: 1,
        },
        fx.actor
      )
    ).rejects.toThrow(/department or project/i);
  });
});
