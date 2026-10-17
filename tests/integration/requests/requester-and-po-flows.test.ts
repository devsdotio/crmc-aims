import { beforeEach, describe, expect, it } from "vitest";

import { AssetService } from "@/server/modules/assets/asset.service";
import { BorrowRequestService } from "@/server/modules/borrow-requests/borrow-request.service";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";
import { DepartmentService } from "@/server/modules/departments/department.service";
import { hasTestDatabase } from "../../setup/env";
import { resetTestDatabase } from "../../setup/db";
import {
  seedCoreFixtures,
  testPoPurpose,
  type TestFixtures,
} from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("requests requester flows", () => {
  const assets = new AssetService();
  const borrow = new BorrowRequestService();
  const consumables = new ConsumableService();
  const consumableRequests = new ConsumableRequestService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("creates assignable request and can cancel a pending borrow request", async () => {
    const assignable = await borrow.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        requestType: "assignable",
        assignedToName: "Jane Assignee",
        items: [
          {
            itemDescription: "Desktop PC",
            category: fx.assetCategory,
            quantity: 1,
            itemType: "asset",
            purpose: "New hire workstation",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(assignable.status).toBe("pending");
    expect(assignable.requestType).toBe("assignable");
    expect(assignable.assignedToName).toBe("Jane Assignee");
    expect(assignable.expectedReturnDate).toBeFalsy();
    expect(assignable.departmentId).toBe(fx.departmentId);
    expect(assignable.items[0]?.quantity).toBe(1);
    expect(assignable.history.some((h) => h.action === "submitted")).toBe(true);

    const pending = await borrow.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        requestType: "borrowable",
        expectedReturnDate: "2026-11-01",
        items: [
          {
            itemDescription: "Projector",
            category: fx.assetCategory,
            quantity: 1,
            itemType: "asset",
            purpose: "Event",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(pending.requestType).toBe("borrowable");
    expect(pending.expectedReturnDate).toBe("2026-11-01");

    const cancelled = await borrow.cancel(
      pending.id,
      { reason: "Event postponed" },
      fx.borrower
    );
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellationReason).toBe("Event postponed");
    expect(cancelled.history.some((h) => h.action === "cancelled")).toBe(true);
  });

  it("requester can create and cancel a consumable request", async () => {
    const item = await consumables.create(
      {
        name: "Markers for request",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "pcs",
        currentQty: 20,
        unitCost: 10,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );

    const req = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          {
            consumableId: item.id,
            quantity: 4,
            purpose: "Classroom",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(req.status).toBe("pending");
    expect(req.lines).toHaveLength(1);
    expect(req.lines[0]?.quantityRequested).toBe(4);
    expect(req.lines[0]?.consumableId).toBe(item.id);
    expect(req.lines[0]?.itemName).toBe("Markers for request");
    expect(req.departmentId).toBe(fx.departmentId);

    const cancelled = await consumableRequests.cancel(
      req.id,
      { reason: "Already have stock" },
      fx.borrower
    );
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellationReason).toBe("Already have stock");
  });

  it("requester can create fractional supply and material requests", async () => {
    const supply = await consumables.create(
      {
        name: "Fractional Toner",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "bottle",
        currentQty: 10,
        unitCost: 250,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );
    const material = await consumables.create(
      {
        name: "Fractional Cement",
        category: fx.consumableCategory,
        classification: "material",
        unit: "kg",
        currentQty: 25.5,
        unitCost: 15,
        supplierId: fx.supplierId,
        location: "Yard",
      },
      fx.actor
    );
    expect(material.currentQty).toBe(25.5);
    expect(material.classification).toBe("material");

    const supplyReq = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          {
            consumableId: supply.id,
            quantity: 1.25,
            purpose: "Printer refill",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(supplyReq.status).toBe("pending");
    expect(supplyReq.lines[0]?.quantityRequested).toBe(1.25);

    const materialReq = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          {
            consumableId: material.id,
            quantity: 0.5,
            purpose: "Patch work",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(materialReq.status).toBe("pending");
    expect(materialReq.lines[0]?.quantityRequested).toBe(0.5);
    expect(materialReq.lines[0]?.consumableId).toBe(material.id);

    await expect(
      consumableRequests.create(
        {
          requesterName: fx.borrower.displayName,
          requesterEmail: fx.borrower.email!,
          departmentId: fx.departmentId,
          lines: [
            {
              consumableId: supply.id,
              quantity: 1.234,
              purpose: "Too many decimals",
            },
          ],
          requesterUserId: fx.borrower.userId,
        },
        fx.borrower
      )
    ).rejects.toThrow();
  });

  it("accepts a single fractional line after same-SKU slip merge", async () => {
    const supply = await consumables.create(
      {
        name: "Merged Slip Paper",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "ream",
        currentQty: 20,
        unitCost: 180,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );

    // Requisition slip / wizard merge 0.5 + 1.25 into one line before POST.
    const req = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          {
            consumableId: supply.id,
            quantity: 1.75,
            purpose: "Office restock",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(req.lines).toHaveLength(1);
    expect(req.lines[0]?.quantityRequested).toBe(1.75);

    await expect(
      consumableRequests.create(
        {
          requesterName: fx.borrower.displayName,
          requesterEmail: fx.borrower.email!,
          departmentId: fx.departmentId,
          lines: [
            {
              consumableId: supply.id,
              quantity: 0.5,
              purpose: "Office restock",
            },
            {
              consumableId: supply.id,
              quantity: 1.25,
              purpose: "Office restock",
            },
          ],
          requesterUserId: fx.borrower.userId,
        },
        fx.borrower
      )
    ).rejects.toThrow(/duplicate/i);
  });

  it("borrower catalog lists warehouse assets, supplies, and materials (parity with admin stock)", async () => {
    const unit = await assets.createAsset(
      {
        name: "Catalog Projector",
        category: fx.assetCategory,
        location: "AV Room",
        assignmentType: "borrowable",
      },
      fx.actor
    );
    const supply = await consumables.create(
      {
        name: "Catalog Bond Paper",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "ream",
        currentQty: 12.5,
        unitCost: 180,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );
    const material = await consumables.create(
      {
        name: "Catalog Paint",
        category: fx.consumableCategory,
        classification: "material",
        unit: "liter",
        currentQty: 4.25,
        unitCost: 95,
        supplierId: fx.supplierId,
        location: "Yard",
      },
      fx.actor
    );

    const adminConsumables = await consumables.list(
      {},
      fx.actor.tenantId,
      fx.actor
    );
    expect(adminConsumables.data.map((r) => r.id)).toEqual(
      expect.arrayContaining([supply.id, material.id])
    );

    const emptyWarehouse = await consumables.list(
      {},
      fx.borrower.tenantId,
      fx.borrower
    );
    expect(emptyWarehouse.data).toHaveLength(0);

    const catalog = await consumables.list(
      { catalog: true },
      fx.borrower.tenantId,
      fx.borrower
    );
    const catalogIds = catalog.data.map((r) => r.id);
    expect(catalogIds).toEqual(
      expect.arrayContaining([supply.id, material.id])
    );
    const supplyRow = catalog.data.find((r) => r.id === supply.id)!;
    const materialRow = catalog.data.find((r) => r.id === material.id)!;
    expect(supplyRow.classification).toBe("supply");
    expect(supplyRow.currentQty).toBe(12.5);
    expect(materialRow.classification).toBe("material");
    expect(materialRow.currentQty).toBe(4.25);
    expect(supplyRow.supplier).toBeUndefined();
    expect(materialRow.history).toEqual([]);

    const assetCatalog = await assets.listAssets(
      { catalog: true },
      fx.borrower.tenantId,
      fx.borrower
    );
    expect(assetCatalog.some((a) => a.id === unit.id)).toBe(true);
    expect(assetCatalog.find((a) => a.id === unit.id)?.value).toBeUndefined();

    const deptHeld = await assets.listAssets(
      {},
      fx.borrower.tenantId,
      fx.borrower
    );
    expect(deptHeld.some((a) => a.id === unit.id)).toBe(false);
  });
});

describeIntegration("purchase order status flows", () => {
  const pos = new PurchaseLotService();
  const departments = new DepartmentService();
  const audit = new AuditLogService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("runs approve → ordered → cancel path with audit, and supports multi-department PO", async () => {
    const second = await departments.create(
      { code: "REG", name: "Registrar" },
      fx.actor.tenantId
    );
    const purpose = testPoPurpose(fx.departmentName);

    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-10",
        requestedBy: fx.actor.displayName,
        departmentIds: [fx.departmentId, second.id],
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            name: "Multi-dept Toner",
            category: fx.consumableCategory,
            classification: "supply",
            unit: "pcs",
            location: "Store",
            quantity: 3,
            unitCost: 500,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.status).toBe("pending_approval");
    expect(lot.itemName).toBe("Multi-dept Toner");
    expect(lot.quantity).toBe(3);
    expect(lot.recordedByName).toBe(fx.actor.displayName);
    const deptIds = (lot.departments ?? []).map((d) => d.id);
    expect(deptIds).toEqual(
      expect.arrayContaining([fx.departmentId, second.id])
    );
    expect(deptIds).toHaveLength(2);

    const approved = await pos.updatePOStatus(
      lot.id,
      { status: "approved" },
      fx.actor
    );
    expect(approved.status).toBe("approved");

    const ordered = await pos.updatePOStatus(
      lot.id,
      { status: "ordered" },
      fx.actor
    );
    expect(ordered.status).toBe("ordered");

    const cancelled = await pos.updatePOStatus(
      lot.id,
      { status: "cancelled", cancellationReason: "Budget reallocated" },
      fx.actor
    );
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellationReason).toBe("Budget reallocated");

    const logs = await audit.list(
      {
        entityType: AUDIT_ENTITY.purchaseOrder,
        action: "purchase_order_cancelled",
      },
      fx.actor
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].actorUserId).toBe(fx.actor.userId);
    expect(logs[0].actorName).toBe(fx.actor.displayName);
    expect(logs[0].notes).toMatch(/cancel|Budget reallocated/i);
  });
});
