import { getDb } from "@/server/db";
import {
  categories,
  departments,
  profiles,
  suppliers,
} from "@/server/db/schema";
import { withTransaction } from "@/server/db/transaction";
import { DEFAULT_TENANT_ID } from "@/server/shared/tenant-context";
import type { ActorContext } from "@/server/shared/auth";
import { makeActor } from "./actor";

export type TestFixtures = {
  actor: ActorContext;
  borrower: ActorContext;
  departmentId: string;
  departmentName: string;
  assetCategory: string;
  assetClassification: string;
  consumableCategory: string;
  /** Settings type=consumable_class parent of consumableCategory. */
  consumableClassification: string;
  supplierId: string;
  supplierName: string;
};

/**
 * Seed the minimum rows most integration suites need after `resetTestDatabase()`.
 * Runs in one transaction so a mid-seed failure never leaves half-linked taxonomy.
 */
export async function seedCoreFixtures(
  overrides: Partial<{ actor: ActorContext }> = {}
): Promise<TestFixtures> {
  const actor = overrides.actor ?? makeActor({ role: "admin" });

  return withTransaction(async (tx) => {
    await tx.insert(profiles).values({
      userId: actor.userId,
      tenantId: actor.tenantId,
      email: actor.email ?? `admin@test.local`,
      fullName: actor.displayName,
      role: actor.role,
      status: "active",
    });

    const borrower = makeActor({
      role: "borrower",
      displayName: "Test Borrower",
      email: "borrower@test.local",
      tenantId: actor.tenantId,
    });

    const [dept] = await tx
      .insert(departments)
      .values({
        tenantId: actor.tenantId ?? DEFAULT_TENANT_ID,
        code: "IT",
        name: "Information Technology",
      })
      .returning();

    await tx.insert(profiles).values({
      userId: borrower.userId,
      tenantId: actor.tenantId,
      email: borrower.email ?? "borrower@test.local",
      fullName: borrower.displayName,
      role: "borrower",
      status: "active",
      departmentId: dept.id,
    });

    borrower.departmentId = dept.id;
    borrower.departmentName = dept.name;

    const assetCategory = "Computing";
    const assetClassification = "Computer Equipments";
    const consumableCategory = "Office Supplies";
    const consumableClassification = "Stationery";

    const [assetClassRow] = await tx
      .insert(categories)
      .values({
        tenantId: actor.tenantId ?? DEFAULT_TENANT_ID,
        name: assetClassification,
        type: "asset_class",
        createdByUserId: actor.userId,
      })
      .returning();

    const [consumableClassRow] = await tx
      .insert(categories)
      .values({
        tenantId: actor.tenantId ?? DEFAULT_TENANT_ID,
        name: consumableClassification,
        type: "consumable_class",
        createdByUserId: actor.userId,
      })
      .returning();

    await tx.insert(categories).values([
      {
        tenantId: actor.tenantId ?? DEFAULT_TENANT_ID,
        name: assetCategory,
        type: "asset",
        parentId: assetClassRow.id,
        createdByUserId: actor.userId,
      },
      {
        tenantId: actor.tenantId ?? DEFAULT_TENANT_ID,
        name: consumableCategory,
        type: "consumable",
        parentId: consumableClassRow.id,
        createdByUserId: actor.userId,
      },
    ]);

    const supplierName = "Acme Supplies Co";
    const [supplier] = await tx
      .insert(suppliers)
      .values({
        tenantId: actor.tenantId ?? DEFAULT_TENANT_ID,
        supplierCode: "SUP-TEST-001",
        name: supplierName,
        status: "active",
        createdByUserId: actor.userId,
        createdByName: actor.displayName,
      })
      .returning();

    return {
      actor,
      borrower: {
        ...borrower,
        departmentId: dept.id,
        departmentName: dept.name,
      },
      departmentId: dept.id,
      departmentName: dept.name,
      assetCategory,
      assetClassification,
      consumableCategory,
      consumableClassification,
      supplierId: supplier.id,
      supplierName,
    };
  });
}

/** Purpose string that satisfies PO justification validation. */
export function testPoPurpose(departmentLabel = "Information Technology"): string {
  return `[${departmentLabel}] Regression test procurement`;
}
