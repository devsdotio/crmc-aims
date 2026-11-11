import { beforeEach, describe, expect, it } from "vitest";

import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import { BorrowRequestService } from "@/server/modules/borrow-requests/borrow-request.service";
import { DepartmentService } from "@/server/modules/departments/department.service";
import { ForbiddenError } from "@/server/shared/errors";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import { makeActor } from "../../setup/actor";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration(
  "supplies vs materials separation & requester/admin edit flows (integration)",
  () => {
    const consumables = new ConsumableService();
    const consumableRequests = new ConsumableRequestService();
    const borrowRequests = new BorrowRequestService();
    const departments = new DepartmentService();
    let fx: TestFixtures;

    beforeEach(async () => {
      await resetTestDatabase();
      fx = await seedCoreFixtures();
    });

    it("hydrates and filters supply, material, and mixed requisitions separately", async () => {
      const supplyItem = await consumables.create(
        {
          name: "Bond Paper A4",
          category: fx.consumableCategory,
          classification: "supply",
          unit: "ream",
          currentQty: 20,
          unitCost: 220,
          supplierId: fx.supplierId,
          location: "Store A",
        },
        fx.actor
      );
      const materialItem = await consumables.create(
        {
          name: "Portland Cement",
          category: fx.consumableCategory,
          classification: "material",
          unit: "bag",
          currentQty: 15,
          unitCost: 260,
          supplierId: fx.supplierId,
          location: "Yard B",
        },
        fx.actor
      );

      const supplyReq = await consumableRequests.create(
        {
          requesterName: fx.borrower.displayName,
          requesterEmail: fx.borrower.email!,
          departmentId: fx.departmentId,
          purpose: "Office forms",
          lines: [
            {
              consumableId: supplyItem.id,
              quantity: 2,
              purpose: "Office forms",
            },
          ],
        },
        fx.borrower
      );
      const materialReq = await consumableRequests.create(
        {
          requesterName: fx.borrower.displayName,
          requesterEmail: fx.borrower.email!,
          departmentId: fx.departmentId,
          purpose: "Ramp repair",
          lines: [
            {
              consumableId: materialItem.id,
              quantity: 3,
              purpose: "Ramp repair",
            },
          ],
        },
        fx.borrower
      );
      const mixedReq = await consumableRequests.create(
        {
          requesterName: fx.borrower.displayName,
          requesterEmail: fx.borrower.email!,
          departmentId: fx.departmentId,
          purpose: "Facility upgrade",
          lines: [
            {
              consumableId: supplyItem.id,
              quantity: 1,
              purpose: "Signage labels",
            },
            {
              consumableId: materialItem.id,
              quantity: 2,
              purpose: "Wall patch",
            },
          ],
        },
        fx.borrower
      );

      expect(supplyReq.classification).toBe("supply");
      expect(materialReq.classification).toBe("material");
      expect(mixedReq.classification).toBe("mixed");

      const onlySupply = await consumableRequests.list(
        { classification: "supply" },
        fx.borrower
      );
      const onlyMaterial = await consumableRequests.list(
        { classification: "material" },
        fx.borrower
      );
      const onlyMixed = await consumableRequests.list(
        { classification: "mixed" },
        fx.borrower
      );

      expect(onlySupply.data.map((r) => r.id)).toEqual([supplyReq.id]);
      expect(onlyMaterial.data.map((r) => r.id)).toEqual([materialReq.id]);
      expect(onlyMixed.data.map((r) => r.id)).toEqual([mixedReq.id]);
    });

    it("lets owner and admin office edit pending requests while blocking other requesters", async () => {
      const otherDept = await departments.create(
        { code: "HR", name: "Human Resources" },
        fx.actor.tenantId
      );
      const otherBorrower = makeActor({
        role: "borrower",
        displayName: "HR Borrower",
        email: "hr@test.local",
        departmentId: otherDept.id,
        departmentName: otherDept.name,
      });

      const borrowReq = await borrowRequests.create(
        {
          requesterName: fx.borrower.displayName,
          requesterEmail: fx.borrower.email!,
          departmentId: fx.departmentId,
          requestType: "borrowable",
          expectedReturnDate: "2026-12-01",
          purpose: "Event AV",
          items: [
            {
              itemDescription: "Projector",
              category: fx.assetCategory,
              quantity: 1,
              itemType: "asset",
              purpose: "Event AV",
            },
          ],
        },
        fx.borrower
      );

      await expect(
        borrowRequests.update(
          borrowReq.id,
          { purpose: "Unauthorized override", editReason: "Not owner" },
          otherBorrower
        )
      ).rejects.toThrow(ForbiddenError);

      const ownerEdited = await borrowRequests.update(
        borrowReq.id,
        {
          purpose: "Owner updated AV need",
          editReason: "Corrected event room purpose",
        },
        fx.borrower
      );
      expect(ownerEdited.purpose).toBe("Owner updated AV need");

      const adminEdited = await borrowRequests.update(
        borrowReq.id,
        {
          purpose: "Admin office finalized AV need",
          editReason: "Admin office clarified request details",
        },
        fx.actor
      );
      expect(adminEdited.purpose).toBe("Admin office finalized AV need");
    });

    it("lists out-of-stock supplies & materials and lets borrowers request them pending restock", async () => {
      const zeroSupply = await consumables.create(
        {
          name: "A4 Laminating Film",
          category: fx.consumableCategory,
          classification: "supply",
          unit: "pack",
          currentQty: 0,
          location: "Store A",
        },
        fx.actor
      );
      const zeroMaterial = await consumables.create(
        {
          name: "Galvanized Wire",
          category: fx.consumableCategory,
          classification: "material",
          unit: "roll",
          currentQty: 0,
          location: "Yard B",
        },
        fx.actor
      );

      const catalog = await consumables.list({ catalog: true }, fx.actor.tenantId, fx.borrower);
      const ids = catalog.data.map((c) => c.id);
      expect(ids).toContain(zeroSupply.id);
      expect(ids).toContain(zeroMaterial.id);

      const created = await consumableRequests.create(
        {
          requesterName: fx.borrower.displayName,
          requesterEmail: fx.borrower.email!,
          departmentId: fx.departmentId,
          purpose: "Restock before quarterly event",
          lines: [
            { consumableId: zeroSupply.id, quantity: 3, purpose: "ID lamination" },
            { consumableId: zeroMaterial.id, quantity: 2, purpose: "Booth setup" },
          ],
        },
        fx.borrower
      );

      expect(created.status).toBe("pending");
      expect(created.classification).toBe("mixed");
    });
  }
);

