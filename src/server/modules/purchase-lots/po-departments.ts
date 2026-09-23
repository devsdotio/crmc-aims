import { and, eq } from "drizzle-orm";

import { purchaseOrderDepartments } from "@/server/db/schema";
import type { DbSession } from "@/server/db/transaction";

/** Remove sponsoring-department links for a PO number (project multi-dept). */
export async function deletePoDepartmentLinks(
  poReference: string,
  tenantId: string | undefined,
  session: DbSession
): Promise<void> {
  const trimmed = poReference.trim();
  if (!trimmed) return;

  const conditions = [eq(purchaseOrderDepartments.poReference, trimmed)];
  if (tenantId) {
    conditions.push(eq(purchaseOrderDepartments.tenantId, tenantId));
  }

  await session
    .delete(purchaseOrderDepartments)
    .where(and(...conditions));
}

/**
 * Move sponsoring-department links when a PO number is renamed.
 * Clears any orphan rows already keyed to the new reference first
 * (safe when clash checks confirm no live lots use that number).
 */
export async function renamePoDepartmentLinks(
  oldReference: string,
  newReference: string,
  tenantId: string | undefined,
  session: DbSession
): Promise<void> {
  const oldRef = oldReference.trim();
  const newRef = newReference.trim();
  if (!oldRef || !newRef || oldRef === newRef) return;

  await deletePoDepartmentLinks(newRef, tenantId, session);

  const conditions = [eq(purchaseOrderDepartments.poReference, oldRef)];
  if (tenantId) {
    conditions.push(eq(purchaseOrderDepartments.tenantId, tenantId));
  }

  await session
    .update(purchaseOrderDepartments)
    .set({ poReference: newRef })
    .where(and(...conditions));
}
