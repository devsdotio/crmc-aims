import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { stockMovements } from "@/server/db/schema";
import { ProjectService } from "@/server/modules/projects/project.service";
import { ProjectProgressService } from "@/server/modules/projects/project-progress.service";
import { ProjectExpenseService } from "@/server/modules/projects/project-expense.service";
import { ProjectAssetService } from "@/server/modules/projects/project-asset.service";
import { AssetService } from "@/server/modules/assets/asset.service";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { VoucherService } from "@/server/modules/vouchers/voucher.service";
import { PettyCashService } from "@/server/modules/petty-cash/petty-cash.service";
import { hasTestDatabase } from "../../setup/env";
import { resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

const PRJ_CODE = /^PRJ-\d{4}-[A-F0-9]{8}$/i;
const DR_CODE = /^DRR\d{4}-\d{6}$/;
const PCV_CODE = /^PCV\d{4}-\d{6}$/;

describeIntegration("vouchers / petty cash", () => {
  const vouchers = new VoucherService();
  const pettyCash = new PettyCashService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("creates, updates, lists, and deletes a legacy voucher and PCV", async () => {
    const voucher = await vouchers.create(
      {
        voucherDate: "2026-09-12",
        payeeName: "Vendor X",
        amount: 2500,
        departmentId: fx.departmentId,
        particulars: "Office chairs",
      },
      fx.actor
    );
    expect(voucher.payeeName).toBe("Vendor X");
    expect(voucher.amount).toBe("2500.00");
    expect(voucher.status).toBe("draft");
    expect(voucher.type).toBe("disbursement");
    expect(voucher.voucherDate).toBe("2026-09-12");
    expect(voucher.particulars).toBe("Office chairs");
    expect(voucher.voucherCode).toMatch(DR_CODE);
    expect(voucher.departmentId).toBe(fx.departmentId);

    const updatedV = await vouchers.update(
      voucher.id,
      { payeeName: "Vendor X Updated" },
      fx.actor
    );
    expect(updatedV.payeeName).toBe("Vendor X Updated");
    expect(updatedV.voucherCode).toBe(voucher.voucherCode);

    const vList = await vouchers.list({}, fx.actor.tenantId);
    expect(vList.vouchers.some((v) => v.id === voucher.id)).toBe(true);
    expect(vList.total).toBeGreaterThanOrEqual(1);

    await vouchers.delete(voucher.id, fx.actor);
    const afterDelete = await vouchers.list({}, fx.actor.tenantId);
    expect(afterDelete.vouchers.some((v) => v.id === voucher.id)).toBe(false);

    const pcv = await pettyCash.create(
      {
        voucherDate: "2026-09-12",
        payeeName: "Staff Runner",
        amount: 350,
        departmentId: fx.departmentId,
        category: "supplies",
      },
      fx.actor
    );
    expect(pcv.amount).toBe("350.00");
    expect(pcv.status).toBe("draft");
    expect(pcv.category).toBe("supplies");
    expect(pcv.payeeName).toBe("Staff Runner");
    expect(pcv.pcvNumber).toMatch(PCV_CODE);
    expect(pcv.departmentId).toBe(fx.departmentId);

    const pcvList = await pettyCash.list({}, fx.actor.tenantId);
    expect(pcvList.vouchers.some((p) => p.id === pcv.id)).toBe(true);

    await pettyCash.delete(pcv.id, fx.actor);
    const pcvAfter = await pettyCash.list({}, fx.actor.tenantId);
    expect(pcvAfter.vouchers.some((p) => p.id === pcv.id)).toBe(false);
  });
});

describeIntegration("projects milestones / materials / assets", () => {
  const projects = new ProjectService();
  const progress = new ProjectProgressService();
  const expenses = new ProjectExpenseService();
  const projectAssets = new ProjectAssetService();
  const assets = new AssetService();
  const consumables = new ConsumableService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("CRUD project + milestone; inventory material refunds on remove; asset assign/return", async () => {
    const project = await projects.create(
      {
        name: "Campus Outreach",
        description: "Regression project",
        status: "active",
      },
      fx.actor
    );
    expect(project.name).toBe("Campus Outreach");
    expect(project.status).toBe("active");
    expect(project.description).toBe("Regression project");
    expect(project.projectCode).toMatch(PRJ_CODE);

    const milestone = await progress.createIndicator(
      project.id,
      { title: "Phase 1 kickoff" },
      fx.actor
    );
    expect(milestone.title).toBe("Phase 1 kickoff");
    expect(milestone.projectId).toBe(project.id);
    expect(milestone.isCompleted).toBe(false);

    const completed = await progress.updateIndicator(
      project.id,
      milestone.id,
      { isCompleted: true },
      fx.actor
    );
    expect(completed.isCompleted).toBe(true);
    expect(completed.completedByName).toBe(fx.actor.displayName);

    await progress.deleteIndicator(project.id, milestone.id, fx.actor);

    const manual = await expenses.createBatchManualMaterials(
      project.id,
      {
        items: [
          { materialName: "Cement bags", quantity: 5, unitCost: 250 },
        ],
      },
      fx.actor
    );
    expect(manual).toHaveLength(1);
    expect(manual[0].description).toBe("Cement bags");
    expect(manual[0].lineType).toBe("material");
    expect(Number(manual[0].quantity)).toBe(5);
    expect(Number(manual[0].amount)).toBe(1250);

    const item = await consumables.create(
      {
        name: "Paint Cans",
        category: fx.consumableCategory,
        classification: "material",
        unit: "can",
        currentQty: 10,
        unitCost: 400,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );

    const charged = await expenses.useConsumable(
      project.id,
      { consumableId: item.id, quantity: 3 },
      fx.actor
    );
    expect(charged.lineType).toBe("consumable");
    expect(charged.consumableId).toBe(item.id);
    expect(Number(charged.quantity)).toBe(3);

    let stock = await consumables.getById(item.id, fx.actor.tenantId);
    expect(stock.currentQty).toBe(7);

    const afterCharge = await getDb()
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    expect(
      afterCharge.some((m) => m.direction === "out" && m.reason === "issue")
    ).toBe(true);

    await expenses.delete(project.id, charged.id, fx.actor);
    stock = await consumables.getById(item.id, fx.actor.tenantId);
    expect(stock.currentQty).toBe(10);

    const refundMoves = await getDb()
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    const refund = refundMoves.find(
      (m) =>
        m.direction === "in" &&
        m.reason === "restock" &&
        m.qty === 3 &&
        (m.notes ?? "").toLowerCase().includes("project")
    );
    expect(refund).toBeTruthy();
    expect(refund!.qty).toBe(3);

    const asset = await assets.createAsset(
      {
        name: "Project Camera",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "assignable",
      },
      fx.actor
    );

    const assignment = await projectAssets.assign(
      project.id,
      { assetId: asset.id },
      fx.actor
    );
    expect(assignment.status).toBe("assigned");
    expect(assignment.projectId).toBe(project.id);
    expect(assignment.assetId).toBe(asset.id);
    expect(assignment.assetCode).toBe(asset.assetCode);
    expect(assignment.assignedByName).toBe(fx.actor.displayName);

    const held = await assets.getAssetById(asset.id, fx.actor.tenantId);
    expect(held.currentHolder).toBeTruthy();
    expect(held.currentHolder).toMatch(/Campus Outreach|PRJ-/i);

    const returned = await projectAssets.returnAsset(
      project.id,
      assignment.id,
      {},
      fx.actor
    );
    expect(returned.status).toBe("returned");
    expect(returned.returnedAt).toBeTruthy();
    expect(returned.returnedByName).toBe(fx.actor.displayName);

    const freed = await assets.getAssetById(asset.id, fx.actor.tenantId);
    expect(freed.currentHolder).toBeFalsy();

    const updated = await projects.update(
      project.id,
      { status: "completed" },
      fx.actor.tenantId
    );
    expect(updated.status).toBe("completed");
  });
});
