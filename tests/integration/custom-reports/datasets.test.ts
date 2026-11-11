import { beforeEach, describe, expect, it } from "vitest";

import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { StockMovementService } from "@/server/modules/stock-movements/stock-movement.service";
import { executeDatasetQuery } from "@/server/modules/custom-reports/dataset-registry";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import {
  seedCoreFixtures,
  testPoPurpose,
  type TestFixtures,
} from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("Custom Reports dataset queries for Supplies vs Materials (integration)", () => {
  const consumables = new ConsumableService();
  const consumableRequests = new ConsumableRequestService();
  const lots = new PurchaseLotService();
  const movements = new StockMovementService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("queries consumables, stock-movements (void toggle), purchase-orders, and consumable-requests accurately", async () => {
    const purpose = testPoPurpose(fx.departmentName);
    const tenantId = fx.actor.tenantId!;

    const [supPo] = await lots.createPurchaseOrder(
      {
        poDate: "2026-10-10",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            isNewItem: true,
            name: "Custom Audit Supply Ink",
            category: fx.consumableCategory,
            classification: "supply",
            unit: "bottle",
            location: "Store",
            quantity: 10,
            unitCost: 220,
            purpose,
          },
        ],
      },
      fx.actor
    );
    const supLot = await lots.updatePOStatus(supPo.id, { status: "delivered" }, fx.actor);

    const [matPo] = await lots.createPurchaseOrder(
      {
        poDate: "2026-10-11",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            isNewItem: true,
            name: "Custom Audit Material Gravel",
            category: fx.consumableCategory,
            classification: "material",
            unit: "sack",
            location: "Yard",
            quantity: 15,
            unitCost: 180,
            purpose,
          },
        ],
      },
      fx.actor
    );
    const matLot = await lots.updatePOStatus(matPo.id, { status: "delivered" }, fx.actor);

    await consumables.issue(
      matLot.consumableId!,
      {
        quantity: 2,
        departmentId: fx.departmentId,
        lotId: matLot.id,
        requestedByName: "Staff",
        receivedBy: "Void Me",
        reason: "Voided dataset movement",
      },
      fx.actor
    );
    const allMatMoves = await movements.list({ reason: "issue", classification: "material" }, fx.actor);
    const toVoid = allMatMoves.find((m) => (m.notes ?? "").includes("Voided dataset movement"))!;
    await movements.voidIssue(toVoid.id, { reason: "Bad dispatch" }, fx.actor);

    const mixedReq = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          { consumableId: supLot.consumableId!, quantity: 2, purpose: "Printer refill" },
          { consumableId: matLot.consumableId!, quantity: 3, purpose: "Walkway patch" },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );

    const matOnly = await executeDatasetQuery(
      "consumables",
      tenantId,
      { classifications: ["material"] },
      ["itemCode", "name", "classification", "availableQty"],
      50,
      0
    );
    expect(matOnly.result.rows.some((r) => r.name === "Custom Audit Material Gravel")).toBe(true);
    expect(matOnly.result.rows.every((r) => r.classification === "material")).toBe(true);

    const activeMovements = await executeDatasetQuery(
      "stock-movements",
      tenantId,
      { classifications: ["material"], statuses: ["active"] },
      ["consumableName", "classification", "voided"],
      50,
      0
    );
    expect(activeMovements.result.rows.every((r) => r.voided === false || r.voided === "No")).toBe(true);

    const allWithVoided = await executeDatasetQuery(
      "stock-movements",
      tenantId,
      { classifications: ["material"], statuses: ["active", "voided"] },
      ["consumableName", "classification", "voided"],
      50,
      0
    );
    expect(allWithVoided.result.rows.length).toBeGreaterThanOrEqual(
      activeMovements.result.rows.length
    );

    const poSup = await executeDatasetQuery(
      "purchase-orders",
      tenantId,
      { classifications: ["supply"], statuses: ["delivered"] },
      ["poNumber", "classification", "status"],
      50,
      0
    );
    expect(poSup.result.rows.some((r) => r.classification === "supply")).toBe(true);

    const crMixed = await executeDatasetQuery(
      "consumable-requests",
      tenantId,
      { classifications: ["mixed"] },
      ["requestCode", "classification", "itemsCount", "suppliesCount", "materialsCount"],
      50,
      0
    );
    expect(
      crMixed.result.rows.some((r) => r.requestCode === mixedReq.requestCode && r.classification === "mixed")
    ).toBe(true);
  });
});

