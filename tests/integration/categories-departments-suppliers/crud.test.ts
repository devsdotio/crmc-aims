import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { categories, locations, profiles, tenants } from "@/server/db/schema";
import { CategoryRepository } from "@/server/modules/categories/category.repository";
import { DepartmentService } from "@/server/modules/departments/department.service";
import { SupplierService } from "@/server/modules/suppliers/supplier.service";
import { ConflictError } from "@/server/shared/errors";
import { makeActor } from "../../setup/actor";
import { hasTestDatabase } from "../../setup/env";
import { resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth++) {
    if (typeof current !== "object" || current === null) break;
    if (
      "code" in current &&
      typeof current.code === "string" &&
      current.code === "23505"
    ) {
      return true;
    }
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

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

  it("assigns an existing asset category under a classification and restamps assets", async () => {
    const db = getDb();
    const { AssetService } = await import(
      "@/server/modules/assets/asset.service"
    );
    const assets = new AssetService();

    const [orphanCategory] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Monitors",
        type: "asset",
        createdByUserId: fx.actor.userId,
      })
      .returning();
    expect(orphanCategory.parentId).toBeNull();

    const [assetClass] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Display Hardware",
        type: "asset_class",
        createdByUserId: fx.actor.userId,
      })
      .returning();

    const createdAsset = await assets.createAsset(
      {
        name: "Dell Monitor",
        category: "Monitors",
        location: "IT Store",
        assignmentType: "borrowable",
      },
      fx.actor
    );
    expect(createdAsset.classification ?? "").toBe("");

    const linked = await categoryRepo.updateAndCascade(
      orphanCategory.id,
      {
        name: orphanCategory.name,
        type: "asset",
        parentId: assetClass.id,
      },
      undefined,
      fx.actor.tenantId
    );
    expect(linked?.parentId).toBe(assetClass.id);
    expect(linked?.parentName).toBe("Display Hardware");

    const refreshed = await assets.getAssetById(
      createdAsset.id,
      fx.actor.tenantId
    );
    expect(refreshed.classification).toBe("Display Hardware");

    const listed = await assets.listAssets(
      { classification: "Display Hardware" },
      fx.actor.tenantId
    );
    expect(listed.some((a) => a.id === createdAsset.id)).toBe(true);
  });

  it("creates consumable classifications and links specific consumable categories", async () => {
    const db = getDb();
    const [consumableClass] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Medical Consumables",
        type: "consumable_class",
        createdByUserId: fx.actor.userId,
      })
      .returning();

    expect(consumableClass.type).toBe("consumable_class");

    const [specific] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Surgical Gloves",
        type: "consumable",
        parentId: consumableClass.id,
        createdByUserId: fx.actor.userId,
      })
      .returning();

    expect(specific.parentId).toBe(consumableClass.id);

    const listedClasses = await categoryRepo.listWithCounts(
      "consumable_class",
      undefined,
      fx.actor.tenantId
    );
    const foundClass = listedClasses.find((c) => c.id === consumableClass.id);
    expect(foundClass).toBeTruthy();
    expect(foundClass!.itemCount).toBeGreaterThanOrEqual(1);

    const listedConsumables = await categoryRepo.listWithCounts(
      "consumable",
      undefined,
      fx.actor.tenantId
    );
    const foundSpecific = listedConsumables.find((c) => c.id === specific.id);
    expect(foundSpecific?.parentId).toBe(consumableClass.id);
    expect(foundSpecific?.parentName).toBe("Medical Consumables");

    const resolved =
      await categoryRepo.resolveConsumableCategoryClassForCategoryName(
        "Surgical Gloves",
        undefined,
        fx.actor.tenantId
      );
    expect(resolved).toBe("Medical Consumables");

    const renamedClass = await categoryRepo.updateAndCascade(
      consumableClass.id,
      { name: "Clinical Consumables", type: "consumable_class" },
      undefined,
      fx.actor.tenantId
    );
    expect(renamedClass?.name).toBe("Clinical Consumables");

    const resolvedAfterRename =
      await categoryRepo.resolveConsumableCategoryClassForCategoryName(
        "Surgical Gloves",
        undefined,
        fx.actor.tenantId
      );
    expect(resolvedAfterRename).toBe("Clinical Consumables");
  });

  it("assigns an existing consumable category under a classification and restamps items", async () => {
    const db = getDb();
    const { ConsumableService } = await import(
      "@/server/modules/consumables/consumable.service"
    );
    const consumablesSvc = new ConsumableService();

    const [orphanCategory] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Toner Cartridges",
        type: "consumable",
        createdByUserId: fx.actor.userId,
      })
      .returning();
    expect(orphanCategory.parentId).toBeNull();

    const [consumableClass] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Print Media",
        type: "consumable_class",
        createdByUserId: fx.actor.userId,
      })
      .returning();

    const createdItem = await consumablesSvc.create(
      {
        name: "HP Black Toner",
        category: "Toner Cartridges",
        classification: "supply",
        unit: "pcs",
        currentQty: 0,
        location: "Supply Room",
      },
      fx.actor
    );
    expect(createdItem.categoryClass ?? "").toBe("");

    const linked = await categoryRepo.updateAndCascade(
      orphanCategory.id,
      {
        name: orphanCategory.name,
        type: "consumable",
        parentId: consumableClass.id,
      },
      undefined,
      fx.actor.tenantId
    );
    expect(linked?.parentId).toBe(consumableClass.id);
    expect(linked?.parentName).toBe("Print Media");

    const refreshed = await consumablesSvc.getById(
      createdItem.id,
      fx.actor.tenantId
    );
    expect(refreshed.categoryClass).toBe("Print Media");
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

  it("allows the same category / department / location labels in another tenant", async () => {
    const db = getDb();
    const otherTenantId = randomUUID();
    await db.insert(tenants).values({
      id: otherTenantId,
      slug: `tenant-${otherTenantId.slice(0, 8)}`,
      name: "Other Tenant Campus",
    });
    const otherActor = makeActor({
      role: "admin",
      tenantId: otherTenantId,
      tenantSlug: `tenant-${otherTenantId.slice(0, 8)}`,
      tenantName: "Other Tenant Campus",
      email: `admin-${otherTenantId.slice(0, 8)}@test.local`,
    });
    await db.insert(profiles).values({
      userId: otherActor.userId,
      tenantId: otherTenantId,
      email: otherActor.email ?? `admin-${otherTenantId.slice(0, 8)}@test.local`,
      fullName: otherActor.displayName,
      role: "admin",
      status: "active",
    });

    const sharedName = "Bond Paper";
    await db.insert(categories).values({
      tenantId: fx.actor.tenantId,
      name: sharedName,
      type: "consumable",
      createdByUserId: fx.actor.userId,
    });
    const [otherCategory] = await db
      .insert(categories)
      .values({
        tenantId: otherTenantId,
        name: sharedName,
        type: "consumable",
        createdByUserId: otherActor.userId,
      })
      .returning();
    expect(otherCategory.name).toBe(sharedName);
    expect(otherCategory.tenantId).toBe(otherTenantId);

    await departments.create(
      { code: "REG", name: "Registrar" },
      fx.actor.tenantId
    );
    const otherDept = await departments.create(
      { code: "REG", name: "Registrar" },
      otherTenantId
    );
    expect(otherDept.code).toBe("REG");
    expect(otherDept.name).toBe("Registrar");

    await db.insert(locations).values({
      tenantId: fx.actor.tenantId,
      code: "WH-A",
      name: "Warehouse A",
    });
    const [otherLoc] = await db
      .insert(locations)
      .values({
        tenantId: otherTenantId,
        code: "WH-A",
        name: "Warehouse A",
      })
      .returning();
    expect(otherLoc.code).toBe("WH-A");
    expect(otherLoc.tenantId).toBe(otherTenantId);
  });

  it("still rejects duplicate category / department names inside one tenant", async () => {
    const db = getDb();
    await db.insert(categories).values({
      tenantId: fx.actor.tenantId,
      name: "Bond Paper",
      type: "consumable",
      createdByUserId: fx.actor.userId,
    });

    try {
      await db.insert(categories).values({
        tenantId: fx.actor.tenantId,
        name: "bond paper",
        type: "consumable",
        createdByUserId: fx.actor.userId,
      });
      expect.fail("expected unique violation");
    } catch (error) {
      expect(isUniqueViolation(error)).toBe(true);
    }

    await departments.create(
      { code: "REG", name: "Registrar" },
      fx.actor.tenantId
    );
    await expect(
      departments.create(
        { code: "REG2", name: "Registrar" },
        fx.actor.tenantId
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects a duplicate icon and allows a row to keep its own icon", async () => {
    const db = getDb();
    const [first] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Monitors",
        type: "asset",
        iconToken: "monitor",
        createdByUserId: fx.actor.userId,
      })
      .returning();

    const [second] = await db
      .insert(categories)
      .values({
        tenantId: fx.actor.tenantId,
        name: "Keyboards",
        type: "asset",
        iconToken: "keyboard",
        createdByUserId: fx.actor.userId,
      })
      .returning();

    const kept = await categoryRepo.updateAndCascade(
      second.id,
      { name: "Keyboards", type: "asset", iconToken: "keyboard" },
      undefined,
      fx.actor.tenantId
    );
    expect(kept?.iconToken).toBe("keyboard");

    await expect(
      categoryRepo.updateAndCascade(
        second.id,
        { name: "Keyboards", type: "asset", iconToken: "monitor" },
        undefined,
        fx.actor.tenantId
      )
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(
      categoryRepo.updateAndCascade(
        second.id,
        { name: "Keyboards", type: "asset", iconToken: "not-an-icon" },
        undefined,
        fx.actor.tenantId
      )
    ).rejects.toThrow(/icon set/i);

    expect(first.iconToken).toBe("monitor");
  });
});
