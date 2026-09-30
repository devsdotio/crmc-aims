import { getDb } from "@/server/db";
import {
  categories,
  departments,
  profiles,
  suppliers,
} from "@/server/db/schema";
import { DEFAULT_TENANT_ID } from "@/server/shared/tenant-context";
import type { ActorContext } from "@/server/shared/auth";
import { makeActor } from "./actor";

export type TestFixtures = {
  actor: ActorContext;
  borrower: ActorContext;
  departmentId: string;
  departmentName: string;
  assetCategory: string;
  consumableCategory: string;
  supplierId: string;
  supplierName: string;
};

/**
 * Seed the minimum rows most integration suites need after `resetTestDatabase()`.
 */
export async function seedCoreFixtures(
  overrides: Partial<{ actor: ActorContext }> = {}
): Promise<TestFixtures> {
  const db = getDb();
  const actor = overrides.actor ?? makeActor({ role: "admin" });

  await db.insert(profiles).values({
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

  const [dept] = await db
    .insert(departments)
    .values({
      tenantId: actor.tenantId ?? DEFAULT_TENANT_ID,
      code: "IT",
      name: "Information Technology",
    })
    .returning();

  await db.insert(profiles).values({
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
  const consumableCategory = "Office Supplies";

  await db.insert(categories).values([
    {
      tenantId: actor.tenantId ?? DEFAULT_TENANT_ID,
      name: assetCategory,
      type: "asset",
      createdByUserId: actor.userId,
    },
    {
      tenantId: actor.tenantId ?? DEFAULT_TENANT_ID,
      name: consumableCategory,
      type: "consumable",
      createdByUserId: actor.userId,
    },
  ]);

  const supplierName = "Acme Supplies Co";
  const [supplier] = await db
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
    consumableCategory,
    supplierId: supplier.id,
    supplierName,
  };
}

/** Purpose string that satisfies PO justification validation. */
export function testPoPurpose(departmentLabel = "Information Technology"): string {
  return `[${departmentLabel}] Regression test procurement`;
}
