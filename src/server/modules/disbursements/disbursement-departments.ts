import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  departments,
  pettyCashDepartments,
  voucherDepartments,
} from "@/server/db/schema";
import type { DbSession } from "@/server/db/transaction";

export type DepartmentRef = { id: string; name: string };

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export async function replaceVoucherDepartmentLinks(
  voucherId: string,
  departmentIds: string[],
  tenantId: string | undefined,
  session?: DbSession
): Promise<void> {
  const db = session ?? getDb();
  const conditions = [eq(voucherDepartments.voucherId, voucherId)];
  if (tenantId) conditions.push(eq(voucherDepartments.tenantId, tenantId));
  await db.delete(voucherDepartments).where(and(...conditions));

  const ids = uniqueIds(departmentIds);
  if (ids.length === 0 || !tenantId) return;

  await db.insert(voucherDepartments).values(
    ids.map((departmentId) => ({
      tenantId,
      voucherId,
      departmentId,
    }))
  );
}

export async function replacePettyCashDepartmentLinks(
  pettyCashId: string,
  departmentIds: string[],
  tenantId: string | undefined,
  session?: DbSession
): Promise<void> {
  const db = session ?? getDb();
  const conditions = [eq(pettyCashDepartments.pettyCashId, pettyCashId)];
  if (tenantId) conditions.push(eq(pettyCashDepartments.tenantId, tenantId));
  await db.delete(pettyCashDepartments).where(and(...conditions));

  const ids = uniqueIds(departmentIds);
  if (ids.length === 0 || !tenantId) return;

  await db.insert(pettyCashDepartments).values(
    ids.map((departmentId) => ({
      tenantId,
      pettyCashId,
      departmentId,
    }))
  );
}

export async function listVoucherDepartmentLinks(
  voucherIds: string[],
  tenantId?: string,
  session?: DbSession
): Promise<Map<string, DepartmentRef[]>> {
  const out = new Map<string, DepartmentRef[]>();
  if (voucherIds.length === 0) return out;

  const db = session ?? getDb();
  const conditions = [inArray(voucherDepartments.voucherId, voucherIds)];
  if (tenantId) conditions.push(eq(voucherDepartments.tenantId, tenantId));

  const rows = await db
    .select({
      voucherId: voucherDepartments.voucherId,
      departmentId: voucherDepartments.departmentId,
      departmentName: departments.name,
    })
    .from(voucherDepartments)
    .innerJoin(departments, eq(departments.id, voucherDepartments.departmentId))
    .where(and(...conditions));

  for (const row of rows) {
    const list = out.get(row.voucherId) ?? [];
    if (!list.some((d) => d.id === row.departmentId)) {
      list.push({ id: row.departmentId, name: row.departmentName });
    }
    out.set(row.voucherId, list);
  }
  return out;
}

export async function listPettyCashDepartmentLinks(
  pettyCashIds: string[],
  tenantId?: string,
  session?: DbSession
): Promise<Map<string, DepartmentRef[]>> {
  const out = new Map<string, DepartmentRef[]>();
  if (pettyCashIds.length === 0) return out;

  const db = session ?? getDb();
  const conditions = [inArray(pettyCashDepartments.pettyCashId, pettyCashIds)];
  if (tenantId) conditions.push(eq(pettyCashDepartments.tenantId, tenantId));

  const rows = await db
    .select({
      pettyCashId: pettyCashDepartments.pettyCashId,
      departmentId: pettyCashDepartments.departmentId,
      departmentName: departments.name,
    })
    .from(pettyCashDepartments)
    .innerJoin(departments, eq(departments.id, pettyCashDepartments.departmentId))
    .where(and(...conditions));

  for (const row of rows) {
    const list = out.get(row.pettyCashId) ?? [];
    if (!list.some((d) => d.id === row.departmentId)) {
      list.push({ id: row.departmentId, name: row.departmentName });
    }
    out.set(row.pettyCashId, list);
  }
  return out;
}

export function fallbackDepartments(
  departmentId?: string | null,
  departmentName?: string | null
): DepartmentRef[] {
  if (departmentId && departmentName) {
    return [{ id: departmentId, name: departmentName }];
  }
  return [];
}

export function requestedDepartmentIds(
  departmentIds?: string[] | null,
  departmentId?: string | null
): string[] {
  if (departmentIds && departmentIds.length > 0) {
    return uniqueIds(departmentIds);
  }
  return departmentId ? [departmentId] : [];
}

export async function resolveDepartmentRefs(
  departmentIds: string[],
  tenantId?: string,
  session?: DbSession
): Promise<DepartmentRef[]> {
  const ids = uniqueIds(departmentIds);
  if (ids.length === 0) return [];

  const db = session ?? getDb();
  const conditions = [inArray(departments.id, ids)];
  if (tenantId) conditions.push(eq(departments.tenantId, tenantId));

  const rows = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(and(...conditions));

  const byId = new Map(rows.map((d) => [d.id, d.name]));
  const resolved: DepartmentRef[] = [];
  for (const id of ids) {
    const name = byId.get(id);
    if (name) resolved.push({ id, name });
  }
  return resolved;
}
