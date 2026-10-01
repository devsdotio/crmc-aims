import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { categories } from "@/server/db/schema";
import { CategoryRepository } from "@/server/modules/categories/category.repository";
import { DepartmentService } from "@/server/modules/departments/department.service";
import { SupplierService } from "@/server/modules/suppliers/supplier.service";
import { hasTestDatabase } from "../../setup/env";
import { resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

const SUP_CODE = /^SUP-\d{4}-[A-F0-9]{8}$/i;

describeIntegration("categories / departments / suppliers CRUD", () => {
  const categoryRepo = new CategoryRepository();
  const departments = new DepartmentService();
  const suppliers = new SupplierService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("lists, creates, renames (cascade), and deletes a category", async () => {
    const db = getDb();
    const [created] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Lab Gear",
        type: "asset",
        createdByUserId: fx.actor.userId,
      })
      .returning();

    expect(created.name).toBe("Lab Gear");
    expect(created.type).toBe("asset");

    const listed = await categoryRepo.listWithCounts(
      "asset",
      undefined,
      fx.actor.tenantId
    );
    const found = listed.find((c) => c.id === created.id);
    expect(found).toBeTruthy();
    expect(found!.name).toBe("Lab Gear");
    expect(found!.type).toBe("asset");

    const renamed = await categoryRepo.updateAndCascade(
      created.id,
      { name: "Laboratory Gear", type: "asset" },
      undefined,
      fx.actor.tenantId
    );
    expect(renamed?.name).toBe("Laboratory Gear");
    expect(renamed?.type).toBe("asset");

    await db.delete(categories).where(eq(categories.id, created.id));
    const after = await categoryRepo.findById(
      created.id,
      undefined,
      fx.actor.tenantId
    );
    expect(after).toBeNull();
  });

  it("creates asset classifications and links specific asset categories", async () => {
    const db = getDb();
    const [assetClass] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Lab Instruments",
        type: "asset_class",
        createdByUserId: fx.actor.userId,
      })
      .returning();

    expect(assetClass.type).toBe("asset_class");

    const [specific] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Microscopes",
        type: "asset",
        parentId: assetClass.id,
        createdByUserId: fx.actor.userId,
      })
      .returning();

    expect(specific.parentId).toBe(assetClass.id);

    const listedClasses = await categoryRepo.listWithCounts(
      "asset_class",
      undefined,
      fx.actor.tenantId
    );
    const foundClass = listedClasses.find((c) => c.id === assetClass.id);
    expect(foundClass).toBeTruthy();
    expect(foundClass!.itemCount).toBeGreaterThanOrEqual(1);

    const listedAssets = await categoryRepo.listWithCounts(
      "asset",
      undefined,
      fx.actor.tenantId
    );
    const foundSpecific = listedAssets.find((c) => c.id === specific.id);
    expect(foundSpecific?.parentId).toBe(assetClass.id);
    expect(foundSpecific?.parentName).toBe("Lab Instruments");

    const resolved =
      await categoryRepo.resolveAssetClassificationForCategoryName(
        "Microscopes",
        undefined,
        fx.actor.tenantId
      );
    expect(resolved).toBe("Lab Instruments");

    const renamedClass = await categoryRepo.updateAndCascade(
      assetClass.id,
      { name: "Laboratory Instruments", type: "asset_class" },
      undefined,
      fx.actor.tenantId
    );
    expect(renamedClass?.name).toBe("Laboratory Instruments");

    const resolvedAfterRename =
      await categoryRepo.resolveAssetClassificationForCategoryName(
        "Microscopes",
        undefined,
        fx.actor.tenantId
      );
    expect(resolvedAfterRename).toBe("Laboratory Instruments");
  });

  it("creates, updates, lists, and deletes a department", async () => {
    const created = await departments.create(
      { code: "REG", name: "Registrar" },
      fx.actor.tenantId
    );
    expect(created.code).toBe("REG");
    expect(created.name).toBe("Registrar");

    const updated = await departments.update(
      created.id,
      { name: "Office of the Registrar" },
      fx.actor.tenantId
    );
    expect(updated.id).toBe(created.id);
    expect(updated.code).toBe("REG");
    expect(updated.name).toBe("Office of the Registrar");

    const listed = await departments.list({}, fx.actor.tenantId);
    expect(listed.some((d) => d.id === created.id && d.code === "REG")).toBe(
      true
    );

    await departments.delete(created.id, fx.actor.tenantId);
    const after = await departments.list({}, fx.actor.tenantId);
    expect(after.some((d) => d.id === created.id)).toBe(false);
  });

  it("creates, updates, lists, and deactivates a supplier", async () => {
    const created = await suppliers.create(
      { name: "Beta Office Depot", contactPhone: "09170001111" },
      fx.actor
    );
    expect(created.name).toBe("Beta Office Depot");
    expect(created.status).toBe("active");
    expect(created.supplierCode).toMatch(SUP_CODE);
    expect(created.contactPhone).toBe("09170001111");

    const updated = await suppliers.update(
      created.id,
      { contactName: "Alex Vendor" },
      fx.actor.tenantId
    );
    expect(updated.contactName).toBe("Alex Vendor");
    expect(updated.supplierCode).toBe(created.supplierCode);
    expect(updated.status).toBe("active");

    const listed = await suppliers.list({}, fx.actor.tenantId);
    expect(
      listed.some((s) => s.id === created.id && s.status === "active")
    ).toBe(true);

    const deactivated = await suppliers.deactivate(
      created.id,
      fx.actor.tenantId
    );
    expect(deactivated.status).toBe("inactive");
    expect(deactivated.id).toBe(created.id);
  });
});
