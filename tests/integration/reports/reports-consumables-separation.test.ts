import { beforeEach, describe, expect, it } from "vitest";

import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import { ProjectService } from "@/server/modules/projects/project.service";
import { ProjectExpenseService } from "@/server/modules/projects/project-expense.service";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { StockMovementService } from "@/server/modules/stock-movements/stock-movement.service";
import { ReportRepository } from "@/server/modules/reports/report.repository";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import {
  seedCoreFixtures,
  testPoPurpose,
  type TestFixtures,
} from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("Reports separation of Supplies vs Materials (integration)", () => {
  const consumables = new ConsumableService();
  const consumableRequests = new ConsumableRequestService();
  const lots = new PurchaseLotService();
  const movements = new StockMovementService();
  const projects = new ProjectService();
  const expenses = new ProjectExpenseService();
  const reports = new ReportRepository();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("separates supplies and materials across Executive, Consumables, POs, Requests, Departments, and Projects", async () => {
    const purpose = testPoPurpose(fx.departmentName);

    const [supDraft] = await lots.createPurchaseOrder(
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
            name: "Report Audit Supply Paper",
            category: fx.consumableCategory,
            classification: "supply",
            unit: "ream",
            location: "Store A",
            quantity: 10,
            unitCost: 150,
            purpose,
          },
        ],
      },
      fx.actor
    );
    const supLot = await lots.updatePOStatus(
      supDraft.id,
      { status: "delivered" },
      fx.actor
    );

    const [matDraft] = await lots.createPurchaseOrder(
      {
        poDate: "2026-10-02",
        requestedBy: fx.actor.displayName,
        departmentId: fx.departmentId,
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            isNewItem: true,
            name: "Report Audit Material Cement",
            category: fx.consumableCategory,
            classification: "material",
            unit: "bag",
            location: "Yard B",
            quantity: 12,
            unitCost: 300,
            purpose,
          },
        ],
      },
      fx.actor
    );
    const matLot = await lots.updatePOStatus(
      matDraft.id,
      { status: "delivered" },
      fx.actor
    );

    const mixedReq = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          { consumableId: supLot.consumableId!, quantity: 2.5, purpose: "Office printing" },
          { consumableId: matLot.consumableId!, quantity: 3, purpose: "Partition repair" },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    await consumableRequests.approve(mixedReq.id, { note: "Approved" }, fx.actor);
    await consumableRequests.release(
      mixedReq.id,
      {
        receivedBy: "Dept Clerk",
        note: "Released mixed",
        lines: [
          { lineId: mixedReq.lines[0]!.id, allocations: [{ lotId: supLot.id, quantity: 2.5 }] },
          { lineId: mixedReq.lines[1]!.id, allocations: [{ lotId: matLot.id, quantity: 3 }] },
        ],
      },
      fx.actor
    );

    // Direct issue + voided issue (voided movement must not count in 30d usage)
    await consumables.issue(
      matLot.consumableId!,
      {
        quantity: 2,
        departmentId: fx.departmentId,
        lotId: matLot.id,
        requestedByName: "Staff",
        receivedBy: "Erroneous Receipt",
        reason: "Mistyped qty",
      },
      fx.actor
    );
    const matLedger = await movements.list(
      { reason: "issue", classification: "material" },
      fx.actor
    );
    const voidTarget = matLedger.find(
      (m) =>
        m.consumableId === matLot.consumableId &&
        m.qty === 2 &&
        (m.notes ?? "").includes("Mistyped qty")
    );
    expect(voidTarget).toBeTruthy();
    await movements.voidIssue(voidTarget!.id, { reason: "Entry error" }, fx.actor);

    // Project usage: 1 Supply, 1 Material, plus 1 miscellaneous labor expense (excluded from project consumables)
    const project = await projects.create(
      {
        name: "Audit Wing Project",
        description: "Test supply/material project isolation",
        status: "active",
      },
      fx.actor
    );
    await expenses.useConsumable(
      project.id,
      { consumableId: supLot.consumableId!, quantity: 1.5 },
      fx.actor
    );
    await expenses.useConsumable(
      project.id,
      { consumableId: matLot.consumableId!, quantity: 4 },
      fx.actor
    );
    await expenses.create(
      project.id,
      {
        lineType: "miscellaneous",
        category: "labor",
        description: "Site Electrician Service",
        amount: 4500,
      },
      fx.actor
    );

    const exec = await reports.getExecutiveData(fx.actor.tenantId, false);
    expect(exec.consumables.suppliesCount).toBeGreaterThanOrEqual(1);
    expect(exec.consumables.materialsCount).toBeGreaterThanOrEqual(1);
    expect(exec.consumables.suppliesValuation).toBeGreaterThan(0);
    expect(exec.consumables.materialsValuation).toBeGreaterThan(0);

    const supplyReport = await reports.getConsumablesReport(
      { page: 1, pageSize: 25, sortOrder: "desc", classification: "supply", includeSandbox: false },
      fx.actor.tenantId
    );
    expect(supplyReport.data.some((r) => r.id === supLot.consumableId)).toBe(true);
    expect(supplyReport.data.every((r) => r.classification === "supply")).toBe(true);
    const supRow = supplyReport.data.find((r) => r.id === supLot.consumableId)!;
    expect(supRow.usage30d).toBeCloseTo(4, 2);

    const materialReport = await reports.getConsumablesReport(
      { page: 1, pageSize: 25, sortOrder: "desc", classification: "material", includeSandbox: false },
      fx.actor.tenantId
    );
    expect(materialReport.data.some((r) => r.id === matLot.consumableId)).toBe(true);
    expect(materialReport.data.every((r) => r.classification === "material")).toBe(true);
    const matRow = materialReport.data.find((r) => r.id === matLot.consumableId)!;
    // 3 released + 4 project use = 7 (the voided 2-unit movement is excluded)
    expect(matRow.usage30d).toBeCloseTo(7, 2);

    const deptReport = await reports.getDepartmentsReport(
      { page: 1, pageSize: 25, sortOrder: "desc", includeSandbox: false },
      fx.actor.tenantId
    );
    const dept = deptReport.data.find((d) => d.id === fx.departmentId)!;
    expect(dept.suppliesConsumedCount).toBeCloseTo(2.5, 2);
    expect(dept.materialsConsumedCount).toBeCloseTo(3, 2);

    const projReport = await reports.getProjectsReport(
      { page: 1, pageSize: 25, sortOrder: "desc", includeSandbox: false },
      fx.actor.tenantId
    );
    const prj = projReport.data.find((p) => p.id === project.id)!;
    expect(prj.suppliesConsumedCount).toBeCloseTo(1.5, 2);
    expect(prj.materialsConsumedCount).toBeCloseTo(4, 2);
    expect(
      prj.consumedSupplies?.some((s) => s.name === "Site Electrician Service")
    ).toBe(false);

    const poSupReport = await reports.getPurchaseOrdersReport(
      { page: 1, pageSize: 25, sortOrder: "desc", classification: "supply", includeSandbox: false },
      fx.actor.tenantId
    );
    expect(poSupReport.data.some((o) => o.classification === "supply")).toBe(true);
    expect(poSupReport.data.every((o) => o.classification === "supply")).toBe(true);
    expect(poSupReport.summary.deliveredCount).toBeGreaterThanOrEqual(1);

    const reqMixedReport = await reports.getRequestsReport(
      { page: 1, pageSize: 25, sortOrder: "desc", classification: "mixed", includeSandbox: false },
      fx.actor.tenantId
    );
    expect(reqMixedReport.data.some((r) => r.id === mixedReq.id && r.classification === "mixed")).toBe(true);
  });
});

