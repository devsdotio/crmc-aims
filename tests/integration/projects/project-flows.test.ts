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

    const updatedV = await vouchers.update(
      voucher.id,
      { payeeName: "Vendor X Updated" },
      fx.actor
    );
    expect(updatedV.payeeName).toBe("Vendor X Updated");

    const vList = await vouchers.list({}, fx.actor.tenantId);
    expect(vList.vouchers.some((v) => v.id === voucher.id)).toBe(true);

    await vouchers.delete(voucher.id, fx.actor);

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
    expect(pcv.amount).toBeTruthy();

    const pcvList = await pettyCash.list({}, fx.actor.tenantId);
    expect(pcvList.vouchers.some((p) => p.id === pcv.id)).toBe(true);

    await pettyCash.delete(pcv.id, fx.actor);
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

    const milestone = await progress.createIndicator(
      project.id,
      { title: "Phase 1 kickoff" },
      fx.actor
    );
    expect(milestone.title).toBe("Phase 1 kickoff");

    await progress.updateIndicator(
      project.id,
      milestone.id,
      { isCompleted: true },
      fx.actor
    );
    await progress.deleteIndicator(project.id, milestone.id, fx.actor);

    await expenses.createBatchManualMaterials(
      project.id,
      {
        items: [
          { materialName: "Cement bags", quantity: 5, unitCost: 250 },
        ],
      },
      fx.actor
    );

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
    let stock = await consumables.getById(item.id, fx.actor.tenantId);
    expect(stock.currentQty).toBe(7);

    await expenses.delete(project.id, charged.id, fx.actor);
    stock = await consumables.getById(item.id, fx.actor.tenantId);
    expect(stock.currentQty).toBe(10);

    const refundMoves = await getDb()
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    expect(refundMoves.length).toBeGreaterThanOrEqual(2);

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
    const held = await assets.getAssetById(asset.id, fx.actor.tenantId);
    expect(held.currentHolder).toBeTruthy();

    await projectAssets.returnAsset(project.id, assignment.id, {}, fx.actor);
    const freed = await assets.getAssetById(asset.id, fx.actor.tenantId);
    expect(freed.currentHolder).toBeFalsy();

    await projects.update(
      project.id,
      { status: "completed" },
      fx.actor.tenantId
    );
  });
});
